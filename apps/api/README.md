# Omniparse AI API

FastAPI 기반 백엔드 서비스. 문서·이미지 분석과 AI 에이전트 기능을 제공합니다.

## 개요

| 기능 | 설명 |
|------|------|
| **OCR** | 이미지에서 텍스트 추출 (EasyOCR, 비동기 Celery) |
| **Parser** | 텍스트 구조화, 테이블 추출 |
| **Image** | 이미지 분석 (크기, 포맷, 인사이트) |
| **Agent** | LangChain 기반 Q&A (OCR/Parser/Image 결과 종합) |

## 기술 스택

- **Python 3.10+**
- **FastAPI** — REST API
- **Celery + Redis** — 비동기 태스크
- **Pydantic v2** — 스키마·설정
- **EasyOCR** — OCR
- **Pillow** — 이미지 처리
- **LangChain** — Agent (OpenAI 등 연동)

## 프로젝트 구조

```
apps/api/
├── app/
│   ├── api/v1/
│   │   ├── endpoints/   # 기능별 엔드포인트
│   │   │   ├── health.py
│   │   │   ├── ocr.py
│   │   │   ├── parser.py
│   │   │   ├── image.py
│   │   │   └── agent.py
│   │   └── deps.py     # 공통 의존성/유틸
│   ├── core/            # Config, Celery 앱
│   ├── schemas/         # Pydantic Request/Response
│   ├── services/        # 비즈니스 로직
│   │   ├── ocr_service.py
│   │   ├── parser_service.py
│   │   ├── image_service.py
│   │   └── agent_service.py
│   └── worker.py        # Celery 태스크 정의
├── main.py              # FastAPI 진입점
├── requirements.txt
└── .env.example
```

## 사전 요구사항

- Python 3.10+
- Redis (Celery broker + result backend)

## 설치

```bash
cd apps/api
python -m venv .venv
source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install -r requirements.txt
```

## 설정

```bash
cp .env.example .env
# .env 편집 (필요 시)
```

| 환경변수 | 설명 | 기본값 |
|----------|------|--------|
| `CELERY_BROKER_URL` | Redis broker URL | `redis://localhost:6379/0` |
| `CELERY_RESULT_BACKEND` | Celery 결과 저장소 | `redis://localhost:6379/0` |
| `UPLOAD_DIR` | 업로드 파일 임시 경로 | `/tmp/omniparse_uploads` |
| `OCR_LANGUAGES` | OCR 언어 (JSON 배열) | `["ko","en"]` |
| `OPENAI_API_KEY` | Agent용 OpenAI API 키 | — |
| `OPENAI_MODEL` | OpenAI 모델명 | `gpt-4o-mini` |

## 실행

### 1. Redis 실행 (Docker)

```bash
docker run -d -p 6379:6379 --name redis redis:7-alpine
```

### 2. FastAPI 서버

```bash
cd apps/api
source .venv/bin/activate
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

프로젝트 루트에서 실행 시:

```bash
uvicorn apps.api.main:app --reload --host 0.0.0.0 --port 8000
```

### 3. Celery 워커 (OCR, Parser, Image 비동기 처리)

```bash
cd apps/api
source .venv/bin/activate
celery -A app.core.celery_app:celery_app worker -l info
```

## API 문서

| URL | 설명 |
|-----|------|
| [Swagger UI](http://localhost:8000/docs) | 인터랙티브 API 문서 |
| [ReDoc](http://localhost:8000/redoc) | ReDoc 문서 |

## 엔드포인트 요약

### Health

| 메서드 | 경로 | 설명 |
|--------|------|------|
| GET | `/api/v1/health` | 헬스체크 |

### OCR

| 메서드 | 경로 | 설명 |
|--------|------|------|
| POST | `/api/v1/ocr/upload` | 이미지 업로드 → 비동기 OCR |
| GET | `/api/v1/ocr/task/{task_id}` | 태스크 상태·결과 |
| GET | `/api/v1/ocr/task/{task_id}/result` | 완료 시 OCR 결과만 반환 |

### Parser

| 메서드 | 경로 | 설명 |
|--------|------|------|
| POST | `/api/v1/parser/struct` | 텍스트 구조화 (동기) |
| POST | `/api/v1/parser/table` | 테이블 추출 (동기) |
| POST | `/api/v1/parser/struct/async` | 구조화 (비동기) |
| POST | `/api/v1/parser/table/async` | 테이블 추출 (비동기) |
| GET | `/api/v1/parser/task/{task_id}` | Parser 태스크 상태 |

### Image

| 메서드 | 경로 | 설명 |
|--------|------|------|
| POST | `/api/v1/image/upload` | 이미지 업로드 → 비동기 분석 |
| POST | `/api/v1/image/analyze` | 이미지 분석 (동기) |
| GET | `/api/v1/image/task/{task_id}` | 태스크 상태 |
| GET | `/api/v1/image/task/{task_id}/result` | 분석 결과 |

### Agent

| 메서드 | 경로 | 설명 |
|--------|------|------|
| POST | `/api/v1/agent/query` | 컨텍스트 기반 Q&A |

## 사용 예시

### OCR (비동기)

```bash
# 업로드
curl -X POST -F "file=@image.png" http://localhost:8000/api/v1/ocr/upload

# 결과 조회 (task_id로 폴링)
curl http://localhost:8000/api/v1/ocr/task/{task_id}
```

### Parser (동기)

```bash
curl -X POST http://localhost:8000/api/v1/parser/struct \
  -H "Content-Type: application/json" \
  -d '{"text": "# 제목\n\n본문 내용\n\n- 항목1\n- 항목2"}'
```

### Agent (Q&A)

```bash
curl -X POST http://localhost:8000/api/v1/agent/query \
  -H "Content-Type: application/json" \
  -d '{
    "question": "이 문서의 요약을 알려주세요",
    "context": {"raw_text": "OCR로 추출한 텍스트..."}
  }'
```

## 아키텍처

- **Layered**: Router → Service → (Worker)
- **비동기 작업**: OCR, Image 업로드, Parser async 등은 Celery로 처리
- **동기 작업**: Parser struct/table, Agent query는 즉시 응답

## 라이선스

프로젝트 정책에 따릅니다.
