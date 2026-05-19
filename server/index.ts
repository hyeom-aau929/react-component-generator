const SYSTEM_PROMPT = `You are a React component generator. Generate a single React component based on the user's description.

Rules:
- Use inline styles only (no CSS imports, no CSS modules)
- Do NOT use import statements — React is already available in scope as a global
- Define the component as a function, then call render(<ComponentName />) at the end
- Make the component visually appealing with proper styling
- Use React hooks if needed (e.g., React.useState, React.useEffect)
- The component must be completely self-contained
- Respond with ONLY the code block — no explanations, no markdown fences
- Use descriptive variable names and clean formatting
- For colors, prefer modern palettes (gradients, shadows, etc.)
- Ensure the component is interactive where appropriate (hover states, click handlers, etc.)
- Do NOT use TypeScript syntax — no type annotations, no interfaces, no generics, no "as" casts. Write plain JavaScript only.

Example output format:
const GradientButton = () => {
  const [hovered, setHovered] = React.useState(false);

  return (
    <button
      style={{
        background: hovered
          ? 'linear-gradient(135deg, #667eea, #764ba2)'
          : 'linear-gradient(135deg, #764ba2, #667eea)',
        color: 'white',
        border: 'none',
        padding: '12px 24px',
        borderRadius: '8px',
        fontSize: '16px',
        cursor: 'pointer',
        transition: 'all 0.3s ease',
        transform: hovered ? 'scale(1.05)' : 'scale(1)',
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      Click me
    </button>
  );
};

render(<GradientButton />);`;

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

const SSE_HEADERS = {
  ...CORS_HEADERS,
  'Content-Type': 'text/event-stream',
  'Cache-Control': 'no-cache',
  Connection: 'keep-alive',
};

type Provider = 'anthropic' | 'google';

type SSEEvent =
  | { type: 'delta'; text: string }
  | { type: 'done'; code: string }
  | { type: 'error'; message: string };

// process.env를 동적으로 읽어 테스트 시 env 조작이 가능하도록 함
function resolveApiKey(provider: Provider, clientKey?: string): string | null {
  const envKey =
    provider === 'anthropic' ? process.env.ANTHROPIC_API_KEY : process.env.GOOGLE_API_KEY;
  return clientKey || envKey || null;
}

export function formatSSE(event: SSEEvent): string {
  return `data: ${JSON.stringify(event)}\n\n`;
}

const SSE_DONE = 'data: [DONE]\n\n';

function stripCodeFences(text: string): string {
  return text
    .replace(/^```(?:jsx|tsx|javascript|typescript)?\n?/gm, '')
    .replace(/```$/gm, '')
    .trim();
}

function ensureRenderCall(code: string): string {
  if (/\brender\s*\(/.test(code)) return code;

  const match = code.match(/(?:const|function)\s+([A-Z]\w+)/);
  if (match) {
    return `${code}\n\nrender(<${match[1]} />);`;
  }
  return code;
}

// SSE 버퍼에서 완전한 라인 배열을 추출하고 나머지 버퍼를 반환한다
function parseSSELines(buffer: string): { lines: string[]; remaining: string } {
  const parts = buffer.split('\n');
  const remaining = parts.pop() ?? '';
  return { lines: parts, remaining };
}

async function callAnthropic(prompt: string, apiKey: string): Promise<string> {
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 4096,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: prompt }],
    }),
  });

  if (!response.ok) {
    throw new Error(`Claude API error: ${response.status}`);
  }

  const data = (await response.json()) as {
    content: Array<{ type: string; text?: string }>;
  };

  return data.content
    .filter((block) => block.type === 'text')
    .map((block) => block.text)
    .join('');
}

