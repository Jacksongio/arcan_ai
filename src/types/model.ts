export type ModelFamily = 'gemma' | 'llama' | 'mistral' | 'phi' | 'qwen' | 'unknown';

export type ModelKind = 'bundled' | 'custom';

export interface MLCModel {
  id: string;
  displayName: string;
  family: ModelFamily;
  kind: ModelKind;
  /** Absolute path on device to the .gguf file. Undefined for "needs download". */
  filePath?: string;
  /** Human-friendly size, e.g. "1.7 GB". */
  sizeLabel?: string;
  /** Bytes on disk if known. */
  sizeBytes?: number;
  /** Quantization tag, e.g. "Q4_K_M". */
  quantization?: string;
  /** Parameter count tag from filename, e.g. "2B", "7B". */
  parameters?: string;
  /** Recommended context window. */
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

/** Parse a GGUF filename into model metadata. */
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
