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

const AUDIO_EXTENSIONS = new Set([
  'mp3',
  'wav',
  'ogg',
  'm4a',
  'aac',
  'flac',
  'wma',
  'opus',
  'mid',
  'midi',
  'amr',
  'aiff',
  'alac',
]);

const VIDEO_EXTENSIONS = new Set([
  'mp4',
  'webm',
  'ogv',
  'mov',
  'mkv',
  'avi',
  'wmv',
  'm4v',
  '3gp',
  'flv',
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
  if (AUDIO_EXTENSIONS.has(ext)) {
    if (ext === 'mp3') return 'audio/mpeg';
    if (ext === 'm4a') return 'audio/mp4';
    return `audio/${ext}`;
  }
  if (VIDEO_EXTENSIONS.has(ext)) {
    if (ext === 'mov') return 'video/quicktime';
    if (ext === 'mkv') return 'video/x-matroska';
    if (ext === 'avi') return 'video/x-msvideo';
    return `video/${ext}`;
  }
  if (ext === 'docx') return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
  if (ext === 'doc') return 'application/msword';
  if (PLAIN_TEXT_EXTENSION.has(ext) || SYNTAX_LANGUAGE_BY_EXTENSION[ext] !== undefined) return 'text/plain';
  return '';
}

export function isImageFile(file) {
  const extension = getFileExtension(file.name);
  return (file.type && file.type.startsWith('image/')) || IMAGE_EXTENSIONS.has(extension);
}

export function isAudioFile(file) {
  const extension = getFileExtension(file.name);
  return (file.type && file.type.startsWith('audio/')) || AUDIO_EXTENSIONS.has(extension);
}

export function isVideoFile(file) {
  const extension = getFileExtension(file.name);
  return (file.type && file.type.startsWith('video/')) || VIDEO_EXTENSIONS.has(extension);
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
  return (file.type && file.type.startsWith('text/'))
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
  if (isAudioFile(file)) return { kind: 'audio' };
  if (isVideoFile(file)) return { kind: 'video' };
  if (isPdfFile(file)) return { kind: 'pdf' };

  if (isWordFile(file)) {
    const ext = getFileExtension(file.name);
    if (ext !== 'docx' && file.type !== 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
      return { kind: 'unsupported-word' };
    }

    try {
      const arrayBuffer = await file.arrayBuffer();
      const uint8 = new Uint8Array(arrayBuffer);
      if (uint8.length < 4 || uint8[0] !== 0x50 || uint8[1] !== 0x4b) {
        return { kind: 'word-error' };
      }
      return {
        kind: 'word-docx',
        arrayBuffer,
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
