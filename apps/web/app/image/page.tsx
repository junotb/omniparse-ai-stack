import { ImageClient } from "./ImageClient";

export const metadata = {
  title: "Image | omniparse-ai-stack",
  description: "비전 분석 - Moondream2 VLM으로 이미지에 대해 자연어 질의응답",
};

export default function ImagePage() {
  return (
    <main className="mx-auto max-w-2xl px-4 py-6 sm:py-10">
      <div className="mb-6 sm:mb-8">
        <h1 className="text-xl font-bold text-slate-900 dark:text-white sm:text-2xl">Image (비전 분석)</h1>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-400 sm:text-base">
          이미지에 대해 자연어로 질문하고 AI가 답변합니다. Moondream2 소형 VLM을 WebGPU/WASM으로 브라우저에서 실행합니다.
        </p>
      </div>

      <ImageClient />
    </main>
  );
}
