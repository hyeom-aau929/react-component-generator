import { useState, useCallback, useEffect } from 'react';
import type { GeneratedComponent, Provider } from '../types';

const STORAGE_KEY = 'rcg-components';

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
  generate: (prompt: string, apiKey: string | undefined, provider: Provider) => Promise<void>;
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

      const newComponent: GeneratedComponent = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        prompt,
        code: data.code,
        createdAt: new Date(),
      };

      setComponents((prev) => [newComponent, ...prev]);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(message);
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

  return { components, isLoading, error, generate, removeComponent, clearAll };
}
