import './index.css';
import {
  openDirectory,
  listDirectory,
  isElectron,
  getElectronFile,
} from './fileSystem';
import {
  isTextFile,
  readFilePreview,
  MAX_TEXT_PREVIEW_BYTES,
} from './filePreview';
import {
  renderWelcomeScreen,
  renderFallbackUploadScreen,
  renderMainLayout,
} from './renderers';

const state = {
  rootHandle: null,
  crumbs: [],
  items: [],
  filtered: [],
  search: '',
  loading: false,
  error: null,
  selectedItem: null,
  previewState: { status: 'idle', preview: null },
  isPreviewPanelVisible: true,
  panelWidth: 380,
  fallbackItems: [],
  usingFallback: false,
  objectUrl: null,
};

let handleMap = new Map();
let loadRequestId = 0;
let previewRequestId = 0;
let isKeyboardListenerAttached = false;

function getAppElement() {
  let el = document.getElementById('app');
  if (!el) {
    el = document.createElement('div');
    el.id = 'app';
    document.body.appendChild(el);
  }
  return el;
}

function updateObjectUrl(file) {
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

  const fileListEl = document.getElementById('file-list');
  const previousScrollTop = fileListEl ? fileListEl.scrollTop : 0;

  const html = renderMainLayout(
    displayName,
    currentPath,
    state.crumbs,
    state.filtered,
    state.loading,
    state.search,
    state.usingFallback,
    state.error,
    state.selectedItem,
    state.previewState,
    state.objectUrl,
    state.isPreviewPanelVisible,
    state.panelWidth
  );

  root.innerHTML = html;
  bindMainEvents();
  attachGlobalKeyboardListener();

  const newFileListEl = document.getElementById('file-list');
  if (newFileListEl && previousScrollTop > 0) {
    newFileListEl.scrollTop = previousScrollTop;
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
    const input = e.target;
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

  document.getElementById('btn-toggle-panel')?.addEventListener('click', () => {
    state.isPreviewPanelVisible = !state.isPreviewPanelVisible;
    render();
  });

  document.querySelectorAll('.btn-crumb').forEach((btn) => {
    btn.addEventListener('click', () => {
      const index = parseInt(btn.dataset.crumbIndex || '0', 10);
      navigateToCrumb(index);
    });
  });

  const searchInput = document.getElementById('input-search');
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      onSearch(e.target.value);
    });
  }

  document.getElementById('btn-clear-search')?.addEventListener('click', () => {
    onSearch('');
  });

  document.querySelectorAll('.btn-file-card').forEach((card) => {
    card.addEventListener('click', (e) => {
      e.stopPropagation();
      const path = card.dataset.itemPath;
      if (!path) return;
      const item = state.filtered.find((i) => i.path === path);
      if (item) {
        handleItemSingleClick(item);
      }
    });

    card.addEventListener('dblclick', (e) => {
      e.stopPropagation();
      const path = card.dataset.itemPath;
      if (!path) return;
      const item = state.filtered.find((i) => i.path === path);
      if (item) {
        handleItemDoubleClick(item);
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
    state.selectedItem = null;
    state.previewState = { status: 'idle', preview: null };
    updateObjectUrl(null);
    handleMap.clear();
    render();
  });

  setupResizer();
}

function setupResizer() {
  const resizer = document.getElementById('resizer');
  const previewPanelContainer = document.getElementById('preview-panel-container');
  if (!resizer || !previewPanelContainer) return;

  let startX = 0;
  let startWidth = state.panelWidth;

  const onMouseMove = (e) => {
    const delta = startX - e.clientX;
    const minWidth = 250;
    const maxWidth = Math.max(minWidth, window.innerWidth - 300);
    const newWidth = Math.max(minWidth, Math.min(maxWidth, startWidth + delta));
    state.panelWidth = newWidth;
    previewPanelContainer.style.width = `${newWidth}px`;
  };

  const onMouseUp = () => {
    window.removeEventListener('mousemove', onMouseMove);
    window.removeEventListener('mouseup', onMouseUp);
  };

  resizer.addEventListener('mousedown', (e) => {
    e.preventDefault();
    startX = e.clientX;
    startWidth = state.panelWidth;
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  });
}

function attachGlobalKeyboardListener() {
  if (isKeyboardListenerAttached) return;
  isKeyboardListenerAttached = true;

  window.addEventListener('keydown', (e) => {
    const activeTag = document.activeElement ? document.activeElement.tagName.toUpperCase() : '';
    if (activeTag === 'INPUT' || activeTag === 'TEXTAREA' || document.activeElement?.isContentEditable) {
      return;
    }

    if (state.filtered.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      const currentIndex = state.selectedItem
        ? state.filtered.findIndex((i) => i.path === state.selectedItem.path)
        : -1;
      const nextIndex = currentIndex < 0 ? 0 : Math.min(state.filtered.length - 1, currentIndex + 1);
      const nextItem = state.filtered[nextIndex];
      if (nextItem) {
        handleItemSingleClick(nextItem);
        scrollToSelectedItem();
      }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      const currentIndex = state.selectedItem
        ? state.filtered.findIndex((i) => i.path === state.selectedItem.path)
        : -1;
      const prevIndex = currentIndex < 0 ? 0 : Math.max(0, currentIndex - 1);
      const prevItem = state.filtered[prevIndex];
      if (prevItem) {
        handleItemSingleClick(prevItem);
        scrollToSelectedItem();
      }
    } else if (e.key === 'Enter') {
      if (state.selectedItem) {
        e.preventDefault();
        handleItemDoubleClick(state.selectedItem);
      }
    }
  });
}

function scrollToSelectedItem() {
  const selectedEl = document.querySelector('[aria-selected="true"]');
  selectedEl?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
}

async function handleItemSingleClick(item) {
  state.selectedItem = item;

  if (item.type === 'directory') {
    state.previewState = { status: 'folder', preview: null };
    updateObjectUrl(null);
    render();
    return;
  }

  const currentReqId = ++previewRequestId;
  state.previewState = { status: 'loading', preview: null };
  render();

  try {
    let file = null;

    if (state.usingFallback) {
      file = item.file || null;
    } else if (isElectron()) {
      const isText = isTextFile({ name: item.name, type: '' });
      const options = isText ? { maxBytes: MAX_TEXT_PREVIEW_BYTES } : undefined;
      file = await getElectronFile(item.path, item.name, options);
    } else {
      const handle = handleMap.get(item.path);
      if (handle && handle.kind === 'file') {
        file = await handle.getFile();
      }
    }

    if (currentReqId !== previewRequestId) return;

    if (!file) {
      state.previewState = { status: 'unsupported', preview: null };
      updateObjectUrl(null);
      render();
      return;
    }

    const preview = await readFilePreview(file);
    if (currentReqId !== previewRequestId) return;

    updateObjectUrl(file);
    state.previewState = { status: preview.kind, preview };
  } catch {
    if (currentReqId !== previewRequestId) return;
    state.previewState = { status: 'error', preview: null };
    updateObjectUrl(null);
  }

  render();
}

async function handleItemDoubleClick(item) {
  if (item.type === 'directory') {
    state.selectedItem = null;
    state.previewState = { status: 'idle', preview: null };
    updateObjectUrl(null);

    if (state.usingFallback) {
      const subItems = fallbackVirtualFs.get(item.path) || [];
      state.crumbs.push({ name: item.name, path: item.path, handle: null });
      state.items = subItems;
      state.filtered = subItems;
      state.search = '';
      render();
    } else if (isElectron()) {
      const dirHandle = {
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
      const handle = handleMap.get(item.path);
      if (handle && handle.kind === 'directory') {
        const dirHandle = handle;
        const previousCrumbs = [...state.crumbs];
        state.crumbs.push({ name: item.name, path: item.path, handle: dirHandle });
        state.search = '';
        try {
          await loadDirectory(dirHandle, item.path);
        } catch {
          state.crumbs = previousCrumbs;
          state.error = `Impossible d'accéder au dossier système "${item.name}". Accès restreint par le navigateur.`;
          render();
        }
      }
    }
  } else {
    handleItemSingleClick(item);
  }
}

async function loadDirectory(dir, path) {
  const requestId = ++loadRequestId;
  state.loading = true;
  state.error = null;
  state.selectedItem = null;
  state.previewState = { status: 'idle', preview: null };
  updateObjectUrl(null);
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

const fallbackVirtualFs = new Map();
const fallbackAllFiles = [];

function setupFallbackVirtualFs(fileList) {
  fallbackVirtualFs.clear();
  fallbackAllFiles.length = 0;

  const folderMap = new Map();
  const getOrCreateFolderMap = (dirPath) => {
    let map = folderMap.get(dirPath);
    if (!map) {
      map = new Map();
      folderMap.set(dirPath, map);
    }
    return map;
  };

  let rootFolderName = '';

  Array.from(fileList).forEach((f) => {
    const rawRel = f.webkitRelativePath || f.name;
    const rel = rawRel.startsWith('/') ? rawRel : `/${rawRel}`;
    const parts = rel.split('/').filter(Boolean);

    const fileItem = {
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

function handleFallbackFiles(fileList) {
  const { rootFolderName, rootPath } = setupFallbackVirtualFs(fileList);
  state.usingFallback = true;
  state.rootHandle = null;
  state.crumbs = [{ name: rootFolderName, path: rootPath, handle: null }];
  state.search = '';
  state.error = null;
  state.selectedItem = null;
  state.previewState = { status: 'idle', preview: null };
  updateObjectUrl(null);

  const currentItems = fallbackVirtualFs.get(rootPath) || fallbackAllFiles;
  state.fallbackItems = currentItems;
  state.items = currentItems;
  state.filtered = currentItems;
  render();
}

async function navigateToCrumb(index) {
  const crumb = state.crumbs[index];
  state.crumbs = state.crumbs.slice(0, index + 1);
  state.search = '';
  state.selectedItem = null;
  state.previewState = { status: 'idle', preview: null };
  updateObjectUrl(null);
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
    state.selectedItem = null;
    state.previewState = { status: 'idle', preview: null };
    updateObjectUrl(null);
    render();
  }
}

function onSearch(value) {
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
