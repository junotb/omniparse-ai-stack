"""
Parser 엔드포인트.
"""

from celery.result import AsyncResult
from fastapi import APIRouter

from app.core.config import settings
from app.core.celery_app import celery_app
from app.schemas.common import TaskStatusResponse
from app.schemas.parser import (
    ParserStructRequest,
    ParserStructResponse,
    ParserTableRequest,
    ParserTableResponse,
    ParserTaskResponse,
)
from app.worker import run_parser_struct, run_parser_table
from app.services.parser_service import get_parser_service

router = APIRouter()


@router.post(
    "/struct",
    response_model=ParserStructResponse,
    summary="텍스트 구조화 (동기)",
    operation_id="parser_struct",
)
async def parser_struct(req: ParserStructRequest) -> ParserStructResponse:
    """텍스트를 헤더/문단/리스트 등으로 구조화."""
    svc = get_parser_service()
    return svc.struct(req.text, req.options)


@router.post(
    "/table",
    response_model=ParserTableResponse,
    summary="테이블 추출 (동기)",
    operation_id="parser_table",
)
async def parser_table(req: ParserTableRequest) -> ParserTableResponse:
    """텍스트에서 테이블 데이터 추출."""
    svc = get_parser_service()
    return svc.extract_tables(req.text, req.delimiter)


@router.post(
    "/struct/async",
    response_model=ParserTaskResponse,
    summary="텍스트 구조화 (비동기)",
    operation_id="parser_struct_async",
)
async def parser_struct_async(req: ParserStructRequest) -> ParserTaskResponse:
    """비동기로 텍스트 구조화 (긴 문서용)."""
    task = run_parser_struct.delay(req.text, req.options)
    return ParserTaskResponse(
        task_id=task.id,
        message="Parser 구조화가 비동기로 시작되었습니다.",
        status_url=f"{settings.api_v1_prefix}/parser/task/{task.id}",
    )


@router.post(
    "/table/async",
    response_model=ParserTaskResponse,
    summary="테이블 추출 (비동기)",
    operation_id="parser_table_async",
)
async def parser_table_async(req: ParserTableRequest) -> ParserTaskResponse:
    """비동기로 테이블 추출."""
    task = run_parser_table.delay(req.text, req.delimiter)
    return ParserTaskResponse(
        task_id=task.id,
        message="Parser 테이블 추출이 비동기로 시작되었습니다.",
        status_url=f"{settings.api_v1_prefix}/parser/task/{task.id}",
    )


@router.get(
    "/task/{task_id}",
    response_model=TaskStatusResponse,
    summary="Parser 태스크 상태 조회",
    operation_id="get_parser_task_status",
)
async def get_parser_task_status(task_id: str) -> TaskStatusResponse:
    """Parser 비동기 태스크 상태 조회."""
    result = AsyncResult(task_id, app=celery_app)
    return TaskStatusResponse(
        task_id=task_id,
        status=result.status,
        result=result.result if result.status == "SUCCESS" else None,
        error=str(result.info) if result.status == "FAILURE" and result.info else None,
        progress=None,
    )
