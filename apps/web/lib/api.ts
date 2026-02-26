/**
 * Omniparse API 클라이언트
 * apps/api 백엔드와 연동
 */

const API_BASE =
  (typeof window !== "undefined"
    ? (process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000")
    : process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000"
  ).replace(/\/$/, "") + "/api/v1";

async function fetchApi<T>(
  path: string,
  options?: RequestInit & { body?: unknown }
): Promise<T> {
  const { body, ...rest } = options ?? {};
  const res = await fetch(`${API_BASE}${path}`, {
    ...rest,
    headers: {
      "Content-Type": "application/json",
      ...rest.headers,
    },
    ...(body !== undefined && body !== null
      ? { body: typeof body === "string" ? body : JSON.stringify(body) }
      : {}),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(
      Array.isArray(err.detail)
        ? err.detail.map((d: { msg?: string }) => d.msg ?? d).join(", ")
        : typeof err.detail === "string"
          ? err.detail
          : JSON.stringify(err.detail ?? err)
    );
  }
  return res.json();
}

/** OCR: 이미지 업로드 후 task_id 반환 */
export async function ocrUpload(file: File): Promise<{ task_id: string; status_url: string }> {
  const formData = new FormData();
  formData.append("file", file);
  const res = await fetch(`${API_BASE}/ocr/upload`, {
    method: "POST",
    body: formData,
    headers: {}, // FormData는 Content-Type 자동 설정
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(
      typeof err.detail === "string" ? err.detail : JSON.stringify(err.detail ?? err)
    );
  }
  return res.json();
}

/** OCR: 태스크 결과 조회 (202면 진행 중) */
export async function ocrTaskResult(taskId: string): Promise<
  | { raw_text: string; blocks: { text: string; bbox?: number[]; confidence?: number }[]; language?: string }
  | { detail: string; status: string }
> {
  const res = await fetch(`${API_BASE}/ocr/task/${taskId}/result`);
  return res.json();
}

/** Parser: 텍스트 구조화 */
export async function parserStruct(
  text: string,
  options?: Record<string, unknown>
): Promise<{ sections: { type: string; content: string; level?: number }[]; raw_length: number }> {
  return fetchApi("/parser/struct", { method: "POST", body: { text, options } });
}

/** Parser: 테이블 추출 */
export async function parserTable(
  text: string,
  delimiter?: string
): Promise<{ tables: string[][][]; table_count: number }> {
  return fetchApi("/parser/table", { method: "POST", body: { text, delimiter } });
}

/** Image: 이미지 동기 분석 */
export async function imageAnalyze(file: File): Promise<{
  task_id: string;
  results: { type: string; data: Record<string, unknown> }[];
  summary?: string;
}> {
  const formData = new FormData();
  formData.append("file", file);
  const res = await fetch(`${API_BASE}/image/analyze`, {
    method: "POST",
    body: formData,
    headers: {},
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(
      typeof err.detail === "string" ? err.detail : JSON.stringify(err.detail ?? err)
    );
  }
  return res.json();
}

/** Agent: 질의 */
export async function agentQuery(
  question: string,
  context?: Record<string, unknown>,
  options?: Record<string, unknown>
): Promise<{ answer: string; sources?: string[]; model?: string }> {
  return fetchApi("/agent/query", {
    method: "POST",
    body: { question, context: context ?? {}, options: options ?? {} },
  });
}

/** API 헬스체크 */
export async function healthCheck(): Promise<{ status: string; version?: string }> {
  return fetchApi("/health");
}
