"""
Business logic and AI model orchestration.

각 서비스는 독립적인 모듈로 구현되며, 확장 시 새 서비스 추가.
"""

from app.services.base import OCRServiceProtocol
from app.services.ocr_service import OCRService, get_ocr_service

__all__ = ["OCRService", "OCRServiceProtocol", "get_ocr_service"]
