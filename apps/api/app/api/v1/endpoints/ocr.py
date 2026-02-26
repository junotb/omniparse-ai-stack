"""
OCR 엔드포인트.
"""

import uuid
from pathlib import Path

from fastapi import APIRouter, HTTPException, UploadFile, File
from fastapi.responses import JSONResponse

from app.core.config import settings
from app.schemas.common import TaskStatusResponse
from app.schemas.ocr import OCRTaskResponse, OCRResultResponse, OCRTextBlock
from app.worker import run_ocr_extract
from app.api.v1.deps import ensure_upload_dir
from celery.result import AsyncResult
from app.core.celery_app import celery_app

router = APIRouter()


@router.post(
    "/upload",
    response_model=OCRTaskResponse,
    summary="이미지 OCR 업로드",
    operation_id="upload_image_for_ocr",
    responses={
        400: {"description": "잘못된 요청 (이미지 아님)"},
        500: {"description": "내부 서버 오류"},
    },
)
async def upload_image_for_ocr(
    file: UploadFile = File(..., description="OCR할 이미지 파일 (PNG, JPG, etc.)"),
) -> OCRTaskResponse:
    """
    이미지 업로드 후 OCR 비동기 처리 시작.

    1. 파일을 임시 경로에 저장
    2. Celery 태스크 enqueue
    3. task_id 반환 (클라이언트는 이 ID로 결과 폴링)
    """
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

    task = run_ocr_extract.delay(str(save_path))

    return OCRTaskResponse(
        task_id=task.id,
        message="OCR 처리가 비동기로 시작되었습니다. task_id로 결과를 조회하세요.",
        status_url=f"{settings.api_v1_prefix}/ocr/task/{task.id}",
    )


@router.get(
    "/task/{task_id}",
    response_model=TaskStatusResponse,
    summary="OCR 태스크 상태 조회",
    operation_id="get_ocr_task_status",
    responses={
        404: {"description": "태스크를 찾을 수 없음"},
    },
)
async def get_ocr_task_status(task_id: str) -> TaskStatusResponse:
    """
    OCR 태스크 상태 및 결과 조회.

    - PENDING: 대기 중
    - STARTED: 처리 중
    - SUCCESS: 완료 (result에 OCR 결과 포함)
    - FAILURE: 실패 (error에 메시지)
    """
    result = AsyncResult(task_id, app=celery_app)

    response = TaskStatusResponse(
        task_id=task_id,
        status=result.status,
        result=None,
        error=None,
        progress=None,
    )

    if result.status == "SUCCESS":
        response.result = result.result
    elif result.status == "FAILURE":
        response.error = str(result.info) if result.info else "Unknown error"

    return response


@router.get(
    "/task/{task_id}/result",
    response_model=OCRResultResponse,
    summary="OCR 태스크 결과 조회",
    operation_id="get_ocr_task_result",
    responses={
        202: {"description": "아직 처리 중 (폴링 계속)"},
        404: {"description": "태스크를 찾을 수 없음"},
        500: {"description": "처리 실패"},
    },
)
async def get_ocr_task_result(task_id: str) -> OCRResultResponse | JSONResponse:
    """
    OCR 태스크 완료 결과만 조회 (성공 시에만 200).

    진행 중이면 202 Accepted 반환.
    """
    result = AsyncResult(task_id, app=celery_app)

    if result.status == "PENDING" or result.status == "STARTED":
        return JSONResponse(
            status_code=202,
            content={
                "detail": "처리 중입니다.",
                "task_id": task_id,
                "status": result.status,
            },
        )
    if result.status == "FAILURE":
        raise HTTPException(
            status_code=500,
            detail=str(result.info) if result.info else "OCR 처리 실패",
        )

    data = result.result
    blocks = [
        OCRTextBlock(
            text=b.get("text", ""),
            bbox=b.get("bbox"),
            confidence=b.get("confidence"),
        )
        for b in data.get("blocks", [])
    ]

    return OCRResultResponse(
        task_id=task_id,
        raw_text=data.get("raw_text", ""),
        blocks=blocks,
        language=data.get("language"),
    )
