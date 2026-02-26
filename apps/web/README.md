# Omniparse AI Stack - Web

AI 기반 문서·이미지 파싱을 위한 Next.js 프론트엔드 애플리케이션입니다. OCR, Parser, Image 비전 분석, Agent를 한 곳에서 활용할 수 있으며, 브라우저 내장 AI와 서버 API를 함께 사용합니다.

## 기술 스택

| 구분 | 기술 |
|------|------|
| Framework | [Next.js](https://nextjs.org) 16 (App Router) |
| Language | [TypeScript](https://www.typescriptlang.org) |
| Styling | [Tailwind CSS](https://tailwindcss.com) 4 |
| UI | React 19 |
| AI/ML (클라이언트) | Tesseract.js, @huggingface/transformers |

## 프로젝트 구조

```
apps/web/
├── app/                    # App Router 페이지 및 레이아웃
│   ├── agent/              # Agent (Self-Planning) 페이지
│   ├── image/              # Image 비전 분석 페이지
│   ├── ocr/                # OCR 텍스트 인식 페이지
│   ├── parser/             # Parser 레이아웃 분석 페이지
│   ├── components/        # 공통 컴포넌트 (Nav 등)
│   ├── layout.tsx          # 루트 레이아웃
│   ├── page.tsx            # 홈페이지
│   └── globals.css         # 글로벌 스타일 (Tailwind)
├── lib/
│   └── api.ts              # Omniparse API 클라이언트
├── next.config.ts
├── postcss.config.mjs      # Tailwind CSS (PostCSS)
├── tsconfig.json
└── package.json
```

## 시작하기

### 사전 요구사항

- Node.js 20+
- (선택) Omniparse API 서버 실행 시 백엔드 연동 가능 (`apps/api`)

### 설치 및 실행

```bash
# 의존성 설치
npm install

# 개발 서버 실행 (http://localhost:3000)
npm run dev
```

브라우저에서 [http://localhost:3000](http://localhost:3000)을 열어 확인할 수 있습니다.

### 환경 변수

| 변수 | 설명 | 기본값 |
|------|------|--------|
| `NEXT_PUBLIC_API_BASE_URL` | Omniparse API 서버 URL | `http://localhost:8000` |

`.env.local`에 설정:

```bash
NEXT_PUBLIC_API_BASE_URL=http://localhost:8000
```

## 스크립트

| 명령어 | 설명 |
|--------|------|
| `npm run dev` | 개발 서버 실행 (Hot Reload) |
| `npm run build` | 프로덕션 빌드 |
| `npm run start` | 프로덕션 서버 실행 |
| `npm run lint` | ESLint 실행 |

## 주요 기능

| 라우트 | 기능 | 설명 |
|--------|------|------|
| `/` | 홈 | 기능 카드 네비게이션 |
| `/ocr` | OCR | 이미지에서 텍스트 추출 (Gemini Nano / Tesseract.js / EasyOCR API) |
| `/parser` | Parser | 문서 레이아웃 분석, 텍스트 구조화, 테이블 추출 |
| `/image` | Image | 이미지 비전 분석 (Moondream2 VLM / API) |
| `/agent` | Agent | 자연어 지시 실행 (Gemini Nano / LangChain·OpenAI API) |

각 기능은 클라이언트(브라우저) 또는 서버 API 모드로 전환 가능합니다.

## API 연동

`lib/api.ts`에서 `apps/api` 백엔드와 통신합니다.

- **OCR**: `/api/v1/ocr/upload`, `/api/v1/ocr/task/:id/result`
- **Parser**: `/api/v1/parser/struct`, `/api/v1/parser/table`
- **Image**: `/api/v1/image/analyze`
- **Agent**: `/api/v1/agent/query`
- **Health**: `/api/v1/health`

백엔드를 사용하려면 `apps/api` 서버를 먼저 실행하세요.

## 개발 가이드

### Tailwind CSS

- Tailwind CSS 4 + `@tailwindcss/postcss` 사용
- `app/globals.css`에 `@import "tailwindcss"` 적용
- 유틸리티 클래스로 스타일링

### 경로 별칭

- `@/*` → 프로젝트 루트 기준 (`tsconfig.json` paths)

### 빌드 참고

- `@huggingface/transformers` 등 대용량 패키지는 `next.config.ts`의 `transpilePackages`에 포함됩니다.

---

**Omniparse AI Stack** · Next.js · TypeScript · Tailwind CSS
