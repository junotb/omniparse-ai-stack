"""
Celery 워커 태스크 정의.

무거운 OCR, Parser, Image 처리 등은 여기서 비동기 실행.
API는 task_id만 반환하고, 클라이언트가 결과를 폴링.
"""

from pathlib import Path

from app.core.celery_app import celery_app
from app.core.config import settings
from app.services.ocr_service import get_ocr_service


@celery_app.task(bind=True, name="ocr.extract")
def run_ocr_extract(self, image_path: str) -> dict:
    """
    OCR 추출 Celery 태스크.

    Args:
        image_path: 업로드된 이미지의 절대 경로 (또는 공유 스토리지 경로)

    Returns:
        {
            "raw_text": str,
            "blocks": [{"text", "bbox", "confidence"}, ...],
            "language": str | None
        }

    Raises:
        예외 발생 시 Celery가 FAILURE 상태로 기록, result에 traceback 저장
    """
    path = Path(image_path)
    if not path.exists():
        raise FileNotFoundError(f"이미지를 찾을 수 없습니다: {path}")

    ocr_service = get_ocr_service()
    result = ocr_service.extract(path)
    return result


@celery_app.task(name="ocr.health")
def ocr_health_check() -> dict:
    """
    OCR 워커 헬스체크.
    모델 로딩 여부 확인용.
    """
    try:
        ocr = get_ocr_service()
        ocr._ensure_engine()
        return {"status": "ok", "engine": settings.ocr_engine}
    except Exception as e:
        return {"status": "error", "message": str(e)}


# --- Parser ---

@celery_app.task(bind=True, name="parser.struct")
def run_parser_struct(self, text: str, options: dict | None = None) -> dict:
    """
    텍스트 구조화 Celery 태스크.

    Returns:
        ParserStructResponse compatible dict
    """
    from app.services.parser_service import get_parser_service

    svc = get_parser_service()
    result = svc.struct(text, options)
    return result.model_dump()


@celery_app.task(bind=True, name="parser.table")
def run_parser_table(self, text: str, delimiter: str | None = None) -> dict:
    """
    테이블 추출 Celery 태스크.

    Returns:
        ParserTableResponse compatible dict
    """
    from app.services.parser_service import get_parser_service

    svc = get_parser_service()
    result = svc.extract_tables(text, delimiter)
    return result.model_dump()


# --- Image ---

@celery_app.task(bind=True, name="image.analyze")
def run_image_analyze(self, image_path: str) -> dict:
    """
    이미지 분석 Celery 태스크.

    Returns:
        { "results": [{ "type", "data" }, ...] }
    """
    from app.services.image_service import get_image_service

    svc = get_image_service()
    return svc.analyze(image_path)
