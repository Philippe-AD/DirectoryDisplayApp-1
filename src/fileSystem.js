import { getMimeType } from './filePreview';

// File system access abstraction supporting both Electron native API and browser File System Access API.

export function isElectron() {
  return typeof window !== 'undefined' && Boolean(window.electronAPI?.isElectron);
}

export function isFileSystemAccessSupported() {
  if (isElectron()) return true;
  return typeof window !== 'undefined' && typeof window.showDirectoryPicker === 'function';
}

export async function openDirectory() {
  if (isElectron()) {
    const selectedPath = await window.electronAPI.selectDirectory();
    if (!selectedPath) {
      throw new DOMException('The user aborted a request.', 'AbortError');
    }
    const name = selectedPath.split(/[/\\]/).filter(Boolean).pop() || selectedPath;
    return {
      kind: 'electron-directory',
      name,
      path: selectedPath,
    };
  }

  if (!isFileSystemAccessSupported()) {
    throw new Error('NOT_SUPPORTED');
  }
  const handle = await window.showDirectoryPicker({ mode: 'read' });
  return handle;
}

export async function getElectronFile(filePath, fileName, options = {}) {
  if (!isElectron() || !window.electronAPI) return null;
  const res = await window.electronAPI.readFileBuffer(filePath, options);
  if (!res) return null;

  const buffer = res.buffer || (res instanceof ArrayBuffer ? res : null);
  if (!buffer) return null;

  const totalSize = typeof res.totalSize === 'number' ? res.totalSize : buffer.byteLength;
  const mimeType = getMimeType(fileName);
  const file = new File([buffer], fileName, { type: mimeType });
  Object.defineProperty(file, 'totalSize', {
    value: totalSize,
    writable: false,
    configurable: true,
  });
  return file;
}

export async function listDirectory(dir, parentPath = '') {
  if (dir.kind === 'electron-directory') {
    const targetPath = parentPath || dir.path;
    const res = await window.electronAPI.readDirectory(targetPath);
    if (res.error) {
      throw new Error(res.error);
    }
    return {
      files: res.files,
      handles: [],
    };
  }

  const files = [];
  const handles = [];

  try {
    const iterator = dir.values();
    while (true) {
      let nextItem;
      try {
        nextItem = await iterator.next();
      } catch (err) {
        console.warn('Skipping unreadable system entry:', err);
        break;
      }

      if (nextItem.done) break;
      const entry = nextItem.value;

      handles.push(entry);
      const childPath = parentPath ? `${parentPath}/${entry.name}` : `/${entry.name}`;

      if (entry.kind === 'directory') {
        files.push({
          name: entry.name,
          type: 'directory',
          path: childPath,
        });
      } else {
        let size = undefined;
        try {
          const file = await entry.getFile();
          size = file.size;
        } catch {
          // Keep entry even if metadata fails
        }

        files.push({
          name: entry.name,
          type: 'file',
          size,
          path: childPath,
        });
      }
    }
  } catch (err) {
    console.warn('Skipping unreadable directory values iterator:', err);
  }

  files.sort((a, b) => {
    if (a.type !== b.type) return a.type === 'directory' ? -1 : 1;
    return a.name.localeCompare(b.name, undefined, { sensitivity: 'base', numeric: true });
  });

  return { files, handles };
}
