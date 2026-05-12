import { create } from 'zustand';
import { Conversation, createConversation, Message } from './types';
import { KEYS, readJSON, storage, writeJSON } from './persistence';

interface ChatState {
  conversations: Conversation[];
  currentConversationId?: string;
  isHydrated: boolean;

  hydrate: () => void;
  startNewConversation: (modelId?: string) => Conversation;
  selectConversation: (id: string) => void;
  deleteConversation: (id: string) => void;
  appendMessage: (conversationId: string, message: Message) => void;
  updateMessage: (
    conversationId: string,
    messageId: string,
    updater: (m: Message) => Message,
  ) => void;
  truncateFromMessage: (conversationId: string, messageId: string) => void;
  clearCurrent: () => void;
  current: () => Conversation | undefined;
}

function persist(state: { conversations: Conversation[]; currentConversationId?: string }) {
  writeJSON(KEYS.conversations, state.conversations);
  if (state.currentConversationId) {
    storage.set(KEYS.currentConversationId, state.currentConversationId);
  } else {
    storage.delete(KEYS.currentConversationId);
  }
}

export const useChatStore = create<ChatState>((set, get) => ({
  conversations: [],
  currentConversationId: undefined,
  isHydrated: false,

  hydrate: () => {
    const conversations = readJSON<Conversation[]>(KEYS.conversations) ?? [];
    const currentConversationId = storage.getString(KEYS.currentConversationId);
    set({ conversations, currentConversationId, isHydrated: true });
  },

  startNewConversation: modelId => {
    const conversation = createConversation(modelId);
    const next = { conversations: [conversation, ...get().conversations], currentConversationId: conversation.id };
    persist(next);
    set(next);
    return conversation;
  },

  selectConversation: id => {
    storage.set(KEYS.currentConversationId, id);
    set({ currentConversationId: id });
  },

  deleteConversation: id => {
    const conversations = get().conversations.filter(c => c.id !== id);
    const currentConversationId =
      get().currentConversationId === id ? conversations[0]?.id : get().currentConversationId;
    persist({ conversations, currentConversationId });
    set({ conversations, currentConversationId });
  },

  appendMessage: (conversationId, message) => {
    const conversations = get().conversations.map(c =>
      c.id === conversationId
        ? { ...c, messages: [...c.messages, message], updatedAt: Date.now() }
        : c,
    );
    persist({ conversations, currentConversationId: get().currentConversationId });
    set({ conversations });
  },

  updateMessage: (conversationId, messageId, updater) => {
    const conversations = get().conversations.map(c =>
      c.id === conversationId
        ? {
            ...c,
            messages: c.messages.map(m => (m.id === messageId ? updater(m) : m)),
            updatedAt: Date.now(),
          }
        : c,
    );
    persist({ conversations, currentConversationId: get().currentConversationId });
    set({ conversations });
  },

  truncateFromMessage: (conversationId, messageId) => {
    const conversations = get().conversations.map(c => {
      if (c.id !== conversationId) return c;
      const idx = c.messages.findIndex(m => m.id === messageId);
      if (idx < 0) return c;
      return { ...c, messages: c.messages.slice(0, idx), updatedAt: Date.now() };
    });
    persist({ conversations, currentConversationId: get().currentConversationId });
    set({ conversations });
  },

  clearCurrent: () => {
    const id = get().currentConversationId;
    if (!id) return;
    const conversations = get().conversations.map(c =>
      c.id === id ? { ...c, messages: [], updatedAt: Date.now() } : c,
    );
    persist({ conversations, currentConversationId: id });
    set({ conversations });
  },

  current: () => {
    const { conversations, currentConversationId } = get();
    return conversations.find(c => c.id === currentConversationId);
  },
}));
