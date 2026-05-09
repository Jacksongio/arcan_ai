import { Message } from './message';

export interface Conversation {
  id: string;
  title: string;
  messages: Message[];
  modelId?: string;
  createdAt: number;
  updatedAt: number;
}

export function createConversation(modelId?: string, title = 'New chat'): Conversation {
  const now = Date.now();
  return {
    id: `conv-${now}-${Math.random().toString(36).slice(2, 8)}`,
    title,
    messages: [],
    modelId,
    createdAt: now,
    updatedAt: now,
  };
}
