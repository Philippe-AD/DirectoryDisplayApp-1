export const MAX_TEXT_PREVIEW_BYTES = 1024 * 1024;
export const RECOMMENDED_MAX_IMAGE_BYTES = 25 * 1024 * 1024;
export const ABSOLUTE_MAX_IMAGE_BYTES = 100 * 1024 * 1024;
export const MAX_DOCX_PREVIEW_BYTES = 20 * 1024 * 1024;

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
  if (!name || typeof name !== 'string') return '';
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
  if (!file) return false;
  const extension = getFileExtension(file.name);
  return (file.type && file.type.startsWith('image/')) || IMAGE_EXTENSIONS.has(extension);
}

export function isAudioFile(file) {
  if (!file) return false;
  const extension = getFileExtension(file.name);
  return (file.type && file.type.startsWith('audio/')) || AUDIO_EXTENSIONS.has(extension);
}

export function isVideoFile(file) {
  if (!file) return false;
  const extension = getFileExtension(file.name);
  return (file.type && file.type.startsWith('video/')) || VIDEO_EXTENSIONS.has(extension);
}

export function isPdfFile(file) {
  if (!file) return false;
  return file.type === 'application/pdf' || getFileExtension(file.name) === 'pdf';
}

export function isWordFile(file) {
  if (!file) return false;
  const extension = getFileExtension(file.name);
  return extension === 'doc' || extension === 'docx'
    || file.type === 'application/msword'
    || file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
}

export function getSyntaxLanguage(name) {
  return SYNTAX_LANGUAGE_BY_EXTENSION[getFileExtension(name)] ?? null;
}

export function isTextFile(file) {
  if (!file) return false;
  const extension = getFileExtension(file.name);
  return (file.type && file.type.startsWith('text/'))
    || getSyntaxLanguage(file.name) !== null
    || PLAIN_TEXT_EXTENSION.has(extension);
}

export async function readTextPreview(fileOrMetadata, textBufferFetcher) {
  if (!fileOrMetadata) return null;
  const name = fileOrMetadata.name || '';
  if (!isTextFile({ name, type: fileOrMetadata.type || '' })) return null;

  const totalSize = typeof fileOrMetadata.size === 'number'
    ? fileOrMetadata.size
    : (typeof fileOrMetadata.totalSize === 'number' ? fileOrMetadata.totalSize : 0);

  if (totalSize > MAX_TEXT_PREVIEW_BYTES) {
    return {
      kind: 'text-too-large',
      content: '',
      truncated: true,
      totalSize,
    };
  }

  try {
    if (typeof textBufferFetcher === 'function') {
      const res = await textBufferFetcher(fileOrMetadata.path);
      if (!res || !res.success) {
        return null;
      }
      const text = new TextDecoder().decode(res.buffer);
      return {
        kind: 'text',
        content: text,
        truncated: Boolean(res.truncated),
        totalSize,
      };
    } else if (typeof fileOrMetadata.slice === 'function') {
      const content = await fileOrMetadata.slice(0, MAX_TEXT_PREVIEW_BYTES).text();
      return {
        kind: 'text',
        content,
        truncated: totalSize > MAX_TEXT_PREVIEW_BYTES,
        totalSize,
      };
    }
  } catch (err) {
    console.error('Failed to read text preview:', err);
    return null;
  }
  return null;
}

export async function readFilePreview(metadata, fetchers = {}) {
  if (!metadata) return { kind: 'unsupported' };
  const name = metadata.name || '';
  const size = typeof metadata.size === 'number'
    ? metadata.size
    : (typeof metadata.totalSize === 'number' ? metadata.totalSize : 0);
  const ext = getFileExtension(name);

  if (isImageFile({ name, type: metadata.type || '' })) {
    if (size > ABSOLUTE_MAX_IMAGE_BYTES) {
      return { kind: 'image-too-large', totalSize: size };
    }
    if (size > RECOMMENDED_MAX_IMAGE_BYTES) {
      return { kind: 'image-warning', totalSize: size, mediaUrl: metadata.mediaUrl };
    }
    return { kind: 'image', totalSize: size, mediaUrl: metadata.mediaUrl };
  }

  if (isAudioFile({ name, type: metadata.type || '' })) {
    return { kind: 'audio', totalSize: size, mediaUrl: metadata.mediaUrl };
  }

  if (isVideoFile({ name, type: metadata.type || '' })) {
    return { kind: 'video', totalSize: size, mediaUrl: metadata.mediaUrl };
  }

  if (isPdfFile({ name, type: metadata.type || '' })) {
    return { kind: 'pdf', totalSize: size, mediaUrl: metadata.mediaUrl };
  }

  if (isWordFile({ name, type: metadata.type || '' })) {
    if (ext !== 'docx' && metadata.type !== 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
      return { kind: 'unsupported-word' };
    }

    if (size > MAX_DOCX_PREVIEW_BYTES) {
      return { kind: 'docx-too-large', totalSize: size };
    }

    try {
      let arrayBuffer = null;
      if (typeof fetchers.readDocxBuffer === 'function') {
        const res = await fetchers.readDocxBuffer(metadata.path);
        if (res && res.success && res.buffer) {
          arrayBuffer = res.buffer;
        } else if (res && res.code === 'FILE_TOO_LARGE') {
          return { kind: 'docx-too-large', totalSize: size };
        } else {
          return { kind: 'word-error' };
        }
      } else if (typeof metadata.arrayBuffer === 'function') {
        arrayBuffer = await metadata.arrayBuffer();
      } else if (metadata.arrayBuffer instanceof ArrayBuffer) {
        arrayBuffer = metadata.arrayBuffer;
      }

      if (!arrayBuffer) return { kind: 'word-error' };

      const uint8 = new Uint8Array(arrayBuffer);
      if (uint8.length < 4 || uint8[0] !== 0x50 || uint8[1] !== 0x4b) {
        return { kind: 'word-error' };
      }
      return {
        kind: 'word-docx',
        arrayBuffer,
        totalSize: size,
      };
    } catch {
      return { kind: 'word-error' };
    }
  }

  if (isTextFile({ name, type: metadata.type || '' })) {
    if (size > MAX_TEXT_PREVIEW_BYTES) {
      return {
        kind: 'text-too-large',
        totalSize: size,
      };
    }
    const textPreview = await readTextPreview(metadata, fetchers.readTextBuffer);
    if (!textPreview) {
      return { kind: 'error', error: 'Impossible de lire le fichier texte.' };
    }
    return textPreview;
  }

  return { kind: 'unsupported', totalSize: size };
}
