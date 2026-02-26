import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Omniparse AI Stack | AI 기반 문서·이미지 파싱",
  description:
    "OCR, Parser, Image 비전 분석, Agent를 한 곳에서. 브라우저 내장 AI와 서버 API를 함께 사용합니다.",
};

const features = [
  {
    slug: "/ocr",
    title: "OCR",
    subtitle: "텍스트 인식",
    description:
      "이미지에서 텍스트를 추출합니다. Chrome Prompt API(Gemini Nano) 또는 Tesseract.js, API(EasyOCR) 지원.",
    icon: "Aa",
  },
  {
    slug: "/parser",
    title: "Parser",
    subtitle: "레이아웃 분석",
    description:
      "문서 이미지에서 제목, 본문, 표, 그림 등 블록을 분류합니다. YOLOv10 DocLayNet 또는 API 텍스트 구조화·테이블 추출.",
    icon: "⊞",
  },
  {
    slug: "/image",
    title: "Image",
    subtitle: "비전 분석",
    description:
      "이미지에 대해 자연어로 질문하고 AI가 답변합니다. Moondream2 VLM 또는 API 메타데이터 분석.",
    icon: "🖼",
  },
  {
    slug: "/agent",
    title: "Agent",
    subtitle: "Self-Planning",
    description:
      "추출된 텍스트에 대해 자연어 지시를 실행합니다. Chrome Gemini Nano 또는 API(LangChain/OpenAI).",
    icon: "⟣",
  },
] as const;

export default function HomePage() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-50 to-white dark:from-slate-950 dark:to-slate-900">
      {/* Hero */}
      <section className="border-b border-slate-200/60 bg-white/80 px-4 py-10 sm:py-16 backdrop-blur-sm dark:border-slate-800 dark:bg-slate-900/80">
        <div className="mx-auto max-w-4xl text-center">
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-3xl md:text-4xl">
            Omniparse AI Stack
          </h1>
          <p className="mt-3 text-base text-slate-600 dark:text-slate-400 sm:mt-4 sm:text-lg">
            AI 기반 문서·이미지 파싱을 브라우저와 서버에서 함께 사용합니다.
          </p>
          <p className="mt-2 text-xs text-slate-500 sm:text-sm dark:text-slate-500">
            Next.js · TypeScript · Tailwind CSS
          </p>
        </div>
      </section>

      {/* Feature cards */}
      <section className="mx-auto max-w-5xl px-4 py-8 sm:py-12 md:py-16">
        <div className="grid gap-4 sm:grid-cols-2 sm:gap-6 lg:grid-cols-4">
          {features.map((f) => (
            <Link
              key={f.slug}
              href={f.slug}
              className="group relative flex min-h-[120px] flex-col overflow-hidden rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition-all active:scale-[0.98] sm:min-h-0 sm:p-6 hover:border-teal-400 hover:shadow-lg dark:border-slate-700 dark:bg-slate-800/50 dark:hover:border-teal-500"
            >
              <div className="mb-3 flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-teal-100 text-lg font-semibold text-teal-700 transition-colors sm:mb-4 sm:h-12 sm:w-12 sm:text-xl group-hover:bg-teal-200 dark:bg-teal-900/40 dark:text-teal-300 dark:group-hover:bg-teal-800/60">
                {f.icon}
              </div>
              <h2 className="text-base font-semibold text-slate-900 dark:text-white sm:text-lg">
                {f.title}
              </h2>
              <p className="text-xs font-medium text-teal-600 dark:text-teal-400 sm:text-sm">
                {f.subtitle}
              </p>
              <p className="mt-2 flex-1 text-xs text-slate-600 dark:text-slate-400 sm:mt-3 sm:text-sm">
                {f.description}
              </p>
              <span className="mt-3 inline-flex min-h-[44px] items-center text-sm font-medium text-teal-600 transition sm:min-h-0 sm:mt-4 group-hover:text-teal-700 dark:text-teal-400 dark:group-hover:text-teal-300">
                시작하기
                <svg
                  className="ml-1 h-4 w-4 transition group-hover:translate-x-1"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 5l7 7-7 7"
                  />
                </svg>
              </span>
            </Link>
          ))}
        </div>
      </section>

      {/* Footer note */}
      <footer className="border-t border-slate-200 px-4 py-6 sm:py-8 dark:border-slate-800">
        <p className="text-center text-xs text-slate-500 dark:text-slate-500">
          각 기능은 클라이언트(브라우저) 또는 API(서버) 모드로 전환 가능합니다.
        </p>
      </footer>
    </main>
  );
}
