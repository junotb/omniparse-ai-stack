"use client";

import { useCallback, useRef, useState } from "react";
import { parserStruct, parserTable } from "@/lib/api";

const LABELS: Record<number, string> = {
  0: "Caption",
  1: "Footnote",
  2: "Formula",
  3: "List-item",
  4: "Page-footer",
  5: "Page-header",
  6: "Picture",
  7: "Section-header",
  8: "Table",
  9: "Text",
  10: "Title",
};

const LABEL_COLORS: Record<string, string> = {
  Title: "#ef4444",
  "Section-header": "#f97316",
  Text: "#22c55e",
  "List-item": "#3b82f6",
  Table: "#8b5cf6",
  Picture: "#ec4899",
  Caption: "#06b6d4",
  Formula: "#84cc16",
  Footnote: "#78716c",
  "Page-header": "#64748b",
  "Page-footer": "#64748b",
};

export interface LayoutBlock {
  label: string;
  score: number;
  box: { xmin: number; ymin: number; xmax: number; ymax: number };
}

type ParserStatus = "idle" | "loading" | "processing" | "done" | "error";
type ParserMode = "client" | "api-struct" | "api-table";

export function ParserClient() {
  const [mode, setMode] = useState<ParserMode>("client");
  const [image, setImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [inputText, setInputText] = useState("");
  const [blocks, setBlocks] = useState<LayoutBlock[]>([]);
  const [apiResult, setApiResult] = useState<
    | { type: "struct"; sections: { type: string; content: string; level?: number }[] }
    | { type: "table"; tables: string[][][]; table_count: number }
    | null
  >(null);
  const [status, setStatus] = useState<ParserStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const [elapsedMs, setElapsedMs] = useState<number | null>(null);
  const [useWebGpu, setUseWebGpu] = useState(true);
  const modelRef = useRef<{ model: unknown; processor: unknown } | null>(null);

  const loadModel = useCallback(async () => {
    if (modelRef.current) return modelRef.current;
    setStatus("loading");
    try {
      const { AutoModel, AutoProcessor } = await import("@huggingface/transformers");
      const model = await AutoModel.from_pretrained(
        "Oblix/yolov10m-doclaynet_ONNX_document-layout-analysis",
        { dtype: "fp32", device: useWebGpu ? "webgpu" : "wasm" }
      );
      const processor = await AutoProcessor.from_pretrained(
        "Oblix/yolov10m-doclaynet_ONNX_document-layout-analysis"
      );
      modelRef.current = { model, processor };
      return modelRef.current;
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setStatus("error");
      throw e;
    } finally {
      setStatus((s) => (s === "loading" ? "idle" : s));
    }
  }, [useWebGpu]);

  const processImage = useCallback(async () => {
    if (mode === "client" && !image) return;
    if ((mode === "api-struct" || mode === "api-table") && !inputText.trim()) return;

    setError(null);
    setBlocks([]);
    setApiResult(null);
    setStatus("processing");
    const start = performance.now();
    try {
      if (mode === "api-struct") {
        const res = await parserStruct(inputText.trim());
        setApiResult({ type: "struct", sections: res.sections });
        setStatus("done");
      } else if (mode === "api-table") {
        const res = await parserTable(inputText.trim());
        setApiResult({ type: "table", tables: res.tables, table_count: res.table_count });
        setStatus("done");
      } else {
        const loaded = await loadModel();
      if (!loaded || !("model" in loaded)) throw new Error("모델 로드 실패");
      const { model, processor } = loaded as {
        model: {
          _call: (inputs: { images: unknown }) => Promise<{ output0: { tolist: () => number[][][] } }>;
          config?: { id2label?: Record<number, string> };
        };
        processor: (image: unknown) => Promise<{ pixel_values: unknown; reshaped_input_sizes: number[][] }>;
      };
      const { RawImage } = await import("@huggingface/transformers");
      const rawImage = await RawImage.read(image);
      const { pixel_values, reshaped_input_sizes } = await processor(rawImage);
      const output = await (model as (inputs: object) => Promise<{ output0: { tolist: () => number[][][] } }>)({
        images: pixel_values,
      });
      const predictions = output.output0.tolist()[0];
      const [newHeight, newWidth] = reshaped_input_sizes[0];
      const imgWidth = (rawImage as { width: number }).width;
      const imgHeight = (rawImage as { height: number }).height;
      const xs = imgWidth / newWidth;
      const ys = imgHeight / newHeight;
      const threshold = 0.35;
      const id2label = (model.config?.id2label ?? LABELS) as Record<number, string>;
      const result: LayoutBlock[] = [];
      for (const pred of predictions) {
        const [xmin, ymin, xmax, ymax, score, id] = pred;
        if (score < threshold) continue;
        const label = id2label[Math.round(id)] ?? LABELS[Math.round(id)] ?? `Class-${id}`;
        result.push({
          label,
          score,
          box: {
            xmin: xmin * xs,
            ymin: ymin * ys,
            xmax: xmax * xs,
            ymax: ymax * ys,
          },
        });
      }
      result.sort((a, b) => a.box.ymin - b.box.ymin);
      setBlocks(result);
      setStatus("done");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setStatus("error");
    } finally {
      setElapsedMs(Math.round(performance.now() - start));
    }
  }, [mode, image, inputText, loadModel]);

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type.startsWith("image/")) {
      setImagePreview((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return URL.createObjectURL(file);
      });
      setImage(file);
      setBlocks([]);
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
      setBlocks([]);
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
    setInputText("");
    setBlocks([]);
    setApiResult(null);
    setStatus("idle");
    setError(null);
    setElapsedMs(null);
  }, [imagePreview]);

  return (
    <div className="space-y-6">
      {/* Mode selection */}
      <fieldset className="rounded-lg border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800/50">
        <legend className="px-1 font-medium text-slate-700 dark:text-slate-300">처리 방식</legend>
        <div className="mt-2 space-y-2">
          <label className="flex cursor-pointer items-center gap-3">
            <input
              type="radio"
              name="parser-mode"
              value="client"
              checked={mode === "client"}
              onChange={() => setMode("client")}
              className="h-4 w-4 accent-teal-600"
            />
            <span className="text-slate-700 dark:text-slate-300">클라이언트 (이미지 레이아웃)</span>
            <span className="text-sm text-slate-500 dark:text-slate-500">— YOLOv10 DocLayNet, WebGPU</span>
          </label>
          <label className="flex cursor-pointer items-center gap-3">
            <input
              type="radio"
              name="parser-mode"
              value="api-struct"
              checked={mode === "api-struct"}
              onChange={() => setMode("api-struct")}
              className="h-4 w-4 accent-teal-600"
            />
            <span className="text-slate-700 dark:text-slate-300">API (텍스트 구조화)</span>
            <span className="text-sm text-slate-500 dark:text-slate-500">— apps/api 백엔드</span>
          </label>
          <label className="flex cursor-pointer items-center gap-3">
            <input
              type="radio"
              name="parser-mode"
              value="api-table"
              checked={mode === "api-table"}
              onChange={() => setMode("api-table")}
              className="h-4 w-4 accent-teal-600"
            />
            <span className="text-slate-700 dark:text-slate-300">API (테이블 추출)</span>
            <span className="text-sm text-slate-500 dark:text-slate-500">— apps/api 백엔드</span>
          </label>
        </div>
        {mode === "client" && (
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
        )}
      </fieldset>

      {/* Input: Text for API, Image for Client */}
      {mode === "api-struct" || mode === "api-table" ? (
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
            입력 텍스트
          </label>
          <textarea
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder={
              mode === "api-struct"
                ? "구조화할 텍스트를 입력하세요 (헤더, 문단, 리스트 등)"
                : "테이블이 포함된 텍스트를 입력하세요 (|, 탭, 쉼표 구분)"
            }
            rows={8}
            className="w-full resize-y rounded-lg border border-slate-300 bg-white px-4 py-2.5 font-mono text-sm text-slate-800 transition focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:focus:border-teal-400"
          />
        </div>
      ) : (
      /* Dropzone */
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
          id="parser-file"
        />
        <label htmlFor="parser-file" className="cursor-pointer text-center">
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
                문서 이미지를 드래그하거나 <span className="font-medium text-teal-600 dark:text-teal-400">클릭하여 선택</span>
              </p>
              <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">PNG, JPG, WebP 등</p>
            </>
          )}
        </label>
      </div>
      )}

      {/* Actions */}
      <div className="flex gap-3">
        <button
          onClick={processImage}
          disabled={
            (mode === "client" && !image) ||
            ((mode === "api-struct" || mode === "api-table") && !inputText.trim()) ||
            status === "loading" ||
            status === "processing"
          }
          className="min-h-[44px] rounded-lg bg-teal-600 px-5 py-2.5 font-medium text-white transition hover:bg-teal-500 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 sm:min-h-0"
        >
          {status === "loading"
            ? "모델 로딩…"
            : status === "processing"
              ? "분석 중…"
              : mode === "api-struct"
                ? "구조화"
                : mode === "api-table"
                  ? "테이블 추출"
                  : "레이아웃 분석"}
        </button>
        {(image || inputText) && (
          <button
            onClick={reset}
            disabled={status === "loading" || status === "processing"}
            className="min-h-[44px] rounded-lg border border-slate-300 bg-white px-5 py-2.5 font-medium text-slate-700 transition hover:bg-slate-50 active:scale-[0.98] disabled:opacity-50 sm:min-h-0 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
          >
            초기화
          </button>
        )}
      </div>

      {/* Result */}
      {(blocks.length > 0 || apiResult || error) && (
        <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800/50">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-sm font-medium text-slate-600 dark:text-slate-400">
              {apiResult?.type === "struct"
                ? `섹션 ${apiResult.sections.length}개`
                : apiResult?.type === "table"
                  ? `테이블 ${apiResult.table_count}개`
                  : `탐지된 블록 ${blocks.length}개`}
              {elapsedMs != null && (
                <span className="ml-2 text-slate-400 dark:text-slate-500">({elapsedMs}ms)</span>
              )}
            </span>
          </div>
          {error ? (
            <p className="text-red-600 dark:text-red-400">{error}</p>
          ) : apiResult?.type === "struct" ? (
            <div className="max-h-64 space-y-1 overflow-auto">
              {apiResult.sections.map((s, i) => (
                <div
                  key={i}
                  className="rounded bg-slate-50 px-3 py-1.5 text-sm dark:bg-slate-900"
                >
                  <span className="font-medium text-teal-600 dark:text-teal-400">
                    [{s.type}{s.level != null ? ` Lv.${s.level}` : ""}]
                  </span>{" "}
                  {s.content}
                </div>
              ))}
            </div>
          ) : apiResult?.type === "table" ? (
            <div className="max-h-64 space-y-4 overflow-auto">
              {apiResult.tables.map((tbl, ti) => (
                <div key={ti} className="overflow-x-auto">
                  <table className="min-w-full border border-slate-200 dark:border-slate-600">
                    <tbody>
                      {tbl.map((row, ri) => (
                        <tr key={ri}>
                          {row.map((cell, ci) => (
                            <td
                              key={ci}
                              className="border border-slate-200 px-2 py-1 text-sm dark:border-slate-600"
                            >
                              {cell}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ))}
            </div>
          ) : (
            <div className="max-h-64 space-y-1 overflow-auto">
              {blocks.map((b, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between rounded bg-slate-50 px-3 py-1.5 text-sm dark:bg-slate-900"
                >
                  <span>
                    <span
                      className="inline-block h-2 w-2 rounded-full"
                      style={{ backgroundColor: LABEL_COLORS[b.label] ?? "#94a3b8" }}
                    />
                    <span className="ml-2 font-medium">{b.label}</span>
                  </span>
                  <span className="text-slate-500">{(b.score * 100).toFixed(0)}%</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
