"""
Agent 서비스 관련 Request/Response 스키마.
"""

from typing import Any, Optional

from pydantic import BaseModel, Field


class AgentQueryRequest(BaseModel):
    """Agent 질의 요청."""

    question: str = Field(..., min_length=1, description="사용자 질문")
    context: Optional[dict[str, Any]] = Field(
        default_factory=dict,
        description="OCR/Parser/Image 결과 등 컨텍스트 (raw_text, tables, image_insights 등)",
    )
    options: Optional[dict[str, Any]] = Field(
        default_factory=dict,
        description="추가 옵션 (temperature, max_tokens 등)",
    )


class AgentQueryResponse(BaseModel):
    """Agent 질의 응답."""

    answer: str = Field(..., description="답변 내용")
    sources: Optional[list[str]] = Field(
        default_factory=list,
        description="참조한 소스 (컨텍스트 키 등)",
    )
    model: Optional[str] = Field(None, description="사용된 LLM 모델명")
