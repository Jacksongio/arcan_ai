export type MessageRole = 'user' | 'assistant' | 'system';

export interface Message {
  id: string;
  role: MessageRole;
  content: string;
  /** True while tokens are still being streamed in. */
  isStreaming?: boolean;
  createdAt: number;
}

export function createMessage(role: MessageRole, content = ''): Message {
  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    role,
    content,
    createdAt: Date.now(),
  };
}
