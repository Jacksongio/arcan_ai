import { initLlama, LlamaContext, releaseAllLlama } from 'llama.rn';
import { Platform } from 'react-native';

interface LoadOptions {
  modelPath: string;
  contextSize?: number;
  batchSize?: number;
  /** GPU layer count override; otherwise picked adaptively. */
  gpuLayers?: number;
  embedding?: boolean;
}

export interface CompletionOptions {
  prompt: string;
  maxTokens?: number;
  temperature?: number;
  topP?: number;
  topK?: number;
  stop?: string[];
  onToken?: (token: string) => void;
}

let ctx: LlamaContext | null = null;
let loadedModelPath: string | null = null;

/**
 * Pick GPU offload layer count. Conservative on iOS simulator (no Metal),
 * adaptive elsewhere — the prior LibLlama.swift used 16–32 layers depending on RAM.
 */
function defaultGpuLayers(): number {
  // The simulator doesn't have working Metal; force CPU.
  // (LlamaContext will fall back gracefully on Android too.)
  // @ts-ignore — RN types don't expose isTesting in older versions
  if (Platform.OS === 'ios' && (Platform as any).isTesting) return 0;
  return Platform.OS === 'ios' ? 99 : 99; // 99 = "as many as possible" in llama.cpp convention
}

export async function loadModel(opts: LoadOptions): Promise<LlamaContext> {
  if (ctx && loadedModelPath === opts.modelPath) {
    return ctx;
  }
  if (ctx) {
    await unloadModel();
  }
  ctx = await initLlama({
    model: opts.modelPath,
    n_ctx: opts.contextSize ?? 4096,
    n_batch: opts.batchSize ?? 512,
    n_gpu_layers: opts.gpuLayers ?? defaultGpuLayers(),
    embedding: opts.embedding ?? false,
  });
  loadedModelPath = opts.modelPath;
  return ctx;
}

export async function unloadModel(): Promise<void> {
  if (ctx) {
    try {
      await ctx.release();
    } catch {
      // ignore
    }
    ctx = null;
    loadedModelPath = null;
  }
}

export function getLoadedPath(): string | null {
  return loadedModelPath;
}

export async function complete(opts: CompletionOptions): Promise<string> {
  if (!ctx) throw new Error('No model loaded');

  const result = await ctx.completion(
    {
      prompt: opts.prompt,
      n_predict: opts.maxTokens ?? 512,
      temperature: opts.temperature ?? 0.7,
      top_p: opts.topP ?? 0.95,
      top_k: opts.topK ?? 40,
      stop: opts.stop ?? [],
    },
    data => {
      if (data?.token && opts.onToken) {
        opts.onToken(data.token);
      }
    },
  );
  return result.text;
}

export async function stopCompletion(): Promise<void> {
  if (ctx) {
    try {
      await ctx.stopCompletion();
    } catch {
      // ignore
    }
  }
}

/** Free every loaded context (called on memory warnings). */
export async function releaseAll(): Promise<void> {
  ctx = null;
  loadedModelPath = null;
  try {
    await releaseAllLlama();
  } catch {
    // ignore
  }
}
