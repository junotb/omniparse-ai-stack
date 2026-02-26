"""
Agent 서비스: LangChain 기반 Q&A.

OCR, Parser, Image 결과를 컨텍스트로 받아 사용자 질문에 답변.
"""

from typing import Any, Optional

from app.core.config import settings


class AgentService:
    """LangChain 기반 지능형 에이전트 서비스."""

    def __init__(self) -> None:
        self._llm: Any = None

    def _ensure_llm(self) -> Any:
        """LLM lazy 로딩. OpenAI 또는 로컬 모델 지원."""
        if self._llm is not None:
            return self._llm

        openai_key = getattr(settings, "openai_api_key", None)
        if openai_key:
            try:
                from langchain_openai import ChatOpenAI

                self._llm = ChatOpenAI(
                    model=getattr(settings, "openai_model", "gpt-4o-mini"),
                    api_key=openai_key,
                    temperature=0.3,
                )
                return self._llm
            except ImportError:
                pass

        # LangChain 미설정 시 규칙 기반 답변
        self._llm = None
        return None

    def query(
        self,
        question: str,
        context: Optional[dict[str, Any]] = None,
        options: Optional[dict[str, Any]] = None,
    ) -> dict[str, Any]:
        """
        컨텍스트 기반 질의 응답.

        Args:
            question: 사용자 질문
            context: OCR raw_text, Parser tables, Image insights 등
            options: temperature, max_tokens 등

        Returns:
            answer, sources, model
        """
        ctx = context or {}
        opts = options or {}

        llm = self._ensure_llm()

        if llm is not None:
            # LangChain을 사용한 실제 LLM 호출
            try:
                from langchain_core.messages import HumanMessage, SystemMessage

                context_str = self._format_context(ctx)
                system = (
                    "당신은 문서와 이미지 분석 결과를 기반으로 질문에 답하는 AI 어시스턴트입니다. "
                    "제공된 컨텍스트만을 참조하여 정확하게 답변하세요. "
                    "컨텍스트에 없으면 '제공된 정보에서 해당 내용을 찾을 수 없습니다.'라고 답하세요."
                )
                user_content = f"## 컨텍스트\n{context_str}\n\n## 질문\n{question}"

                messages = [
                    SystemMessage(content=system),
                    HumanMessage(content=user_content),
                ]
                response = llm.invoke(messages)
                answer = response.content if hasattr(response, "content") else str(response)

                return {
                    "answer": answer,
                    "sources": list(ctx.keys()) if ctx else [],
                    "model": getattr(llm, "model_name", None) or getattr(llm, "model", None),
                }
            except Exception as e:
                return {
                    "answer": f"[LLM 호출 오류] {str(e)}",
                    "sources": [],
                    "model": None,
                }

        # LLM 미설정: 규칙 기반 폴백
        return self._fallback_answer(question, ctx)

    def _format_context(self, ctx: dict[str, Any]) -> str:
        """컨텍스트를 LLM에 전달할 문자열로 변환."""
        parts = []
        for k, v in ctx.items():
            if v is None:
                continue
            if isinstance(v, str):
                parts.append(f"### {k}\n{v}")
            elif isinstance(v, (list, dict)):
                import json

                parts.append(f"### {k}\n{json.dumps(v, ensure_ascii=False, indent=2)}")
            else:
                parts.append(f"### {k}\n{v}")
        return "\n\n".join(parts) if parts else "(컨텍스트 없음)"

    def _fallback_answer(self, question: str, context: dict[str, Any]) -> dict[str, Any]:
        """LLM 없을 때 규칙 기반 간단 답변."""
        raw_text = context.get("raw_text") or context.get("text") or ""
        has_context = bool(raw_text or context.get("tables") or context.get("image_insights"))

        if not has_context:
            return {
                "answer": "제공된 컨텍스트가 없습니다. OCR, Parser, Image 분석 결과를 context로 전달해 주세요. "
                "또한 OpenAI API 키를 설정하면 LangChain으로 더 풍부한 답변이 가능합니다.",
                "sources": [],
                "model": None,
            }

        # 키워드 기반 간단 매칭
        q_lower = question.lower()
        if "몇" in question or "개수" in question or "수" in question:
            tables = context.get("tables", [])
            return {
                "answer": f"제공된 컨텍스트에서 테이블이 {len(tables)}개 발견되었습니다.",
                "sources": list(context.keys()),
                "model": None,
            }
        if "텍스트" in question or "내용" in question:
            preview = raw_text[:200] + "..." if len(raw_text) > 200 else raw_text
            return {
                "answer": f"추출된 텍스트 일부:\n{preview}",
                "sources": list(context.keys()),
                "model": None,
            }

        return {
            "answer": "컨텍스트는 수신되었으나, LangChain/LLM이 설정되지 않아 상세 분석이 어렵습니다. "
            "OPENAI_API_KEY를 설정해 주세요.",
            "sources": list(context.keys()),
            "model": None,
        }


def get_agent_service() -> AgentService:
    """Agent 서비스 팩토리."""
    return AgentService()
