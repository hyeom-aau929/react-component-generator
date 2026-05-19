export type Provider = 'anthropic' | 'google';

export interface GeneratedComponent {
  id: string;
  prompt: string;
  code: string;
  createdAt: Date;
}

export interface SSEDeltaEvent { type: 'delta'; text: string; }
export interface SSEDoneEvent  { type: 'done';  code: string; }
export interface SSEErrorEvent { type: 'error'; message: string; }
export type SSEEvent = SSEDeltaEvent | SSEDoneEvent | SSEErrorEvent;

export interface StreamingState {
  id: string;
  prompt: string;
  streamingCode: string;
  isStreaming: boolean;
  createdAt: Date;
}
