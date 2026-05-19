# AGENTS.md

## Operational Commands

패키지 매니저: **bun 고정** — npm, yarn, pnpm 절대 사용 금지.

```bash
bun install                    # 의존성 설치
bun run dev                    # API 서버 + 프론트엔드 동시 실행 (개발)
bun run server                 # API 서버만 실행 (포트 3002)
bun run build                  # tsc -b && vite build (output: dist/)
bun run lint                   # ESLint 검사
bun run preview                # 빌드 결과물 미리보기
```

개발 시 `bun run dev`는 concurrently로 `bun run server`(blue)와 `vite`(green)를 동시에 실행한다.
백엔드만 수정했을 경우 `bun run server`만 재시작해도 된다 (bun --watch 적용됨).

## Golden Rules

**Immutable (절대 위반 금지)**

- API 키를 코드에 하드코딩하지 마라. `.env` 또는 런타임 UI 입력만 허용.
- `server/index.ts`는 Bun 런타임 전용이다. Node.js/Express API를 사용하지 마라.
- 생성된 컴포넌트 코드(SYSTEM_PROMPT 출력물)에 TypeScript 문법을 포함시키지 마라 — react-live는 TS를 파싱하지 못한다.

**Do's**

- 새 AI 프로바이더 추가 시: `src/types/index.ts` → `src/App.tsx` → `server/index.ts` 순서로 수정.
- `SYSTEM_PROMPT` 수정은 `server/index.ts` 최상단 상수만 편집한다.
- API 키 우선순위: 클라이언트 제공 키 > `.env` 키 > null.
- 프론트엔드 스타일은 `src/App.css`(레이아웃) 또는 `src/index.css`(전역)만 수정한다.

**Don'ts**

- `src/components/`에 CSS import 사용 금지 — 인라인 style 객체만 허용.
- react-live 샌드박스 내 컴포넌트에 `import` 문 작성 금지.
- 컴포넌트 상태(GeneratedComponent[])를 서버에 저장하지 마라. localStorage는 허용 (키: `rcg-components`).

## Project Context

자연어 프롬프트로 React 컴포넌트를 실시간 생성·미리보기하는 UI 워크벤치.
Anthropic Claude / Google Gemini 중 사용자가 프로바이더를 선택할 수 있다.

Tech Stack: React 19, TypeScript, Vite 8, Bun, react-live 4, ESLint 9

## Standards & References

**커밋 메시지**: Conventional Commits 형식, 한국어 본문 허용.
```
feat: 새 기능
fix: 버그 수정
style: 스타일 변경
refactor: 리팩터링
```

**타입 정의**: 모든 신규 타입은 `src/types/index.ts`에 추가한다.

**Maintenance Policy**: 이 파일의 규칙과 실제 코드 간 괴리가 발생하면 업데이트를 제안하라.

## Context Map

- **[백엔드 API 서버 수정](./server/AGENTS.md)** — AI 프로바이더 추가, SYSTEM_PROMPT 튜닝, 엔드포인트 수정 시.
- **[프론트엔드 컴포넌트 수정](./src/AGENTS.md)** — UI 컴포넌트, 훅, 타입 정의, 스타일 수정 시.
