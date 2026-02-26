"""
Celery application configuration.

FastAPI와 워커 프로세스 양쪽에서 사용.
- API: 태스크 enqueue (apply_async)
- Worker: 태스크 실행 (worker.run)
"""

from celery import Celery

from app.core.config import settings


def create_celery_app() -> Celery:
    """
    Celery 앱 팩토리.
    
    broker: Redis (태스크 큐)
    backend: Redis (태스크 결과 저장)
    """
    app = Celery(
        "omniparse_worker",
        broker=settings.celery_broker_url,
        backend=settings.celery_result_backend,
        include=["app.worker"],  # 태스크 모듈
    )
    app.conf.update(
        task_serializer="json",
        accept_content=["json"],
        result_serializer="json",
        timezone="Asia/Seoul",
        enable_utc=True,
        # 태스크 결과 만료 (24시간)
        result_expires=86400,
        # 워커 prefetch: 동시 처리 수 제한 (무거운 OCR 고려)
        worker_prefetch_multiplier=1,
        # 태스크 타임아웃 (OCR은 수 분 소요 가능)
        task_soft_time_limit=600,
        task_time_limit=900,
    )
    return app


# 전역 Celery 인스턴스
celery_app = create_celery_app()
