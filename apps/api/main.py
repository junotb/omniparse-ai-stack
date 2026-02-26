"""
Omniparse AI Stack - FastAPI 진입점.

실행 (apps/api에서):
    uvicorn main:app --reload

또는 프로젝트 루트에서:
    uvicorn apps.api.main:app --reload
"""

from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app import __version__
from app.api.v1 import api_router
from app.core.config import settings


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    애플리케이션 생명주기 관리.

    - startup: AI 모델 preload (Parser, Image, Agent 등) 가능
    - OCR 모델은 Celery 워커에서 로드하므로 여기서는 제외
    """
    # Startup
    Path(settings.upload_dir).mkdir(parents=True, exist_ok=True)
    yield
    # Shutdown (정리 작업)
    pass


app = FastAPI(
    title=settings.app_name,
    version=__version__,
    description="""
    Omniparse AI Stack API
    
    - **OCR**: 이미지 → 텍스트 추출 (비동기)
    - **Parser**: 텍스트/문서 구조화, 테이블 분석
    - **Image**: 객체 탐지, 이미지 인사이트
    - **Agent**: LangChain 기반 종합 Q&A
    """,
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
)

# API v1 라우터 등록
prefix = settings.api_v1_prefix.rstrip("/") or "/api/v1"
app.include_router(api_router, prefix=prefix)

# CORS (프론트엔드 연동 시)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # 프로덕션에서는 특정 origin으로 제한
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health", tags=["health"], summary="헬스체크 (직접)")
async def health_direct():
    """라우터 bypass 테스트."""
    return {"status": "ok", "version": __version__, "message": "direct"}


@app.get("/api/v1/health", tags=["health"], summary="헬스체크 (v1)")
async def health_v1():
    """API v1 헬스체크."""
    return {"status": "ok", "version": __version__, "message": None}


@app.get("/", tags=["root"], summary="루트")
async def root():
    """서비스 정보 및 문서 링크를 반환합니다."""
    return {
        "service": settings.app_name,
        "version": __version__,
        "docs": "/docs",
        "health": f"{prefix}/health",
    }


@app.get("/debug/routes", include_in_schema=False)
async def debug_routes():
    """등록된 라우트 목록 (디버깅용)."""
    routes = []
    for r in app.routes:
        if hasattr(r, "path") and hasattr(r, "methods"):
            routes.append({"path": r.path, "methods": list(r.methods)})
    return {"routes": routes}