async function callGoogle(prompt: string, apiKey: string): Promise<string> {
  const model = 'gemini-2.5-flash';
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      system_instruction: { parts: [{ text: SYSTEM_PROMPT }] },
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: { maxOutputTokens: 8192 },
    }),
  });

  if (!response.ok) {
    throw new Error(`Gemini API error: ${response.status}`);
  }

  const data = (await response.json()) as {
    candidates: Array<{
      content: { parts: Array<{ text?: string }> };
      finishReason?: string;
    }>;
  };

  const candidate = data.candidates?.[0];
  if (candidate?.finishReason === 'MAX_TOKENS') {
    throw new Error('생성된 코드가 너무 길어 잘렸습니다. 더 간단한 컴포넌트를 요청해주세요.');
  }

  return (
    candidate?.content?.parts
      ?.map((part) => part.text)
      ?.join('') ?? ''
  );
}

async function streamAnthropic(
  prompt: string,
  apiKey: string,
  writer: WritableStreamDefaultWriter<Uint8Array>
): Promise<void> {
  const encoder = new TextEncoder();

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 4096,
      stream: true,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: prompt }],
    }),
  });

  if (!response.ok) {
    throw new Error(`Claude API error: ${response.status}`);
  }

  const reader = response.body!.getReader();
  const decoder = new TextDecoder();
  let fullText = '';
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const { lines, remaining } = parseSSELines(buffer);
    buffer = remaining;

    for (const line of lines) {
      if (!line.startsWith('data: ')) continue;
      const data = line.slice(6);
      if (data === '[DONE]') continue;

      try {
        const parsed = JSON.parse(data) as {
          type: string;
          delta?: { type: string; text?: string };
        };

        if (
          parsed.type === 'content_block_delta' &&
          parsed.delta?.type === 'text_delta'
        ) {
          const chunk = parsed.delta.text ?? '';
          fullText += chunk;
          await writer.write(encoder.encode(formatSSE({ type: 'delta', text: chunk })));
        }
      } catch {
        // 파싱 실패 라인 무시
      }
    }
  }

  const finalCode = ensureRenderCall(stripCodeFences(fullText));
  await writer.write(encoder.encode(formatSSE({ type: 'done', code: finalCode })));
}

