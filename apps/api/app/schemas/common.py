"""
공통 Request/Response 스키마.
"""

from typing import Any, Optional

from pydantic import BaseModel, Field


class HealthResponse(BaseModel):
    """헬스체크 응답"""

    status: str = Field(..., description="서비스 상태: ok | degraded")
    version: str = Field(..., description="API 버전")
    message: Optional[str] = Field(None, description="추가 메시지")


class TaskStatusResponse(BaseModel):
    """비동기 태스크 상태 조회 응답"""

    task_id: str = Field(..., description="Celery 태스크 ID")
    status: str = Field(
        ...,
        description="태스크 상태: PENDING | STARTED | SUCCESS | FAILURE",
    )
    result: Optional[Any] = Field(None, description="완료 시 결과 데이터")
    error: Optional[str] = Field(None, description="실패 시 에러 메시지")
    progress: Optional[float] = Field(None, ge=0, le=1, description="진행률 (0~1)")


class TaskPendingResponse(BaseModel):
    """태스크 처리 중 응답 (202)"""

    detail: str = Field(..., description="상태 메시지")
    task_id: str = Field(..., description="태스크 ID")
    status: str = Field(..., description="현재 상태: PENDING | STARTED")
