import { MLCModel, Message, createMessage } from '../types';
import { useChatStore, useSettingsStore } from '../store';
import { buildPrompt, stripSpecialTokens } from './chatTemplates';
import { complete, getLoadedPath, loadModel, stopCompletion } from './llama';

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

export async function ensureModelLoaded(model: MLCModel): Promise<void> {
  if (!model.filePath) {
    throw new Error('Model has no file path on disk');
  }
  if (getLoadedPath() === model.filePath) return;
  await loadModel({
    modelPath: model.filePath,
    contextSize: model.recommendedCtx ?? 1024,
    batchSize: 512,
  });
}

/**
 * Append the user message, append a streaming assistant placeholder, drive the
 * generation loop, and update the store as tokens arrive.
 */
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

    const conv = useChatStore.getState().conversations.find(c => c.id === opts.conversationId);
    const history = conv?.messages.filter(m => m.id !== assistantMsg.id) ?? [];

    const { prompt, stopTokens } = buildPrompt(opts.model.family, settings.systemPrompt, history);

    let buffer = '';
    await complete({
      prompt,
      maxTokens: settings.maxTokens,
      temperature: settings.temperature,
      stop: stopTokens,
      onToken: token => {
        buffer += token;
        const cleaned = stripSpecialTokens(buffer);
        opts.onAssistantToken?.(cleaned);
        useChatStore.getState().updateMessage(opts.conversationId, assistantMsg.id, m => ({
          ...m,
          content: cleaned,
        }));
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
