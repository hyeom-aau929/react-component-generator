# server/AGENTS.md

## Module Context

Bun HTTP 서버 단일 파일(`server/index.ts`). AI API 프록시 역할로, CORS 처리 및 API 키 보안을 담당한다.
프론트엔드와 직접 의존성 없음 — JSON API 계약으로만 통신.

## Tech Stack & Constraints

- Bun 런타임 전용: `Bun.serve()`, `process.env` 사용. Node.js `http`/`express` 사용 금지.
- 외부 HTTP 호출은 네이티브 `fetch` 사용 (별도 HTTP 클라이언트 라이브러리 불필요).
- TypeScript 사용 가능하나 컴파일 불필요 — bun이 직접 실행.

## Implementation Patterns

**새 AI 프로바이더 추가 순서:**
1. `type Provider` 유니온에 추가: `'anthropic' | 'google' | 'new'`
2. `ENV_KEYS` Record에 환경변수 추가
3. `callNew(prompt, apiKey)` async 함수 작성
4. `/api/generate` 핸들러의 provider 분기에 케이스 추가
5. `/api/config` 응답의 `envKeys`에 키 존재 여부 추가

**API 응답 출력 파이프라인:**
```
rawText → stripCodeFences() → ensureRenderCall() → { code }
```
모든 프로바이더 출력은 이 파이프라인을 반드시 통과해야 한다.

**에러 응답 포맷**: `Response.json({ error: string }, { status, headers: CORS_HEADERS })`

## Local Golden Rules

**Do's**
- 모든 응답에 `CORS_HEADERS`를 포함한다 (`OPTIONS` preflight 포함).
- API 키는 `resolveApiKey(provider, clientKey)` 함수를 통해서만 결정한다.
- `MAX_TOKENS` finishReason은 명시적 에러로 처리한다 (Google Gemini 전용 케이스).

**Don'ts**
- API 키를 로그에 출력하지 마라.
- `SYSTEM_PROMPT` 외부에 AI 행동 규칙을 분산하지 마라 — 단일 상수로 관리.
- 서버 포트(3002)를 하드코딩된 다른 값으로 변경하지 마라 — vite proxy 설정과 연동됨.

## Testing Strategy

자동화 테스트 없음. 디버깅 방법:
```bash
bun run server          # 서버만 실행 후 curl/Postman으로 엔드포인트 직접 테스트
```
```bash
curl http://localhost:3002/api/config
curl -X POST http://localhost:3002/api/generate \
  -H "Content-Type: application/json" \
  -d '{"prompt":"버튼 컴포넌트","provider":"anthropic","apiKey":"sk-..."}'
```
