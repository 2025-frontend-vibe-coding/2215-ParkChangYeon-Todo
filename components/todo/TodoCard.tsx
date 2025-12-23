'use client'

import * as React from 'react'
import { format } from 'date-fns'
import { ko } from 'date-fns/locale'
import { Edit2, Trash2, Calendar } from 'lucide-react'

import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import type { Todo, Priority } from './types'

interface TodoCardProps {
  todo: Todo
  onToggleComplete: (id: string, completed: boolean) => void
  onEdit: (todo: Todo) => void
  onDelete: (id: string) => void
}

const priorityConfig: Record<
  Priority,
  { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }
> = {
  high: { label: '높음', variant: 'destructive' },
  medium: { label: '중간', variant: 'default' },
  low: { label: '낮음', variant: 'secondary' },
}

export function TodoCard({
  todo,
  onToggleComplete,
  onEdit,
  onDelete,
}: TodoCardProps) {
  const priority = priorityConfig[todo.priority]
  const isOverdue =
    !todo.completed &&
    todo.due_date &&
    new Date(todo.due_date) < new Date() &&
    new Date(todo.due_date).toDateString() !== new Date().toDateString()

  const formatDate = (dateString: string | null) => {
    if (!dateString) return null
    try {
      return format(new Date(dateString), 'yyyy년 MM월 dd일 HH:mm', {
        locale: ko,
      })
    } catch {
      return null
    }
  }

  return (
    <Card
      className={cn(
        'transition-all hover:shadow-md',
        todo.completed && 'opacity-60'
      )}
    >
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3 flex-1 min-w-0">
            <Checkbox
              checked={todo.completed}
              onCheckedChange={(checked) =>
                onToggleComplete(todo.id, checked === true)
              }
              className="mt-1"
              aria-label={todo.completed ? '완료 취소' : '완료 표시'}
            />
            <div className="flex-1 min-w-0">
              <CardTitle
                className={cn(
                  'text-lg mb-2',
                  todo.completed && 'line-through text-muted-foreground'
                )}
              >
                {todo.title}
              </CardTitle>
              {todo.description && (
                <p
                  className={cn(
                    'text-sm text-muted-foreground line-clamp-2',
                    todo.completed && 'line-through'
                  )}
                >
                  {todo.description}
                </p>
              )}
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="flex flex-wrap items-center gap-2">
        <Badge variant={priority.variant}>{priority.label}</Badge>
        {todo.category && (
          <Badge variant="outline">{todo.category}</Badge>
        )}
        {todo.due_date && (
          <div
            className={cn(
              'flex items-center gap-1.5 text-xs text-muted-foreground',
              isOverdue && 'text-destructive font-medium'
            )}
          >
            <Calendar className="size-3.5" />
            <span>{formatDate(todo.due_date)}</span>
            {isOverdue && <span className="ml-1">(지연)</span>}
          </div>
        )}
      </CardContent>

      <CardFooter className="flex justify-end gap-2 pt-0">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onEdit(todo)}
          disabled={todo.completed}
        >
          <Edit2 className="size-4" />
          <span className="sr-only">편집</span>
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onDelete(todo.id)}
          className="text-destructive hover:text-destructive"
        >
          <Trash2 className="size-4" />
          <span className="sr-only">삭제</span>
        </Button>
      </CardFooter>
    </Card>
  )
}

