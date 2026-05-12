// ── Model ──

export type ModelFamily = 'gemma' | 'llama' | 'mistral' | 'phi' | 'qwen' | 'unknown';

export type ModelKind = 'custom';

export interface MLCModel {
  id: string;
  displayName: string;
  family: ModelFamily;
  kind: ModelKind;
  filePath?: string;
  sizeLabel?: string;
  sizeBytes?: number;
  quantization?: string;
  parameters?: string;
  recommendedCtx: number;
}

const FAMILY_PATTERNS: Array<[RegExp, ModelFamily]> = [
  [/gemma/i, 'gemma'],
  [/llama/i, 'llama'],
  [/mistral|mixtral/i, 'mistral'],
  [/phi/i, 'phi'],
  [/qwen/i, 'qwen'],
];

const QUANT_PATTERN = /(Q\d_[A-Z0-9_]+|F16|F32|BF16)/i;
const PARAM_PATTERN = /(\d+(?:\.\d+)?)[bB](?![a-z])/;

export function parseModelFilename(filename: string): {
  family: ModelFamily;
  quantization?: string;
  parameters?: string;
  displayName: string;
} {
  const stem = filename.replace(/\.gguf$/i, '');

  let family: ModelFamily = 'unknown';
  for (const [pattern, fam] of FAMILY_PATTERNS) {
    if (pattern.test(stem)) {
      family = fam;
      break;
    }
  }

  const quant = stem.match(QUANT_PATTERN)?.[1]?.toUpperCase();
  const params = stem.match(PARAM_PATTERN)?.[0]?.toUpperCase();

  const displayName = stem
    .replace(/[-_]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  return { family, quantization: quant, parameters: params, displayName };
}

// ── Message ──

export type MessageRole = 'user' | 'assistant' | 'system';

export interface Message {
  id: string;
  role: MessageRole;
  content: string;
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

// ── Conversation ──

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
