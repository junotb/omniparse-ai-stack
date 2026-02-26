"""
Pydantic schemas for Request/Response DTOs.

API 계약을 명확히 하고, 자동 문서화 및 검증에 활용.
"""

from app.schemas.common import HealthResponse, TaskStatusResponse, TaskPendingResponse
from app.schemas.ocr import OCRTaskResponse, OCRResultResponse

__all__ = [
    "HealthResponse",
    "TaskStatusResponse",
    "TaskPendingResponse",
    "OCRTaskResponse",
    "OCRResultResponse",
]
