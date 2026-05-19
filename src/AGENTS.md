# src/AGENTS.md

## Module Context

React 19 + TypeScript 프론트엔드. 글라스모피즘 디자인의 단일 페이지 앱으로,
컴포넌트 생성 상태는 `useComponentGenerator` 훅이 관리하며 localStorage(`rcg-components`)를 통해 새로고침 후에도 유지된다.

## Tech Stack & Constraints

- React 19: `React.useState`, `React.useEffect` 등 전역 React 사용 가능.
- react-live 4: 생성된 컴포넌트를 런타임 샌드박스에서 렌더링 — 오직 plain JS JSX만 허용.
- 스타일링: CSS 파일 직접 수정 또는 인라인 style 객체. CSS-in-JS 라이브러리 없음.
- 폰트: Pretendard (`src/index.css`에 정의됨).

## Implementation Patterns

**신규 UI 컴포넌트 추가:**
1. `src/components/NewComponent.tsx` 생성
2. `src/App.tsx`에서 import 후 레이아웃에 배치
3. 필요한 타입은 `src/types/index.ts`에 추가
4. 스타일은 `src/App.css` (컴포넌트 레벨) 또는 `src/index.css` (전역)에 추가

**훅 패턴:**
`useComponentGenerator`는 `components`, `isLoading`, `error`, `generate`, `removeComponent`, `clearAll`을 반환한다.
추가 상태가 필요하면 이 훅을 확장하거나 별도 훅을 `src/hooks/`에 추가한다.

**컴포넌트 ID 생성:** `${Date.now()}-${Math.random().toString(36).slice(2, 7)}` 패턴 유지.

**API 호출:** 백엔드 엔드포인트는 `fetch('/api/generate', ...)` 상대 경로 사용 (vite proxy 경유).

## Local Golden Rules

**Do's**
- `src/types/index.ts`의 `Provider` 타입과 `GeneratedComponent` 인터페이스를 항상 소스 오브 트루스로 사용한다.
- `ComponentCard`에서 탭(preview/code) 전환은 로컬 상태로만 관리한다.
- 글라스모피즘 스타일(`backdrop-filter`, `rgba` 배경) 일관성을 유지한다.

**Don'ts**
- `src/components/` 내 파일에서 CSS 파일을 import하지 마라.
- `LivePreview`에 전달하는 코드 문자열에 TypeScript 문법을 포함시키지 마라 — 파싱 오류 발생.
- `GeneratedComponent` 배열을 sessionStorage나 API에 저장하지 마라. localStorage는 허용 (키: `rcg-components`).
- App.tsx에 비즈니스 로직을 직접 작성하지 마라 — 훅으로 위임한다.

## Testing Strategy

자동화 테스트 없음. 기능 검증 방법:
- `bun run dev` 실행 후 브라우저 DevTools Console에서 에러 확인.
- react-live 렌더링 오류는 `LivePreview` 컴포넌트가 자체 에러 경계로 표시한다.
- 타입 오류: `bun run build`의 `tsc -b` 단계에서 확인.
