import { AgentClient } from "./AgentClient";

export const metadata = {
  title: "Agent | omniparse-ai-stack",
  description: "Self-Planning Agent — Chrome Built-in AI(Gemini Nano)로 자연어 지시 실행",
};

export default function AgentPage() {
  return (
    <main className="mx-auto max-w-2xl px-4 py-10">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Agent (Self-Planning)</h1>
        <p className="mt-1 text-slate-600 dark:text-slate-400">
          추출된 텍스트에 대해 &quot;날짜만 뽑아서 JSON으로 만들어&quot; 같은 자연어 지시를 브라우저 내장 Gemini Nano로 0.5초 내 실행합니다.
        </p>
      </div>

      <AgentClient />
    </main>
  );
}
