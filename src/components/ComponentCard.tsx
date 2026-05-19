import { useState } from 'react';
import type { GeneratedComponent } from '../types';
import { LivePreview } from './LivePreview';
import { CodeView } from './CodeView';

interface ComponentCardProps {
  component: GeneratedComponent;
  onRemove: (id: string) => void;
  onRegenerate: (prompt: string) => void;
  isLoading: boolean;
}

type Tab = 'preview' | 'code';
type ViewportSize = 'mobile' | 'tablet' | 'desktop';

export function ComponentCard({ component, onRemove, onRegenerate, isLoading }: ComponentCardProps) {
  const [activeTab, setActiveTab] = useState<Tab>('preview');
  const [previewKey, setPreviewKey] = useState(0);
  const [viewportSize, setViewportSize] = useState<ViewportSize>('desktop');
  const createdAt = component.createdAt.toLocaleTimeString('ko-KR', {
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <div className="component-card">
      <div className="card-header">
        <div className="card-title-group">
          <span>{createdAt}</span>
          <p className="card-prompt">{component.prompt}</p>
        </div>
        <div className="card-actions">
          <button
            className="btn-refresh"
            onClick={() => setPreviewKey((k) => k + 1)}
            title="미리보기 새로고침"
            aria-label="미리보기 새로고침"
          >
            ↻
          </button>
          <button
            className="btn-regenerate"
            onClick={() => onRegenerate(component.prompt)}
            disabled={isLoading}
          >
            {isLoading ? '생성 중...' : '재생성'}
          </button>
          <button
            className="btn-remove"
            onClick={() => onRemove(component.id)}
          >
            삭제
          </button>
        </div>
      </div>
      <div className="card-tabs">
        <div className="card-tabs-main">
          <button
            className={`tab ${activeTab === 'preview' ? 'tab--active' : ''}`}
            onClick={() => setActiveTab('preview')}
          >
            미리보기
          </button>
          <button
            className={`tab ${activeTab === 'code' ? 'tab--active' : ''}`}
            onClick={() => setActiveTab('code')}
          >
            코드
          </button>
        </div>
        {activeTab === 'preview' && (
          <div className="viewport-controls">
            <button
              className={`viewport-btn ${viewportSize === 'mobile' ? 'viewport-btn--active' : ''}`}
              onClick={() => setViewportSize('mobile')}
              title="모바일 (375px)"
            >
              모바일
            </button>
            <button
              className={`viewport-btn ${viewportSize === 'tablet' ? 'viewport-btn--active' : ''}`}
              onClick={() => setViewportSize('tablet')}
              title="태블릿 (768px)"
            >
              태블릿
            </button>
            <button
              className={`viewport-btn ${viewportSize === 'desktop' ? 'viewport-btn--active' : ''}`}
              onClick={() => setViewportSize('desktop')}
              title="데스크탑"
            >
              데스크탑
            </button>
          </div>
        )}
      </div>
      <div className="card-content">
        {activeTab === 'preview' ? (
          <LivePreview key={previewKey} code={component.code} viewportSize={viewportSize} />
        ) : (
          <CodeView code={component.code} />
        )}
      </div>
    </div>
  );
}
