"""
OCR 서비스 구현: EasyOCR 기반 텍스트 추출.

- 싱글톤 패턴으로 모델 한 번만 로드 (메모리 절약)
- 확장: PaddleOCR 등 추가 엔진은 별도 클래스로 구현 후 팩토리에서 선택
"""

from pathlib import Path
from typing import Any, Optional

from app.core.config import settings


class OCRService:
    """
    EasyOCR 기반 OCR 서비스.
    
    Celery 워커 프로세스 내에서 인스턴스화되며,
    worker가 시작될 때 모델이 로드됨 (worker 초기화 시점).
    """

    _instance: Optional["OCRService"] = None
    _engine: Any = None  # EasyOCR Reader

    def __new__(cls) -> "OCRService":
        """싱글톤: 워커당 하나의 인스턴스만 유지."""
        if cls._instance is None:
            cls._instance = super().__new__(cls)
        return cls._instance

    def _ensure_engine(self) -> None:
        """
        OCR 엔진 lazy 로딩.
        첫 extract 호출 시 또는 워커 초기화 시 로드.
        """
        if self._engine is not None:
            return
        try:
            import easyocr
            self._engine = easyocr.Reader(
                lang_list=settings.ocr_languages,
                gpu=False,  # GPU 사용 시 환경변수로 제어 가능
                verbose=False,
            )
        except ImportError as e:
            raise RuntimeError(
                "EasyOCR가 설치되지 않았습니다. pip install easyocr"
            ) from e

    def extract(
        self,
        image_path: str | Path,
        *,
        detail: int = 1,
        **kwargs: Any,
    ) -> dict[str, Any]:
        """
        이미지에서 텍스트 추출.

        Args:
            image_path: 이미지 파일 경로 (로컬 경로)
            detail: 1=bbox+텍스트, 0=텍스트만
            **kwargs: EasyOCR readtext에 전달할 추가 인자

        Returns:
            raw_text: 전체 텍스트 (개행으로 결합)
            blocks: [{"text", "bbox", "confidence"}, ...]
            language: 감지된 언어 (EasyOCR은 블록별로 반환하므로 첫 블록 기준)

        Raises:
            FileNotFoundError: 이미지 파일 없음
            RuntimeError: OCR 엔진 초기화 실패
        """
        path = Path(image_path)
        if not path.exists():
            raise FileNotFoundError(f"이미지를 찾을 수 없습니다: {path}")

        self._ensure_engine()

        # readtext: [(bbox, text, confidence), ...]
        result = self._engine.readtext(str(path), detail=detail, **kwargs)

        blocks: list[dict[str, Any]] = []
        texts: list[str] = []

        for item in result:
            if detail == 1:
                bbox, text, confidence = item
                blocks.append({
                    "text": text,
                    "bbox": [float(c) for c in bbox],
                    "confidence": float(confidence),
                })
            else:
                text = item
                blocks.append({"text": text, "bbox": None, "confidence": None})
            texts.append(text)

        raw_text = "\n".join(texts) if texts else ""

        return {
            "raw_text": raw_text,
            "blocks": blocks,
            "language": settings.ocr_languages[0] if settings.ocr_languages else None,
        }


# 전역 서비스 인스턴스 (워커 내에서 사용)
def get_ocr_service() -> OCRService:
    """OCR 서비스 팩토리. 워커/테스트에서 일관된 인스턴스 반환."""
    return OCRService()
