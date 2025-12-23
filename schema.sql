-- ============================================
-- Supabase 데이터베이스 스키마
-- 할 일 관리 서비스
-- ============================================

-- ============================================
-- 1. public.users 테이블 생성
-- auth.users와 1:1 관계의 사용자 프로필 테이블
-- ============================================

CREATE TABLE IF NOT EXISTS public.users (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text,
  full_name text,
  avatar_url text,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL
);

-- ============================================
-- 2. public.todos 테이블 생성
-- 사용자별 할 일 관리 테이블
-- ============================================

CREATE TABLE IF NOT EXISTS public.todos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  created_date timestamp with time zone DEFAULT now() NOT NULL,
  due_date timestamp with time zone,
  priority text NOT NULL DEFAULT 'medium' CHECK (priority IN ('high', 'medium', 'low')),
  category text,
  completed boolean NOT NULL DEFAULT false,
  updated_at timestamp with time zone DEFAULT now() NOT NULL
);

-- ============================================
-- 3. 인덱스 생성 (성능 최적화)
-- ============================================

-- user_id 인덱스 (할 일 조회 시 자주 사용)
CREATE INDEX IF NOT EXISTS idx_todos_user_id ON public.todos(user_id);

-- completed 인덱스 (완료 상태 필터링)
CREATE INDEX IF NOT EXISTS idx_todos_completed ON public.todos(completed);

-- due_date 인덱스 (마감일 정렬 및 필터링)
CREATE INDEX IF NOT EXISTS idx_todos_due_date ON public.todos(due_date);

-- priority 인덱스 (우선순위 정렬)
CREATE INDEX IF NOT EXISTS idx_todos_priority ON public.todos(priority);

-- 복합 인덱스 (user_id + completed + due_date)
CREATE INDEX IF NOT EXISTS idx_todos_user_completed_due ON public.todos(user_id, completed, due_date);

-- ============================================
-- 4. updated_at 자동 업데이트 함수
-- ============================================

CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- todos 테이블의 updated_at 자동 업데이트 트리거
CREATE TRIGGER set_updated_at_todos
  BEFORE UPDATE ON public.todos
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- users 테이블의 updated_at 자동 업데이트 트리거
CREATE TRIGGER set_updated_at_users
  BEFORE UPDATE ON public.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- ============================================
-- 5. Row Level Security (RLS) 활성화
-- ============================================

-- users 테이블 RLS 활성화
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- todos 테이블 RLS 활성화
ALTER TABLE public.todos ENABLE ROW LEVEL SECURITY;

-- ============================================
-- 6. users 테이블 RLS 정책
-- ============================================

-- 사용자는 자신의 프로필만 조회 가능
CREATE POLICY "Users can view own profile"
  ON public.users
  FOR SELECT
  USING (auth.uid() = id);

-- 사용자는 자신의 프로필만 수정 가능
CREATE POLICY "Users can update own profile"
  ON public.users
  FOR UPDATE
  USING (auth.uid() = id);

-- 사용자는 자신의 프로필만 삽입 가능
CREATE POLICY "Users can insert own profile"
  ON public.users
  FOR INSERT
  WITH CHECK (auth.uid() = id);

-- ============================================
-- 7. todos 테이블 RLS 정책
-- ============================================

-- 사용자는 자신의 할 일만 조회 가능
CREATE POLICY "Users can view own todos"
  ON public.todos
  FOR SELECT
  USING (auth.uid() = user_id);

-- 사용자는 자신의 할 일만 생성 가능
CREATE POLICY "Users can create own todos"
  ON public.todos
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- 사용자는 자신의 할 일만 수정 가능
CREATE POLICY "Users can update own todos"
  ON public.todos
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 사용자는 자신의 할 일만 삭제 가능
CREATE POLICY "Users can delete own todos"
  ON public.todos
  FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================
-- 8. 사용자 프로필 자동 생성 함수
-- 새 사용자 가입 시 자동으로 프로필 생성
-- ============================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1))
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- auth.users에 새 사용자 생성 시 트리거
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- ============================================
-- 완료
-- ============================================

