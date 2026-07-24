import './index.css';
import {
  openDirectory,
  listDirectory,
  isElectron,
  getElectronFile,
  type FileItem,
  type DirectoryHandle,
  type FileSystemEntryHandle,
} from './fileSystem';
import {
  isImageFile,
  isPdfFile,
  isWordFile,
  readFilePreview,
  type FilePreviewResult,
} from './filePreview';
import {
  renderWelcomeScreen,
  renderFallbackUploadScreen,
  renderMainLayout,
  renderPreviewModal,
  type Crumb,
} from './renderers';

interface AppState {
  rootHandle: DirectoryHandle | null;
  crumbs: Crumb[];
  items: FileItem[];
  filtered: FileItem[];
  search: string;
  loading: boolean;
  error: string | null;
  selectedItem: {
    item: FileItem;
    file: File | null;
    preview: FilePreviewResult;
  } | null;
  fallbackItems: FileItem[];
  usingFallback: boolean;
  objectUrl: string | null;
}

const state: AppState = {
  rootHandle: null,
  crumbs: [],
  items: [],
  filtered: [],
  search: '',
  loading: false,
  error: null,
  selectedItem: null,
  fallbackItems: [],
  usingFallback: false,
  objectUrl: null,
};

let handleMap = new Map<string, FileSystemEntryHandle>();
let loadRequestId = 0;
let previouslyFocusedElement: HTMLElement | null = null;

function getAppElement(): HTMLElement {
  let el = document.getElementById('app');
  if (!el) {
    el = document.createElement('div');
    el.id = 'app';
    document.body.appendChild(el);
  }
  return el;
}

function updateObjectUrl(file: File | null) {
  if (state.objectUrl) {
    URL.revokeObjectURL(state.objectUrl);
    state.objectUrl = null;
  }
  if (file) {
    state.objectUrl = URL.createObjectURL(file);
  }
}

function render() {
  const root = getAppElement();

  if (!state.rootHandle && !state.usingFallback) {
    root.innerHTML = renderWelcomeScreen(state.error);
    bindWelcomeEvents();
    return;
  }

  if (state.usingFallback && state.fallbackItems.length === 0) {
    root.innerHTML = renderFallbackUploadScreen();
    bindFallbackUploadEvents();
    return;
  }

  const currentCrumb = state.crumbs.length > 0 ? state.crumbs[state.crumbs.length - 1] : null;
  const displayName = currentCrumb ? currentCrumb.name : 'Files';
  const currentPath = currentCrumb ? currentCrumb.path : '';

  let html = renderMainLayout(
    displayName,
    currentPath,
    state.crumbs,
    state.filtered,
    state.loading,
    state.search,
    state.usingFallback,
    state.error
  );

  if (state.selectedItem) {
    html += renderPreviewModal(
      state.selectedItem.item,
      state.selectedItem.preview,
      state.objectUrl
    );
  }

  root.innerHTML = html;
  bindMainEvents();

  if (state.selectedItem) {
    setupModalFocusTrap();
  }
}

function bindWelcomeEvents() {
  document.getElementById('btn-open-folder')?.addEventListener('click', handleOpenFolder);
  document.getElementById('btn-use-fallback')?.addEventListener('click', () => {
    state.usingFallback = true;
    state.error = null;
    render();
  });
}

function bindFallbackUploadEvents() {
  document.getElementById('input-fallback-files')?.addEventListener('change', (e) => {
    const input = e.target as HTMLInputElement;
    if (input.files) {
      handleFallbackFiles(input.files);
    }
  });
  document.getElementById('btn-cancel-fallback')?.addEventListener('click', () => {
    state.usingFallback = false;
    state.error = null;
    render();
  });
}

