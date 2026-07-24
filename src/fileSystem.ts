// File system access abstraction supporting both Electron native API and browser File System Access API.

export interface FileItem {
  name: string;
  type: 'file' | 'directory';
  size?: number;
  path: string;
  file?: File;
}

export interface WebDirectoryHandle {
  kind: 'directory';
  name: string;
  values(): AsyncIterableIterator<FileSystemEntryHandle>;
}

export interface ElectronDirectoryHandle {
  kind: 'electron-directory';
  name: string;
  path: string;
}

export interface FileHandle {
  kind: 'file';
  name: string;
  getFile(): Promise<File>;
}

export type FileSystemEntryHandle = FileHandle | DirectoryHandle;
export type DirectoryHandle = WebDirectoryHandle | ElectronDirectoryHandle;
export type OpenDirectoryResult = DirectoryHandle;

export interface ElectronAPI {
  isElectron: boolean;
  selectDirectory: () => Promise<string | null>;
  readDirectory: (dirPath: string) => Promise<{ files: FileItem[]; error?: string }>;
  readFileBuffer: (filePath: string) => Promise<ArrayBuffer | null>;
}

declare global {
  interface Window {
    showDirectoryPicker?: (options?: {
      mode?: 'read' | 'readwrite';
    }) => Promise<WebDirectoryHandle>;
    electronAPI?: ElectronAPI;
  }
}

export function isElectron(): boolean {
  return typeof window !== 'undefined' && Boolean(window.electronAPI?.isElectron);
}

export function isFileSystemAccessSupported(): boolean {
  if (isElectron()) return true;
  return typeof window !== 'undefined' && typeof window.showDirectoryPicker === 'function';
}

export async function openDirectory(): Promise<DirectoryHandle> {
  if (isElectron()) {
    const selectedPath = await window.electronAPI!.selectDirectory();
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
  const handle = await window.showDirectoryPicker!({ mode: 'read' });
  return handle as WebDirectoryHandle;
}

export async function getElectronFile(filePath: string, fileName: string): Promise<File | null> {
  if (!isElectron() || !window.electronAPI) return null;
  const buffer = await window.electronAPI.readFileBuffer(filePath);
  if (!buffer) return null;
  return new File([buffer], fileName);
}

export async function listDirectory(
  dir: DirectoryHandle,
  parentPath = ''
): Promise<{ files: FileItem[]; handles: FileSystemEntryHandle[] }> {
  if (dir.kind === 'electron-directory') {
    const targetPath = parentPath || dir.path;
    const res = await window.electronAPI!.readDirectory(targetPath);
    if (res.error) {
      throw new Error(res.error);
    }
    return {
      files: res.files,
      handles: [],
    };
  }

  const files: FileItem[] = [];
  const handles: FileSystemEntryHandle[] = [];

  try {
    const iterable = dir.values();
    const iterator = typeof (iterable as any)[Symbol.asyncIterator] === 'function'
      ? (iterable as any)[Symbol.asyncIterator]()
      : iterable;

    let consecutiveErrors = 0;
    while (true) {
      let result: IteratorResult<FileSystemEntryHandle>;
      try {
        result = await iterator.next();
        consecutiveErrors = 0;
      } catch (err) {
        console.warn('Skipping unreadable system entry in directory:', err);
        consecutiveErrors++;
        if (consecutiveErrors > 10) {
          break;
        }
        continue;
      }

      if (!result || result.done) break;

      const entry = result.value;
      if (!entry || !entry.name) continue;

      const path = parentPath ? `${parentPath}/${entry.name}` : `/${entry.name}`;

      try {
        if (entry.kind === 'file') {
          try {
            const file = await entry.getFile();
            files.push({ name: entry.name, type: 'file', size: file.size, path });
          } catch {
            files.push({ name: entry.name, type: 'file', path });
          }
        } else if (entry.kind === 'directory') {
          files.push({ name: entry.name, type: 'directory', path });
        }
        handles.push(entry);
      } catch (entryErr) {
        console.warn(`Error processing system entry ${entry.name}:`, entryErr);
      }
    }
  } catch (dirErr) {
    console.warn('Error reading directory entries:', dirErr);
  }

  files.sort((a, b) => {
    if (a.type !== b.type) return a.type === 'directory' ? -1 : 1;
    return a.name.localeCompare(b.name, undefined, { sensitivity: 'base', numeric: true });
  });

  return { files, handles };
}
