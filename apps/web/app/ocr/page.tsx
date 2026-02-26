import { OcrClient } from "./OcrClient";

export const metadata = {
  title: "OCR | omniparse-ai-stack",
  description: "브라우저 내장 AI(Prompt API) 또는 Tesseract.js로 이미지에서 텍스트 추출",
};

export default function OcrPage() {
  return (
    <main className="mx-auto max-w-2xl px-4 py-10">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">OCR (텍스트 인식)</h1>
        <p className="mt-1 text-slate-600 dark:text-slate-400">
          이미지에서 텍스트를 추출합니다. Chrome Prompt API(Gemini Nano)를 우선 사용하며, 미지원 시 Tesseract.js로 처리합니다.
        </p>
      </div>

      <OcrClient />
    </main>
  );
}
