"""
Image 엔드포인트.
"""

import uuid
from pathlib import Path

from fastapi import APIRouter, HTTPException, UploadFile, File
from fastapi.responses import JSONResponse
from celery.result import AsyncResult

from app.core.config import settings
from app.core.celery_app import celery_app
from app.schemas.common import TaskStatusResponse
from app.schemas.image import ImageTaskResponse, ImageResultResponse, ImageAnalyzeResult
from app.worker import run_image_analyze
from app.api.v1.deps import ensure_upload_dir
from app.services.image_service import get_image_service

router = APIRouter()


@router.post(
    "/upload",
    response_model=ImageTaskResponse,
    summary="이미지 분석 업로드",
    operation_id="upload_image_for_analyze",
    responses={400: {"description": "잘못된 요청 (이미지 아님)"}},
)
async def upload_image_for_analyze(
    file: UploadFile = File(..., description="분석할 이미지 파일"),
) -> ImageTaskResponse:
    """이미지 업로드 후 분석 비동기 처리."""
    allowed = {"image/png", "image/jpeg", "image/jpg", "image/webp", "image/bmp"}
    if file.content_type not in allowed:
        raise HTTPException(
            status_code=400,
            detail=f"지원하지 않는 파일 형식입니다. 허용: {', '.join(allowed)}",
        )

    upload_dir = ensure_upload_dir()
    suffix = Path(file.filename or "image").suffix or ".png"
    safe_name = f"{uuid.uuid4().hex}{suffix}"
    save_path = upload_dir / safe_name

    try:
        content = await file.read()
        if not content:
            raise HTTPException(status_code=400, detail="빈 파일입니다.")
        save_path.write_bytes(content)
    except OSError as e:
        raise HTTPException(status_code=500, detail=f"파일 저장 실패: {e}") from e

    task = run_image_analyze.delay(str(save_path))
    return ImageTaskResponse(
        task_id=task.id,
        message="Image 분석이 비동기로 시작되었습니다.",
        status_url=f"{settings.api_v1_prefix}/image/task/{task.id}",
    )


@router.post(
    "/analyze",
    response_model=ImageResultResponse,
    summary="이미지 분석 (동기)",
    operation_id="image_analyze",
)
async def image_analyze_sync(
    file: UploadFile = File(..., description="분석할 이미지 파일"),
) -> ImageResultResponse:
    """동기로 이미지 분석 (작은 이미지용)."""
    allowed = {"image/png", "image/jpeg", "image/jpg", "image/webp", "image/bmp"}
    if file.content_type not in allowed:
        raise HTTPException(status_code=400, detail="지원하지 않는 파일 형식입니다.")

    upload_dir = ensure_upload_dir()
    suffix = Path(file.filename or "image").suffix or ".png"
    save_path = upload_dir / f"{uuid.uuid4().hex}{suffix}"
    content = await file.read()
    if not content:
        raise HTTPException(status_code=400, detail="빈 파일입니다.")
    save_path.write_bytes(content)

    try:
        svc = get_image_service()
        result = svc.analyze(save_path)
        blocks = [ImageAnalyzeResult(**r) for r in result["results"]]
        return ImageResultResponse(
            task_id="sync",
            results=blocks,
            summary=None,
        )
    finally:
        save_path.unlink(missing_ok=True)


@router.get(
    "/task/{task_id}",
    response_model=TaskStatusResponse,
    summary="Image 태스크 상태 조회",
    operation_id="get_image_task_status",
)
async def get_image_task_status(task_id: str) -> TaskStatusResponse:
    """Image 비동기 태스크 상태 조회."""
    result = AsyncResult(task_id, app=celery_app)
    return TaskStatusResponse(
        task_id=task_id,
        status=result.status,
        result=result.result if result.status == "SUCCESS" else None,
        error=str(result.info) if result.status == "FAILURE" and result.info else None,
        progress=None,
    )


@router.get(
    "/task/{task_id}/result",
    response_model=ImageResultResponse,
    summary="Image 태스크 결과 조회",
    operation_id="get_image_task_result",
    responses={202: {"description": "처리 중"}},
)
async def get_image_task_result(task_id: str) -> ImageResultResponse | JSONResponse:
    """Image 태스크 완료 결과만 조회."""
    result = AsyncResult(task_id, app=celery_app)

    if result.status in ("PENDING", "STARTED"):
        return JSONResponse(
            status_code=202,
            content={"detail": "처리 중입니다.", "task_id": task_id, "status": result.status},
        )
    if result.status == "FAILURE":
        raise HTTPException(
            status_code=500,
            detail=str(result.info) if result.info else "Image 분석 실패",
        )

    data = result.result
    blocks = [ImageAnalyzeResult(**r) for r in (data.get("results") or [])]
    return ImageResultResponse(
        task_id=task_id,
        results=blocks,
        summary=None,
    )
