import RNFS from 'react-native-fs';
import { keepLocalCopy, pick } from '@react-native-documents/picker';
import { MLCModel, parseModelFilename } from '../types';
import { useModelStore } from '../store';

/** Where imported .gguf files live on device. */
export const MODELS_DIR = `${RNFS.DocumentDirectoryPath}/models`;

/** Public link surfaced to the user when they have no models installed. */
export const MODEL_DOWNLOAD_URL = 'https://huggingface.co/models?library=gguf&sort=trending';

/** Curated suggestions shown on the "no models" empty state. */
export const RECOMMENDED_MODELS: Array<{ name: string; url: string; size: string; note: string }> = [
  {
    name: 'Gemma 2 2B Instruct (Q4_K_M)',
    url: 'https://huggingface.co/bartowski/gemma-2-2b-it-GGUF',
    size: '~1.7 GB',
    note: 'Recommended starter — fits on most phones, good quality.',
  },
  {
    name: 'Llama 3.2 3B Instruct (Q4_K_M)',
    url: 'https://huggingface.co/bartowski/Llama-3.2-3B-Instruct-GGUF',
    size: '~2.0 GB',
    note: 'Slightly larger, sharper reasoning. Needs ~3 GB free RAM.',
  },
  {
    name: 'Phi 3.5 Mini Instruct (Q4_K_M)',
    url: 'https://huggingface.co/bartowski/Phi-3.5-mini-instruct-GGUF',
    size: '~2.3 GB',
    note: 'Strong instruction following. Higher RAM use.',
  },
];

async function ensureModelsDir(): Promise<void> {
  const exists = await RNFS.exists(MODELS_DIR);
  if (!exists) await RNFS.mkdir(MODELS_DIR);
}

function humanBytes(bytes: number): string {
  if (bytes >= 1_000_000_000) return `${(bytes / 1_000_000_000).toFixed(2)} GB`;
  if (bytes >= 1_000_000) return `${(bytes / 1_000_000).toFixed(0)} MB`;
  if (bytes >= 1_000) return `${(bytes / 1_000).toFixed(0)} KB`;
  return `${bytes} B`;
}

function buildModel(filePath: string, sizeBytes: number): MLCModel {
  const filename = filePath.split('/').pop() ?? 'model.gguf';
  const meta = parseModelFilename(filename);
  return {
    id: filename,
    displayName: meta.displayName,
    family: meta.family,
    kind: 'custom',
    filePath,
    sizeBytes,
    sizeLabel: humanBytes(sizeBytes),
    quantization: meta.quantization,
    parameters: meta.parameters,
    recommendedCtx: 1024,
  };
}

/** Re-scan the documents/models directory and update the store. */
export async function refreshModels(): Promise<MLCModel[]> {
  await ensureModelsDir();
  const entries = await RNFS.readDir(MODELS_DIR);
  const ggufs = entries.filter(e => e.isFile() && e.name.toLowerCase().endsWith('.gguf'));
  const models = ggufs.map(e => buildModel(e.path, Number(e.size) || 0));
  useModelStore.getState().setModels(models);
  return models;
}

/** Open the platform document picker, copy chosen .gguf into our models dir. */
export async function importGGUFFromPicker(): Promise<MLCModel | null> {
  const [picked] = await pick({ mode: 'import' });
  if (!picked) return null;

  await ensureModelsDir();
  const filename = picked.name ?? `model-${Date.now()}.gguf`;
  if (!filename.toLowerCase().endsWith('.gguf')) {
    throw new Error('Only .gguf model files are supported.');
  }

  // The picker returns a `content://` URI on Android and a security-scoped
  // `file://` URI on iOS. Use keepLocalCopy to materialize a real file we can
  // read with RNFS.
  const [copy] = await keepLocalCopy({
    files: [{ uri: picked.uri, fileName: filename }],
    destination: 'documentDirectory',
  });
  if (copy.status !== 'success') {
    throw new Error(`Could not copy file: ${copy.copyError ?? 'unknown'}`);
  }

  const dest = `${MODELS_DIR}/${filename}`;
  if (await RNFS.exists(dest)) {
    await RNFS.unlink(dest);
  }
  const sourcePath = copy.localUri.replace('file://', '');
  await RNFS.moveFile(sourcePath, dest);

  const stat = await RNFS.stat(dest);
  const model = buildModel(dest, Number(stat.size) || 0);
  useModelStore.getState().upsertModel(model);
  return model;
}

/** Delete a model's .gguf file and remove it from the store. */
export async function deleteModel(model: MLCModel): Promise<void> {
  if (model.filePath && (await RNFS.exists(model.filePath))) {
    await RNFS.unlink(model.filePath);
  }
  useModelStore.getState().removeModel(model.id);
}

/** Total bytes occupied by all installed models. */
export async function modelsDiskUsage(): Promise<number> {
  await ensureModelsDir();
  const entries = await RNFS.readDir(MODELS_DIR);
  return entries.reduce((sum, e) => sum + (e.isFile() ? Number(e.size) || 0 : 0), 0);
}
