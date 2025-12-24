'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { CheckSquare, Sparkles, ArrowLeft } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { createClient } from '@/lib/supabase/client';

export default function ResetPasswordPage() {
  const router = useRouter();
  const supabase = React.useMemo(() => createClient(), []);
  const [password, setPassword] = React.useState('');
  const [confirmPassword, setConfirmPassword] = React.useState('');
  const [error, setError] = React.useState<string | null>(null);
  const [success, setSuccess] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(false);

  React.useEffect(() => {
    const initializeRecovery = async () => {
      // URL에 hash가 있는지 확인 (Supabase에서 리다이렉트할 때 제공)
      const hashParams = new URLSearchParams(window.location.hash.substring(1));
      const accessToken = hashParams.get('access_token');
      const type = hashParams.get('type');
      const error = hashParams.get('error');
      const errorDescription = hashParams.get('error_description');

      // 오류가 있는 경우
      if (error) {
        const errorMessage = errorDescription 
          ? decodeURIComponent(errorDescription.replace(/\+/g, ' '))
          : '링크가 유효하지 않거나 만료되었습니다.';
        setError(errorMessage);
        return;
      }

      if (accessToken && type === 'recovery') {
        try {
          // 세션 업데이트
          const { error: sessionError } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: hashParams.get('refresh_token') || '',
          });

          if (sessionError) {
            setError('세션 설정에 실패했습니다. 다시 시도해주세요.');
          }
          
          // 해시 제거 (깔끔한 URL 유지)
          window.history.replaceState(null, '', '/reset-password');
        } catch (err) {
          setError('비밀번호 재설정 링크를 처리하는 중 오류가 발생했습니다.');
        }
      } else {
        // 토큰이 없는 경우 - 이미 세션이 있는지 확인
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          setError('유효한 재설정 링크가 필요합니다. 비밀번호 찾기 페이지에서 다시 요청해주세요.');
        }
      }
    };

    initializeRecovery();
  }, [supabase.auth]);

  const validatePassword = (pwd: string) => {
    if (pwd.length < 6) {
      return '비밀번호는 최소 6자 이상이어야 합니다.';
    }
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // 비밀번호 유효성 검사
    const passwordError = validatePassword(password);
    if (passwordError) {
      setError(passwordError);
      return;
    }

    // 비밀번호 확인
    if (password !== confirmPassword) {
      setError('비밀번호가 일치하지 않습니다.');
      return;
    }

    setIsLoading(true);

    try {
      const { error: updateError } = await supabase.auth.updateUser({
        password: password,
      });

      if (updateError) {
        throw updateError;
      }

      setSuccess(true);
      // 성공 후 로그인 페이지로 이동
      setTimeout(() => {
        router.push('/login');
      }, 2000);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '비밀번호 재설정에 실패했습니다.';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  if (success) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-4">
        <div className="w-full max-w-md space-y-8">
          <Card>
            <CardHeader className="space-y-1">
              <CardTitle className="text-2xl text-center">비밀번호 재설정 완료</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Alert>
                <AlertDescription>
                  비밀번호가 성공적으로 변경되었습니다. 로그인 페이지로 이동합니다...
                </AlertDescription>
              </Alert>
              <Link href="/login">
                <Button className="w-full">로그인 페이지로 이동</Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    );
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
            <h1 className="text-3xl font-bold tracking-tight">새 비밀번호 설정</h1>
            <p className="mt-2 text-muted-foreground flex items-center justify-center gap-2">
              <Sparkles className="size-4" />
              새로운 비밀번호를 입력해주세요
            </p>
          </div>
        </div>

        {/* 비밀번호 재설정 폼 */}
        <Card>
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl">비밀번호 재설정</CardTitle>
            <CardDescription>새로운 비밀번호를 입력해주세요</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <div className="space-y-2">
                <Label htmlFor="password">새 비밀번호</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="최소 6자 이상"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  disabled={isLoading}
                  autoComplete="new-password"
                />
                <p className="text-xs text-muted-foreground">
                  비밀번호는 최소 6자 이상이어야 합니다.
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">비밀번호 확인</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  placeholder="비밀번호를 다시 입력하세요"
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  required
                  disabled={isLoading}
                  autoComplete="new-password"
                />
                {confirmPassword && password !== confirmPassword && (
                  <p className="text-xs text-destructive">비밀번호가 일치하지 않습니다.</p>
                )}
              </div>

              <Button
                type="submit"
                className="w-full"
                disabled={
                  isLoading ||
                  !password ||
                  !confirmPassword ||
                  password !== confirmPassword ||
                  password.length < 6
                }
              >
                {isLoading ? '재설정 중...' : '비밀번호 재설정'}
              </Button>
            </form>

            <div className="mt-6 text-center text-sm">
              <Link
                href="/login"
                className="inline-flex items-center gap-1 text-primary hover:underline"
              >
                <ArrowLeft className="size-4" />
                로그인 페이지로 돌아가기
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

