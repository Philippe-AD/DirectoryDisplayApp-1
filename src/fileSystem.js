import { getMimeType } from './filePreview';

// Native Electron File System Provider

export function isElectron() {
  return typeof window !== 'undefined' && Boolean(window.electronAPI?.isElectron);
}

export async function openDirectory() {
  if (!window.electronAPI?.selectDirectory) {
    throw new Error('ELECTRON_IPC_NOT_AVAILABLE');
  }
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

export async function getElectronFile(filePath, fileName, options = {}) {
  if (!window.electronAPI?.readFileBuffer) return null;
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

export async function getFileMetadata(filePath) {
  if (window.electronAPI?.getFileMetadata) {
    return await window.electronAPI.getFileMetadata(filePath);
  }
  return { success: false, error: 'Metadata API not available.' };
}

export async function readTextBuffer(filePath, options) {
  if (window.electronAPI?.readTextBuffer) {
    return await window.electronAPI.readTextBuffer(filePath, options);
  }
  return { success: false, error: 'Text buffer API not available.' };
}

export async function readDocxBuffer(filePath) {
  if (window.electronAPI?.readDocxBuffer) {
    return await window.electronAPI.readDocxBuffer(filePath);
  }
  return { success: false, error: 'Docx buffer API not available.' };
}

export async function revokePreviewToken(token) {
  if (window.electronAPI?.revokePreviewToken && token) {
    return await window.electronAPI.revokePreviewToken(token);
  }
  return { success: false };
}


export async function listDirectory(dir, parentPath = '') {
  const targetPath = parentPath || (dir && dir.path) || '';
  if (!window.electronAPI?.readDirectory) {
    return { files: [], handles: [] };
  }
  const res = await window.electronAPI.readDirectory(targetPath);
  if (res.error) {
    throw new Error(res.error);
  }
  return {
    files: res.files || [],
    handles: [],
  };
}

export async function openExternalFile(filePath) {
  if (window.electronAPI?.openExternal) {
    return await window.electronAPI.openExternal(filePath);
  }
  return { success: true };
}

export async function renameFileOrDirectory(oldPath, newPath) {
  if (window.electronAPI?.renameEntry) {
    return await window.electronAPI.renameEntry(oldPath, newPath);
  }
  return {
    success: false,
    error: "La modification du système de fichiers n'est pas disponible.",
  };
}

export async function copyFileOrDirectory(options) {
  if (window.electronAPI?.copyEntry) {
    return await window.electronAPI.copyEntry(options);
  }
  return {
    success: false,
    error: "La création de copie n'est pas disponible.",
  };
}

export async function cancelCopyOperation(copyId) {
  if (window.electronAPI?.cancelCopy) {
    return await window.electronAPI.cancelCopy(copyId);
  }
  return { success: false };
}

export async function undoCopyOperation(copyPath) {
  if (window.electronAPI?.undoCopy) {
    return await window.electronAPI.undoCopy(copyPath);
  }
  return {
    success: false,
    error: "L'annulation de la copie n'est pas disponible.",
  };
}

export function subscribeCopyProgress(callback) {
  if (window.electronAPI?.onCopyProgress) {
    return window.electronAPI.onCopyProgress(callback);
  }
  return () => {};
}

export async function moveFileOrDirectory(options) {
  if (window.electronAPI?.moveEntry) {
    return await window.electronAPI.moveEntry(options);
  }
  return {
    success: false,
    error: "Le déplacement n'est pas disponible.",
  };
}

export async function cancelMoveOperation(moveId) {
  if (window.electronAPI?.cancelMove) {
    return await window.electronAPI.cancelMove(moveId);
  }
  return { success: false };
}

export async function undoMoveOperation(options) {
  if (window.electronAPI?.undoMove) {
    return await window.electronAPI.undoMove(options);
  }
  return {
    success: false,
    error: "L'annulation du déplacement n'est pas disponible.",
  };
}

export function subscribeMoveProgress(callback) {
  if (window.electronAPI?.onMoveProgress) {
    return window.electronAPI.onMoveProgress(callback);
  }
  return () => {};
}

export async function trashItemOrDirectory(targetPath, appRootDir = '') {
  if (window.electronAPI?.trashItem) {
    return await window.electronAPI.trashItem({ targetPath, appRootDir });
  }
  return {
    success: false,
    error: "La mise à la Corbeille n'est pas disponible dans cet environnement.",
  };
}


