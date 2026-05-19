import { useState, useEffect } from 'react';
import type { StreamingState } from '../types';

interface StreamingCardProps {
  streamingState: StreamingState;
}

export function StreamingCard({ streamingState }: StreamingCardProps) {
  const [cursorVisible, setCursorVisible] = useState(true);

  useEffect(() => {
    if (!streamingState.isStreaming) return;
    const id = setInterval(() => setCursorVisible((v) => !v), 500);
    return () => clearInterval(id);
  }, [streamingState.isStreaming]);

  const createdAt = streamingState.createdAt.toLocaleTimeString('ko-KR', {
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <div
      style={{
        background: 'rgba(255, 255, 255, 0.6)',
        backdropFilter: 'blur(20px)',
        border: '1px solid rgba(255, 255, 255, 0.3)',
        borderRadius: '20px',
        boxShadow: '0 4px 12px rgba(15, 23, 42, 0.08)',
        overflow: 'hidden',
        animation: 'slideUp 0.6s cubic-bezier(0.34, 1.56, 0.64, 1)',
      }}
    >
      {/* 헤더 */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          gap: '20px',
          padding: '20px 24px 16px',
          borderBottom: '1px solid rgba(226, 232, 240, 0.6)',
        }}
      >
        <div>
          <span
            style={{
              fontSize: '0.75rem',
              color: '#94a3b8',
              fontWeight: 500,
              textTransform: 'uppercase',
              letterSpacing: '0.04em',
            }}
          >
            {createdAt}
          </span>
          <p
            style={{
              marginTop: '8px',
              color: '#0f172a',
              fontSize: '1.05rem',
              fontWeight: 600,
              margin: '8px 0 0',
            }}
          >
            {streamingState.prompt}
          </p>
        </div>

        {/* 생성 중 배지 */}
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            padding: '6px 14px',
            background: 'linear-gradient(135deg, rgba(236,72,153,0.12), rgba(139,92,246,0.12))',
            border: '1px solid rgba(236,72,153,0.25)',
            borderRadius: '20px',
            fontSize: '0.78rem',
            fontWeight: 600,
            color: '#ec4899',
            whiteSpace: 'nowrap',
            flexShrink: 0,
          }}
        >
          <span
            style={{
              display: 'inline-block',
              width: '7px',
              height: '7px',
              borderRadius: '50%',
              background: '#ec4899',
              animation: 'pulse 1.2s ease-in-out infinite',
            }}
          />
          생성 중
        </span>
      </div>

      {/* 탭 바: preview 비활성, code 활성 */}
      <div
        style={{
          display: 'flex',
          gap: '4px',
          padding: '12px 16px 0',
          borderBottom: '1px solid rgba(226, 232, 240, 0.6)',
        }}
      >
        <button
          disabled
          style={{
            padding: '8px 16px',
            border: 'none',
            borderRadius: '8px 8px 0 0',
            background: 'transparent',
            color: '#94a3b8',
            fontWeight: 500,
            fontSize: '0.9rem',
            cursor: 'not-allowed',
            opacity: 0.45,
          }}
        >
          미리보기
        </button>
        <button
          style={{
            padding: '8px 16px',
            border: 'none',
            borderRadius: '8px 8px 0 0',
            background: 'linear-gradient(135deg, rgba(236,72,153,0.12), rgba(139,92,246,0.12))',
            color: '#ec4899',
            fontWeight: 600,
            fontSize: '0.9rem',
            cursor: 'default',
          }}
        >
          코드
        </button>
      </div>

      {/* 코드 뷰 */}
      <div
        style={{
          minHeight: '300px',
          background: '#ffffff',
          padding: '20px 24px',
          overflow: 'auto',
        }}
      >
        <pre
          style={{
            margin: 0,
            fontFamily: "'JetBrains Mono', 'Fira Code', 'Consolas', monospace",
            fontSize: '0.85rem',
            lineHeight: 1.6,
            color: '#1e293b',
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word',
          }}
        >
          {streamingState.streamingCode}
          {streamingState.isStreaming && (
            <span
              style={{
                display: 'inline-block',
                width: '2px',
                height: '1em',
                background: '#ec4899',
                verticalAlign: 'text-bottom',
                marginLeft: '1px',
                opacity: cursorVisible ? 1 : 0,
                transition: 'opacity 0.1s',
              }}
            />
          )}
        </pre>
      </div>
    </div>
  );
}