async function streamGoogle(
  prompt: string,
  apiKey: string,
  writer: WritableStreamDefaultWriter<Uint8Array>
): Promise<void> {
  const encoder = new TextEncoder();
  const model = 'gemini-2.5-flash';
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:streamGenerateContent?alt=sse&key=${apiKey}`;

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      system_instruction: { parts: [{ text: SYSTEM_PROMPT }] },
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: { maxOutputTokens: 8192 },
    }),
  });

  if (!response.ok) {
    throw new Error(`Gemini API error: ${response.status}`);
  }

  const reader = response.body!.getReader();
  const decoder = new TextDecoder();
  let fullText = '';
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const { lines, remaining } = parseSSELines(buffer);
    buffer = remaining;

    for (const line of lines) {
      if (!line.startsWith('data: ')) continue;
      const data = line.slice(6).trim();

      try {
        const parsed = JSON.parse(data) as {
          candidates?: Array<{
            content: { parts: Array<{ text?: string }> };
            finishReason?: string;
          }>;
        };

        const candidate = parsed.candidates?.[0];
        if (candidate?.finishReason === 'MAX_TOKENS') {
          throw new Error('생성된 코드가 너무 길어 잘렸습니다. 더 간단한 컴포넌트를 요청해주세요.');
        }

        const chunk = candidate?.content?.parts?.map((p) => p.text).join('') ?? '';
        if (chunk) {
          fullText += chunk;
          await writer.write(encoder.encode(formatSSE({ type: 'delta', text: chunk })));
        }
      } catch (e) {
        if (e instanceof Error && e.message.includes('잘렸습니다')) throw e;
        // 파싱 실패 라인 무시
      }
    }
  }

  const finalCode = ensureRenderCall(stripCodeFences(fullText));
  await writer.write(encoder.encode(formatSSE({ type: 'done', code: finalCode })));
}

// ─── 공통 유효성 검사 ────────────────────────────────────────────────────────

type ValidateResult =
  | { ok: true; prompt: string; resolvedKey: string; provider: Provider }
  | { ok: false; response: Response };

async function validateGenerateRequest(req: Request): Promise<ValidateResult> {
  const { prompt, apiKey, provider = 'anthropic' } = (await req.json()) as {
    prompt: string;
    apiKey?: string;
    provider?: Provider;
  };

  const resolvedKey = resolveApiKey(provider, apiKey);

  if (!resolvedKey) {
    return {
      ok: false,
      response: Response.json(
        { error: `API key is required. Set ${provider === 'anthropic' ? 'ANTHROPIC_API_KEY' : 'GOOGLE_API_KEY'} in .env or enter it manually.` },
        { status: 400, headers: CORS_HEADERS }
      ),
    };
  }

  if (!prompt) {
    return {
      ok: false,
      response: Response.json(
        { error: 'Prompt is required' },
        { status: 400, headers: CORS_HEADERS }
      ),
    };
  }

  return { ok: true, prompt, resolvedKey, provider };
}

// ─── 요청 핸들러 (테스트 가능하도록 export) ──────────────────────────────────

export async function serverFetch(req: Request): Promise<Response> {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: CORS_HEADERS });
  }

  const url = new URL(req.url);

  if (req.method === 'GET' && url.pathname === '/api/config') {
    return Response.json(
      {
        envKeys: {
          anthropic: !!process.env.ANTHROPIC_API_KEY,
          google: !!process.env.GOOGLE_API_KEY,
        },
      },
      { headers: CORS_HEADERS }
    );
  }

  if (req.method === 'POST' && url.pathname === '/api/generate') {
    try {
      const validated = await validateGenerateRequest(req);
      if (!validated.ok) return validated.response;

      const { prompt, resolvedKey, provider } = validated;

      const text =
        provider === 'google'
          ? await callGoogle(prompt, resolvedKey)
          : await callAnthropic(prompt, resolvedKey);

      const code = ensureRenderCall(stripCodeFences(text));

      return Response.json({ code }, { headers: CORS_HEADERS });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';

      if (message.includes('503')) {
        return Response.json(
          { error: 'API 서버가 일시적으로 과부하 상태입니다. 잠시 후 다시 시도해주세요.' },
          { status: 503, headers: CORS_HEADERS }
        );
      }

      if (message.includes('429')) {
        return Response.json(
          { error: '요청이 너무 많습니다. 잠시 후 다시 시도해주세요.' },
          { status: 429, headers: CORS_HEADERS }
        );
      }

      return Response.json(
        { error: message },
        { status: 500, headers: CORS_HEADERS }
      );
    }
  }

  if (req.method === 'POST' && url.pathname === '/api/generate/stream') {
    try {
      const validated = await validateGenerateRequest(req);
      if (!validated.ok) return validated.response;

      const { prompt, resolvedKey, provider } = validated;
      const { readable, writable } = new TransformStream<Uint8Array, Uint8Array>();
      const writer = writable.getWriter();
      const encoder = new TextEncoder();

      (async () => {
        try {
          if (provider === 'google') {
            await streamGoogle(prompt, resolvedKey, writer);
          } else {
            await streamAnthropic(prompt, resolvedKey, writer);
          }
        } catch (err) {
          const message = err instanceof Error ? err.message : 'Unknown error';
          await writer.write(encoder.encode(formatSSE({ type: 'error', message })));
        } finally {
          await writer.write(encoder.encode(SSE_DONE));
          await writer.close();
        }
      })();

      return new Response(readable, { headers: SSE_HEADERS });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      return Response.json({ error: message }, { status: 500, headers: CORS_HEADERS });
    }
  }

  return Response.json(
    { error: 'Not found' },
    { status: 404, headers: CORS_HEADERS }
  );
}

// ─── 서버 시작 (직접 실행 시에만) ────────────────────────────────────────────

if (import.meta.main) {
  const server = Bun.serve({ port: 3002, fetch: serverFetch });
  console.log(`API server running at http://localhost:${server.port}`);
}