function bindMainEvents() {
  document.getElementById('btn-go-back')?.addEventListener('click', goBack);

  document.getElementById('btn-dismiss-error')?.addEventListener('click', () => {
    state.error = null;
    render();
  });

  document.querySelectorAll<HTMLButtonElement>('.btn-crumb').forEach((btn) => {
    btn.addEventListener('click', () => {
      const index = parseInt(btn.dataset.crumbIndex || '0', 10);
      navigateToCrumb(index);
    });
  });

  const searchInput = document.getElementById('input-search') as HTMLInputElement | null;
  if (searchInput) {
    searchInput.focus();
    // Maintain cursor position at end of input
    const len = searchInput.value.length;
    searchInput.setSelectionRange(len, len);

    searchInput.addEventListener('input', (e) => {
      onSearch((e.target as HTMLInputElement).value);
    });
  }

  document.getElementById('btn-clear-search')?.addEventListener('click', () => {
    onSearch('');
  });

  document.querySelectorAll<HTMLButtonElement>('.btn-file-card').forEach((card) => {
    card.addEventListener('click', () => {
      const path = card.dataset.itemPath;
      if (!path) return;
      const item = state.filtered.find((i) => i.path === path);
      if (item) {
        handleItemClick(item);
      }
    });
  });

  document.getElementById('btn-open-another')?.addEventListener('click', () => {
    loadRequestId += 1;
    state.loading = false;
    state.rootHandle = null;
    state.crumbs = [];
    state.items = [];
    state.filtered = [];
    state.fallbackItems = [];
    state.usingFallback = false;
    closePreviewModal();
    handleMap.clear();
    render();
  });

  document.getElementById('btn-close-modal')?.addEventListener('click', closePreviewModal);
  document.getElementById('modal-overlay')?.addEventListener('click', (e) => {
    if (e.target === e.currentTarget) {
      closePreviewModal();
    }
  });
}

