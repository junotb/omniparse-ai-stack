"use client";

import { useCallback, useEffect, useState } from "react";
import { createWorker } from "tesseract.js";

type OcrEngineChoice = "auto" | "prompt-api" | "tesseract";
type OcrEngineUsed = "prompt-api" | "tesseract" | null;
type OcrStatus = "idle" | "checking" | "processing" | "done" | "error";

export function OcrClient() {
  const [image, setImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [result, setResult] = useState<string>("");
  const [engineChoice, setEngineChoice] = useState<OcrEngineChoice>("auto");
  const [engine, setEngine] = useState<OcrEngineUsed>(null);
  const [promptApiAvailable, setPromptApiAvailable] = useState<boolean | null>(null);
  const [status, setStatus] = useState<OcrStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const [elapsedMs, setElapsedMs] = useState<number | null>(null);

  const checkPromptApi = useCallback(async (): Promise<boolean> => {
    if (typeof window === "undefined") return false;
    if (typeof (window as unknown as { LanguageModel?: unknown }).LanguageModel === "undefined") return false;
    const LM = (window as unknown as { LanguageModel: { availability: (opts?: object) => Promise<string> } }).LanguageModel;
    const availability = await LM.availability({
      expectedInputs: [
        { type: "text", languages: ["en"] },
        { type: "image" },
      ],
      expectedOutputs: [{ type: "text", languages: ["en"] }],
    });
    return availability === "available" || availability === "downloadable" || availability === "downloading";
  }, []);

  useEffect(() => {
    checkPromptApi().then(setPromptApiAvailable);
  }, [checkPromptApi]);

  const runWithPromptApi = useCallback(async (blob: Blob) => {
    const LM = (window as unknown as { LanguageModel: { create: (opts?: object) => Promise<{ prompt: (input: unknown) => Promise<string>; destroy: () => void }> } }).LanguageModel;
    const session = await LM.create({
      expectedInputs: [
        { type: "text", languages: ["en"] },
        { type: "image" },
      ],
      expectedOutputs: [{ type: "text", languages: ["en"] }],
      initialPrompts: [
        {
          role: "system",
          content:
            "You are an OCR assistant. Extract ALL text from the provided image exactly as it appears. Preserve layout, line breaks, and formatting. Output only the extracted text, nothing else.",
        },
      ],
    });

    const result = await session.prompt([
      {
        role: "user",
        content: [
          { type: "text", value: "Extract all text from this image. Output only the raw text, preserving original formatting:" },
          { type: "image", value: blob },
        ],
      },
    ]);
    session.destroy();
    return result;
  }, []);

  const runWithTesseract = useCallback(async (file: File): Promise<string> => {
    const worker = await createWorker("eng+kor", 1, {
      logger: () => {},
    });
    const { data } = await worker.recognize(file);
    await worker.terminate();
    return data.text;
  }, []);

  const processImage = useCallback(async () => {
    if (!image) return;

    setError(null);
    setResult("");
    setStatus("processing");
    const start = performance.now();

    const resolveEngine = async (): Promise<"prompt-api" | "tesseract"> => {
      if (engineChoice === "tesseract") return "tesseract";
      if (engineChoice === "prompt-api") return "prompt-api";
      const available = promptApiAvailable ?? (await checkPromptApi());
      return available ? "prompt-api" : "tesseract";
    };

    try {
      const engineToUse = await resolveEngine();
      let text = "";

      if (engineToUse === "prompt-api") {
        setEngine("prompt-api");
        try {
          text = await runWithPromptApi(image);
        } catch (promptErr) {
          if (engineChoice === "prompt-api") throw promptErr;
          setEngine("tesseract");
          text = await runWithTesseract(image);
        }
      } else {
        setEngine("tesseract");
        text = await runWithTesseract(image);
      }

      setResult(text.trim() || "(텍스트를 추출하지 못했습니다)");
      setStatus("done");
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setStatus("error");
    } finally {
      setElapsedMs(Math.round(performance.now() - start));
    }
  }, [image, engineChoice, promptApiAvailable, checkPromptApi, runWithPromptApi, runWithTesseract]);

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type.startsWith("image/")) {
      setImagePreview((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return URL.createObjectURL(file);
      });
      setImage(file);
      setResult("");
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
      setResult("");
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
    setResult("");
    setEngine(null);
    setStatus("idle");
    setError(null);
    setElapsedMs(null);
  }, [imagePreview]);

  const isPromptApiDisabled = promptApiAvailable === false;

  return (
    <div className="space-y-6">
      {/* Engine selection */}
      <fieldset className="rounded-lg border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800/50">
        <legend className="px-1 font-medium text-slate-700 dark:text-slate-300">OCR 엔진 선택</legend>
        <div className="mt-2 space-y-2">
          <label className="flex cursor-pointer items-center gap-3">
            <input
              type="radio"
              name="engine"
              value="auto"
              checked={engineChoice === "auto"}
              onChange={() => setEngineChoice("auto")}
              className="h-4 w-4 accent-teal-600"
            />
            <span className="text-slate-700 dark:text-slate-300">자동</span>
            <span className="text-sm text-slate-500 dark:text-slate-500">
              — Prompt API 사용 가능 시 우선, 아니면 Tesseract
            </span>
          </label>
          <label
            className={`flex items-center gap-3 ${isPromptApiDisabled ? "cursor-not-allowed opacity-60" : "cursor-pointer"}`}
          >
            <input
              type="radio"
              name="engine"
              value="prompt-api"
              checked={engineChoice === "prompt-api"}
              onChange={() => setEngineChoice("prompt-api")}
              disabled={isPromptApiDisabled}
              className="h-4 w-4 accent-teal-600 disabled:cursor-not-allowed"
            />
            <span className="text-slate-700 dark:text-slate-300">Prompt API (Gemini Nano)</span>
            <span className="text-sm text-slate-500 dark:text-slate-500">
              — NPU/GPU 가속, 1~2초 내 고정확도
              {promptApiAvailable === false && (
                <span className="ml-1 text-amber-600 dark:text-amber-400">(사용 불가)</span>
              )}
            </span>
          </label>
          <label className="flex cursor-pointer items-center gap-3">
            <input
              type="radio"
              name="engine"
              value="tesseract"
              checked={engineChoice === "tesseract"}
              onChange={() => setEngineChoice("tesseract")}
              className="h-4 w-4 accent-teal-600"
            />
            <span className="text-slate-700 dark:text-slate-300">Tesseract.js</span>
            <span className="text-sm text-slate-500 dark:text-slate-500">— 대부분 브라우저 지원</span>
          </label>
        </div>
        <p className="mt-3 text-xs text-slate-500 dark:text-slate-500">
          Prompt API: Chrome에서{" "}
          <code className="rounded bg-slate-200 px-1 dark:bg-slate-700">#prompt-api-for-gemini-nano-multimodal-input</code>
          , <code className="rounded bg-slate-200 px-1 dark:bg-slate-700">#optimization-guide-on-device-model</code> 활성화
        </p>
      </fieldset>

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
          id="ocr-file"
        />
        <label htmlFor="ocr-file" className="cursor-pointer text-center">
          {imagePreview ? (
            <div className="space-y-3">
              <img
                src={imagePreview}
                alt="미리보기"
                className="mx-auto max-h-40 max-w-full rounded-lg object-contain shadow"
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
          onClick={processImage}
          disabled={!image || status === "processing"}
          className="rounded-lg bg-teal-600 px-5 py-2.5 font-medium text-white transition hover:bg-teal-500 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {status === "processing" ? "처리 중…" : "텍스트 추출"}
        </button>
        {image && (
          <button
            onClick={reset}
            disabled={status === "processing"}
            className="rounded-lg border border-slate-300 bg-white px-5 py-2.5 font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
          >
            초기화
          </button>
        )}
      </div>

      {/* Result */}
      {(result || error) && (
        <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800/50">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-sm font-medium text-slate-600 dark:text-slate-400">
              {engine === "prompt-api" ? "Prompt API (Gemini Nano)" : engine === "tesseract" ? "Tesseract.js" : ""}
              {elapsedMs != null && (
                <span className="ml-2 text-slate-400 dark:text-slate-500">({elapsedMs}ms)</span>
              )}
            </span>
          </div>
          {error ? (
            <p className="text-red-600 dark:text-red-400">{error}</p>
          ) : (
            <pre className="max-h-64 overflow-auto whitespace-pre-wrap rounded-lg bg-slate-50 p-4 text-sm text-slate-800 dark:bg-slate-900 dark:text-slate-200">
              {result}
            </pre>
          )}
        </div>
      )}
    </div>
  );
}
