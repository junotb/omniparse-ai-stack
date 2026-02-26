"""
Application configuration using Pydantic Settings.

환경 변수 및 .env 파일에서 설정 로드.
확장 시 새로운 설정 항목은 이 모듈에 추가.
"""

from functools import lru_cache
from typing import Optional

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """
    애플리케이션 전역 설정.
    
    - env_file: .env 파일 우선 로드
    - case_sensitive: 환경변수 대소문자 구분 안 함
    """
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",  # 정의되지 않은 환경변수 무시
    )

    # Application
    app_name: str = Field(default="Omniparse AI API", description="애플리케이션 이름")
    debug: bool = Field(default=False, description="디버그 모드")
    api_v1_prefix: str = Field(default="/api/v1", description="API v1 경로 접두사")

    # Celery (Redis를 broker + result backend로 사용)
    celery_broker_url: str = Field(
        default="redis://localhost:6379/0",
        description="Celery 메시지 브로커 URL (Redis)",
    )
    celery_result_backend: str = Field(
        default="redis://localhost:6379/0",
        description="Celery 결과 저장소 (Redis)",
    )

    # Redis
    redis_url: str = Field(default="redis://localhost:6379/0", description="Redis 연결 URL")

    # PostgreSQL (향후 확장용)
    database_url: Optional[str] = Field(default=None, description="PostgreSQL 연결 URL")

    # OCR / AI Models
    ocr_engine: str = Field(default="easyocr", description="OCR 엔진: easyocr | paddleocr")
    ocr_languages: list[str] = Field(
        default=["ko", "en"],
        description="OCR 지원 언어 (EasyOCR: ko, en, ja, ...)",
    )
    # 업로드 파일 저장 경로 (Celery 워커와 API가 공유 가능한 경로)
    upload_dir: str = Field(default="/tmp/omniparse_uploads", description="업로드 파일 임시 저장 경로")

    # Agent (LangChain / OpenAI)
    openai_api_key: Optional[str] = Field(default=None, description="OpenAI API 키 (Agent 사용 시)")
    openai_model: str = Field(default="gpt-4o-mini", description="OpenAI 모델명")


@lru_cache
def get_settings() -> Settings:
    """
    설정 싱글톤. lru_cache로 인스턴스 재사용.
    테스트 시 cache_clear() 호출하여 격리 가능.
    """
    return Settings()


# 전역 설정 인스턴스 (import 편의성)
settings = get_settings()
