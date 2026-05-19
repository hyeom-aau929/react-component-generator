import { LiveProvider, LivePreview as ReactLivePreview, LiveError } from 'react-live';

type ViewportSize = 'mobile' | 'tablet' | 'desktop';

interface LivePreviewProps {
  code: string;
  viewportSize?: ViewportSize;
}

const viewportWidths: Record<ViewportSize, string> = {
  mobile: '375px',
  tablet: '768px',
  desktop: '100%',
};

export function LivePreview({ code, viewportSize = 'desktop' }: LivePreviewProps) {
  return (
    <div className="preview-panel">
      <div className="panel-header">
        <h3>미리보기</h3>
      </div>
      <div className="preview-content">
        <LiveProvider code={code} noInline>
          <div className="preview-render">
            <div
              className="preview-viewport-wrapper"
              style={{ maxWidth: viewportWidths[viewportSize] }}
            >
              <ReactLivePreview />
            </div>
          </div>
          <LiveError className="preview-error" />
        </LiveProvider>
      </div>
    </div>
  );
}
