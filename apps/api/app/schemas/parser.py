"""
Parser 서비스 관련 Request/Response 스키마.
"""

from typing import Any, List, Optional

from pydantic import BaseModel, Field


class ParserStructRequest(BaseModel):
    """텍스트 구조화 요청."""

    text: str = Field(..., min_length=1, description="구조화할 텍스트")
    options: Optional[dict[str, Any]] = Field(
        default_factory=dict,
        description="파싱 옵션 (섹션 구분 방식 등)",
    )


class StructuredSection(BaseModel):
    """구조화된 문서의 단일 섹션."""

    type: str = Field(..., description="섹션 타입: header | paragraph | list | block")
    content: str = Field(..., description="섹션 본문")
    level: Optional[int] = Field(None, ge=0, description="헤더 레벨 (1=H1, 2=H2, ...)")


class ParserStructResponse(BaseModel):
    """텍스트 구조화 결과."""

    sections: List[StructuredSection] = Field(
        default_factory=list,
        description="구조화된 섹션 목록",
    )
    raw_length: int = Field(..., description="원본 텍스트 길이")


class ParserTableRequest(BaseModel):
    """테이블 추출 요청."""

    text: str = Field(..., min_length=1, description="테이블이 포함된 텍스트")
    delimiter: Optional[str] = Field(
        default=None,
        description="컬럼 구분자 (None이면 자동 감지)",
    )


class ParserTableResponse(BaseModel):
    """테이블 추출 결과."""

    tables: List[List[List[str]]] = Field(
        default_factory=list,
        description="추출된 테이블 목록 (각 테이블은 2차원 문자열 배열)",
    )
    table_count: int = Field(0, description="추출된 테이블 개수")


class ParserTaskResponse(BaseModel):
    """Parser 비동기 태스크 응답."""

    task_id: str = Field(..., description="Celery 태스크 ID")
    message: str = Field(
        default="Parser 처리가 비동기로 시작되었습니다.",
        description="안내 메시지",
    )
    status_url: str = Field(
        ...,
        description="결과 조회 URL",
    )
