import type { SSEEvent, GeneratedComponent } from '../types';

export interface ParseResult {
  events: SSEEvent[];
  remaining: string;
}

export function parseStreamChunk(prevBuffer: string, newChunk: string): ParseResult {
  const buffer = prevBuffer + newChunk;
  const lines = buffer.split('\n');
  const lastElement = lines.pop() ?? '';
  // buffer가 \n으로 끝나면 lastElement는 빈 문자열 → 잔여 없음
  const remaining = buffer.endsWith('\n') ? '' : lastElement;

  const events: SSEEvent[] = [];

  for (const line of lines) {
    if (!line.startsWith('data: ')) continue;
    const data = line.slice(6);
    if (data === '[DONE]') continue;
    try {
      events.push(JSON.parse(data) as SSEEvent);
    } catch {
      // 파싱 실패 라인 무시
    }
  }

  return { events, remaining };
}

export function buildComponent(
  id: string,
  prompt: string,
  code: string
): GeneratedComponent {
  return { id, prompt, code, createdAt: new Date() };
}
