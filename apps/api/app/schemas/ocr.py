"""
OCR 서비스 관련 Request/Response 스키마.
"""

from typing import List, Optional

from pydantic import BaseModel, Field


class OCRTextBlock(BaseModel):
    """
    OCR로 추출된 단일 텍스트 블록.
    bbox: [x1, y1, x2, y2] 또는 좌표 리스트
    """

    text: str = Field(..., description="추출된 텍스트")
    bbox: Optional[List[float]] = Field(None, description="바운딩 박스 좌표")
    confidence: Optional[float] = Field(None, ge=0, le=1, description="신뢰도")


class OCRTaskResponse(BaseModel):
    """
    OCR 업로드 후 반환되는 태스크 정보.
    클라이언트는 task_id로 결과 폴링.
    """

    task_id: str = Field(..., description="Celery 태스크 ID")
    message: str = Field(
        default="OCR 처리가 비동기로 시작되었습니다. task_id로 결과를 조회하세요.",
        description="안내 메시지",
    )
    status_url: str = Field(
        ...,
        description="결과 조회 URL (예: /api/v1/ocr/task/{task_id})",
    )


class OCRResultResponse(BaseModel):
    """
    OCR 완료 결과.
    """

    task_id: str = Field(..., description="태스크 ID")
    raw_text: str = Field(..., description="전체 추출 텍스트 (개행 결합)")
    blocks: List[OCRTextBlock] = Field(default_factory=list, description="블록별 상세 결과")
    language: Optional[str] = Field(None, description="감지된 언어")
