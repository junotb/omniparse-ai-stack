"""
Omniparse AI Stack - Backend API Application

Layered Architecture:
- api/v1: 라우터 (엔드포인트)
- services: 핵심 비즈니스 로직 및 AI 모델
- schemas: Pydantic Request/Response DTO
- core: 설정, Celery, 공통 유틸리티
"""

__version__ = "0.1.0"
