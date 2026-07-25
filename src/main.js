import './index.css';
import {
  openDirectory,
  listDirectory,
  isElectron,
  getElectronFile,
  openExternalFile,
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
import {
  sortNodePaths,
  getVisibleTreeNodes,
} from './treeLogic';

export { sortNodePaths, getVisibleTreeNodes };

const state = {
  rootHandle: null,
  rootPath: '',
  rootName: '',
  nodes: new Map(), // Map<path, TreeNode>
  treeRootPath: null,
  search: '',
  loading: false,
  error: null,
  selectedItem: null,
  previewState: { status: 'idle', preview: null, error: null },
  isPreviewPanelVisible: true,
  panelWidth: 380,
  isHeaderCollapsed: false,
  usingFallback: false,
  objectUrl: null,
  isTreeVisible: true,
  showExternalOpenModal: false,
  skipExternalOpenWarning: false,
  pendingExternalOpenPath: null,
  theme: 'light',
};

let previewRequestId = 0;
let isKeyboardListenerAttached = false;
let isFileProtectionListenersAttached = false;
const handleMap = new Map(); // Map<path, handle>

function attachFileProtectionListeners() {
  if (isFileProtectionListenersAttached) return;
  isFileProtectionListenersAttached = true;

  window.addEventListener('dragstart', (e) => e.preventDefault());
  window.addEventListener('dragover', (e) => e.preventDefault());
  window.addEventListener('drop', (e) => e.preventDefault());
  window.addEventListener('contextmenu', (e) => e.preventDefault());
}

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
  attachFileProtectionListeners();

  const root = getAppElement();

  if (!state.rootHandle && !state.usingFallback) {
    root.innerHTML = renderWelcomeScreen(state.error);
    bindWelcomeEvents();
    return;
  }

  if (state.usingFallback && state.nodes.size === 0) {
    root.innerHTML = renderFallbackUploadScreen();
    bindFallbackUploadEvents();
    return;
  }

  const rootNode = state.treeRootPath ? state.nodes.get(state.treeRootPath) : null;
  const displayName = rootNode ? rootNode.name : 'Files';
  const currentPath = rootNode ? rootNode.path : '';

  const fileListEl = document.getElementById('file-list');
  const previousScrollTop = fileListEl ? fileListEl.scrollTop : 0;

  const visibleNodes = getVisibleTreeNodes(state.treeRootPath, state.nodes, state.search);

  const html = renderMainLayout(
    displayName,
    currentPath,
    visibleNodes,
    state.loading,
    state.search,
    state.usingFallback,
    state.error,
    state.selectedItem,
    state.previewState,
    state.objectUrl,
    state.isPreviewPanelVisible,
    state.panelWidth,
    state.isHeaderCollapsed,
    state.isTreeVisible,
    state.showExternalOpenModal,
    state.theme
  );

  root.innerHTML = html;
  bindMainEvents();
  attachGlobalKeyboardListener();

  if (state.previewState?.preview?.kind === 'word-docx') {
    const docxContainer = document.getElementById('docx-preview-container');
    if (docxContainer && state.previewState.preview.arrayBuffer) {
      renderDocxPreview(state.previewState.preview.arrayBuffer, docxContainer);
    }
  }

  const newFileListEl = document.getElementById('file-list');
  if (newFileListEl && previousScrollTop > 0) {
    newFileListEl.scrollTop = previousScrollTop;
  }
}

