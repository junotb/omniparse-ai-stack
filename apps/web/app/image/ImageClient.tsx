"use client";

import { useCallback, useRef, useState } from "react";

type ImageStatus = "idle" | "loading" | "processing" | "done" | "error";

/** max_position_embeddings(2048) - 이미지(729) - 고정문구(~20) - 생성(128) ≈ 1170 토큰 ≈ 1500자 */
const MAX_QUESTION_LENGTH = 1500;

/** 질문에 붙이는 한글 답변 요청 (Translator API 미사용 시) */
const KOREAN_ANSWER_SUFFIX = " (한글로 답해줘)";

/** 한글 포함 여부 (초성·중성·종성 조합 영역) */
function hasKorean(text: string): boolean {
  return /[\uac00-\ud7a3]/.test(text);
}

/** Chrome Translator API로 번역 (ko↔en). 미지원 시 null */
async function translateWithChrome(text: string, from: "ko" | "en", to: "ko" | "en"): Promise<string | null> {
  if (typeof self === "undefined" || !("Translator" in self)) return null;
  const T = (self as Window & { Translator?: { availability?: (o: object) => Promise<string>; create: (o: object) => Promise<{ translate: (t: string) => Promise<string> }> } }).Translator;
  if (!T?.create) return null;
  try {
    const availability = await T.availability?.({ sourceLanguage: from, targetLanguage: to });
    if (availability !== "available" && availability !== "downloadable") return null;
    const translator = await T.create({ sourceLanguage: from, targetLanguage: to });
    return await translator.translate(text);
  } catch {
    return null;
  }
}

