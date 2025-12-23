'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { CheckSquare, LogOut, Search, Filter, ArrowUpDown, User } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { TodoForm } from '@/components/todo/TodoForm';
import { TodoList } from '@/components/todo/TodoList';
import type { Todo, TodoFormData, Priority } from '@/components/todo/types';
import { useAuth } from '@/hooks/use-auth';
import { Sparkles, Loader2 } from 'lucide-react';

type StatusFilter = 'all' | 'active' | 'completed' | 'overdue';
type SortOption = 'priority' | 'due_date' | 'created_date' | 'title';

export default function HomePage() {
  const router = useRouter();
  const supabase = React.useMemo(() => createClient(), []);
  const { user: authUser, loading: authLoading } = useAuth();

  // URL에서 Supabase 인증 오류 확인 및 처리
  React.useEffect(() => {
    const handleAuthError = () => {
      const searchParams = new URLSearchParams(window.location.search);
      const hashParams = new URLSearchParams(window.location.hash.substring(1));

      const error = searchParams.get('error') || hashParams.get('error');
      const errorCode = searchParams.get('error_code') || hashParams.get('error_code');
      const errorDescription =
        searchParams.get('error_description') || hashParams.get('error_description');

      // 비밀번호 재설정 관련 오류인 경우
      if (error && (errorCode === 'otp_expired' || errorCode === 'token_expired')) {
        router.replace(
          `/forgot-password?error=${encodeURIComponent(
            errorDescription || '링크가 만료되었습니다. 다시 요청해주세요.'
          )}`
        );
        return;
      }

      // 일반적인 인증 오류인 경우
      if (error) {
        // URL 정리 (오류 파라미터 제거)
        const newUrl = window.location.pathname;
        router.replace(newUrl);
      }

      // 해시에 access_token이 있는 경우 (비밀번호 재설정)
      const accessToken = hashParams.get('access_token');
      const type = hashParams.get('type');

      if (accessToken && type === 'recovery') {
        // reset-password 페이지로 리다이렉트 (해시 정보 유지)
        router.replace(`/reset-password${window.location.hash}`);
        return;
      }
    };

    handleAuthError();
  }, [router]);
  const [user, setUser] = React.useState<{ email: string; name: string } | null>(null);
  const [todos, setTodos] = React.useState<Todo[]>([]);
  const [isLoadingTodos, setIsLoadingTodos] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [searchQuery, setSearchQuery] = React.useState('');
  const [statusFilter, setStatusFilter] = React.useState<StatusFilter>('all');
  const [priorityFilter, setPriorityFilter] = React.useState<Priority | 'all'>('all');
  const [sortBy, setSortBy] = React.useState<SortOption>('created_date');
  const [editingTodo, setEditingTodo] = React.useState<Todo | null>(null);
  const [isFormVisible, setIsFormVisible] = React.useState(true);
  const [summaryData, setSummaryData] = React.useState<{
    summary: string;
    urgentTasks: string[];
    insights: string[];
    recommendations: string[];
  } | null>(null);
  const [isLoadingSummary, setIsLoadingSummary] = React.useState(false);
  const [summaryPeriod, setSummaryPeriod] = React.useState<'today' | 'week'>('today');

  // 할 일 목록 조회
  const fetchTodos = React.useCallback(async () => {
    if (!authUser?.id) return;

    setIsLoadingTodos(true);
    setError(null);

    try {
      let query = supabase.from('todos').select('*').eq('user_id', authUser.id);

      // 검색 필터 (제목 기준)
      if (searchQuery.trim()) {
        query = query.ilike('title', `%${searchQuery.trim()}%`);
      }

      // 상태 필터
      if (statusFilter === 'active') {
        query = query.eq('completed', false);
      } else if (statusFilter === 'completed') {
        query = query.eq('completed', true);
      }
      // 'overdue'는 클라이언트 사이드에서 처리

      // 우선순위 필터
      if (priorityFilter !== 'all') {
        query = query.eq('priority', priorityFilter);
      }

      // 정렬
      switch (sortBy) {
        case 'priority':
          // 우선순위 정렬은 클라이언트 사이드에서 처리 (high > medium > low)
          query = query.order('priority', { ascending: false });
          break;
        case 'due_date':
          query = query.order('due_date', { ascending: true, nullsFirst: false });
          break;
        case 'title':
          query = query.order('title', { ascending: true });
          break;
        case 'created_date':
        default:
          query = query.order('created_date', { ascending: false });
          break;
      }

      const { data, error: fetchError } = await query;

      if (fetchError) throw fetchError;

      let filteredTodos = (data || []) as Todo[];

      // 지연된 항목 필터링 (클라이언트 사이드)
      if (statusFilter === 'overdue') {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        filteredTodos = filteredTodos.filter(
          todo => !todo.completed && todo.due_date && new Date(todo.due_date) < today
        );
      }

      // 우선순위 정렬 (클라이언트 사이드 - high > medium > low)
      if (sortBy === 'priority') {
        const priorityOrder = { high: 3, medium: 2, low: 1 };
        filteredTodos = [...filteredTodos].sort(
          (a, b) => priorityOrder[b.priority] - priorityOrder[a.priority]
        );
      }

      setTodos(filteredTodos);
    } catch (err: unknown) {
      console.error('할 일 조회 오류:', err);
      const errorMessage = err instanceof Error ? err.message : '할 일을 불러오는데 실패했습니다.';
      setError(errorMessage);
      if (
        err instanceof Error &&
        (err.message?.includes('JWT') || err.message?.includes('PGRST301'))
      ) {
        setError('인증이 만료되었습니다. 다시 로그인해주세요.');
        router.push('/login');
      }
    } finally {
      setIsLoadingTodos(false);
    }
  }, [authUser?.id, searchQuery, statusFilter, priorityFilter, sortBy, supabase, router]);

  // 초기 로드 및 필터/정렬 변경 시 재조회
  React.useEffect(() => {
    if (authUser?.id) {
      fetchTodos();
    }
  }, [authUser?.id, fetchTodos]);

  const handleAddTodo = async (data: TodoFormData) => {
    if (!authUser?.id) {
      setError('로그인이 필요합니다.');
      return;
    }

    try {
      const { error: insertError } = await supabase
        .from('todos')
        .insert({
          user_id: authUser.id,
          title: data.title,
          description: data.description || null,
          due_date: data.due_date || null,
          priority: data.priority,
          category: data.category || null,
          completed: data.completed,
        })
        .select()
        .single();

      if (insertError) throw insertError;

      // 목록 갱신
      await fetchTodos();
      setIsFormVisible(false);
      setEditingTodo(null);
    } catch (err: unknown) {
      console.error('할 일 생성 오류:', err);
      const errorMessage = err instanceof Error ? err.message : '할 일을 생성하는데 실패했습니다.';
      setError(errorMessage);
      if (
        err instanceof Error &&
        (err.message?.includes('JWT') || err.message?.includes('PGRST301'))
      ) {
        setError('인증이 만료되었습니다. 다시 로그인해주세요.');
        router.push('/login');
      }
    }
  };

  const handleUpdateTodo = async (data: TodoFormData) => {
    if (!editingTodo || !authUser?.id) {
      setError('수정할 할 일이 없거나 로그인이 필요합니다.');
      return;
    }

    try {
      const { error: updateError } = await supabase
        .from('todos')
        .update({
          title: data.title,
          description: data.description || null,
          due_date: data.due_date || null,
          priority: data.priority,
          category: data.category || null,
          completed: data.completed,
        })
        .eq('id', editingTodo.id)
        .eq('user_id', authUser.id); // 본인 소유만 수정 가능

      if (updateError) throw updateError;

      // 목록 갱신
      await fetchTodos();
      setEditingTodo(null);
      setIsFormVisible(false);
    } catch (err: unknown) {
      console.error('할 일 수정 오류:', err);
      const errorMessage = err instanceof Error ? err.message : '할 일을 수정하는데 실패했습니다.';
      setError(errorMessage);
      if (
        err instanceof Error &&
        (err.message?.includes('JWT') || err.message?.includes('PGRST301'))
      ) {
        setError('인증이 만료되었습니다. 다시 로그인해주세요.');
        router.push('/login');
      }
    }
  };

  const handleDeleteTodo = async (id: string) => {
    if (!authUser?.id) {
      setError('로그인이 필요합니다.');
      return;
    }

    if (!confirm('정말 삭제하시겠습니까?')) {
      return;
    }

    try {
      const { error: deleteError } = await supabase
        .from('todos')
        .delete()
        .eq('id', id)
        .eq('user_id', authUser.id); // 본인 소유만 삭제 가능

      if (deleteError) throw deleteError;

      // 목록 갱신
      await fetchTodos();
      if (editingTodo?.id === id) {
        setEditingTodo(null);
        setIsFormVisible(false);
      }
    } catch (err: unknown) {
      console.error('할 일 삭제 오류:', err);
      const errorMessage = err instanceof Error ? err.message : '할 일을 삭제하는데 실패했습니다.';
      setError(errorMessage);
      if (
        err instanceof Error &&
        (err.message?.includes('JWT') || err.message?.includes('PGRST301'))
      ) {
        setError('인증이 만료되었습니다. 다시 로그인해주세요.');
        router.push('/login');
      }
    }
  };

  const handleToggleComplete = async (id: string, completed: boolean) => {
    if (!authUser?.id) {
      setError('로그인이 필요합니다.');
      return;
    }

    try {
      const { error: updateError } = await supabase
        .from('todos')
        .update({ completed })
        .eq('id', id)
        .eq('user_id', authUser.id); // 본인 소유만 수정 가능

      if (updateError) throw updateError;

      // 목록 갱신
      await fetchTodos();
    } catch (err: unknown) {
      console.error('완료 상태 변경 오류:', err);
      const errorMessage =
        err instanceof Error ? err.message : '완료 상태를 변경하는데 실패했습니다.';
      setError(errorMessage);
      if (
        err instanceof Error &&
        (err.message?.includes('JWT') || err.message?.includes('PGRST301'))
      ) {
        setError('인증이 만료되었습니다. 다시 로그인해주세요.');
        router.push('/login');
      }
    }
  };

  const handleEdit = (todo: Todo) => {
    setEditingTodo(todo);
    setIsFormVisible(true);
  };

  // 사용자 정보 설정
  React.useEffect(() => {
    if (authUser) {
      setUser({
        email: authUser.email || '',
        name: authUser.user_metadata?.full_name || authUser.email?.split('@')[0] || '사용자',
      });
    } else {
      setUser(null);
    }
  }, [authUser]);

  const handleLogout = async () => {
    try {
      const { error } = await supabase.auth.signOut();

      if (error) {
        console.error('로그아웃 오류:', error);
        alert('로그아웃에 실패했습니다. 다시 시도해주세요.');
        return;
      }

      // 로그아웃 성공 시 로그인 페이지로 이동
      router.push('/login');
      router.refresh();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
      console.error('로그아웃 오류:', err);
      alert('로그아웃에 실패했습니다. 다시 시도해주세요.');
    }
  };

  const handleFormSubmit = async (data: TodoFormData) => {
    if (editingTodo) {
      await handleUpdateTodo(data);
    } else {
      await handleAddTodo(data);
    }
  };

  const handleFormCancel = () => {
    setEditingTodo(null);
    setIsFormVisible(false);
  };

  // 오늘 날짜 기준 할 일 필터링
  const getTodayTodos = React.useCallback(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    return todos.filter(todo => {
      if (!todo.due_date) return false;
      const dueDate = new Date(todo.due_date);
      dueDate.setHours(0, 0, 0, 0);
      return dueDate >= today && dueDate < tomorrow;
    });
  }, [todos]);

  // 이번 주 할 일 필터링
  const getWeekTodos = React.useCallback(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const dayOfWeek = today.getDay();
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - dayOfWeek); // 일요일
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 7); // 다음 주 일요일

    return todos.filter(todo => {
      if (!todo.due_date) return false;
      const dueDate = new Date(todo.due_date);
      dueDate.setHours(0, 0, 0, 0);
      return dueDate >= startOfWeek && dueDate < endOfWeek;
    });
  }, [todos]);

  const handleGenerateSummary = async (period: 'today' | 'week') => {
    if (!authUser?.id) {
      setError('로그인이 필요합니다.');
      return;
    }

    setIsLoadingSummary(true);
    setError(null);

    try {
      const targetTodos = period === 'today' ? getTodayTodos() : getWeekTodos();

      if (targetTodos.length === 0) {
        setError(`${period === 'today' ? '오늘' : '이번 주'} 할 일이 없습니다.`);
        setIsLoadingSummary(false);
        return;
      }

      const response = await fetch('/api/ai/summarize-todos', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          todos: targetTodos,
          period,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || '요약 생성에 실패했습니다.');
      }

      const data = await response.json();
      setSummaryData(data);
      setSummaryPeriod(period);
    } catch (err) {
      console.error('요약 생성 오류:', err);
      setError(err instanceof Error ? err.message : '요약을 생성하는데 실패했습니다.');
    } finally {
      setIsLoadingSummary(false);
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

  // 로그인하지 않은 경우 (리다이렉트 중)
  if (!authUser) {
    return null;
  }

  return (
    <div className="flex min-h-screen flex-col">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-3">
            <CheckSquare className="size-6 text-primary" />
            <h1 className="text-xl font-bold">할 일 관리</h1>
          </div>

          <div className="flex items-center gap-4">
            {user && (
              <>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <User className="size-4" />
                  <span>{user.email}</span>
                </div>
                <Separator orientation="vertical" className="h-6" />
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" className="gap-2">
                      <Avatar className="size-8">
                        <AvatarFallback>{user.name[0].toUpperCase()}</AvatarFallback>
                      </Avatar>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56">
                    <DropdownMenuLabel>내 계정</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem disabled>
                      <User className="mr-2 size-4" />
                      <span>{user.email}</span>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={handleLogout}>
                      <LogOut className="mr-2 size-4" />
                      로그아웃
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </>
            )}
          </div>
        </div>
      </header>

      {/* 에러 메시지 */}
      {error && (
        <div className="container mx-auto px-4 pt-4">
          <div className="rounded-lg border border-destructive bg-destructive/10 p-3 text-sm text-destructive">
            {error}
            <button
              onClick={() => setError(null)}
              className="ml-2 font-medium underline hover:no-underline"
            >
              닫기
            </button>
          </div>
        </div>
      )}

      {/* Toolbar */}
      <div className="border-b bg-muted/30">
        <div className="container mx-auto px-4 py-4">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            {/* 검색 */}
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="search"
                placeholder="제목으로 검색..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>

            {/* 필터 및 정렬 */}
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-2">
                <Filter className="size-4 text-muted-foreground" />
                <Select
                  value={statusFilter}
                  onValueChange={value => setStatusFilter(value as StatusFilter)}
                >
                  <SelectTrigger className="w-[140px]">
                    <SelectValue placeholder="상태" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">전체</SelectItem>
                    <SelectItem value="active">진행 중</SelectItem>
                    <SelectItem value="completed">완료</SelectItem>
                    <SelectItem value="overdue">지연</SelectItem>
                  </SelectContent>
                </Select>

                <Select
                  value={priorityFilter}
                  onValueChange={value => setPriorityFilter(value as Priority | 'all')}
                >
                  <SelectTrigger className="w-[120px]">
                    <SelectValue placeholder="우선순위" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">전체</SelectItem>
                    <SelectItem value="high">높음</SelectItem>
                    <SelectItem value="medium">중간</SelectItem>
                    <SelectItem value="low">낮음</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Separator orientation="vertical" className="h-6" />

              <div className="flex items-center gap-2">
                <ArrowUpDown className="size-4 text-muted-foreground" />
                <Select value={sortBy} onValueChange={value => setSortBy(value as SortOption)}>
                  <SelectTrigger className="w-[140px]">
                    <SelectValue placeholder="정렬" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="created_date">생성일순</SelectItem>
                    <SelectItem value="priority">우선순위순</SelectItem>
                    <SelectItem value="due_date">마감일순</SelectItem>
                    <SelectItem value="title">제목순</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="container mx-auto flex-1 px-4 py-6">
        <div className="grid gap-6 lg:grid-cols-[400px_1fr]">
          {/* Todo Form */}
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>{editingTodo ? '할 일 수정' : '새 할 일 추가'}</CardTitle>
                  {!isFormVisible && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setEditingTodo(null);
                        setIsFormVisible(true);
                      }}
                    >
                      추가하기
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {isFormVisible ? (
                  <TodoForm
                    todo={editingTodo}
                    onSubmit={handleFormSubmit}
                    onCancel={editingTodo ? handleFormCancel : undefined}
                  />
                ) : (
                  <div className="py-8 text-center text-sm text-muted-foreground">
                    할 일을 추가하려면 위의 &quot;추가하기&quot; 버튼을 클릭하세요.
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Todo List and AI Summary */}
          <div className="space-y-6">
            {/* AI 요약 및 분석 */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Sparkles className="size-5 text-primary" />
                  AI 요약 및 분석
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Tabs defaultValue="today" className="w-full">
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="today">오늘의 요약</TabsTrigger>
                    <TabsTrigger value="week">이번 주 요약</TabsTrigger>
                  </TabsList>

                  <TabsContent value="today" className="mt-4 space-y-4">
                    <div className="flex items-center justify-between">
                      <p className="text-sm text-muted-foreground">
                        오늘 할 일: {getTodayTodos().length}개
                      </p>
                      <Button
                        onClick={() => handleGenerateSummary('today')}
                        disabled={isLoadingSummary || getTodayTodos().length === 0}
                        size="sm"
                      >
                        {isLoadingSummary && summaryPeriod === 'today' ? (
                          <>
                            <Loader2 className="mr-2 size-4 animate-spin" />
                            분석 중...
                          </>
                        ) : (
                          <>
                            <Sparkles className="mr-2 size-4" />
                            AI 요약
                          </>
                        )}
                      </Button>
                    </div>
                    {summaryData && summaryPeriod === 'today' && (
                      <SummaryDisplay data={summaryData} />
                    )}
                  </TabsContent>

                  <TabsContent value="week" className="mt-4 space-y-4">
                    <div className="flex items-center justify-between">
                      <p className="text-sm text-muted-foreground">
                        이번 주 할 일: {getWeekTodos().length}개
                      </p>
                      <Button
                        onClick={() => handleGenerateSummary('week')}
                        disabled={isLoadingSummary || getWeekTodos().length === 0}
                        size="sm"
                      >
                        {isLoadingSummary && summaryPeriod === 'week' ? (
                          <>
                            <Loader2 className="mr-2 size-4 animate-spin" />
                            분석 중...
                          </>
                        ) : (
                          <>
                            <Sparkles className="mr-2 size-4" />
                            AI 요약
                          </>
                        )}
                      </Button>
                    </div>
                    {summaryData && summaryPeriod === 'week' && (
                      <SummaryDisplay data={summaryData} />
                    )}
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>

            {/* Todo List */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold">할 일 목록 ({todos.length})</h2>
              </div>
              <TodoList
                todos={todos}
                onToggleComplete={handleToggleComplete}
                onEdit={handleEdit}
                onDelete={handleDeleteTodo}
                isLoading={isLoadingTodos}
              />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

// AI 요약 결과 표시 컴포넌트
function SummaryDisplay({
  data,
}: {
  data: {
    summary: string;
    urgentTasks: string[];
    insights: string[];
    recommendations: string[];
  };
}) {
  return (
    <div className="space-y-4 rounded-lg border bg-muted/30 p-4">
      {/* 요약 */}
      <div>
        <h3 className="mb-2 font-semibold">📊 요약</h3>
        <p className="text-sm">{data.summary}</p>
      </div>

      {/* 긴급 작업 */}
      {data.urgentTasks.length > 0 && (
        <div>
          <h3 className="mb-2 font-semibold">⚠️ 긴급 작업</h3>
          <ul className="list-inside list-disc space-y-1 text-sm">
            {data.urgentTasks.map((task, idx) => (
              <li key={idx}>{task}</li>
            ))}
          </ul>
        </div>
      )}

      {/* 인사이트 */}
      {data.insights.length > 0 && (
        <div>
          <h3 className="mb-2 font-semibold">💡 인사이트</h3>
          <ul className="list-inside list-disc space-y-1 text-sm">
            {data.insights.map((insight, idx) => (
              <li key={idx}>{insight}</li>
            ))}
          </ul>
        </div>
      )}

      {/* 추천 사항 */}
      {data.recommendations.length > 0 && (
        <div>
          <h3 className="mb-2 font-semibold">✨ 추천 사항</h3>
          <ul className="list-inside list-disc space-y-1 text-sm">
            {data.recommendations.map((rec, idx) => (
              <li key={idx}>{rec}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
