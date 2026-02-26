# Omniparse AI Stack

AI/ML 모델의 대표적인 사용 사례를 실제로 구현한 **문서·이미지 파싱 풀스택 프로젝트**입니다. 비정형 입력(이미지, 텍스트)을 받아 구조화된 정보로 추출하는 파이프라인을 브라우저와 서버 양쪽에서 실행할 수 있습니다.

---

## AI/ML 사용 사례 개요

이 프로젝트는 문서 이해 및 정보 추출 도메인에서 널리 쓰이는 네 가지 대표 사례를 포함합니다.

| 사용 사례 | 대표 분야 | 설명 |
|----------|-----------|------|
| **OCR** | 컴퓨터 비전 + 시퀀스 모델링 | 이미지에서 텍스트를 인식·추출 |
| **Image** | 멀티모달 AI (VLM) | 이미지에 대해 질의·답변, 메타데이터 분석 |
| **Parser** | 문서 AI / 객체 탐지 | 문서 레이아웃 분석, 구조화, 테이블 추출 |
| **Agent** | LLM 기반 지시 수행 | 텍스트에 대한 지시 이행, 구조화 출력 |

---

## 각 사용 사례 상세

### OCR — 텍스트 인식

**대표 분야**: 컴퓨터 비전, 시퀀스 모델링

이미지에서 문자를 인식해 디지털 텍스트로 추출합니다. 스캔 문서, 사진, 스크린샷 등 비정형 시각 자료에서 텍스트를 읽어낼 때 사용하는 전형적인 AI/ML 응용입니다.

- **클라이언트**: Prompt API(Gemini Nano), Tesseract.js
- **서버**: EasyOCR, Celery 비동기 처리

---

### Image — 이미지 이해

**대표 분야**: 멀티모달 AI (Vision-Language Model)

이미지와 자연어를 함께 이해하는 VLM을 사용합니다. 이미지에 대해 질문하면 답변을 생성하거나, 이미지 메타데이터를 분석합니다.

- **클라이언트**: Moondream2 (WebGPU/WASM)
- **서버**: 이미지 분석 API (크기, 포맷, 인사이트)

---

### Parser — 문서 구조 분석

**대표 분야**: 문서 AI, 객체 탐지

문서 이미지를 레이아웃 블록(제목, 본문, 테이블, 그림 등)으로 나누거나, 텍스트를 섹션·테이블 형태로 구조화합니다. 비정형 문서에서 의미 단위를 뽑아내는 전형적인 문서 AI 사용 사례입니다.

- **클라이언트**: YOLOv10 DocLayNet (문서 레이아웃 분석)
- **서버**: 텍스트 구조화, 테이블 추출 API

---

### Agent — 지시 수행

**대표 분야**: LLM 기반 자연어 처리

사용자 지시에 따라 텍스트를 변환·정규화합니다. 예를 들어 "날짜만 추출해 JSON 배열로 만들어" 같은 지시를 처리합니다. 대화형 AI와 구조화 출력의 대표적 사용 사례입니다.

- **클라이언트**: Chrome Prompt API (Gemini Nano)
- **서버**: LangChain, OpenAI 등 LLM API

---

## 프로젝트 구조

```
omniparse-ai-stack/
├── apps/
│   ├── web/        # Next.js 프론트엔드 (각 기능 UI + 클라이언트 AI)
│   └── api/        # FastAPI 백엔드 (서버 AI, Celery)
└── README.md
```

---

## 빠른 시작

### 프론트엔드 (웹 앱)

```bash
cd apps/web
npm install
npm run dev
```

→ [http://localhost:3000](http://localhost:3000)

### 백엔드 (API, 선택)

```bash
# Redis 실행 (OCR 비동기 등)
docker run -d -p 6379:6379 redis:7-alpine

# API 서버
cd apps/api
python -m venv .venv
source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env       # 필요 시 편집
uvicorn main:app --reload --host 0.0.0.0 --port 8000

# Celery 워커 (OCR 등 비동기 작업)
celery -A app.core.celery_app:celery_app worker -l info
```

---

## 공통 특징

- **클라이언트 vs API 이원화**: 브라우저 내 실행 또는 서버 실행 선택 가능
- **동일한 UI 패턴**: status, elapsedMs, error 처리, 초기화 버튼 등 일관된 UX
- **통합 API**: `apps/api` 하나로 OCR, Image, Parser, Agent 모두 제공

---

## 기술 스택 요약

| 구분 | 기술 |
|------|------|
| 프론트엔드 | Next.js 16, React 19, TypeScript, Tailwind CSS 4 |
| 클라이언트 AI | Tesseract.js, @huggingface/transformers, Prompt API |
| 백엔드 | FastAPI, Celery, Redis |
| 서버 AI | EasyOCR, LangChain, OpenAI, Pillow |

---

## 상세 문서

- [apps/web/README.md](apps/web/README.md) — 웹 앱 가이드
- [apps/api/README.md](apps/api/README.md) — API 가이드

---

**Omniparse AI Stack** — AI/ML 사용 사례로서의 문서 파싱 풀스택 데모
