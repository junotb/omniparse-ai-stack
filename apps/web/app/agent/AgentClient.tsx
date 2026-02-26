"use client";

import { useCallback, useEffect, useState } from "react";

type AgentStatus = "idle" | "checking" | "processing" | "done" | "error";

const DEFAULT_INSTRUCTION = "날짜만 뽑아서 JSON 배열로 만들어";
const DEFAULT_INPUT = `2024년 3월 15일에 회의가 예정되어 있습니다.
다음 주 수요일(3/20)까지 제출해 주세요.
작성일: 2024-03-10`;

export function AgentClient() {
  const [instruction, setInstruction] = useState(DEFAULT_INSTRUCTION);
  const [inputText, setInputText] = useState(DEFAULT_INPUT);
  const [result, setResult] = useState<string>("");
  const [promptApiAvailable, setPromptApiAvailable] = useState<boolean | null>(null);
  const [status, setStatus] = useState<AgentStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const [elapsedMs, setElapsedMs] = useState<number | null>(null);

  const checkPromptApi = useCallback(async (): Promise<boolean> => {
    if (typeof window === "undefined") return false;
    const LM = (window as Window & { LanguageModel?: { availability?: (opts?: object) => Promise<string> } }).LanguageModel;
    if (!LM?.availability) return false;
    const availability = await LM.availability({
      expectedInputs: [{ type: "text", languages: ["en"] }],
      expectedOutputs: [{ type: "text", languages: ["en"] }],
    });
    return availability === "available" || availability === "downloadable" || availability === "downloading";
  }, []);

  useEffect(() => {
    checkPromptApi().then(setPromptApiAvailable);
  }, [checkPromptApi]);

  const execute = useCallback(async () => {
    if (!inputText.trim()) return;
    if (!promptApiAvailable) {
      setError("Chrome Prompt API(Gemini Nano)를 사용할 수 없습니다. Chrome 138+에서 #prompt-api-for-gemini-nano-multimodal-input 플래그를 활성화해 주세요.");
      return;
    }

    setError(null);
    setResult("");
    setStatus("processing");
    const start = performance.now();

    try {
      const LM = (window as Window & {
        LanguageModel: {
          create: (opts?: object) => Promise<{
            prompt: (input: unknown) => Promise<string>;
            destroy: () => void;
          }>;
        };
      }).LanguageModel;

      const session = await LM.create({
        expectedInputs: [{ type: "text", languages: ["en"] }],
        expectedOutputs: [{ type: "text", languages: ["en"] }],
        initialPrompts: [
          {
            role: "system",
            content:
              "You are a task execution agent. Follow the user's instruction precisely on the provided text. Output only the result—no preamble, no explanation. If the instruction asks for JSON, output valid JSON only.",
          },
        ],
      });

      const response = await session.prompt([
        {
          role: "user",
          content: [
            {
              type: "text",
              value: `Instruction: ${instruction}\n\nText to process:\n${inputText}`,
            },
          ],
        },
      ]);

      session.destroy();
      setResult(response.trim() || "(결과 없음)");
      setStatus("done");
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setStatus("error");
    } finally {
      setElapsedMs(Math.round(performance.now() - start));
    }
  }, [instruction, inputText, promptApiAvailable]);

  const reset = useCallback(() => {
    setResult("");
    setStatus("idle");
    setError(null);
    setElapsedMs(null);
  }, []);

  return (
    <div className="space-y-6">
      {/* Engine info */}
      <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm dark:border-slate-700 dark:bg-slate-800/50">
        <p className="font-medium text-slate-700 dark:text-slate-300">Self-Planning Agent (Gemini Nano)</p>
        <p className="mt-1 text-slate-600 dark:text-slate-400">
          브라우저 내장 AI로 자연어 지시를 실행합니다. 모델 다운로드 없이 0.5초 내 응답이 가능합니다.
        </p>
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-500">
          Chrome 138+ 및 <code className="rounded bg-slate-200 px-1 dark:bg-slate-700">#prompt-api-for-gemini-nano-multimodal-input</code> 플래그 필요.
          {promptApiAvailable === false && (
            <span className="ml-1 font-medium text-amber-600 dark:text-amber-400">(현재 사용 불가)</span>
          )}
          {promptApiAvailable === true && (
            <span className="ml-1 text-teal-600 dark:text-teal-400">(사용 가능)</span>
          )}
        </p>
      </div>

      {/* Instruction */}
      <div>
        <label htmlFor="agent-instruction" className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
          지시 (Instruction)
        </label>
        <input
          id="agent-instruction"
          type="text"
          value={instruction}
          onChange={(e) => setInstruction(e.target.value)}
          placeholder="예: 날짜만 뽑아서 JSON으로 만들어"
          className="w-full rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-slate-800 transition focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:focus:border-teal-400"
        />
      </div>

      {/* Input text */}
      <div>
        <label htmlFor="agent-input" className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
          입력 텍스트
        </label>
        <textarea
          id="agent-input"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder="처리할 텍스트를 입력하세요..."
          rows={8}
          className="w-full resize-y rounded-lg border border-slate-300 bg-white px-4 py-2.5 font-mono text-sm text-slate-800 transition focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:focus:border-teal-400"
        />
      </div>

      {/* Actions */}
      <div className="flex gap-3">
        <button
          onClick={execute}
          disabled={!inputText.trim() || status === "processing" || promptApiAvailable === false}
          className="rounded-lg bg-teal-600 px-5 py-2.5 font-medium text-white transition hover:bg-teal-500 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {status === "processing" ? "실행 중…" : "실행"}
        </button>
        {(result || error) && (
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
              결과
              {elapsedMs != null && (
                <span className="ml-2 text-slate-400 dark:text-slate-500">({elapsedMs}ms)</span>
              )}
            </span>
          </div>
          {error ? (
            <p className="text-red-600 dark:text-red-400">{error}</p>
          ) : (
            <pre className="max-h-96 overflow-auto whitespace-pre-wrap rounded-lg bg-slate-50 p-4 font-mono text-sm text-slate-800 dark:bg-slate-900 dark:text-slate-200">
              {result}
            </pre>
          )}
        </div>
      )}
    </div>
  );
}
