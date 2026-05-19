import { describe, test, expect, mock, beforeEach, afterEach } from 'bun:test';
import { formatSSE, serverFetch } from './index';

// ─── formatSSE 유닛 테스트 ───────────────────────────────────────────────────

describe('formatSSE', () => {
  test('delta 이벤트를 올바른 SSE 포맷으로 직렬화한다', () => {
    const result = formatSSE({ type: 'delta', text: 'const ' });
    expect(result).toBe('data: {"type":"delta","text":"const "}\n\n');
  });

  test('done 이벤트를 올바른 SSE 포맷으로 직렬화한다', () => {
    const result = formatSSE({ type: 'done', code: 'const A = () => null;\n\nrender(<A />);' });
    expect(result).toContain('"type":"done"');
    expect(result).toContain('"code"');
    expect(result.endsWith('\n\n')).toBe(true);
  });

  test('error 이벤트를 올바른 SSE 포맷으로 직렬화한다', () => {
    const result = formatSSE({ type: 'error', message: 'API 오류' });
    expect(result).toBe('data: {"type":"error","message":"API 오류"}\n\n');
  });
});

// ─── POST /api/generate/stream 엔드포인트 테스트 ─────────────────────────────

describe('POST /api/generate/stream', () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    // 각 테스트 전에 fetch를 원래 상태로 복원
    globalThis.fetch = originalFetch;
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  test('API 키 없으면 400 JSON 응답을 반환한다', async () => {
    // 환경변수를 임시로 비워 클라이언트 키도 없는 상황 재현
    const savedAnthropicKey = process.env.ANTHROPIC_API_KEY;
    delete process.env.ANTHROPIC_API_KEY;

    try {
      const req = new Request('http://localhost:3002/api/generate/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: '버튼 컴포넌트', provider: 'anthropic' }),
      });

      const res = await serverFetch(req);
      expect(res.status).toBe(400);

      const data = await res.json() as { error: string };
      expect(data.error).toContain('API key');
    } finally {
      if (savedAnthropicKey !== undefined) process.env.ANTHROPIC_API_KEY = savedAnthropicKey;
    }
  });

  test('프롬프트 없으면 400 JSON 응답을 반환한다', async () => {
    const req = new Request('http://localhost:3002/api/generate/stream', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      // apiKey 명시 → resolvedKey는 비어 있지 않지만 prompt는 빈 문자열
      body: JSON.stringify({ prompt: '', apiKey: 'test-key', provider: 'anthropic' }),
    });

    const res = await serverFetch(req);
    expect(res.status).toBe(400);

    const data = await res.json() as { error: string };
    expect(data.error).toContain('Prompt');
  });

  test('성공 시 Content-Type이 text/event-stream이다', async () => {
    const encoder = new TextEncoder();
    const anthropicSSE = [
      'event: content_block_delta\ndata: {"type":"content_block_delta","index":0,"delta":{"type":"text_delta","text":"const Button = () => null;"}}\n\n',
      'event: message_stop\ndata: {"type":"message_stop"}\n\n',
    ].join('');

    globalThis.fetch = mock(async () =>
      new Response(
        new ReadableStream({
          start(controller) {
            controller.enqueue(encoder.encode(anthropicSSE));
            controller.close();
          },
        }),
        { status: 200, headers: { 'Content-Type': 'text/event-stream' } }
      )
    );

    const req = new Request('http://localhost:3002/api/generate/stream', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt: '버튼', apiKey: 'sk-test', provider: 'anthropic' }),
    });

    const res = await serverFetch(req);
    expect(res.status).toBe(200);
    expect(res.headers.get('Content-Type')).toBe('text/event-stream');
  });

  test('스트림에 delta 이벤트와 마지막에 [DONE]이 포함된다', async () => {
    const encoder = new TextEncoder();
    const anthropicSSE =
      'event: content_block_delta\ndata: {"type":"content_block_delta","index":0,"delta":{"type":"text_delta","text":"const Button = () => null;"}}\n\n' +
      'event: message_stop\ndata: {"type":"message_stop"}\n\n';

    globalThis.fetch = mock(async () =>
      new Response(
        new ReadableStream({
          start(controller) {
            controller.enqueue(encoder.encode(anthropicSSE));
            controller.close();
          },
        }),
        { status: 200 }
      )
    );

    const req = new Request('http://localhost:3002/api/generate/stream', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt: '버튼', apiKey: 'sk-test', provider: 'anthropic' }),
    });

    const res = await serverFetch(req);
    const body = await res.text();

    expect(body).toContain('"type":"delta"');
    expect(body).toContain('data: [DONE]');
  });

  test('스트리밍 API 오류 시 error 이벤트를 포함한 스트림을 반환한다', async () => {
    globalThis.fetch = mock(async () =>
      new Response(null, { status: 401 })
    );

    const req = new Request('http://localhost:3002/api/generate/stream', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt: '버튼', apiKey: 'bad-key', provider: 'anthropic' }),
    });

    const res = await serverFetch(req);
    expect(res.status).toBe(200); // SSE 응답 자체는 200
    expect(res.headers.get('Content-Type')).toBe('text/event-stream');

    const body = await res.text();
    expect(body).toContain('"type":"error"');
    expect(body).toContain('data: [DONE]');
  });
});
