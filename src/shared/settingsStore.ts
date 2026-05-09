import { create } from 'zustand';
import { KEYS, readJSON, writeJSON } from './persistence';

interface Settings {
  ttsEnabled: boolean;
  hapticsEnabled: boolean;
  systemPrompt: string;
  temperature: number;
  maxTokens: number;
}

const DEFAULTS: Settings = {
  ttsEnabled: true,
  hapticsEnabled: true,
  systemPrompt: 'You are ArcanAI, a helpful, concise on-device assistant. Keep replies focused and clear.',
  temperature: 0.7,
  maxTokens: 512,
};

interface SettingsState extends Settings {
  isHydrated: boolean;
  hydrate: () => void;
  update: (patch: Partial<Settings>) => void;
  reset: () => void;
}

export const useSettingsStore = create<SettingsState>(set => ({
  ...DEFAULTS,
  isHydrated: false,

  hydrate: () => {
    const stored = readJSON<Settings>(KEYS.settings) ?? DEFAULTS;
    set({ ...DEFAULTS, ...stored, isHydrated: true });
  },

  update: patch => {
    set(state => {
      const next = { ...state, ...patch };
      const persisted: Settings = {
        ttsEnabled: next.ttsEnabled,
        hapticsEnabled: next.hapticsEnabled,
        systemPrompt: next.systemPrompt,
        temperature: next.temperature,
        maxTokens: next.maxTokens,
      };
      writeJSON(KEYS.settings, persisted);
      return next;
    });
  },

  reset: () => {
    writeJSON(KEYS.settings, DEFAULTS);
    set({ ...DEFAULTS });
  },
}));
