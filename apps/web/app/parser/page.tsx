import { ParserClient } from "./ParserClient";

export const metadata = {
  title: "Parser | omniparse-ai-stack",
  description: "문서 레이아웃 분석 - YOLOv10m DocLayNet ONNX로 제목, 본문, 표 등 블록 분류",
};

export default function ParserPage() {
  return (
    <main className="mx-auto max-w-2xl px-4 py-6 sm:py-10">
      <div className="mb-6 sm:mb-8">
        <h1 className="text-xl font-bold text-slate-900 dark:text-white sm:text-2xl">Parser (레이아웃 분석)</h1>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-400 sm:text-base">
          문서 이미지에서 제목, 본문, 표, 그림 등 블록을 분류합니다. YOLOv10m DocLayNet ONNX 모델을 WebGPU/WASM으로 실행합니다.
        </p>
      </div>

      <ParserClient />
    </main>
  );
}