async function renderDocxPreview(arrayBuffer, container) {
  try {
    const docx = await import('docx-preview');
    container.innerHTML = '';
    await docx.renderAsync(arrayBuffer, container, null, {
      inWrapper: true,
      ignoreWidth: false,
      ignoreHeight: false,
      experimental: true,
    });
  } catch (err) {
    console.error('Failed to render DOCX preview:', err);
    container.innerHTML = `
      <div class="p-4 rounded-xl bg-red-50 text-xs text-red-700">
        Impossible d'afficher la mise en page du document Word. Aucun fichier n'a été modifié.
      </div>
    `;
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
  document.getElementById('btn-dismiss-error')?.addEventListener('click', () => {
    state.error = null;
    render();
  });

  document.getElementById('btn-refresh-root')?.addEventListener('click', () => {
    if (state.treeRootPath) {
      refreshFolder(state.treeRootPath);
    }
  });

  document.getElementById('btn-toggle-header')?.addEventListener('click', () => {
    state.isHeaderCollapsed = !state.isHeaderCollapsed;
    render();
  });

  document.getElementById('btn-toggle-theme')?.addEventListener('click', () => {
    state.theme = state.theme === 'dark' ? 'light' : 'dark';
    render();
  });

  document.getElementById('btn-toggle-tree')?.addEventListener('click', () => {
    state.isTreeVisible = !state.isTreeVisible;
    render();
  });

  document.getElementById('btn-toggle-panel')?.addEventListener('click', () => {
    state.isPreviewPanelVisible = !state.isPreviewPanelVisible;
    render();
  });

  const searchInput = document.getElementById('input-search');
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      state.search = e.target.value;
      render();
    });
  }

  document.getElementById('btn-clear-search')?.addEventListener('click', () => {
    state.search = '';
    render();
  });

  document.querySelectorAll('.btn-toggle-folder').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const path = btn.dataset.nodeToggle;
      if (path) {
        toggleFolder(path);
      }
    });
  });

  document.querySelectorAll('.btn-retry-folder').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const path = btn.dataset.nodeRetry;
      if (path) {
        loadFolderContents(path, true);
      }
    });
  });

  document.querySelectorAll('.tree-node-item').forEach((itemEl) => {
    itemEl.addEventListener('click', (e) => {
      e.stopPropagation();
      const path = itemEl.dataset.nodePath;
      if (!path) return;
      const node = state.nodes.get(path);
      if (node) {
        handleNodeSingleClick(node);
      }
    });

    itemEl.addEventListener('dblclick', (e) => {
      e.stopPropagation();
      const path = itemEl.dataset.nodePath;
      if (!path) return;
      const node = state.nodes.get(path);
      if (node) {
        handleNodeDoubleClick(node);
      }
    });
  });

  document.getElementById('btn-open-another')?.addEventListener('click', () => {
    state.loading = false;
    state.rootHandle = null;
    state.rootPath = '';
    state.rootName = '';
    state.nodes.clear();
    state.treeRootPath = null;
    state.usingFallback = false;
    state.selectedItem = null;
    state.previewState = { status: 'idle', preview: null, error: null };
    updateObjectUrl(null);
    handleMap.clear();
    render();
  });

  document.getElementById('btn-open-external')?.addEventListener('click', (e) => {
    const filePath = e.currentTarget.dataset.filePath || state.selectedItem?.path;
    if (filePath) {
      requestExternalOpen(filePath);
    }
  });

  if (state.showExternalOpenModal) {
    document.getElementById('btn-modal-cancel')?.addEventListener('click', cancelExternalOpen);
    document.getElementById('btn-modal-confirm')?.addEventListener('click', confirmExternalOpen);
  }

  setupResizer();
}

export function requestExternalOpen(filePath) {
  if (state.skipExternalOpenWarning) {
    openExternalFile(filePath);
    return;
  }
  state.pendingExternalOpenPath = filePath;
  state.showExternalOpenModal = true;
  render();
}

export function confirmExternalOpen() {
  const chk = document.getElementById('chk-skip-external-warning');
  if (chk && chk.checked) {
    state.skipExternalOpenWarning = true;
  }
  const filePath = state.pendingExternalOpenPath;
  state.showExternalOpenModal = false;
  state.pendingExternalOpenPath = null;
  render();
  if (filePath) {
    openExternalFile(filePath);
  }
}

export function cancelExternalOpen() {
  state.showExternalOpenModal = false;
  state.pendingExternalOpenPath = null;
  render();
}

