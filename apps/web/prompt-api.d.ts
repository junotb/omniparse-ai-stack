/**
 * Type declarations for Chrome Prompt API (WPT / Language Model API)
 * @see https://developer.chrome.com/docs/ai/prompt-api
 * @see https://github.com/webmachinelearning/prompt-api
 */

type LanguageModelAvailability = "available" | "downloading" | "downloadable" | "unavailable";

interface LanguageModelCreateOptions {
  initialPrompts?: Array<{ role: string; content: string | object[] }>;
  expectedInputs?: Array<{ type: "text" | "image" | "audio"; languages?: string[] }>;
  expectedOutputs?: Array<{ type: "text"; languages?: string[] }>;
  signal?: AbortSignal;
  monitor?: (model: unknown) => void;
}

interface LanguageModelSession {
  prompt(
    input: string | Array<{ role: string; content: string | Array<{ type: string; value: string | Blob | ImageData }> }>,
    options?: { signal?: AbortSignal; responseConstraint?: object }
  ): Promise<string>;
  promptStreaming(input: string, options?: { signal?: AbortSignal }): ReadableStream<string>;
  append(
    messages: Array<{
      role: string;
      content: string | Array<{ type: string; value: string | Blob | ImageData }>;
    }>
  ): Promise<void>;
  destroy(): void;
  contextUsage: number;
  contextWindow: number;
}

interface LanguageModelStatic {
  availability(options?: {
    expectedInputs?: Array<{ type: string; languages?: string[] }>;
    expectedOutputs?: Array<{ type: string; languages?: string[] }>;
  }): Promise<LanguageModelAvailability>;
  create(options?: LanguageModelCreateOptions): Promise<LanguageModelSession>;
}

declare const LanguageModel: LanguageModelStatic | undefined;
