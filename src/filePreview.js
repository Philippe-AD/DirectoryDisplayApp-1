export const MAX_TEXT_PREVIEW_BYTES = 1024 * 1024;

const SYNTAX_LANGUAGE_BY_EXTENSION = {
  py: 'python',
  java: 'java',
  cs: 'csharp',
  sql: 'sql',
  js: 'javascript',
  jsx: 'jsx',
  ts: 'typescript',
  tsx: 'tsx',
  c: 'c',
  h: 'c',
  cc: 'cpp',
  cpp: 'cpp',
  cxx: 'cpp',
  hpp: 'cpp',
  css: 'css',
  html: 'markup',
  htm: 'markup',
  xml: 'markup',
  json: 'json',
  yaml: 'yaml',
  yml: 'yaml',
  md: 'markdown',
  sh: 'bash',
  bash: 'bash',
  ps1: 'powershell',
  php: 'php',
  rb: 'ruby',
  go: 'go',
  rs: 'rust',
  swift: 'swift',
  kt: 'kotlin',
  kts: 'kotlin',
  scala: 'scala',
  vue: 'markup',
  svelte: 'markup',
};

const PLAIN_TEXT_EXTENSION = new Set([
  'txt',
  'csv',
  'log',
  'ini',
  'conf',
  'config',
  'env',
  'properties',
  'toml',
]);

const IMAGE_EXTENSIONS = new Set([
  'png',
  'jpg',
  'jpeg',
  'gif',
  'webp',
  'svg',
  'bmp',
  'ico',
  'avif',
  'tiff',
  'apng',
]);

export function getFileExtension(name) {
  const dotIndex = name.lastIndexOf('.');
  return dotIndex >= 0 ? name.slice(dotIndex + 1).toLowerCase() : '';
}

export function getMimeType(fileName) {
  const ext = getFileExtension(fileName);
  if (ext === 'pdf') return 'application/pdf';
  if (IMAGE_EXTENSIONS.has(ext)) {
    if (ext === 'jpg' || ext === 'jpeg') return 'image/jpeg';
    if (ext === 'svg') return 'image/svg+xml';
    return `image/${ext}`;
  }
  if (ext === 'docx') return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
  if (ext === 'doc') return 'application/msword';
  if (PLAIN_TEXT_EXTENSION.has(ext) || SYNTAX_LANGUAGE_BY_EXTENSION[ext] !== undefined) return 'text/plain';
  return '';
}

export function isImageFile(file) {
  const extension = getFileExtension(file.name);
  return file.type.startsWith('image/') || IMAGE_EXTENSIONS.has(extension);
}

export function isPdfFile(file) {
  return file.type === 'application/pdf' || getFileExtension(file.name) === 'pdf';
}

export function isWordFile(file) {
  const extension = getFileExtension(file.name);
  return extension === 'doc' || extension === 'docx'
    || file.type === 'application/msword'
    || file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
}

export function getSyntaxLanguage(name) {
  return SYNTAX_LANGUAGE_BY_EXTENSION[getFileExtension(name)] ?? null;
}

export function isTextFile(file) {
  const extension = getFileExtension(file.name);
  return file.type.startsWith('text/')
    || getSyntaxLanguage(file.name) !== null
    || PLAIN_TEXT_EXTENSION.has(extension);
}

export async function readTextPreview(file) {
  if (!isTextFile(file)) return null;

  try {
    const totalSize = typeof file.totalSize === 'number' ? file.totalSize : file.size;
    const truncated = totalSize > MAX_TEXT_PREVIEW_BYTES;
    const content = await file.slice(0, MAX_TEXT_PREVIEW_BYTES).text();

    return {
      content,
      truncated,
      totalSize,
    };
  } catch (err) {
    console.error('Failed to read text preview:', err);
    return null;
  }
}

export async function readFilePreview(file) {
  if (isImageFile(file)) return { kind: 'image' };
  if (isPdfFile(file)) return { kind: 'pdf' };

  if (isWordFile(file)) {
    const ext = getFileExtension(file.name);
    if (ext !== 'docx' && file.type !== 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
      return { kind: 'unsupported-word' };
    }

    try {
      const mammoth = await import('mammoth');
      const result = await mammoth.extractRawText({
        arrayBuffer: await file.arrayBuffer(),
      });
      return {
        kind: 'word',
        content: result.value.trim() || '(empty document)',
      };
    } catch {
      return { kind: 'word-error' };
    }
  }

  const textPreview = await readTextPreview(file);
  return textPreview === null
    ? { kind: 'unsupported' }
    : {
        kind: 'text',
        content: textPreview.content,
        truncated: textPreview.truncated,
        totalSize: textPreview.totalSize,
      };
}
