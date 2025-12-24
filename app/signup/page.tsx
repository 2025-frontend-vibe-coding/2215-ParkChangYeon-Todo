'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { CheckSquare, Sparkles } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/hooks/use-auth';

export default function SignupPage() {
  const router = useRouter();
  const supabase = React.useMemo(() => createClient(), []);
  const { user, loading: authLoading } = useAuth();
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [confirmPassword, setConfirmPassword] = React.useState('');
  const [fullName, setFullName] = React.useState('');
  const [error, setError] = React.useState<string | null>(null);
  const [success, setSuccess] = React.useState<string | null>(null);
  const [isLoading, setIsLoading] = React.useState(false);

  const isValidEmail = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());

  const validatePassword = (pwd: string) => {
    if (pwd.length < 6) {
      return '비밀번호는 최소 6자 이상이어야 합니다.';
    }
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    // 이메일 형식 검사
    if (!isValidEmail(email)) {
      setError('올바른 이메일 주소를 입력해주세요.');
      return;
    }

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
      const { error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName || null,
          },
          emailRedirectTo: `${window.location.origin}/login`,
        },
      });

      if (signUpError) throw signUpError;

      // 이메일 확인 플로우 안내
      setSuccess('회원가입이 완료되었습니다. 이메일로 전송된 확인 메일을 확인해주세요.');
      setEmail('');
      setPassword('');
      setConfirmPassword('');
      setFullName('');

      // 프로젝트 설정에 따라 즉시 이동이 필요하면 아래 주석 해제
      router.push('/login');
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
      setError(err?.message || '회원가입에 실패했습니다. 입력 정보를 확인하고 다시 시도해주세요.');
      setIsLoading(false);
      return;
    }

    setIsLoading(false);
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
    router.push('/');
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
            <h1 className="text-3xl font-bold tracking-tight">할 일 관리</h1>
            <p className="mt-2 text-muted-foreground flex items-center justify-center gap-2">
              <Sparkles className="size-4" />
              AI 기반 스마트 일정 관리
            </p>
          </div>
          <p className="text-sm text-muted-foreground max-w-sm mx-auto">
            간단하고 직관적인 할 일 관리와 AI를 활용한 자동화로
            <br />더 효율적인 일정 관리를 시작하세요.
          </p>
        </div>

        {/* 회원가입 폼 */}
        <Card>
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl">회원가입</CardTitle>
            <CardDescription>이메일과 비밀번호를 입력하여 계정을 만드세요</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <div className="space-y-2">
                <Label htmlFor="fullName">이름</Label>
                <Input
                  id="fullName"
                  type="text"
                  placeholder="이름(선택)"
                  value={fullName}
                  onChange={e => setFullName(e.target.value)}
                  disabled={isLoading}
                  autoComplete="name"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">이메일</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="example@email.com"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                  disabled={isLoading}
                  autoComplete="email"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">비밀번호</Label>
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

              {success && (
                <Alert>
                  <AlertDescription>{success}</AlertDescription>
                </Alert>
              )}

              <Button
                type="submit"
                className="w-full"
                disabled={
                  isLoading ||
                  !email ||
                  !password ||
                  !confirmPassword ||
                  password !== confirmPassword
                }
              >
                {isLoading ? '가입 중...' : '회원가입'}
              </Button>
            </form>

            <div className="mt-6 text-center text-sm space-y-2">
              <div>
                <span className="text-muted-foreground">이미 계정이 있으신가요? </span>
                <Link href="/login" className="font-medium text-primary hover:underline">
                  로그인
                </Link>
              </div>
              <div>
                <Link href="/forgot-password" className="text-sm text-primary hover:underline">
                  비밀번호를 잊으셨나요?
                </Link>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 추가 정보 */}
        <p className="text-center text-xs text-muted-foreground">
          회원가입하시면 서비스 이용약관 및 개인정보 처리방침에 동의하는 것으로 간주됩니다.
        </p>
      </div>
    </div>
  );
}
