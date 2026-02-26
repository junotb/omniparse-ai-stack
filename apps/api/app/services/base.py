"""
추상 베이스 클래스 및 인터페이스 정의.

확장성을 위해 Protocol 기반 설계.
새 AI 모듈 추가 시 해당 Protocol 구현.
"""

from abc import ABC, abstractmethod
from pathlib import Path
from typing import Any, Protocol, runtime_checkable


@runtime_checkable
class OCRServiceProtocol(Protocol):
    """
    OCR 서비스 프로토콜.
    
    여러 엔진(EasyOCR, PaddleOCR 등) 구현체가 이 계약을 따르도록 함.
    """

    def extract(self, image_path: str | Path, **kwargs: Any) -> dict[str, Any]:
        """
        이미지에서 텍스트 추출.
        
        Returns:
            {
                "raw_text": str,
                "blocks": [{"text": str, "bbox": [...], "confidence": float}],
                "language": str | None
            }
        """
        ...
