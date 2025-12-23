'use client'

import * as React from 'react'
import { Sparkles } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Separator } from '@/components/ui/separator'
import type { Todo, TodoFormData, Priority } from './types'

interface TodoFormProps {
  todo?: Todo | null
  onSubmit: (data: TodoFormData) => void | Promise<void>
  onCancel?: () => void
  isLoading?: boolean
}

const defaultValues: TodoFormData = {
  title: '',
  description: '',
  due_date: '',
  priority: 'medium',
  category: '',
  completed: false,
}

export function TodoForm({
  todo,
  onSubmit,
  onCancel,
  isLoading = false,
}: TodoFormProps) {
  const [formData, setFormData] = React.useState<TodoFormData>(() => {
    if (todo) {
      return {
        title: todo.title,
        description: todo.description || '',
        due_date: todo.due_date
          ? new Date(todo.due_date).toISOString().slice(0, 16)
          : '',
        priority: todo.priority,
        category: todo.category || '',
        completed: todo.completed,
      }
    }
    return defaultValues
  })

  const [aiInput, setAiInput] = React.useState('')
  const [isAiLoading, setIsAiLoading] = React.useState(false)
  const [aiError, setAiError] = React.useState<string | null>(null)

  // 편집 모드에서는 AI 기능 비활성화
  const isEditMode = !!todo

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    await onSubmit(formData)
  }

  const handleChange = (
    field: keyof TodoFormData,
    value: string | boolean | Priority
  ) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  const handleAiParse = async () => {
    if (!aiInput.trim()) {
      setAiError('자연어 문장을 입력해주세요.')
      return
    }

    setIsAiLoading(true)
    setAiError(null)

    try {
      const response = await fetch('/api/ai/parse-todo', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ text: aiInput }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'AI 처리에 실패했습니다.')
      }

      const parsedData = await response.json()

      // 파싱된 데이터를 폼에 적용
      setFormData(prev => ({
        ...prev,
        title: parsedData.title || prev.title,
        description: parsedData.description || prev.description,
        due_date: parsedData.due_date || prev.due_date,
        priority: parsedData.priority || prev.priority,
        category: parsedData.category || prev.category,
      }))

      // AI 입력 필드 초기화
      setAiInput('')
    } catch (err) {
      console.error('AI 파싱 오류:', err)
      setAiError(err instanceof Error ? err.message : 'AI 처리 중 오류가 발생했습니다.')
    } finally {
      setIsAiLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* AI 기반 할 일 생성 (편집 모드가 아닐 때만 표시) */}
      {!isEditMode && (
        <>
          <div className="space-y-2">
            <Label htmlFor="ai-input" className="flex items-center gap-2">
              <Sparkles className="size-4 text-primary" />
              AI로 할 일 만들기
            </Label>
            <div className="flex gap-2">
              <Input
                id="ai-input"
                type="text"
                placeholder="예: 내일 오후 3시까지 중요한 팀 회의 준비하기"
                value={aiInput}
                onChange={(e) => {
                  setAiInput(e.target.value)
                  setAiError(null)
                }}
                disabled={isAiLoading || isLoading}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault()
                    handleAiParse()
                  }
                }}
                className="flex-1"
              />
              <Button
                type="button"
                variant="secondary"
                onClick={handleAiParse}
                disabled={isAiLoading || isLoading || !aiInput.trim()}
              >
                {isAiLoading ? '처리 중...' : '변환'}
              </Button>
            </div>
            {aiError && (
              <p className="text-sm text-destructive">{aiError}</p>
            )}
            <p className="text-xs text-muted-foreground">
              자연어로 할 일을 입력하면 자동으로 제목, 날짜, 우선순위 등을 추출합니다.
            </p>
          </div>
          <Separator />
        </>
      )}
      <div className="space-y-2">
        <Label htmlFor="title">
          제목 <span className="text-destructive">*</span>
        </Label>
        <Input
          id="title"
          type="text"
          value={formData.title}
          onChange={(e) => handleChange('title', e.target.value)}
          placeholder="할 일 제목을 입력하세요"
          required
          disabled={isLoading}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">설명</Label>
        <Textarea
          id="description"
          value={formData.description}
          onChange={(e) => handleChange('description', e.target.value)}
          placeholder="할 일에 대한 상세 설명을 입력하세요"
          rows={4}
          disabled={isLoading}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="due_date">마감일</Label>
          <Input
            id="due_date"
            type="datetime-local"
            value={formData.due_date}
            onChange={(e) => handleChange('due_date', e.target.value)}
            disabled={isLoading}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="priority">우선순위</Label>
          <Select
            value={formData.priority}
            onValueChange={(value) => handleChange('priority', value as Priority)}
            disabled={isLoading}
          >
            <SelectTrigger id="priority" className="w-full">
              <SelectValue placeholder="우선순위 선택" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="high">높음</SelectItem>
              <SelectItem value="medium">중간</SelectItem>
              <SelectItem value="low">낮음</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="category">카테고리</Label>
        <Input
          id="category"
          type="text"
          value={formData.category}
          onChange={(e) => handleChange('category', e.target.value)}
          placeholder="예: 업무, 개인, 학습"
          disabled={isLoading}
        />
      </div>

      <div className="flex justify-end gap-2 pt-4">
        {onCancel && (
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={isLoading}
          >
            취소
          </Button>
        )}
        <Button type="submit" disabled={isLoading || !formData.title.trim()}>
          {isLoading ? '저장 중...' : todo ? '수정' : '추가'}
        </Button>
      </div>
    </form>
  )
}

