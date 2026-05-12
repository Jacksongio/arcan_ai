import RNFS from 'react-native-fs';
import { pick } from '@react-native-documents/picker';
import * as XLSX from 'xlsx';

export interface AttachedFile {
  name: string;
  content: string;
}

const SUPPORTED_TYPES = [
  'public.plain-text',
  'public.utf8-plain-text',
  'public.comma-separated-values-text',
  'com.adobe.pdf',
  'org.openxmlformats.spreadsheetml.sheet',
  'com.microsoft.excel.xls',
  'net.daringfireball.markdown',
  'public.data',
  'public.item',
];

const TEXT_EXTENSIONS = ['.txt', '.md', '.markdown', '.csv', '.tsv', '.json', '.xml', '.log'];
const EXCEL_EXTENSIONS = ['.xlsx', '.xls'];
const PDF_EXTENSION = '.pdf';

const MAX_CHARS = 8_000;

function getExtension(name: string): string {
  const dot = name.lastIndexOf('.');
  return dot >= 0 ? name.slice(dot).toLowerCase() : '';
}

function truncateContent(text: string, filename: string): string {
  if (text.length <= MAX_CHARS) return text;
  return text.slice(0, MAX_CHARS) + `\n\n[...truncated — file "${filename}" exceeds ${MAX_CHARS} character limit]`;
}

async function readTextFile(path: string): Promise<string> {
  return RNFS.readFile(path, 'utf8');
}

async function readExcelFile(path: string): Promise<string> {
  const base64 = await RNFS.readFile(path, 'base64');
  const workbook = XLSX.read(base64, { type: 'base64' });

  const parts: string[] = [];
  for (const sheetName of workbook.SheetNames) {
    const sheet = workbook.Sheets[sheetName];
    const csv = XLSX.utils.sheet_to_csv(sheet);
    if (workbook.SheetNames.length > 1) {
      parts.push(`--- Sheet: ${sheetName} ---\n${csv}`);
    } else {
      parts.push(csv);
    }
  }
  return parts.join('\n\n');
}

async function readPdfFile(path: string): Promise<string> {
  const content = await RNFS.readFile(path, 'ascii');
  const textChunks: string[] = [];

  const tjRegex = /\[((?:\([^)]*\)|-?\d+\s*)+)\]\s*TJ/g;
  let match;
  while ((match = tjRegex.exec(content)) !== null) {
    const inner = match[1];
    const parts = inner.match(/\(([^)]*)\)/g);
    if (parts) {
      const line = parts.map(p => p.slice(1, -1)).join('');
      const cleaned = line
        .replace(/\\n/g, '\n')
        .replace(/\\\(/g, '(')
        .replace(/\\\)/g, ')')
        .replace(/[^\x20-\x7E\n\r\t]/g, '')
        .trim();
      if (cleaned) textChunks.push(cleaned);
    }
  }

  const tjSingleRegex = /\(([^)]+)\)\s*Tj/g;
  while ((match = tjSingleRegex.exec(content)) !== null) {
    const cleaned = match[1]
      .replace(/\\n/g, '\n')
      .replace(/\\\(/g, '(')
      .replace(/\\\)/g, ')')
      .replace(/[^\x20-\x7E\n\r\t]/g, '')
      .trim();
    if (cleaned) textChunks.push(cleaned);
  }

  if (textChunks.length === 0) {
    throw new Error(
      'Could not extract text from this PDF. It may be image-based, encrypted, or use compressed streams. Try a .txt, .csv, or .md file instead.',
    );
  }
  return textChunks.join(' ');
}

function uriToPath(uri: string): string {
  const withoutScheme = uri.replace(/^file:\/\//, '');
  return decodeURIComponent(withoutScheme);
}

export async function pickAndReadFile(): Promise<AttachedFile | null> {
  const [picked] = await pick({
    mode: 'import',
    type: SUPPORTED_TYPES,
  });
  if (!picked) return null;

  const name = picked.name ?? 'file';
  const ext = getExtension(name);
  const path = uriToPath(picked.uri);

  let content: string;

  if (EXCEL_EXTENSIONS.includes(ext)) {
    content = await readExcelFile(path);
  } else if (ext === PDF_EXTENSION) {
    content = await readPdfFile(path);
  } else if (TEXT_EXTENSIONS.includes(ext)) {
    content = await readTextFile(path);
  } else {
    try {
      content = await readTextFile(path);
    } catch {
      throw new Error(`Cannot read "${name}". Unsupported file format.`);
    }
  }

  return {
    name,
    content: truncateContent(content.trim(), name),
  };
}
