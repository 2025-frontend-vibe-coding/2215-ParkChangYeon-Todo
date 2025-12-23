import { google } from '@ai-sdk/google';
import { generateObject } from 'ai';
import { z } from 'zod';

const todoSchema = z.object({
  title: z.string().describe('할 일의 제목'),
  description: z.string().optional().describe('할 일에 대한 상세 설명'),
  due_date: z.string().optional().describe('마감일 (YYYY-MM-DD 형식)'),
  due_time: z.string().optional().describe('마감 시간 (HH:mm 형식, 24시간 형식)'),
  priority: z.enum(['high', 'medium', 'low']).describe('우선순위'),
  category: z.string().optional().describe('카테고리 (예: 업무, 개인, 학습)'),
});

// 입력 전처리 함수
function preprocessInput(text: string): string {
  // 앞뒤 공백 제거
  let processed = text.trim();

  // 연속된 공백을 하나로 통합
  processed = processed.replace(/\s+/g, ' ');

  // 특수 문자나 이모지 처리 - 위험한 제어 문자만 제거 (일반 특수문자와 이모지는 허용)
  // 제어 문자(탭, 개행 등)는 제거하되, 일반적인 특수문자와 이모지는 유지
  processed = processed.replace(/[\x00-\x08\x0B-\x0C\x0E-\x1F\x7F]/g, '');

  // 대소문자 정규화 - 한국어는 그대로, 영어는 첫 글자만 대문자로 (선택적)
  // 한국어 입력이 주 목적이므로 기본적으로는 그대로 유지
  // 필요시 영문 부분만 정규화할 수 있으나, 현재는 원본 유지

  return processed;
}

// 입력 검증 함수
function validateInput(text: string): { valid: boolean; error?: string } {
  // 빈 문자열 체크
  if (!text || text.trim().length === 0) {
    return { valid: false, error: '입력 텍스트가 필요합니다.' };
  }

  // 최소 길이 제한 (2자)
  if (text.trim().length < 2) {
    return { valid: false, error: '입력은 최소 2자 이상이어야 합니다.' };
  }

  // 최대 길이 제한 (500자)
  if (text.length > 500) {
    return { valid: false, error: '입력은 최대 500자까지 가능합니다.' };
  }

  return { valid: true };
}

// 후처리 함수
function postprocessResult(data: {
  title: string;
  description?: string;
  due_date?: string;
  due_time?: string;
  priority: 'high' | 'medium' | 'low';
  category?: string;
}): {
  title: string;
  description: string;
  due_date: string | null;
  priority: 'high' | 'medium' | 'low';
  category: string;
} {
  // 제목 처리 (너무 길거나 짧은 경우 조정)
  let title = (data.title || '').trim();
  if (title.length === 0) {
    title = '새 할 일';
  } else if (title.length > 100) {
    title = title.substring(0, 97) + '...';
  }

  // 설명 처리
  const description = (data.description || '').trim();

  // 날짜 처리 및 과거 날짜 확인
  let due_datetime: string | null = null;
  if (data.due_date) {
    const time = data.due_time || '09:00';
    const dateTimeStr = `${data.due_date}T${time}`;
    const dueDate = new Date(dateTimeStr);
    const now = new Date();

    // 과거 날짜인지 확인 (하루 이상 과거인 경우만 경고, 당일은 허용)
    const oneDayAgo = new Date(now);
    oneDayAgo.setDate(oneDayAgo.getDate() - 1);
    oneDayAgo.setHours(0, 0, 0, 0);

    dueDate.setHours(0, 0, 0, 0);

    if (dueDate < oneDayAgo) {
      // 과거 날짜는 null로 설정 (또는 경고 후 현재 날짜로 설정 가능)
      // 여기서는 null로 설정
      due_datetime = null;
    } else {
      due_datetime = dateTimeStr;
    }
  }

  // 우선순위 기본값
  const priority = data.priority || 'medium';

  // 카테고리 기본값
  const category = (data.category || '').trim();

  return {
    title,
    description,
    due_date: due_datetime,
    priority,
    category,
  };
}

