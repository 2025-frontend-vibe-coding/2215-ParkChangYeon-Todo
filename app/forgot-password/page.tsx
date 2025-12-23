'use client';

// 동적 렌더링 강제 (빌드 타임 정적 생성 방지)
export const dynamic = 'force-dynamic';

import * as React from 'react';
import Link from 'next/link';
import { CheckSquare, Sparkles, ArrowLeft } from 'lucide-react';
import { useRouter } from 'next/navigation';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/hooks/use-auth';

export default function ForgotPasswordPage() {
  const router = useRouter();
  const supabase = React.useMemo(() => createClient(), []);
  const { user, loading: authLoading } = useAuth();
  const [email, setEmail] = React.useState('');
  const [error, setError] = React.useState<string | null>(null);
  const [success, setSuccess] = React.useState<string | null>(null);
  const [isLoading, setIsLoading] = React.useState(false);

  // URL 파라미터에서 오류 메시지 확인
  React.useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    const urlError = searchParams.get('error');
    if (urlError) {
      setError(decodeURIComponent(urlError));
      // URL에서 오류 파라미터 제거
      router.replace('/forgot-password');
    }
  }, [router]);

  const isValidEmail = (value: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    // 이메일 형식 검사
    if (!email.trim()) {
      setError('이메일을 입력해주세요.');
      return;
    }

    if (!isValidEmail(email)) {
      setError('올바른 이메일 주소를 입력해주세요.');
      return;
    }

    setIsLoading(true);

    try {
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (resetError) {
        throw resetError;
      }

      // 성공 메시지 표시
      setSuccess('비밀번호 재설정 링크가 이메일로 전송되었습니다. 이메일을 확인해주세요.');
      setEmail('');
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : '비밀번호 재설정 요청에 실패했습니다.';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  // 인증 로딩 중이면 아무것도 표시하지 않음
  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-muted-foreground">로딩 중...</div>
      </div>
    );
  }

  // 이미 로그인된 경우 메인 페이지로 리다이렉트
  if (user) {
    return null;
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-md space-y-8">
        {/* 로고 및 소개 */}
        <div className="text-center space-y-4">
          <div className="flex justify-center">
            <div className="flex items-center justify-center size-16 rounded-2xl bg-primary/10">
              <CheckSquare className="size-8 text-primary" />
            </div>
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">비밀번호 찾기</h1>
            <p className="mt-2 text-muted-foreground flex items-center justify-center gap-2">
              <Sparkles className="size-4" />
              비밀번호 재설정 링크를 이메일로 받으세요
            </p>
          </div>
        </div>

        {/* 비밀번호 찾기 폼 */}
        <Card>
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl">비밀번호 재설정</CardTitle>
            <CardDescription>
              등록된 이메일 주소를 입력하시면 비밀번호 재설정 링크를 보내드립니다
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              {success && (
                <Alert>
                  <AlertDescription>{success}</AlertDescription>
                </Alert>
              )}

              <div className="space-y-2">
                <Label htmlFor="email">이메일</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="example@email.com"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                  disabled={isLoading || !!success}
                  autoComplete="email"
                />
              </div>

              <Button type="submit" className="w-full" disabled={isLoading || !email || !!success}>
                {isLoading ? '전송 중...' : success ? '전송 완료' : '재설정 링크 보내기'}
              </Button>
            </form>

            <div className="mt-6 text-center text-sm space-y-2">
              <div>
                <Link
                  href="/login"
                  className="inline-flex items-center gap-1 text-primary hover:underline"
                >
                  <ArrowLeft className="size-4" />
                  로그인 페이지로 돌아가기
                </Link>
              </div>
              <div>
                <span className="text-muted-foreground">계정이 없으신가요? </span>
                <Link href="/signup" className="font-medium text-primary hover:underline">
                  회원가입
                </Link>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 추가 정보 */}
        <p className="text-center text-xs text-muted-foreground">
          이메일을 받지 못하셨나요? 스팸 폴더를 확인하거나 잠시 후 다시 시도해주세요.
        </p>
      </div>
    </div>
  );
}
