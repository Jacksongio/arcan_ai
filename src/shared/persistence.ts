import { MMKV } from 'react-native-mmkv';

export const storage = new MMKV({ id: 'arcan-ai-store' });

export const KEYS = {
  models: 'models.v1',
  selectedModelId: 'selectedModelId.v1',
  conversations: 'conversations.v1',
  currentConversationId: 'currentConversationId.v1',
  settings: 'settings.v1',
} as const;

export function readJSON<T>(key: string): T | undefined {
  const raw = storage.getString(key);
  if (!raw) return undefined;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return undefined;
  }
}

export function writeJSON<T>(key: string, value: T): void {
  storage.set(key, JSON.stringify(value));
}