export async function POST(request: Request) {
  try {
    const { text } = await request.json();

    // 입력 검증
    if (!text || typeof text !== 'string') {
      return Response.json({ error: '입력 텍스트가 필요합니다.' }, { status: 400 });
    }

    // 입력 전처리
    const preprocessedText = preprocessInput(text);

    // 입력 검증 (전처리된 텍스트 기준)
    const validation = validateInput(preprocessedText);
    if (!validation.valid) {
      return Response.json({ error: validation.error }, { status: 400 });
    }

    if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
      return Response.json({ error: 'AI API 키가 설정되지 않았습니다.' }, { status: 500 });
    }

    const now = new Date();
    const currentDateStr = now.toISOString().split('T')[0]; // YYYY-MM-DD
    const currentDayOfWeek = now.toLocaleDateString('ko-KR', { weekday: 'long' });

    const result = await generateObject({
      model: google('gemini-2.5-flash'), // gemini-2.0-flash-exp 대신 안정적인 모델 사용
      schema: todoSchema,
      prompt: `다음 자연어 문장을 분석하여 할 일 정보를 구조화된 JSON 데이터로 변환해주세요.

입력 문장: "${preprocessedText}"

=== 필수 규칙 ===

1. 제목(title): 핵심 작업 내용만 간결하게 추출 (최대 20자 권장)

2. 설명(description): 원문을 기반으로 상세 설명 작성 (선택사항)

3. 날짜(due_date) 변환 규칙 - 반드시 YYYY-MM-DD 형식으로 변환:
   - "오늘" 또는 "오늘까지" → ${currentDateStr}
   - "내일" 또는 "내일까지" → 현재 날짜 + 1일
   - "모레" 또는 "모레까지" → 현재 날짜 + 2일
   - "이번 주 [요일]" (예: "이번 주 금요일") → 가장 가까운 해당 요일
   - "다음 주 [요일]" (예: "다음 주 월요일") → 다음주의 해당 요일
   - "다음주 [요일]" (예: "다음주 월요일") → 다음주의 해당 요일
   - 명시된 날짜가 없으면 null 반환
   - 현재 날짜: ${currentDateStr} (${currentDayOfWeek})

4. 시간(due_time) 변환 규칙 - 반드시 24시간 형식(HH:mm)으로 변환:
   - "아침" 또는 "오전" → 09:00
   - "점심" → 12:00
   - "오후" → 14:00 (명시된 시간이 없을 때만)
   - "저녁" → 18:00
   - "밤" → 21:00
   - "오전 [N]시" → 0N:00 형식 (예: "오전 10시" → 10:00)
   - "오후 [N]시" → (N+12):00 형식 (예: "오후 3시" → 15:00)
   - "N시" → 0N:00 형식 (예: "9시" → 09:00)
   - 시간이 명시되지 않으면 기본값 "09:00" 사용
   - 시간만 있고 분이 없으면 ":00" 추가

5. 우선순위(priority) 판단 규칙 - 반드시 다음 중 하나 선택:
   - "high": 다음 키워드가 포함된 경우 → "급하게", "중요한", "빨리", "꼭", "반드시", "시급", "긴급", "필수"
   - "medium": 다음 키워드가 포함된 경우 또는 키워드 없음 → "보통", "적당히"
   - "low": 다음 키워드가 포함된 경우 → "여유롭게", "천천히", "언젠가", "나중에"

6. 카테고리(category) 분류 규칙:
   - "업무": "회의", "보고서", "프로젝트", "업무", "프레젠테이션", "문서", "협의"
   - "개인": "쇼핑", "친구", "가족", "개인", "약속", "모임"
   - "건강": "운동", "병원", "건강", "요가", "헬스", "검진", "약"
   - "학습": "공부", "책", "강의", "학습", "교육", "독서", "시험"
   - 키워드가 없거나 매칭되지 않으면 null 또는 빈 문자열 반환

=== 출력 형식 ===
반드시 JSON 형식을 준수하여 응답하세요. 모든 필드는 스키마에 맞는 형식으로 변환되어야 합니다.`,
    });

    // 후처리 적용
    const processedResult = postprocessResult(result.object);

    return Response.json({
      ...processedResult,
      completed: false,
    });
  } catch (error) {
    // 상세한 에러 로깅
    console.error('=== AI 파싱 오류 발생 ===');
    console.error('에러 객체:', error);
    console.error('에러 타입:', typeof error);

    if (error instanceof Error) {
      console.error('에러 메시지:', error.message);
      console.error('에러 스택:', error.stack);

      // 에러 객체의 모든 속성 출력 (개발 환경에서만)
      if (process.env.NODE_ENV === 'development') {
        const errorDetails: Record<string, unknown> = {
          name: error.name,
          message: error.message,
          stack: error.stack,
        };

        // cause 속성이 있는 경우 추가
        if ('cause' in error) {
          errorDetails.cause = error.cause;
        }

        // 에러 객체의 다른 속성들 추가
        Object.getOwnPropertyNames(error).forEach(key => {
          if (!errorDetails[key]) {
            errorDetails[key] = (error as unknown as Record<string, unknown>)[key];
          }
        });

        console.error('에러 객체 상세:', errorDetails);
      }
    }

    if (error instanceof Error) {
      const errorMessage = error.message || '';
      const lowerErrorMessage = errorMessage.toLowerCase();

      // API 키 관련 에러 체크 (최우선)
      if (
        lowerErrorMessage.includes('api key') ||
        lowerErrorMessage.includes('invalid api key') ||
        lowerErrorMessage.includes('authentication') ||
        lowerErrorMessage.includes('unauthorized') ||
        errorMessage.includes('401') ||
        errorMessage.includes('UNAUTHENTICATED')
      ) {
        console.error('API 키 오류로 판단');
        return Response.json(
          {
            error:
              'AI API 키가 올바르지 않습니다. 환경 변수 GOOGLE_GENERATIVE_AI_API_KEY를 확인해주세요.',
          },
          { status: 500 }
        );
      }

      // 모델 관련 에러 체크 (두 번째 우선순위)
      if (
        (lowerErrorMessage.includes('model') && lowerErrorMessage.includes('not found')) ||
        lowerErrorMessage.includes('model_not_found') ||
        lowerErrorMessage.includes('invalid model') ||
        errorMessage.includes('404')
      ) {
        console.error('모델 오류로 판단');
        return Response.json(
          { error: `AI 모델을 찾을 수 없습니다. 모델명을 확인해주세요. (${errorMessage})` },
          { status: 500 }
        );
      }

      // API 호출 한도 초과 에러 처리 (매우 엄격한 조건만 체크)
      // "quota" 단어만으로는 판단하지 않고, "quota exceeded" 같이 명확한 표현만 체크
      const isRateLimitError =
        errorMessage.includes('429') ||
        errorMessage.includes('RESOURCE_EXHAUSTED') ||
        (lowerErrorMessage.includes('quota') && lowerErrorMessage.includes('exceeded')) ||
        (lowerErrorMessage.includes('rate limit') && lowerErrorMessage.includes('exceeded'));

      if (isRateLimitError) {
        console.error('한도 초과 오류로 판단');
        console.error('429 에러 상세:', {
          errorMessage,
          errorName: error.name,
          timestamp: new Date().toISOString(),
        });
        return Response.json(
          { error: 'API 호출 한도가 초과되었습니다. 잠시 후 다시 시도해주세요.' },
          { status: 429 }
        );
      }

      // 입력 관련 에러는 400으로 처리
      if (
        errorMessage.includes('400') ||
        errorMessage.includes('INVALID_ARGUMENT') ||
        errorMessage.includes('validation') ||
        errorMessage.includes('Bad Request')
      ) {
        return Response.json(
          { error: `입력 검증에 실패했습니다: ${errorMessage}` },
          { status: 400 }
        );
      }

      // 네트워크 관련 에러
      if (
        errorMessage.includes('network') ||
        errorMessage.includes('fetch') ||
        errorMessage.includes('timeout') ||
        errorMessage.includes('ECONNREFUSED')
      ) {
        return Response.json(
          { error: '네트워크 오류가 발생했습니다. 인터넷 연결을 확인해주세요.' },
          { status: 500 }
        );
      }

      // 기타 에러는 상세 정보와 함께 500으로 처리
      return Response.json(
        {
          error: 'AI 처리 중 오류가 발생했습니다.',
          details: process.env.NODE_ENV === 'development' ? errorMessage : undefined,
        },
        { status: 500 }
      );
    }

    // Error 객체가 아닌 경우
    const errorString = String(error);
    return Response.json(
      {
        error: '알 수 없는 오류가 발생했습니다.',
        details: process.env.NODE_ENV === 'development' ? errorString : undefined,
      },
      { status: 500 }
    );
  }
}
