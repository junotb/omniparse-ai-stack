"""
API v1 엔드포인트 모듈.

기능별로 분리된 라우터를 export.
"""

from app.api.v1.endpoints.health import router as health_router
from app.api.v1.endpoints.ocr import router as ocr_router
from app.api.v1.endpoints.parser import router as parser_router
from app.api.v1.endpoints.image import router as image_router
from app.api.v1.endpoints.agent import router as agent_router

__all__ = [
    "health_router",
    "ocr_router",
    "parser_router",
    "image_router",
    "agent_router",
]
