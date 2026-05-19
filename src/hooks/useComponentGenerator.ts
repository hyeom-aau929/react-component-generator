import { useState, useCallback, useEffect } from 'react';
import type { GeneratedComponent, Provider, StreamingState } from '../types';
import { parseStreamChunk, buildComponent } from './streamUtils';

const STORAGE_KEY = 'rcg-components';

function createComponentId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

function isValidComponent(c: unknown): c is Omit<GeneratedComponent, 'createdAt'> & { createdAt: string } {
  return (
    typeof c === 'object' &&
    c !== null &&
    typeof (c as Record<string, unknown>).id === 'string' &&
    typeof (c as Record<string, unknown>).prompt === 'string' &&
    typeof (c as Record<string, unknown>).code === 'string' &&
    typeof (c as Record<string, unknown>).createdAt === 'string'
  );
}

interface UseComponentGeneratorReturn {
  components: GeneratedComponent[];
  isLoading: boolean;
  error: string | null;
  streamingState: StreamingState | null;
  generate: (prompt: string, apiKey: string | undefined, provider: Provider) => Promise<void>;
  generateStream: (prompt: string, apiKey: string | undefined, provider: Provider) => Promise<void>;
  removeComponent: (id: string) => void;
  clearAll: () => void;
}

export function useComponentGenerator(): UseComponentGeneratorReturn {
  const [components, setComponents] = useState<GeneratedComponent[]>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (!stored) return [];
      const parsed: unknown[] = JSON.parse(stored);
      if (!Array.isArray(parsed)) return [];
      return parsed
        .filter(isValidComponent)
        .map((c) => ({ ...c, createdAt: new Date(c.createdAt) }));
    } catch {
      return [];
    }
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [streamingState, setStreamingState] = useState<StreamingState | null>(null);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(components));
    } catch {
      // quota 초과 등 쓰기 실패 시 무시 — 읽기는 정상 동작 유지
    }
  }, [components]);

  const generate = useCallback(async (prompt: string, apiKey: string | undefined, provider: Provider) => {
    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, ...(apiKey && { apiKey }), provider }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to generate component');
      }

      setComponents((prev) => [
        buildComponent(createComponentId(), prompt, data.code),
        ...prev,
      ]);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const generateStream = useCallback(async (
    prompt: string,
    apiKey: string | undefined,
    provider: Provider
  ) => {
    const id = createComponentId();

    setIsLoading(true);
    setError(null);
    setStreamingState({ id, prompt, streamingCode: '', isStreaming: true, createdAt: new Date() });

    try {
      const res = await fetch('/api/generate/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, ...(apiKey && { apiKey }), provider }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to generate component');
      }

      const reader = res.body!.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const { events, remaining } = parseStreamChunk(buffer, decoder.decode(value, { stream: true }));
        buffer = remaining;

        for (const event of events) {
          if (event.type === 'delta') {
            setStreamingState((prev) =>
              prev ? { ...prev, streamingCode: prev.streamingCode + event.text } : prev
            );
          } else if (event.type === 'done') {
            setComponents((prev) => [buildComponent(id, prompt, event.code), ...prev]);
            setStreamingState(null);
          } else if (event.type === 'error') {
            throw new Error(event.message);
          }
        }
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(message);
      setStreamingState(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const removeComponent = useCallback((id: string) => {
    setComponents((prev) => prev.filter((c) => c.id !== id));
  }, []);

  const clearAll = useCallback(() => {
    setComponents([]);
  }, []);

  return {
    components,
    isLoading,
    error,
    streamingState,
    generate,
    generateStream,
    removeComponent,
    clearAll,
  };
}
