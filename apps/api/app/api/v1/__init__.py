"""
API v1 라우터 집계.
"""

from fastapi import APIRouter

from app.api.v1.endpoints import (
    health_router,
    ocr_router,
    parser_router,
    image_router,
    agent_router,
)

api_router = APIRouter()

# 라우터 등록
api_router.include_router(health_router, prefix="", tags=["health"])
api_router.include_router(ocr_router, prefix="/ocr", tags=["ocr"])
api_router.include_router(parser_router, prefix="/parser", tags=["parser"])
api_router.include_router(image_router, prefix="/image", tags=["image"])
api_router.include_router(agent_router, prefix="/agent", tags=["agent"])
