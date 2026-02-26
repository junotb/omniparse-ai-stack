"""
Image 서비스 관련 Request/Response 스키마.
"""

from typing import Any, List, Optional

from pydantic import BaseModel, Field


class ImageAnalyzeResult(BaseModel):
    """이미지 분석 단일 결과 항목."""

    type: str = Field(..., description="분석 타입: dimensions | format | objects | insights")
    data: dict[str, Any] = Field(default_factory=dict, description="분석 데이터")


class ImageTaskResponse(BaseModel):
    """Image 비동기 태스크 응답."""

    task_id: str = Field(..., description="Celery 태스크 ID")
    message: str = Field(
        default="Image 분석이 비동기로 시작되었습니다.",
        description="안내 메시지",
    )
    status_url: str = Field(
        ...,
        description="결과 조회 URL",
    )


class ImageResultResponse(BaseModel):
    """Image 분석 완료 결과."""

    task_id: str = Field(..., description="태스크 ID")
    results: List[ImageAnalyzeResult] = Field(
        default_factory=list,
        description="분석 결과 목록",
    )
    summary: Optional[str] = Field(None, description="분석 요약 (Agent 통합 시)")
