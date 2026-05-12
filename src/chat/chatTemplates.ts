import { Message, ModelFamily } from '../shared/types';

/**
 * Format a chat history into the prompt string a given model family expects.
 * Mirrors the templates used in the prior Swift ChatEngine: each family has its
 * own role markers, end-of-turn sentinels, and stop tokens.
 */
interface FormattedPrompt {
  prompt: string;
  /** Token strings that should halt generation. */
  stopTokens: string[];
}

export function buildPrompt(
  family: ModelFamily,
  systemPrompt: string,
  messages: Message[],
): FormattedPrompt {
  const turns = messages.filter(m => m.role !== 'system');
  switch (family) {
    case 'gemma':
      return gemmaTemplate(systemPrompt, turns);
    case 'llama':
      return llama3Template(systemPrompt, turns);
    case 'mistral':
      return mistralTemplate(systemPrompt, turns);
    case 'phi':
      return phiTemplate(systemPrompt, turns);
    case 'qwen':
      return qwenTemplate(systemPrompt, turns);
    default:
      return chatMLTemplate(systemPrompt, turns);
  }
}

// Gemma uses <start_of_turn>/<end_of_turn> with no system role —
// we fold the system prompt into the first user turn.
function gemmaTemplate(system: string, turns: Message[]): FormattedPrompt {
  let prompt = '';
  let firstUserSeen = false;
  for (const m of turns) {
    if (m.role === 'user') {
      const content = !firstUserSeen && system ? `${system}\n\n${m.content}` : m.content;
      prompt += `<start_of_turn>user\n${content}<end_of_turn>\n`;
      firstUserSeen = true;
    } else if (m.role === 'assistant') {
      prompt += `<start_of_turn>model\n${m.content}<end_of_turn>\n`;
    }
  }
  prompt += '<start_of_turn>model\n';
  return { prompt, stopTokens: ['<end_of_turn>', '<start_of_turn>'] };
}

function llama3Template(system: string, turns: Message[]): FormattedPrompt {
  let prompt = '<|begin_of_text|>';
  if (system) {
    prompt += `<|start_header_id|>system<|end_header_id|>\n\n${system}<|eot_id|>`;
  }
  for (const m of turns) {
    const role = m.role === 'assistant' ? 'assistant' : 'user';
    prompt += `<|start_header_id|>${role}<|end_header_id|>\n\n${m.content}<|eot_id|>`;
  }
  prompt += '<|start_header_id|>assistant<|end_header_id|>\n\n';
  return { prompt, stopTokens: ['<|eot_id|>', '<|end_of_text|>'] };
}

function mistralTemplate(system: string, turns: Message[]): FormattedPrompt {
  let prompt = '';
  let pendingSystem = system;
  for (let i = 0; i < turns.length; i++) {
    const m = turns[i];
    if (m.role === 'user') {
      const sysPrefix = pendingSystem ? `${pendingSystem}\n\n` : '';
      prompt += `<s>[INST] ${sysPrefix}${m.content} [/INST]`;
      pendingSystem = '';
    } else if (m.role === 'assistant') {
      prompt += ` ${m.content}</s>`;
    }
  }
  return { prompt, stopTokens: ['</s>', '[INST]'] };
}

function phiTemplate(system: string, turns: Message[]): FormattedPrompt {
  let prompt = '';
  if (system) prompt += `<|system|>\n${system}<|end|>\n`;
  for (const m of turns) {
    const role = m.role === 'assistant' ? 'assistant' : 'user';
    prompt += `<|${role}|>\n${m.content}<|end|>\n`;
  }
  prompt += '<|assistant|>\n';
  return { prompt, stopTokens: ['<|end|>', '<|user|>', '<|system|>'] };
}

function qwenTemplate(system: string, turns: Message[]): FormattedPrompt {
  let prompt = '';
  if (system) prompt += `<|im_start|>system\n${system}<|im_end|>\n`;
  for (const m of turns) {
    const role = m.role === 'assistant' ? 'assistant' : 'user';
    prompt += `<|im_start|>${role}\n${m.content}<|im_end|>\n`;
  }
  prompt += '<|im_start|>assistant\n';
  return { prompt, stopTokens: ['<|im_end|>', '<|im_start|>'] };
}

function chatMLTemplate(system: string, turns: Message[]): FormattedPrompt {
  return qwenTemplate(system, turns);
}

const SPECIAL_TOKENS = [
  '<end_of_turn>',
  '<start_of_turn>',
  '<|eot_id|>',
  '<|end_of_text|>',
  '<|begin_of_text|>',
  '<|start_header_id|>',
  '<|end_header_id|>',
  '<|im_start|>',
  '<|im_end|>',
  '<|system|>',
  '<|user|>',
  '<|assistant|>',
  '<|end|>',
  '</s>',
  '<s>',
  '[INST]',
  '[/INST]',
];

/** Remove any special chat-template tokens that leaked into generated text. */
export function stripSpecialTokens(text: string): string {
  let out = text;
  for (const tok of SPECIAL_TOKENS) {
    out = out.split(tok).join('');
  }
  return out;
}
