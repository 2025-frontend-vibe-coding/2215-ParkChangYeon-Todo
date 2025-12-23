import { google } from '@ai-sdk/google';
import { generateObject } from 'ai';
import { z } from 'zod';
import type { Priority } from '@/components/todo/types';

const summarySchema = z.object({
  summary: z.string().describe('할 일 요약 (완료율 포함)'),
  urgentTasks: z.array(z.string()).describe('긴급한 할 일 목록'),
  insights: z.array(z.string()).describe('인사이트 목록'),
  recommendations: z.array(z.string()).describe('추천 사항 목록'),
});

export async function POST(request: Request) {
  try {
    const { todos, period } = await request.json();

    if (!todos || !Array.isArray(todos)) {
      return Response.json({ error: '할 일 목록이 필요합니다.' }, { status: 400 });
    }

    if (!['today', 'week'].includes(period)) {
      return Response.json({ error: '분석 기간은 today 또는 week여야 합니다.' }, { status: 400 });
    }

    if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
      return Response.json({ error: 'AI API 키가 설정되지 않았습니다.' }, { status: 500 });
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // 기본 통계
    const total = todos.length;
    const completed = todos.filter(t => t.completed).length;
    const incomplete = total - completed;
    const completionRate = total > 0 ? ((completed / total) * 100).toFixed(1) : '0';
    
    // 우선순위별 분석
    const priorityStats: Record<Priority, { total: number; completed: number; incomplete: number }> = {
      high: { total: 0, completed: 0, incomplete: 0 },
      medium: { total: 0, completed: 0, incomplete: 0 },
      low: { total: 0, completed: 0, incomplete: 0 },
    };
    
    todos.forEach(todo => {
      const priority = todo.priority as Priority;
      priorityStats[priority].total++;
      if (todo.completed) {
        priorityStats[priority].completed++;
      } else {
        priorityStats[priority].incomplete++;
      }
    });

    // 우선순위별 완료율
    const priorityCompletionRates = {
      high: priorityStats.high.total > 0 ? ((priorityStats.high.completed / priorityStats.high.total) * 100).toFixed(1) : '0',
      medium: priorityStats.medium.total > 0 ? ((priorityStats.medium.completed / priorityStats.medium.total) * 100).toFixed(1) : '0',
      low: priorityStats.low.total > 0 ? ((priorityStats.low.completed / priorityStats.low.total) * 100).toFixed(1) : '0',
    };

    // 카테고리별 분석
    const categoryStats: Record<string, { total: number; completed: number }> = {};
    todos.forEach(todo => {
      const category = todo.category || '미분류';
      if (!categoryStats[category]) {
        categoryStats[category] = { total: 0, completed: 0 };
      }
      categoryStats[category].total++;
      if (todo.completed) {
        categoryStats[category].completed++;
      }
    });

    // 마감일 준수율 및 연기된 할 일 분석
    const tasksWithDueDate = todos.filter(t => t.due_date);
    const onTimeCompleted = tasksWithDueDate.filter(t => {
      if (!t.completed || !t.due_date) return false;
      const dueDate = new Date(t.due_date);
      dueDate.setHours(0, 0, 0, 0);
      const completedDate = new Date(t.updated_at);
      completedDate.setHours(0, 0, 0, 0);
      return completedDate <= dueDate;
    }).length;
    const dueDateComplianceRate = tasksWithDueDate.length > 0 
      ? ((onTimeCompleted / tasksWithDueDate.length) * 100).toFixed(1) 
      : '0';

    // 연기된 할 일 (미완료 + 마감일 지남)
    const overdue = todos.filter(t => {
      if (t.completed || !t.due_date) return false;
      const dueDate = new Date(t.due_date);
      dueDate.setHours(0, 0, 0, 0);
      return dueDate < today;
    });

    // 연기된 후 완료된 할 일 (과거 마감일이었지만 나중에 완료)
    const completedAfterDue = tasksWithDueDate.filter(t => {
      if (!t.completed || !t.due_date) return false;
      const dueDate = new Date(t.due_date);
      dueDate.setHours(0, 0, 0, 0);
      const completedDate = new Date(t.updated_at);
      completedDate.setHours(0, 0, 0, 0);
      return completedDate > dueDate;
    });

    // 시간대별 집중도 분석 (due_date의 시간 부분 기준)
    const timeSlots: Record<string, { total: number; completed: number }> = {
      '오전 (09:00-12:00)': { total: 0, completed: 0 },
      '오후 (12:00-18:00)': { total: 0, completed: 0 },
      '저녁 (18:00-21:00)': { total: 0, completed: 0 },
      '밤 (21:00-24:00)': { total: 0, completed: 0 },
    };

    todos.forEach(todo => {
      if (todo.due_date) {
        const date = new Date(todo.due_date);
        const hour = date.getHours();
        let slot: string;
        if (hour >= 9 && hour < 12) slot = '오전 (09:00-12:00)';
        else if (hour >= 12 && hour < 18) slot = '오후 (12:00-18:00)';
        else if (hour >= 18 && hour < 21) slot = '저녁 (18:00-21:00)';
        else if (hour >= 21) slot = '밤 (21:00-24:00)';
        else slot = '오전 (09:00-12:00)'; // 기본값
        
        timeSlots[slot].total++;
        if (todo.completed) {
          timeSlots[slot].completed++;
        }
      }
    });

    // 가장 집중된 시간대
    const maxTimeSlot = Object.entries(timeSlots).reduce((max, [key, value]) => 
      value.total > max[1].total ? [key, value] : max, ['', { total: 0, completed: 0 }]
    )[0];

    // 긴급 작업 (high 우선순위 미완료)
    const urgentTasks = todos.filter(t => t.priority === 'high' && !t.completed);
    
    // 요일별 분석 (이번 주인 경우)
    const dayStats: Record<string, { total: number; completed: number }> = {};
    if (period === 'week') {
      todos.forEach(todo => {
        if (todo.due_date) {
          const date = new Date(todo.due_date);
          const dayName = date.toLocaleDateString('ko-KR', { weekday: 'long' });
          if (!dayStats[dayName]) {
            dayStats[dayName] = { total: 0, completed: 0 };
          }
          dayStats[dayName].total++;
          if (todo.completed) {
            dayStats[dayName].completed++;
          }
        }
      });
    }

    // 완료하기 쉬운 작업 특징 (완료된 작업들의 공통점)
    const completedTodos = todos.filter(t => t.completed);
    const mostCompletedCategory = Object.entries(categoryStats)
      .filter(([_, stats]) => stats.total > 0)
      .sort((a, b) => {
        const rateA = (a[1].completed / a[1].total) * 100;
        const rateB = (b[1].completed / b[1].total) * 100;
        return rateB - rateA;
      })[0]?.[0] || '없음';

    const mostCompletedPriority = (Object.entries(priorityStats) as [Priority, { total: number; completed: number; incomplete: number }][])
      .filter(([_, stats]) => stats.total > 0)
      .sort((a, b) => {
        const rateA = (a[1].completed / a[1].total) * 100;
        const rateB = (b[1].completed / b[1].total) * 100;
        return rateB - rateA;
      })[0]?.[0] || '없음';

    const periodText = period === 'today' ? '오늘' : '이번 주';
    const currentDate = today.toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      weekday: 'long',
    });

    // 분석 데이터 문자열 생성
    const analysisData = `
=== 기본 통계 ===
- 총 할 일 수: ${total}개
- 완료된 할 일: ${completed}개 (${completionRate}%)
- 미완료 할 일: ${incomplete}개

=== 우선순위별 분석 ===
- 높은 우선순위: 총 ${priorityStats.high.total}개 (완료 ${priorityStats.high.completed}개, ${priorityCompletionRates.high}%)
- 중간 우선순위: 총 ${priorityStats.medium.total}개 (완료 ${priorityStats.medium.completed}개, ${priorityCompletionRates.medium}%)
- 낮은 우선순위: 총 ${priorityStats.low.total}개 (완료 ${priorityStats.low.completed}개, ${priorityCompletionRates.low}%)

=== 시간 관리 분석 ===
- 마감일이 있는 할 일: ${tasksWithDueDate.length}개
- 마감일 준수율: ${dueDateComplianceRate}% (${onTimeCompleted}/${tasksWithDueDate.length})
- 현재 연기된 할 일: ${overdue.length}개${overdue.length > 0 ? ` (${overdue.map(t => t.title).join(', ')})` : ''}
- 연기 후 완료된 할 일: ${completedAfterDue.length}개

=== 시간대별 집중도 ===${Object.entries(timeSlots).map(([slot, stats]) => 
  `\n- ${slot}: ${stats.total}개 (완료 ${stats.completed}개, ${stats.total > 0 ? ((stats.completed / stats.total) * 100).toFixed(1) : '0'}%)`
).join('')}
${maxTimeSlot ? `- 가장 집중된 시간대: ${maxTimeSlot}` : ''}

=== 카테고리별 분석 ===${Object.entries(categoryStats).map(([category, stats]) => 
  `\n- ${category}: 총 ${stats.total}개 (완료 ${stats.completed}개, ${stats.total > 0 ? ((stats.completed / stats.total) * 100).toFixed(1) : '0'}%)`
).join('')}

=== 생산성 패턴 ===
- 가장 완료율이 높은 카테고리: ${mostCompletedCategory}
- 가장 완료율이 높은 우선순위: ${mostCompletedPriority === 'high' ? '높음' : mostCompletedPriority === 'medium' ? '중간' : '낮음'}${period === 'week' && Object.keys(dayStats).length > 0 ? `
- 요일별 할 일 분포:${Object.entries(dayStats).map(([day, stats]) => 
  `\n  - ${day}: ${stats.total}개 (완료 ${stats.completed}개)`
).join('')}` : ''}

=== 긴급 작업 ===
- 미완료 긴급 작업: ${urgentTasks.length}개${urgentTasks.length > 0 ? ` (${urgentTasks.map(t => t.title).join(', ')})` : ''}
`;

    const result = await generateObject({
      model: google('gemini-2.5-flash'),
      schema: summarySchema,
      prompt: `${periodText} 할 일 목록을 심층 분석하여 사용자에게 유용한 요약, 인사이트, 그리고 실행 가능한 추천을 제공해주세요.

${analysisData}

=== 할 일 상세 목록 ===
${todos.map((t, i) => {
  const dueDate = t.due_date ? new Date(t.due_date).toLocaleDateString('ko-KR') : '마감일 없음';
  const priorityText = t.priority === 'high' ? '높음' : t.priority === 'medium' ? '중간' : '낮음';
  const categoryText = t.category || '미분류';
  const status = t.completed ? '✅ 완료' : '⏳ 미완료';
  return `${i + 1}. ${status} - ${t.title} (우선순위: ${priorityText}, 카테고리: ${categoryText}, 마감: ${dueDate}${t.description ? `, 설명: ${t.description.substring(0, 50)}` : ''})`;
}).join('\n')}

현재 날짜 및 시간: ${currentDate}

=== 분석 지침 ===

**1. summary (요약)**
${period === 'today' 
  ? `- 오늘의 할 일 현황을 간결하게 요약 (총 할 일 수, 완료 수, 완료율)
- 남은 할 일 수와 긴급 작업 수 강조
- 오늘 하루 동안의 집중도와 생산성을 언급`
  : `- 이번 주 전체 할 일 현황 요약 (총 할 일 수, 완료 수, 완료율)
- 주간 완료율 개선 추세 (가능한 경우)
- 가장 생산적인 요일과 패턴 언급`}

**2. urgentTasks (긴급 작업)**
- 미완료 상태인 높은 우선순위 작업의 제목만 나열 (최대 5개)
- 마감일이 임박한 작업 우선 표시

**3. insights (인사이트) - 다음 항목들을 포함하되, 자연스럽게 통합하여 작성:**

a) **완료율 분석**
   - 전체 완료율과 우선순위별 완료 패턴 분석 (높은 우선순위를 잘 완료하는지 등)
   - 카테고리별 완료율 차이점 지적
   - 이전 기간 대비 개선 여부 (가능한 경우)

b) **시간 관리 분석**
   - 마감일 준수율 평가 및 해석
   - 연기된 할 일의 빈도와 패턴 파악 (어떤 유형의 작업이 자주 연기되는지)
   - 시간대별 업무 집중도 분포 분석 (특정 시간대에 과부하가 있는지)

c) **생산성 패턴**
   ${period === 'week' ? `- 가장 생산적인 요일 도출 (요일별 완료 분포 기반)
   - ` : ''}가장 완료하기 쉬운 작업 유형 분석 (카테고리, 우선순위 관점)
   - 자주 미루거나 완료하지 못하는 작업의 공통 특징 도출
   - 생산성 패턴에 대한 통찰 제공

d) **긍정적인 피드백**
   - 사용자가 잘하고 있는 부분 강조 (예: 높은 우선순위 작업을 잘 완료함, 특정 카테고리에서 높은 완료율 등)
   - 개선된 부분이 있다면 격려
   - 동기부여가 되는 긍정적인 메시지 포함

**4. recommendations (추천 사항) - 실행 가능하고 구체적인 2~4가지 제안:**

${period === 'today'
  ? `- 오늘 남은 시간을 효율적으로 사용하기 위한 구체적인 시간 관리 팁
- 남은 할 일의 우선순위 재조정 제안
- 긴급 작업 처리 전략
- 업무 과부하를 줄이기 위한 당일 일정 재배치 제안`
  : `- 주간 패턴을 바탕으로 한 다음 주 계획 제안
- 우선순위 조정 및 일정 재배치 구체적 제안
- 업무 과부하를 줄이기 위한 분산 전략 (시간대별, 요일별 분배)
- 생산성을 높이기 위한 일정 관리 팁`}

=== 작성 원칙 ===

1. **자연스러운 한국어**: 사용자가 이해하기 쉽고 바로 실천할 수 있는 자연스러운 문장으로 구성
2. **긍정적인 톤**: 격려하고 동기부여하는 따뜻한 톤 유지. 비판보다는 개선 기회로 제시
3. **구체성**: 모호한 표현보다는 구체적인 수치와 패턴을 언급
4. **실용성**: 이론보다는 바로 실행 가능한 조언 제공
5. **균형**: 잘한 점과 개선할 점을 균형있게 제시

각 항목(summary, urgentTasks, insights, recommendations)을 자연스럽고 친근한 문체로 작성하되, 데이터 기반의 객관적인 분석을 제공하세요.`,
    });

    return Response.json(result.object);
  } catch (error) {
    console.error('AI 요약 오류:', error);

    if (error instanceof Error) {
      const errorMessage = error.message || '';
      const lowerErrorMessage = errorMessage.toLowerCase();

      // API 키 관련 에러
      if (
        lowerErrorMessage.includes('api key') ||
        lowerErrorMessage.includes('authentication') ||
        errorMessage.includes('401') ||
        errorMessage.includes('UNAUTHENTICATED')
      ) {
        return Response.json(
          { error: 'AI API 키가 올바르지 않습니다. 환경 변수를 확인해주세요.' },
          { status: 500 }
        );
      }

      // 모델 관련 에러
      if (
        (lowerErrorMessage.includes('model') && lowerErrorMessage.includes('not found')) ||
        errorMessage.includes('404')
      ) {
        return Response.json(
          { error: `AI 모델을 찾을 수 없습니다: ${errorMessage}` },
          { status: 500 }
        );
      }

      // 429 에러
      if (
        errorMessage.includes('429') ||
        errorMessage.includes('RESOURCE_EXHAUSTED') ||
        (lowerErrorMessage.includes('quota') && lowerErrorMessage.includes('exceeded'))
      ) {
        return Response.json(
          { error: 'API 호출 한도가 초과되었습니다. 잠시 후 다시 시도해주세요.' },
          { status: 429 }
        );
      }

      return Response.json(
        { error: `AI 분석 중 오류가 발생했습니다: ${errorMessage}` },
        { status: 500 }
      );
    }

    return Response.json(
      { error: '알 수 없는 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}

