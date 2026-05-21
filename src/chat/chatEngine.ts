import { MLCModel, Message, createMessage } from '../shared/types';
import { useChatStore, useSettingsStore } from '../shared';
import { buildPrompt, stripSpecialTokens } from './chatTemplates';
import { complete, getLoadedPath, loadModel, stopCompletion } from '../shared/llama';

interface SendOptions {
  conversationId: string;
  model: MLCModel;
  userInput: string;
  onAssistantToken?: (text: string) => void;
}

let inFlight = false;

export function isGenerating(): boolean {
  return inFlight;
}

const MIN_CTX = 4096;
const CHARS_PER_TOKEN = 3.5;
const TEMPLATE_OVERHEAD = 200;

function estimateTokens(text: string): number {
  return Math.ceil(text.length / CHARS_PER_TOKEN);
}

function trimHistory(
  messages: Message[],
  systemPrompt: string,
  contextSize: number,
  reserveForResponse: number,
): Message[] {
  const budget = contextSize - reserveForResponse - TEMPLATE_OVERHEAD;
  const systemTokens = estimateTokens(systemPrompt);

  let available = budget - systemTokens;
  if (available <= 0) return messages.slice(-1);

  const result: Message[] = [];
  for (let i = messages.length - 1; i >= 0; i--) {
    const cost = estimateTokens(messages[i].content);
    if (cost > available && result.length > 0) break;
    available -= cost;
    result.unshift(messages[i]);
  }

  return result;
}

export async function ensureModelLoaded(model: MLCModel): Promise<void> {
  if (!model.filePath) {
    throw new Error('Model has no file path on disk');
  }
  if (getLoadedPath() === model.filePath) return;
  if (inFlight) {
    await cancelGeneration();
  }
  await loadModel({
    modelPath: model.filePath,
    contextSize: Math.max(model.recommendedCtx ?? MIN_CTX, MIN_CTX),
    batchSize: 512,
  });
}

export async function sendMessage(opts: SendOptions): Promise<Message> {
  if (inFlight) throw new Error('A response is already being generated');
  inFlight = true;

  const chat = useChatStore.getState();
  const settings = useSettingsStore.getState();

  const userMsg = createMessage('user', opts.userInput.trim());
  chat.appendMessage(opts.conversationId, userMsg);

  const assistantMsg: Message = { ...createMessage('assistant', ''), isStreaming: true };
  chat.appendMessage(opts.conversationId, assistantMsg);

  try {
    await ensureModelLoaded(opts.model);

    const contextSize = Math.max(opts.model.recommendedCtx ?? MIN_CTX, MIN_CTX);
    const conv = useChatStore.getState().conversations.find(c => c.id === opts.conversationId);
    const allMessages = conv?.messages.filter(m => m.id !== assistantMsg.id) ?? [];

    const history = trimHistory(
      allMessages,
      settings.systemPrompt,
      contextSize,
      settings.maxTokens,
    );

    const { prompt, stopTokens } = buildPrompt(opts.model.family, settings.systemPrompt, history);

    let buffer = '';
    await complete({
      prompt,
      maxTokens: settings.maxTokens,
      temperature: settings.temperature,
      stop: stopTokens,
      onToken: token => {
        buffer += token;
      },
    });

    const finalText = stripSpecialTokens(buffer).trim();
    useChatStore.getState().updateMessage(opts.conversationId, assistantMsg.id, m => ({
      ...m,
      content: finalText,
      isStreaming: false,
    }));
    return { ...assistantMsg, content: finalText, isStreaming: false };
  } catch (err) {
    const errText = err instanceof Error ? err.message : String(err);
    useChatStore.getState().updateMessage(opts.conversationId, assistantMsg.id, m => ({
      ...m,
      content: m.content ? `${m.content}\n\n[error: ${errText}]` : `[error: ${errText}]`,
      isStreaming: false,
    }));
    throw err;
  } finally {
    inFlight = false;
  }
}

export async function cancelGeneration(): Promise<void> {
  await stopCompletion();
  inFlight = false;
}
