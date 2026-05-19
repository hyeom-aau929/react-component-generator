import { describe, test, expect } from 'bun:test';
import { parseStreamChunk, buildComponent } from './streamUtils';

// ─── parseStreamChunk 유닛 테스트 ────────────────────────────────────────────
// SSE 청크 문자열에서 이벤트 배열과 잔여 버퍼를 파싱하는 순수 함수를 테스트한다

describe('parseStreamChunk', () => {
  test('단일 delta 이벤트를 파싱한다', () => {
    const chunk = 'data: {"type":"delta","text":"const "}\n\n';
    const { events, remaining } = parseStreamChunk('', chunk);
    expect(events).toHaveLength(1);
    expect(events[0]).toEqual({ type: 'delta', text: 'const ' });
    expect(remaining).toBe('');
  });

  test('여러 delta 이벤트를 한 번에 파싱한다', () => {
    const chunk =
      'data: {"type":"delta","text":"const "}\n\n' +
      'data: {"type":"delta","text":"Button"}\n\n';
    const { events, remaining } = parseStreamChunk('', chunk);
    expect(events).toHaveLength(2);
    expect(events[0]).toEqual({ type: 'delta', text: 'const ' });
    expect(events[1]).toEqual({ type: 'delta', text: 'Button' });
  });

  test('done 이벤트를 파싱한다', () => {
    const code = 'const A = () => null;\n\nrender(<A />);';
    const chunk = `data: ${JSON.stringify({ type: 'done', code })}\n\n`;
    const { events } = parseStreamChunk('', chunk);
    expect(events).toHaveLength(1);
    expect(events[0]).toEqual({ type: 'done', code });
  });

  test('error 이벤트를 파싱한다', () => {
    const chunk = 'data: {"type":"error","message":"API 오류"}\n\n';
    const { events } = parseStreamChunk('', chunk);
    expect(events[0]).toEqual({ type: 'error', message: 'API 오류' });
  });

  test('[DONE] 종료 신호를 이벤트 목록에서 제외한다', () => {
    const chunk = 'data: [DONE]\n\n';
    const { events } = parseStreamChunk('', chunk);
    expect(events).toHaveLength(0);
  });

  test('불완전한 청크는 잔여 버퍼에 누적된다', () => {
    const partial = 'data: {"type":"delta","text":"con';
    const result = parseStreamChunk('', partial);
    expect(result.events).toHaveLength(0);
    expect(result.remaining).toBe(partial);
  });

  test('이전 버퍼와 새 청크를 결합하여 완전한 이벤트를 파싱한다', () => {
    const prev = 'data: {"type":"delta","text":"con';
    const next = 'st "}\n\n';
    const { events, remaining } = parseStreamChunk(prev, next);
    expect(events).toHaveLength(1);
    expect(events[0]).toEqual({ type: 'delta', text: 'const ' });
    expect(remaining).toBe('');
  });
});

// ─── buildComponent 유닛 테스트 ──────────────────────────────────────────────
// streamingId, prompt, code로 GeneratedComponent를 생성하는 순수 함수를 테스트한다

describe('buildComponent', () => {
  test('id, prompt, code, createdAt을 포함한 컴포넌트를 반환한다', () => {
    const comp = buildComponent('test-id', '버튼 컴포넌트', 'const A = () => null;');
    expect(comp.id).toBe('test-id');
    expect(comp.prompt).toBe('버튼 컴포넌트');
    expect(comp.code).toBe('const A = () => null;');
    expect(comp.createdAt).toBeInstanceOf(Date);
  });
});
