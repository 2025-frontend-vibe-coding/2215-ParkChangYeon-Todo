# 📝 AI 기반 할 일 관리 서비스

AI를 활용한 스마트 할 일 관리 웹 애플리케이션입니다. 자연어로 할 일을 입력하면 AI가 자동으로 구조화하고, 할 일 목록을 분석하여 생산성 향상을 위한 인사이트를 제공합니다.

![Next.js](https://img.shields.io/badge/Next.js-16.1.0-black)
![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue)
![Supabase](https://img.shields.io/badge/Supabase-2.89.0-green)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4.0-38bdf8)

## ✨ 주요 기능

### 🔐 사용자 인증
- 이메일/비밀번호 기반 회원가입 및 로그인
- 비밀번호 찾기 및 재설정
- 세션 관리 및 자동 리다이렉트

### 📋 할 일 관리 (CRUD)
- 할 일 생성, 조회, 수정, 삭제
- 우선순위 설정 (높음/중간/낮음)
- 카테고리 분류 (업무/개인/건강/학습)
- 마감일 설정 및 완료 상태 관리

### 🔍 검색 및 필터링
- 제목/설명 키워드 검색
- 우선순위별 필터링
- 카테고리별 필터링
- 진행 상태별 필터링 (진행 중/완료/지연)

### 📊 정렬 기능
- 우선순위순 정렬
- 마감일순 정렬
- 생성일순 정렬

### 🤖 AI 할 일 생성
- 자연어 입력으로 할 일 자동 생성
- Google Gemini API를 활용한 지능형 파싱
- 날짜, 시간, 우선순위, 카테고리 자동 추출

**입력 예시:**
```
내일 오후 3시까지 중요한 팀 회의 준비하기
```

**자동 추출 결과:**
- 제목: "팀 회의 준비"
- 마감일: 내일 오후 3시
- 우선순위: 높음
- 카테고리: 업무

### 📈 AI 요약 및 분석
- **오늘의 요약**: 당일 할 일 완료율 및 긴급 작업 분석
- **이번 주 요약**: 주간 패턴 분석 및 생산성 인사이트
- 완료율 분석 (전체/우선순위별/카테고리별)
- 시간 관리 분석 (마감일 준수율, 연기 패턴)
- 생산성 패턴 도출 (가장 생산적인 요일/시간대)
- 실행 가능한 추천 사항 제공

## 🛠 기술 스택

### 프론트엔드
- **Next.js 16.1.0** (App Router)
- **React 19.2.3**
- **TypeScript 5.0**
- **Tailwind CSS 4.0**
- **shadcn/ui** - UI 컴포넌트 라이브러리
- **Lucide React** - 아이콘

### 백엔드 & 인프라
- **Supabase**
  - Authentication (이메일/비밀번호)
  - PostgreSQL 데이터베이스
  - Row Level Security (RLS)
  - 실시간 데이터 동기화

### AI
- **Google Gemini API** (gemini-2.5-flash)
- **AI SDK** - AI 모델 통합

### 기타
- **Zod** - 스키마 검증
- **date-fns** - 날짜 처리
- **React Hook Form** - 폼 관리

## 🚀 시작하기

### 필수 요구사항
- Node.js 18.x 이상
- npm 또는 yarn
- Supabase 계정
- Google Gemini API 키

### 설치

1. **저장소 클론**
```bash
git clone <repository-url>
cd todo
```

2. **의존성 설치**
```bash
npm install
```

3. **환경 변수 설정**

`.env.local` 파일을 생성하고 다음 변수를 설정하세요:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

# Google Gemini API
GOOGLE_GENERATIVE_AI_API_KEY=your_gemini_api_key
```

4. **Supabase 데이터베이스 설정**

Supabase 대시보드의 SQL Editor에서 `schema.sql` 파일의 내용을 실행하세요:

```bash
# Supabase 대시보드 → SQL Editor → schema.sql 내용 실행
```

또는 Supabase CLI를 사용하는 경우:

```bash
supabase db push
```

5. **Supabase 인증 설정**

Supabase 대시보드에서 다음을 설정하세요:

- **Authentication → URL Configuration**
  - Site URL: `http://localhost:3000`
  - Redirect URLs:
    - `http://localhost:3000/reset-password`
    - `http://localhost:3000/**`

6. **개발 서버 실행**

```bash
npm run dev
```

브라우저에서 [http://localhost:3000](http://localhost:3000)을 열어 확인하세요.

## 📁 프로젝트 구조

```
todo/
├── app/                      # Next.js App Router
│   ├── api/                  # API Routes
│   │   └── ai/              # AI 관련 API
│   │       ├── parse-todo/  # 자연어 → 할 일 변환
│   │       └── summarize-todos/ # 할 일 요약 및 분석
│   ├── forgot-password/     # 비밀번호 찾기 페이지
│   ├── login/               # 로그인 페이지
│   ├── reset-password/      # 비밀번호 재설정 페이지
│   ├── signup/              # 회원가입 페이지
│   └── page.tsx             # 메인 페이지 (할 일 관리)
├── components/
│   ├── todo/                # 할 일 관련 컴포넌트
│   │   ├── TodoCard.tsx     # 할 일 카드
│   │   ├── TodoForm.tsx     # 할 일 입력 폼
│   │   ├── TodoList.tsx     # 할 일 목록
│   │   └── types.ts         # 타입 정의
│   └── ui/                  # shadcn/ui 컴포넌트
├── hooks/
│   └── use-auth.ts          # 인증 상태 관리 훅
├── lib/
│   ├── supabase/            # Supabase 클라이언트
│   │   ├── client.ts        # 클라이언트 사이드
│   │   └── server.ts        # 서버 사이드
│   └── utils.ts             # 유틸리티 함수
├── docs/
│   └── PRD.md               # 제품 요구사항 정의서
├── schema.sql               # 데이터베이스 스키마
└── package.json
```

## 🔑 주요 기능 상세

### AI 할 일 생성

자연어로 입력한 문장을 AI가 분석하여 구조화된 할 일 데이터로 변환합니다.

**지원하는 날짜 표현:**
- 오늘, 내일, 모레
- 이번 주 [요일] (예: 이번 주 금요일)
- 다음 주 [요일] (예: 다음 주 월요일)

**지원하는 시간 표현:**
- 아침 (09:00), 점심 (12:00), 오후 (14:00), 저녁 (18:00), 밤 (21:00)
- 오전/오후 N시 (예: 오후 3시 → 15:00)

**우선순위 키워드:**
- 높음: "급하게", "중요한", "빨리", "꼭", "반드시"
- 중간: "보통", "적당히" (또는 키워드 없음)
- 낮음: "여유롭게", "천천히", "언젠가"

**카테고리 키워드:**
- 업무: "회의", "보고서", "프로젝트", "업무"
- 개인: "쇼핑", "친구", "가족", "개인"
- 건강: "운동", "병원", "건강", "요가"
- 학습: "공부", "책", "강의", "학습"

### AI 요약 및 분석

할 일 목록을 분석하여 다음과 같은 인사이트를 제공합니다:

1. **완료율 분석**
   - 일일 및 주간 완료율
   - 우선순위별 완료 패턴
   - 카테고리별 완료율

2. **시간 관리 분석**
   - 마감일 준수율
   - 연기된 할 일의 빈도 및 패턴
   - 시간대별 업무 집중도 분포

3. **생산성 패턴**
   - 가장 생산적인 요일과 시간대
   - 자주 미루는 작업 유형
   - 완료하기 쉬운 작업의 공통 특징

4. **실행 가능한 추천**
   - 구체적인 시간 관리 팁
   - 우선순위 조정 및 일정 재배치 제안
   - 업무 과부하를 줄이는 분산 전략

## 🧪 개발

### 스크립트

```bash
# 개발 서버 실행
npm run dev

# 프로덕션 빌드
npm run build

# 프로덕션 서버 실행
npm start

# 린트 검사
npm run lint
```

### 데이터베이스 마이그레이션

Supabase 대시보드의 SQL Editor에서 `schema.sql` 파일의 내용을 실행하거나, Supabase CLI를 사용하여 마이그레이션을 적용할 수 있습니다.

## 🔒 보안

- **Row Level Security (RLS)**: 사용자는 자신의 할 일만 조회/수정/삭제 가능
- **환경 변수**: 민감한 정보는 환경 변수로 관리
- **인증 토큰**: Supabase Auth를 통한 안전한 세션 관리

## 📝 라이선스

이 프로젝트는 개인 학습 및 포트폴리오 목적으로 제작되었습니다.

## 🤝 기여

이슈 리포트나 기능 제안은 언제든 환영합니다!

## 📧 문의

프로젝트에 대한 질문이나 제안사항이 있으시면 이슈를 등록해주세요.

---

**Made with ❤️ using Next.js, Supabase, and Google Gemini**