export function ImageClient() {
  const [image, setImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [question, setQuestion] = useState("이 사진 속 상황이 뭐야?");
  const [answer, setAnswer] = useState<string>("");
  const [translatedQuestionEn, setTranslatedQuestionEn] = useState<string | null>(null);
  const [status, setStatus] = useState<ImageStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const [elapsedMs, setElapsedMs] = useState<number | null>(null);
  const [useWebGpu, setUseWebGpu] = useState(true);
  const modelRef = useRef<{
    model: unknown;
    processor: unknown;
    tokenizer: unknown;
  } | null>(null);

  const loadModel = useCallback(async () => {
    if (modelRef.current) return modelRef.current;
    setStatus("loading");
    try {
      const {
        env,
        AutoProcessor,
        AutoTokenizer,
        Moondream1ForConditionalGeneration,
      } = await import("@huggingface/transformers");
      // ONNX Runtime의 "Some nodes were not assigned..." 경고 억제
      if (env?.backends?.onnx) env.backends.onnx.logLevel = "error";
      const model = await Moondream1ForConditionalGeneration.from_pretrained("Xenova/moondream2", {
        dtype: {
          embed_tokens: "fp16",
          vision_encoder: "fp16",
          decoder_model_merged: "q4",
        },
        device: useWebGpu ? "webgpu" : "wasm",
      });
      const processor = await AutoProcessor.from_pretrained("Xenova/moondream2");
      const tokenizer = await AutoTokenizer.from_pretrained("Xenova/moondream2");
      modelRef.current = { model, processor, tokenizer };
      return modelRef.current;
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setStatus("error");
      throw e;
    }
  }, [useWebGpu]);

  const askImage = useCallback(async () => {
    if (!image) return;
    if (question.length > MAX_QUESTION_LENGTH) return;
    setError(null);
    setAnswer("");
    setTranslatedQuestionEn(null);
    const start = performance.now();
    try {
      const loaded = await loadModel();
      if (!loaded) throw new Error("모델 로드 실패");
      setStatus("processing");
      const { model, processor, tokenizer } = loaded as {
        model: {
          generate: (params: object) => Promise<number[][]>;
        };
        processor: (image: unknown) => Promise<object>;
        tokenizer: {
          (text: string): object;
          batch_decode: (ids: number[][], opts?: object) => string[];
        };
      };
      const { RawImage } = await import("@huggingface/transformers");
      const rawImage = await RawImage.read(image);

      // 한글 질문이면 Chrome Translator API로 ko→en→Moondream2→en→ko
      const useTranslator = hasKorean(question) && "Translator" in self;
      let promptQuestion = question;
      let usedTranslation = false;
      if (useTranslator) {
        const translatedQ = await translateWithChrome(question, "ko", "en");
        if (translatedQ) {
          promptQuestion = translatedQ;
          usedTranslation = true;
          setTranslatedQuestionEn(translatedQ);
        }
      }

      const suffix = usedTranslation ? "" : KOREAN_ANSWER_SUFFIX;
      const text = `<image>\n\nQuestion: ${promptQuestion}${suffix}\n\nAnswer:`;
      // tokens 개수와 vision features(729)가 일치해야 함. 378x378 이미지 + patch 14 → 27×27=729
      const NUM_IMAGE_TOKENS = 729;
      const expandedText = text.replace("<image>", "<image>".repeat(NUM_IMAGE_TOKENS));
      const textInputs = tokenizer(expandedText);
      const visionInputs = await processor(rawImage);
      const output = await model.generate({
        ...textInputs,
        ...visionInputs,
        do_sample: false,
        max_new_tokens: 128,
      });
      const decoded = tokenizer.batch_decode(output, { skip_special_tokens: false });
      let result = decoded[0] ?? "";
      const answerMatch = result.match(/Answer:\s*(.+?)(?:<\|endoftext\||$)/s);
      let extracted = answerMatch ? answerMatch[1].trim() : result.replace(/^[\s\S]*?Answer:\s*/i, "").replace(/<\|endoftext\|>.*$/s, "").trim();
      extracted = extracted || result;

      // 한글 질문이었고 Translator 사용 시, 영어 답변을 한글로 번역
      if (usedTranslation && extracted) {
        const translatedA = await translateWithChrome(extracted, "en", "ko");
        if (translatedA) extracted = translatedA;
      }
      setAnswer(extracted);
      setStatus("done");
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setStatus("error");
    } finally {
      setElapsedMs(Math.round(performance.now() - start));
    }
  }, [image, question, loadModel]);

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type.startsWith("image/")) {
      setImagePreview((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return URL.createObjectURL(file);
      });
      setImage(file);
      setAnswer("");
      setStatus("idle");
      setError(null);
      setElapsedMs(null);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith("image/")) {
      setImagePreview((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return URL.createObjectURL(file);
      });
      setImage(file);
      setAnswer("");
      setStatus("idle");
      setError(null);
      setElapsedMs(null);
    }
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => e.preventDefault(), []);

  const reset = useCallback(() => {
    if (imagePreview) URL.revokeObjectURL(imagePreview);
    setImage(null);
    setImagePreview(null);
    setAnswer("");
    setTranslatedQuestionEn(null);
    setStatus("idle");
    setError(null);
    setElapsedMs(null);
  }, [imagePreview]);

  return (
    <div className="space-y-6">
      {/* Engine info */}
      <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm dark:border-slate-700 dark:bg-slate-800/50">
        <p className="font-medium text-slate-700 dark:text-slate-300">비전 분석 (Vision Analysis)</p>
        <p className="mt-1 text-slate-600 dark:text-slate-400">
          Moondream2 VLM — 이미지에 대해 자연어로 질문하고 답변을 받습니다. WebGPU/WASM으로 브라우저에서 실행됩니다.
        </p>
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-500">
          참고: WebLLM은 비전 모델 미지원으로 Transformers.js + Moondream2 사용. 한글 질문 시 Chrome 138+의 Translator API로 질문(ko→en)·답변(en→ko) 자동 번역.
        </p>
        <label className="mt-3 flex cursor-pointer items-center gap-2">
          <input
            type="checkbox"
            checked={useWebGpu}
            onChange={(e) => {
              setUseWebGpu(e.target.checked);
              modelRef.current = null;
            }}
            className="h-4 w-4 rounded accent-teal-600"
          />
          <span className="text-slate-700 dark:text-slate-300">WebGPU 사용 (GPU 가속)</span>
        </label>
      </div>

      {/* Question input */}
      <div>
        <div className="mb-1 flex items-center justify-between">
          <label htmlFor="vision-question" className="block text-sm font-medium text-slate-700 dark:text-slate-300">
            질문
          </label>
          <span
            className={`text-xs ${question.length > MAX_QUESTION_LENGTH ? "text-red-500" : "text-slate-500 dark:text-slate-500"}`}
          >
            {question.length} / {MAX_QUESTION_LENGTH}
          </span>
        </div>
        <input
          id="vision-question"
          type="text"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="이 사진 속 상황이 뭐야?"
          maxLength={MAX_QUESTION_LENGTH}
          className="w-full rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-slate-800 transition focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:focus:border-teal-400"
        />
      </div>

      {/* Dropzone */}
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        className="flex min-h-[180px] flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-300 bg-slate-50/50 p-6 transition-colors hover:border-teal-400 hover:bg-teal-50/30 dark:border-slate-600 dark:bg-slate-800/30 dark:hover:border-teal-500 dark:hover:bg-teal-900/20"
      >
        <input
          type="file"
          accept="image/*"
          onChange={handleFileChange}
          className="hidden"
          id="image-file"
        />
        <label htmlFor="image-file" className="cursor-pointer text-center">
          {imagePreview ? (
            <div className="space-y-3">
              <img
                src={imagePreview}
                alt="미리보기"
                className="mx-auto max-h-48 max-w-full rounded-lg object-contain shadow"
              />
              <p className="text-sm text-slate-600 dark:text-slate-400">{image.name}</p>
            </div>
          ) : (
            <>
              <p className="text-slate-500 dark:text-slate-400">
                이미지를 드래그하거나 <span className="font-medium text-teal-600 dark:text-teal-400">클릭하여 선택</span>
              </p>
              <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">PNG, JPG, WebP 등</p>
            </>
          )}
        </label>
      </div>

      {/* Actions */}
      <div className="flex gap-3">
        <button
          onClick={askImage}
          disabled={!image || question.length > MAX_QUESTION_LENGTH || status === "loading" || status === "processing"}
          className="rounded-lg bg-teal-600 px-5 py-2.5 font-medium text-white transition hover:bg-teal-500 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {status === "loading"
            ? "모델 로딩…"
            : status === "processing"
              ? "분석 중…"
              : "질문하기"}
        </button>
        {image && (
          <button
            onClick={reset}
            disabled={status === "loading" || status === "processing"}
            className="rounded-lg border border-slate-300 bg-white px-5 py-2.5 font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
          >
            초기화
          </button>
        )}
      </div>

      {/* Result */}
      {(answer || error) && (
        <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800/50">
          {translatedQuestionEn && (
            <div className="mb-4 rounded-lg border border-amber-200/60 bg-amber-50/50 py-2.5 px-3 text-sm dark:border-amber-800/40 dark:bg-amber-900/20">
              <p className="font-medium text-amber-800 dark:text-amber-200">
                한글을 사용했기 때문에 영어로 번역한 후 질의했습니다.
              </p>
              <p className="mt-1.5 text-amber-900/90 dark:text-amber-100/90">
                <span className="text-amber-700 dark:text-amber-300">영문: </span>
                {translatedQuestionEn}
              </p>
            </div>
          )}
          <div className="mb-2 flex items-center justify-between">
            <span className="text-sm font-medium text-slate-600 dark:text-slate-400">
              답변
              {elapsedMs != null && (
                <span className="ml-2 text-slate-400 dark:text-slate-500">({elapsedMs}ms)</span>
              )}
            </span>
          </div>
          {error ? (
            <p className="text-red-600 dark:text-red-400">{error}</p>
          ) : (
            <p className="whitespace-pre-wrap text-slate-800 dark:text-slate-200">{answer}</p>
          )}
        </div>
      )}
    </div>
  );
}
