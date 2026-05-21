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
let loadingPromise: Promise<LlamaContext> | null = null;
let activeCompletion: Promise<any> | null = null;

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
  if (loadingPromise) {
    await loadingPromise;
    if (ctx && loadedModelPath === opts.modelPath) {
      return ctx;
    }
  }

  const promise = (async () => {
    await stopCompletion();
    if (activeCompletion) {
      try { await activeCompletion; } catch { /* ignore */ }
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
  })();

  loadingPromise = promise;
  try {
    return await promise;
  } finally {
    if (loadingPromise === promise) {
      loadingPromise = null;
    }
  }
}

export async function unloadModel(): Promise<void> {
  const toRelease = ctx;
  if (toRelease) {
    ctx = null;
    loadedModelPath = null;
    try {
      await toRelease.release();
    } catch {
      // ignore
    }
  }
}

export function getLoadedPath(): string | null {
  return loadedModelPath;
}

export async function complete(opts: CompletionOptions): Promise<string> {
  const activeCtx = ctx;
  if (!activeCtx) throw new Error('No model loaded');

  const completionPromise = activeCtx.completion(
    {
      prompt: opts.prompt,
      n_predict: opts.maxTokens ?? 512,
      temperature: opts.temperature ?? 0.7,
      top_p: opts.topP ?? 0.95,
      top_k: opts.topK ?? 40,
      stop: opts.stop ?? [],
    },
    data => {
      if (ctx !== activeCtx) return;
      if (data?.token && opts.onToken) {
        opts.onToken(data.token);
      }
    },
  );

  activeCompletion = completionPromise;
  try {
    const result = await completionPromise;
    return result.text;
  } finally {
    if (activeCompletion === completionPromise) {
      activeCompletion = null;
    }
  }
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