function setupModalFocusTrap() {
  previouslyFocusedElement = document.activeElement as HTMLElement | null;
  const closeBtn = document.getElementById('btn-close-modal');
  closeBtn?.focus();

  const handleKeyDown = (e: KeyboardEvent) => {
    if (!state.selectedItem) return;

    if (e.key === 'Escape') {
      closePreviewModal();
      document.removeEventListener('keydown', handleKeyDown);
    } else if (e.key === 'Tab') {
      const dialog = document.getElementById('modal-dialog');
      if (!dialog) return;

      const focusables = dialog.querySelectorAll<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      if (focusables.length === 0) return;

      const first = focusables[0];
      const last = focusables[focusables.length - 1];

      if (e.shiftKey) {
        if (document.activeElement === first) {
          e.preventDefault();
          last.focus();
        }
      } else {
        if (document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    }
  };

  document.addEventListener('keydown', handleKeyDown);
}

function closePreviewModal() {
  state.selectedItem = null;
  updateObjectUrl(null);
  render();
  if (previouslyFocusedElement) {
    previouslyFocusedElement.focus();
    previouslyFocusedElement = null;
  }
}

async function loadDirectory(dir: DirectoryHandle, path: string) {
  const requestId = ++loadRequestId;
  state.loading = true;
  state.error = null;
  render();

  try {
    const { files, handles } = await listDirectory(dir, path);
    if (requestId !== loadRequestId) return;

    handleMap = new Map(
      handles.map((h) => {
        const childPath = path ? `${path}/${h.name}` : `/${h.name}`;
        return [childPath, h];
      })
    );

    state.items = files;
    state.filtered = files;
  } catch (err) {
    if (requestId !== loadRequestId) return;
    state.error = err instanceof Error ? err.message : 'Failed to read this folder.';
    state.items = [];
    state.filtered = [];
  } finally {
    if (requestId === loadRequestId) {
      state.loading = false;
      render();
    }
  }
}

async function handleOpenFolder() {
  state.error = null;
  try {
    const handle = await openDirectory();
    const path = handle.kind === 'electron-directory' ? handle.path : `/${handle.name}`;
    state.rootHandle = handle;
    state.crumbs = [{ name: handle.name, path, handle }];
    await loadDirectory(handle, path);
  } catch (err) {
    if (err instanceof Error && err.message === 'NOT_SUPPORTED') {
      state.error = 'Your browser does not support the folder picker.';
    } else if (err instanceof DOMException && err.name === 'AbortError') {
      // User cancelled
    } else {
      const isSecurityOrSystem = err instanceof DOMException &&
        (err.name === 'SecurityError' || err.name === 'NotAllowedError');
      state.error = isSecurityOrSystem
        ? 'Ce dossier contient des fichiers système protégés par le navigateur. Vous pouvez utiliser le sélecteur alternatif.'
        : (err instanceof Error ? err.message : 'Could not open that folder.');
    }
    render();
  }
}

const fallbackVirtualFs = new Map<string, FileItem[]>();
const fallbackAllFiles: FileItem[] = [];

function setupFallbackVirtualFs(fileList: FileList) {
  fallbackVirtualFs.clear();
  fallbackAllFiles.length = 0;

  const folderMap = new Map<string, Map<string, FileItem>>();
  const getOrCreateFolderMap = (dirPath: string) => {
    let map = folderMap.get(dirPath);
    if (!map) {
      map = new Map<string, FileItem>();
      folderMap.set(dirPath, map);
    }
    return map;
  };

  let rootFolderName = '';

  Array.from(fileList).forEach((f) => {
    const rawRel = f.webkitRelativePath || f.name;
    const rel = rawRel.startsWith('/') ? rawRel : `/${rawRel}`;
    const parts = rel.split('/').filter(Boolean);

    const fileItem: FileItem = {
      name: f.name,
      type: 'file',
      size: f.size,
      path: rel,
      file: f,
    };
    fallbackAllFiles.push(fileItem);

    if (parts.length > 0 && !rootFolderName) {
      rootFolderName = parts[0];
    }

    if (parts.length <= 1) {
      const rootPath = `/${rootFolderName || 'Files'}`;
      getOrCreateFolderMap(rootPath).set(f.name, fileItem);
    } else {
      let currentDirPath = `/${parts[0]}`;
      for (let i = 1; i < parts.length; i++) {
        const isLast = i === parts.length - 1;
        const partName = parts[i];
        if (isLast) {
          getOrCreateFolderMap(currentDirPath).set(partName, fileItem);
        } else {
          const subDirPath = `${currentDirPath}/${partName}`;
          const currentMap = getOrCreateFolderMap(currentDirPath);
          if (!currentMap.has(partName)) {
            currentMap.set(partName, {
              name: partName,
              type: 'directory',
              path: subDirPath,
            });
          }
          currentDirPath = subDirPath;
        }
      }
    }
  });

  folderMap.forEach((childrenMap, dirPath) => {
    const list = Array.from(childrenMap.values());
    list.sort((a, b) => {
      if (a.type !== b.type) return a.type === 'directory' ? -1 : 1;
      return a.name.localeCompare(b.name, undefined, { sensitivity: 'base', numeric: true });
    });
    fallbackVirtualFs.set(dirPath, list);
  });

  const rootPath = `/${rootFolderName || 'Files'}`;
  return { rootFolderName: rootFolderName || 'Files', rootPath };
}

function handleFallbackFiles(fileList: FileList) {
  const { rootFolderName, rootPath } = setupFallbackVirtualFs(fileList);
  state.usingFallback = true;
  state.rootHandle = null;
  state.crumbs = [{ name: rootFolderName, path: rootPath, handle: null as any }];
  state.search = '';
  state.error = null;

  const currentItems = fallbackVirtualFs.get(rootPath) || fallbackAllFiles;
  state.fallbackItems = currentItems;
  state.items = currentItems;
  state.filtered = currentItems;
  render();
}

async function openFilePreviewModal(item: FileItem, file: File) {
  try {
    const preview = await readFilePreview(file);
    updateObjectUrl(file);
    state.selectedItem = { item, file, preview };
  } catch {
    const preview: FilePreviewResult = isImageFile(file)
      ? { kind: 'image' }
      : isPdfFile(file)
        ? { kind: 'pdf' }
        : isWordFile(file)
          ? { kind: 'word-error' }
          : { kind: 'unsupported' };
    updateObjectUrl(file);
    state.selectedItem = { item, file, preview };
  }
  render();
}

async function handleItemClick(item: FileItem) {
  if (state.usingFallback) {
    if (item.type === 'directory') {
      const subItems = fallbackVirtualFs.get(item.path) || [];
      state.crumbs.push({ name: item.name, path: item.path, handle: null as any });
      state.items = subItems;
      state.filtered = subItems;
      state.search = '';
      render();
    } else if (item.file) {
      await openFilePreviewModal(item, item.file);
    } else {
      state.selectedItem = { item, file: null, preview: { kind: 'unsupported' } };
      render();
    }
  } else if (isElectron()) {
    if (item.type === 'directory') {
      const dirHandle: DirectoryHandle = {
        kind: 'electron-directory',
        name: item.name,
        path: item.path,
      };
      const previousCrumbs = [...state.crumbs];
      state.crumbs.push({ name: item.name, path: item.path, handle: dirHandle });
      state.search = '';
      try {
        await loadDirectory(dirHandle, item.path);
      } catch (err) {
        state.crumbs = previousCrumbs;
        state.error = err instanceof Error ? err.message : `Impossible d'accéder au dossier "${item.name}".`;
        render();
      }
    } else {
      try {
        const file = await getElectronFile(item.path, item.name);
        if (file) {
          await openFilePreviewModal(item, file);
        } else {
          state.selectedItem = { item, file: null, preview: { kind: 'unsupported' } };
          render();
        }
      } catch {
        state.selectedItem = { item, file: null, preview: { kind: 'unsupported' } };
        render();
      }
    }
  } else if (item.type === 'directory') {
    const handle = handleMap.get(item.path);
    if (handle && handle.kind === 'directory') {
      const dirHandle = handle as unknown as DirectoryHandle;
      const previousCrumbs = [...state.crumbs];
      state.crumbs.push({ name: item.name, path: item.path, handle: dirHandle });
      state.search = '';
      try {
        await loadDirectory(dirHandle, item.path);
      } catch (err) {
        state.crumbs = previousCrumbs;
        state.error = `Impossible d'accéder au dossier système "${item.name}". Accès restreint par le navigateur.`;
        render();
      }
    }
  } else {
    const handle = handleMap.get(item.path);
    if (handle && handle.kind === 'file') {
      try {
        const file = await handle.getFile();
        await openFilePreviewModal(item, file);
      } catch {
        state.selectedItem = { item, file: null, preview: { kind: 'unsupported' } };
        render();
      }
    } else {
      state.selectedItem = { item, file: null, preview: { kind: 'unsupported' } };
      render();
    }
  }
}

async function navigateToCrumb(index: number) {
  const crumb = state.crumbs[index];
  state.crumbs = state.crumbs.slice(0, index + 1);
  state.search = '';
  if (state.usingFallback) {
    const subItems = fallbackVirtualFs.get(crumb.path) || fallbackAllFiles;
    state.items = subItems;
    state.filtered = subItems;
    render();
  } else {
    await loadDirectory(crumb.handle, crumb.path);
  }
}

async function goBack() {
  if (state.crumbs.length > 1) {
    await navigateToCrumb(state.crumbs.length - 2);
  } else {
    loadRequestId += 1;
    state.loading = false;
    state.rootHandle = null;
    state.crumbs = [];
    state.items = [];
    state.filtered = [];
    state.fallbackItems = [];
    state.usingFallback = false;
    render();
  }
}

function onSearch(value: string) {
  state.search = value;
  const currentCrumb = state.crumbs.length > 0 ? state.crumbs[state.crumbs.length - 1] : null;
  const source = state.usingFallback
    ? (value ? fallbackAllFiles : (fallbackVirtualFs.get(currentCrumb?.path || '') || state.items))
    : state.items;
  const q = value.toLowerCase();
  state.filtered = source.filter((item) => item.name.toLowerCase().includes(q));
  render();
}

// Initial render
document.addEventListener('DOMContentLoaded', () => {
  render();
});
if (document.readyState === 'interactive' || document.readyState === 'complete') {
  render();
}
