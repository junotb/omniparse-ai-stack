"""
Health 엔드포인트.
"""

from fastapi import APIRouter

from app import __version__
from app.schemas.common import HealthResponse

router = APIRouter()


@router.get(
    "/health",
    response_model=HealthResponse,
    summary="헬스체크",
    operation_id="health_check",
)
async def health_check() -> HealthResponse:
    """서비스 상태 확인. API 정상 동작 여부를 확인합니다."""
    return HealthResponse(
        status="ok",
        version=__version__,
        message=None,
    )
