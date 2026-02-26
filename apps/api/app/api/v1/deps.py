"""
API v1 공통 의존성 및 유틸리티.

엔드포인트 간 공유되는 헬퍼 함수.
"""

from pathlib import Path

from app.core.config import settings


def ensure_upload_dir() -> Path:
    """업로드 디렉토리 생성 및 반환."""
    path = Path(settings.upload_dir)
    path.mkdir(parents=True, exist_ok=True)
    return path