function setupResizer() {
  const resizer = document.getElementById('resizer');
  const previewPanelContainer = document.getElementById('preview-panel-container');
  if (!resizer || !previewPanelContainer) return;

  let startX = 0;
  let startWidth = state.panelWidth;

  const onMouseMove = (e) => {
    const delta = startX - e.clientX;
    const minWidth = 300;
    const maxWidth = Math.max(minWidth, window.innerWidth - 280);
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
    const isEditingText = activeTag === 'INPUT' || activeTag === 'TEXTAREA' || Boolean(document.activeElement?.isContentEditable);

    // Prevent destructive keys (Delete, Backspace) from modifying anything outside text inputs
    if (e.key === 'Delete' || e.key === 'Del' || (e.key === 'Backspace' && !isEditingText)) {
      if (!isEditingText) {
        e.preventDefault();
      }
      return;
    }

    if (state.showExternalOpenModal) {
      if (e.key === 'Escape') {
        e.preventDefault();
        cancelExternalOpen();
      } else if (e.key === 'Enter') {
        e.preventDefault();
        confirmExternalOpen();
      }
      return;
    }

    if (isEditingText) {
      return;
    }

    const visibleNodes = getVisibleTreeNodes(state.treeRootPath, state.nodes, state.search);
    if (visibleNodes.length === 0) return;

    const currentIndex = state.selectedItem
      ? visibleNodes.findIndex((n) => n.path === state.selectedItem.path)
      : -1;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      const nextIndex = currentIndex < 0 ? 0 : Math.min(visibleNodes.length - 1, currentIndex + 1);
      const nextNode = visibleNodes[nextIndex];
      if (nextNode) {
        handleNodeSingleClick(nextNode);
        scrollToSelectedNode();
      }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      const prevIndex = currentIndex < 0 ? 0 : Math.max(0, currentIndex - 1);
      const prevNode = visibleNodes[prevIndex];
      if (prevNode) {
        handleNodeSingleClick(prevNode);
        scrollToSelectedNode();
      }
    } else if (e.key === 'ArrowRight') {
      if (state.selectedItem && state.selectedItem.type === 'directory') {
        e.preventDefault();
        if (!state.selectedItem.isExpanded) {
          toggleFolder(state.selectedItem.path);
        } else if (state.selectedItem.childrenPaths.length > 0) {
          const sortedChildren = sortNodePaths(state.selectedItem.childrenPaths, state.nodes);
          const firstChild = state.nodes.get(sortedChildren[0]);
          if (firstChild) {
            handleNodeSingleClick(firstChild);
            scrollToSelectedNode();
          }
        }
      }
    } else if (e.key === 'ArrowLeft') {
      if (state.selectedItem) {
        e.preventDefault();
        if (state.selectedItem.type === 'directory' && state.selectedItem.isExpanded) {
          state.selectedItem.isExpanded = false;
          render();
        } else if (state.selectedItem.parentPath) {
          const parentNode = state.nodes.get(state.selectedItem.parentPath);
          if (parentNode) {
            handleNodeSingleClick(parentNode);
            scrollToSelectedNode();
          }
        }
      }
    } else if (e.key === 'Enter' || e.key === ' ') {
      if (state.selectedItem) {
        e.preventDefault();
        if (state.selectedItem.type === 'directory') {
          toggleFolder(state.selectedItem.path);
        } else {
          handleNodeSingleClick(state.selectedItem);
        }
      }
    }
  });
}


function scrollToSelectedNode() {
  const selectedEl = document.querySelector('[aria-selected="true"]');
  selectedEl?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
}

function handleNodeSingleClick(node) {
  state.selectedItem = node;

  if (node.type === 'directory') {
    state.previewState = { status: 'folder', preview: null };
    updateObjectUrl(null);
    render();
    return;
  }

  triggerFilePreview(node);
}

