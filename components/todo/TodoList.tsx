'use client';

import * as React from 'react';
import { CheckSquare } from 'lucide-react';

import { Empty, EmptyDescription, EmptyMedia, EmptyTitle } from '@/components/ui/empty';
import { TodoCard } from './TodoCard';
import type { Todo } from './types';

interface TodoListProps {
  todos: Todo[];
  onToggleComplete: (id: string, completed: boolean) => void;
  onEdit: (todo: Todo) => void;
  onDelete: (id: string) => void;
  isLoading?: boolean;
}

export function TodoList({
  todos,
  onToggleComplete,
  onEdit,
  onDelete,
  isLoading = false,
}: TodoListProps) {
  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map(i => (
          <div key={i} className="h-32 animate-pulse rounded-xl border bg-muted" />
        ))}
      </div>
    );
  }

  if (todos.length === 0) {
    return (
      <Empty>
        <EmptyMedia variant="icon">
          <CheckSquare className="size-6" />
        </EmptyMedia>
        <EmptyTitle>할 일이 없습니다</EmptyTitle>
        <EmptyDescription>새로운 할 일을 추가하여 시작해보세요.</EmptyDescription>
      </Empty>
    );
  }

  return (
    <div className="space-y-4">
      {todos.map(todo => (
        <TodoCard
          key={todo.id}
          todo={todo}
          onToggleComplete={onToggleComplete}
          onEdit={onEdit}
          onDelete={onDelete}
        />
      ))}
    </div>
  );
}
