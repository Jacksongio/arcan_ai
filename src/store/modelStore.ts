import { create } from 'zustand';
import { MLCModel } from '../types';
import { KEYS, readJSON, storage, writeJSON } from './persistence';

interface ModelState {
  models: MLCModel[];
  selectedModelId?: string;
  isHydrated: boolean;

  hydrate: () => void;
  setModels: (models: MLCModel[]) => void;
  upsertModel: (model: MLCModel) => void;
  removeModel: (id: string) => void;
  selectModel: (id: string | undefined) => void;
  selectedModel: () => MLCModel | undefined;
}

export const useModelStore = create<ModelState>((set, get) => ({
  models: [],
  selectedModelId: undefined,
  isHydrated: false,

  hydrate: () => {
    const models = readJSON<MLCModel[]>(KEYS.models) ?? [];
    const selectedModelId = storage.getString(KEYS.selectedModelId);
    set({ models, selectedModelId, isHydrated: true });
  },

  setModels: models => {
    writeJSON(KEYS.models, models);
    set({ models });
  },

  upsertModel: model => {
    const next = [...get().models.filter(m => m.id !== model.id), model];
    writeJSON(KEYS.models, next);
    set({ models: next });
  },

  removeModel: id => {
    const next = get().models.filter(m => m.id !== id);
    writeJSON(KEYS.models, next);
    const selected = get().selectedModelId === id ? undefined : get().selectedModelId;
    if (selected === undefined) {
      storage.delete(KEYS.selectedModelId);
    }
    set({ models: next, selectedModelId: selected });
  },

  selectModel: id => {
    if (id === undefined) {
      storage.delete(KEYS.selectedModelId);
    } else {
      storage.set(KEYS.selectedModelId, id);
    }
    set({ selectedModelId: id });
  },

  selectedModel: () => {
    const { models, selectedModelId } = get();
    return models.find(m => m.id === selectedModelId);
  },
}));