function handleNodeDoubleClick(node) {
  if (node.type === 'directory') {
    toggleFolder(node.path);
  } else {
    handleNodeSingleClick(node);
  }
}

async function triggerFilePreview(node) {
  const currentReqId = ++previewRequestId;
  state.previewState = { status: 'loading', preview: null };
  render();

  try {
    let file = null;

    if (state.usingFallback) {
      file = node.file || null;
    } else if (isElectron()) {
      const isText = isTextFile({ name: node.name, type: '' });
      const options = isText ? { maxBytes: MAX_TEXT_PREVIEW_BYTES } : undefined;
      file = await getElectronFile(node.path, node.name, options);
    } else {
      const handle = handleMap.get(node.path);
      if (handle && handle.kind === 'file') {
        file = await handle.getFile();
      } else if (node.file) {
        file = node.file;
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

export async function toggleFolder(path) {
  const node = state.nodes.get(path);
  if (!node || node.type !== 'directory') return;

  if (node.isExpanded) {
    node.isExpanded = false;
    render();
    return;
  }

  node.isExpanded = true;
  if (!node.isLoaded) {
    await loadFolderContents(path);
  } else {
    render();
  }
}

export async function refreshFolder(path) {
  const node = state.nodes.get(path);
  if (!node || node.type !== 'directory') return;
  await loadFolderContents(path, true);
}

export async function loadFolderContents(path, forceReload = false) {
  const node = state.nodes.get(path);
  if (!node || node.type !== 'directory') return;

  if (node.isLoaded && !forceReload) return;

  node.isLoading = true;
  node.error = null;
  render();

  try {
    let dirDir = null;

    if (state.usingFallback) {
      // In fallback mode, nodes are already created
      node.isLoading = false;
      node.isLoaded = true;
      render();
      return;
    }

    if (isElectron()) {
      dirDir = { kind: 'electron-directory', name: node.name, path: node.path };
    } else {
      dirDir = handleMap.get(path) || state.rootHandle;
    }

    const { files, handles } = await listDirectory(dirDir, node.path);

    const childPaths = [];
    files.forEach((fileItem) => {
      const childPath = fileItem.path;
      childPaths.push(childPath);

      const existingChild = state.nodes.get(childPath);

      state.nodes.set(childPath, {
        path: childPath,
        name: fileItem.name,
        type: fileItem.type,
        size: fileItem.size,
        file: fileItem.file || null,
        parentPath: path,
        level: node.level + 1,
        isExpanded: existingChild ? existingChild.isExpanded : false,
        isLoaded: existingChild ? existingChild.isLoaded : false,
        isLoading: false,
        error: null,
        childrenPaths: existingChild ? existingChild.childrenPaths : [],
      });

      const handle = handles.find((h) => h.name === fileItem.name);
      if (handle) {
        handleMap.set(childPath, handle);
      }
    });

    // Remove children no longer present on disk
    if (forceReload && Array.isArray(node.childrenPaths)) {
      const newChildSet = new Set(childPaths);
      node.childrenPaths.forEach((oldPath) => {
        if (!newChildSet.has(oldPath)) {
          state.nodes.delete(oldPath);
        }
      });
    }

    node.childrenPaths = childPaths;
    node.isLoaded = true;
  } catch (err) {
    node.error = err instanceof Error ? err.message : `Impossible de lire le dossier "${node.name}".`;
  } finally {
    node.isLoading = false;
    render();
  }
}

async function handleOpenFolder() {
  state.error = null;
  try {
    const handle = await openDirectory();
    const path = handle.kind === 'electron-directory' ? handle.path : `/${handle.name}`;

    state.rootHandle = handle;
    state.rootPath = path;
    state.rootName = handle.name;
    state.nodes.clear();
    handleMap.clear();

    const rootNode = {
      path,
      name: handle.name,
      type: 'directory',
      parentPath: null,
      level: 0,
      isExpanded: true,
      isLoaded: false,
      isLoading: true,
      error: null,
      childrenPaths: [],
      handle,
    };

    state.nodes.set(path, rootNode);
    state.treeRootPath = path;

    await loadFolderContents(path);
  } catch (err) {
    if (err instanceof Error && err.message === 'NOT_SUPPORTED') {
      state.error = 'Your browser does not support the folder picker.';
    } else if (err instanceof DOMException && err.name === 'AbortError') {
      // Cancelled
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

function handleFallbackFiles(fileList) {
  state.nodes.clear();
  handleMap.clear();

  let rootFolderName = '';
  const folderMap = new Map();

  const getOrCreateFolderMap = (dirPath) => {
    let map = folderMap.get(dirPath);
    if (!map) {
      map = new Map();
      folderMap.set(dirPath, map);
    }
    return map;
  };

  Array.from(fileList).forEach((f) => {
    const rawRel = f.webkitRelativePath || f.name;
    const rel = rawRel.startsWith('/') ? rawRel : `/${rawRel}`;
    const parts = rel.split('/').filter(Boolean);

    if (parts.length > 0 && !rootFolderName) {
      rootFolderName = parts[0];
    }

    const rootPath = `/${rootFolderName || 'Files'}`;

    if (parts.length <= 1) {
      getOrCreateFolderMap(rootPath).set(f.name, {
        path: rel,
        name: f.name,
        type: 'file',
        size: f.size,
        file: f,
        parentPath: rootPath,
        level: 1,
        isExpanded: false,
        isLoaded: true,
        isLoading: false,
        error: null,
        childrenPaths: [],
      });
    } else {
      let currentDirPath = `/${parts[0]}`;
      for (let i = 1; i < parts.length; i++) {
        const isLast = i === parts.length - 1;
        const partName = parts[i];
        if (isLast) {
          getOrCreateFolderMap(currentDirPath).set(partName, {
            path: rel,
            name: partName,
            type: 'file',
            size: f.size,
            file: f,
            parentPath: currentDirPath,
            level: i,
            isExpanded: false,
            isLoaded: true,
            isLoading: false,
            error: null,
            childrenPaths: [],
          });
        } else {
          const subDirPath = `${currentDirPath}/${partName}`;
          const currentMap = getOrCreateFolderMap(currentDirPath);
          if (!currentMap.has(partName)) {
            currentMap.set(partName, {
              path: subDirPath,
              name: partName,
              type: 'directory',
              parentPath: currentDirPath,
              level: i,
              isExpanded: false,
              isLoaded: true,
              isLoading: false,
              error: null,
              childrenPaths: [],
            });
          }
          currentDirPath = subDirPath;
        }
      }
    }
  });

  const rootPath = `/${rootFolderName || 'Files'}`;
  const rootNode = {
    path: rootPath,
    name: rootFolderName || 'Files',
    type: 'directory',
    parentPath: null,
    level: 0,
    isExpanded: true,
    isLoaded: true,
    isLoading: false,
    error: null,
    childrenPaths: [],
  };

  state.nodes.set(rootPath, rootNode);
  state.treeRootPath = rootPath;

  folderMap.forEach((childrenMap, dirPath) => {
    const parentNode = state.nodes.get(dirPath);
    const childPaths = [];
    childrenMap.forEach((childNode) => {
      state.nodes.set(childNode.path, childNode);
      childPaths.push(childNode.path);
    });

    if (parentNode) {
      parentNode.childrenPaths = childPaths;
    }
  });

  state.usingFallback = true;
  state.rootHandle = null;
  state.search = '';
  state.error = null;
  state.selectedItem = null;
  state.previewState = { status: 'idle', preview: null };
  updateObjectUrl(null);
  render();
}

// Initial render
if (typeof document !== 'undefined') {
  document.addEventListener('DOMContentLoaded', () => {
    render();
  });
  if (document.readyState === 'interactive' || document.readyState === 'complete') {
    render();
  }
}
