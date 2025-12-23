# PRD – AI 기반 할 일 관리 서비스

## 1. 개요

본 문서는 **AI 기반 할 일 관리(To-do) 웹 서비스**의 제품 요구사항 정의서(PRD)이다. 사용자는 기본적인 할 일 관리 기능과 함께, 자연어 기반 AI 할 일 생성 및 요약/분석 기능을 통해 보다 효율적인 일정 관리를 할 수 있다.

- 대상 사용자: 개인 일정 및 업무를 관리하고 싶은 일반 사용자
- 핵심 가치:
  - 간단하고 직관적인 할 일 관리
  - AI를 활용한 입력 자동화 및 생산성 향상
  - 웹 기반으로 언제 어디서나 접근 가능

---

## 2. 주요 기능 요구사항

### 2.1 사용자 인증 (Auth)

- Supabase Auth를 이용한 이메일/비밀번호 기반 로그인 및 회원가입
- 기능 상세
  - 이메일/비밀번호 회원가입
  - 이메일/비밀번호 로그인
  - 로그아웃
  - 세션 유지(새로고침 후에도 로그인 상태 유지)
- 비기능 요구사항
  - 인증 실패 시 명확한 에러 메시지 제공
  - 인증 정보는 클라이언트에 직접 저장하지 않음

#### 수용 기준(AC)

- 올바른 이메일/비번으로 가입/로그인 가능
- 잘못된 비번 시 에러 메시지 노출
- 로그인 후 보호된 라우트 접근 가능 / 비로그인 시 로그인으로 리다이렉트

---

### 2.2 할 일 관리 (CRUD)

사용자는 본인의 할 일을 생성, 조회, 수정, 삭제할 수 있다.

#### 필드 정의

| 필드명       | 타입      | 설명                        |
| ------------ | --------- | --------------------------- |
| id           | uuid      | 할 일 고유 ID               |
| user_id      | uuid      | 사용자 ID (users 테이블 FK) |
| title        | string    | 할 일 제목                  |
| description  | text      | 할 일 상세 설명             |
| created_date | timestamp | 생성일                      |
| due_date     | timestamp | 마감일                      |
| priority     | enum      | high / medium / low         |
| category     | string    | 업무 / 개인 / 학습 등       |
| completed    | boolean   | 완료 여부                   |
| updated_at   | timestamp | 수정일                      |

#### 기능 상세

- 생성(Create)
  - 수동 입력 폼으로 생성
  - 기본값 자동 입력(우선순위=medium, completed=false)
- 조회(Read)
  - 목록 조회(페이지 진입 시 기본)
  - 상세 보기(모달 또는 별도 페이지)
- 수정(Update)
  - 필드 편집
  - 완료 체크/해제(토글)
- 삭제(Delete)
  - 단건 삭제
  - (선택) 다중 선택 삭제 — v1.1 후보

#### 수용 기준(AC)

- 사용자는 본인의 todo만 조회/수정/삭제 가능(RLS로 강제)
- 생성 직후 목록에 반영(Optimistic UI 또는 revalidate)
- 수정 후 즉시 반영
- 삭제 전 확인(Confirm) UX 제공

---

### 2.3 검색 / 필터 / 정렬

#### 검색

- 제목(title), 설명(description) 기준 키워드 검색

#### 필터

- 우선순위: 높음 / 중간 / 낮음
- 카테고리: 업무 / 개인 / 학습 등(다중 선택 가능)
- 진행 상태:
  - 진행 중 (completed = false, due_date >= today)
  - 완료 (completed = true)
  - 지연 (completed = false, due_date < today)

#### 정렬

- 우선순위순 (high → medium → low)
- 마감일순 (due_date ASC, nulls last)
- 생성일순 (created_date DESC 기본)

---

### 2.4 AI 할 일 생성 기능

사용자가 자연어로 입력한 문장을 AI가 분석해 구조화된 할 일 데이터로 변환한다.

- 사용 기술: Google Gemini API
- 동작 방식:
  1. 사용자가 자연어 문장 입력
  2. AI가 날짜, 시간, 목적을 추출
  3. 할 일 생성 폼에 자동 반영

#### 입력 예시

```
내일 오전 10시에 팀 회의 준비
```

#### 출력 예시

```json
{
  "title": "팀 회의 준비",
  "description": "내일 오전 10시에 있을 팀 회의를 위해 자료 작성하기",
  "created_date": "YYYY-MM-DD HH:MM",
  "due_date": "YYYY-MM-DD 10:00",
  "priority": "high",
  "category": "업무",
  "completed": false
}
```

---

### 2.5 AI 요약 및 분석 기능

버튼 클릭 한 번으로 전체 할 일을 분석하고 요약 결과 제공

#### 일일 요약

- 오늘 완료한 할 일 목록
- 아직 남아 있는 할 일 개수
- 지연된 할 일 알림

#### 주간 요약

- 이번 주 전체 할 일 수
- 완료율(%)
- 카테고리별 비중 분석

---

## 3. 화면 구성

### 3.1 로그인 / 회원가입 화면

- 이메일, 비밀번호 입력 폼
- 로그인 / 회원가입 전환
- 인증 오류 메시지 표시

### 3.2 할 일 관리 메인 화면

- 할 일 목록
- 할 일 추가 버튼
- 검색 입력창
- 필터 / 정렬 옵션
- AI 할 일 생성 입력 영역
- AI 요약 및 분석 버튼

### 3.3 (확장) 통계 및 분석 화면

- 주간 활동량 차트
- 완료율 그래프
- 카테고리별 할 일 분포 시각화

---

## 4. 기술 스택

### 프론트엔드

- Next.js (App Router)
- Tailwind CSS
- shadcn/ui
- TypeScript

### 백엔드 / 인프라

- Supabase
  - Auth
  - PostgreSQL
  - Row Level Security(RLS)

### AI

- Google Gemini API (AI SDK 연동)

---

## 5. 데이터베이스 구조 (Supabase)

### users

- Supabase Auth 기본 테이블 사용
- 추가 프로필 정보 확장 가능

### todos

```sql
CREATE TABLE todos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) on delete casecade,
  title text NOT NULL,
  description text,
  created_date timestamp DEFAULT now(),
  due_date timestamp,
  priority text CHECK (priority IN ('high', 'medium', 'low')),
  category text,
  completed boolean DEFAULT false,
  updated_at timestamp DEFAULT now()
);
```

### 보안 정책

- RLS 적용
- 사용자 본인의 할 일만 조회/수정/삭제 가능

---

## 6. 향후 확장 아이디어

- 캘린더 연동
- 알림(이메일/푸시)
- 팀 단위 할 일 공유
- 모바일 앱 확장

## 7. 향후 확장 계획

- 캘린더 뷰
- 알림(푸시 / 이메일)
- 팀 단위 할 일 공유
- AI 일정 추천
