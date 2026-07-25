import './index.css';
import {
  openDirectory,
  listDirectory,
  getElectronFile,
  openExternalFile,
  renameFileOrDirectory,
  copyFileOrDirectory,
  cancelCopyOperation,
  undoCopyOperation,
  subscribeCopyProgress,
  moveFileOrDirectory,
  cancelMoveOperation,
  undoMoveOperation,
  subscribeMoveProgress,
} from './fileSystem';
import {
  isTextFile,
  readFilePreview,
  MAX_TEXT_PREVIEW_BYTES,
} from './filePreview';
import {
  renderWelcomeScreen,
  renderMainLayout,
} from './renderers';
import {
  sortNodePaths,
  getVisibleTreeNodes,
} from './treeLogic';
import {
  validateRename,
  isExtensionModified,
  splitFileName,
} from './renameValidation';
import {
  validateCopyTarget,
  generateAutoCopyName,
} from './copyValidation';
import {
  validateMoveTarget,
  validateMoveName,
} from './moveValidation';

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
  objectUrl: null,
  isTreeVisible: true,
  showExternalOpenModal: false,
  skipExternalOpenWarning: false,
  pendingExternalOpenPath: null,
  externalOpenCandidatePath: null,
  theme: 'dark',
  renameModal: {
    isOpen: false,
    step: 'input', // 'input' | 'confirm'
    item: null,
    newName: '',
    parentPath: '',
    parentChildrenNames: [],
    validationError: null,
    extensionWarning: null,
  },
  undoState: {
    available: false,
    itemType: 'file',
    oldPath: '',
    newPath: '',
    oldName: '',
    newName: '',
    parentPath: '',
  },
  undoToast: {
    visible: false,
    message: '',
  },
  renameErrorMessage: null,
  copyModal: {
    isOpen: false,
    step: 'wizard', // 'wizard' | 'confirm' | 'progress' | 'success'
    sourceItem: null,
    destDirPath: '',
    copyName: '',
    validationError: null,
    extensionWarning: null,
    hasConflict: false,
    progressState: { currentItem: '', percentage: 0, copiedCount: 0, totalCount: 0 },
    resultState: { sourcePath: '', copyPath: '', copyName: '' },
    copyId: null,
  },
  lastCopyUndoState: {
    available: false,
    copyPath: '',
    copyName: '',
    sourcePath: '',
    isDir: false,
    destDirPath: '',
  },
  copyUndoToast: {
    visible: false,
    message: '',
  },
  copyErrorMessage: null,
  moveModal: {
    isOpen: false,
    step: 'wizard', // 'wizard' | 'confirm' | 'progress' | 'success'
    sourceItem: null,
    destDirPath: '',
    moveName: '',
    validationError: null,
    extensionWarning: null,
    hasConflict: false,
    progressState: { currentItem: '', percentage: 0, movedCount: 0, totalCount: 0 },
    resultState: { sourcePath: '', targetPath: '', moveName: '' },
    moveId: null,
  },
  lastMoveUndoState: {
    available: false,
    sourcePath: '',
    targetPath: '',
    moveName: '',
    isDir: false,
    destDirPath: '',
  },
  moveUndoToast: {
    visible: false,
    message: '',
  },
  moveErrorMessage: null,
};

let previewRequestId = 0;
let isKeyboardListenerAttached = false;
let isFileProtectionListenersAttached = false;

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

  if (!state.rootHandle) {
    root.innerHTML = renderWelcomeScreen(state.error);
    bindWelcomeEvents();
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
    state.error,
    state.selectedItem,
    state.previewState,
    state.objectUrl,
    state.isPreviewPanelVisible,
    state.panelWidth,
    state.isHeaderCollapsed,
    state.isTreeVisible,
    state.showExternalOpenModal,
    state.theme,
    state.renameModal,
    state.undoToast,
    state.renameErrorMessage,
    state.copyModal,
    state.copyUndoToast,
    state.copyErrorMessage,
    state.moveModal,
    state.moveUndoToast,
    state.moveErrorMessage
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
}

export function openRenameModal(item = state.selectedItem) {
  if (!item) return;

  let parentPath = item.parentPath || '';
  if (!parentPath && item.path) {
    const parts = item.path.split(/[/\\]/).filter(Boolean);
    if (parts.length > 1) {
      parts.pop();
      parentPath = item.path.startsWith('/') ? '/' + parts.join('/') : parts.join('/');
    }
  }

  let parentChildrenNames = [];
  if (parentPath && state.nodes.has(parentPath)) {
    const parentNode = state.nodes.get(parentPath);
    parentChildrenNames = (parentNode.childrenPaths || [])
      .map((cp) => state.nodes.get(cp)?.name)
      .filter(Boolean);
  } else {
    parentChildrenNames = Array.from(state.nodes.values())
      .filter((n) => n.parentPath === parentPath)
      .map((n) => n.name);
  }

  state.renameModal = {
    isOpen: true,
    step: 'input',
    item,
    newName: item.name,
    parentPath,
    parentChildrenNames,
    validationError: null,
    extensionWarning: null,
  };

  validateCurrentRenameInput();
  render();

  setTimeout(() => {
    const inputEl = document.getElementById('input-rename-name');
    if (inputEl) {
      inputEl.focus();
      if (item.type !== 'directory') {
        const { baseName } = splitFileName(item.name);
        if (baseName && baseName.length > 0) {
          inputEl.setSelectionRange(0, baseName.length);
        } else {
          inputEl.select();
        }
      } else {
        inputEl.select();
      }
    }
  }, 50);
}

export function validateCurrentRenameInput() {
  if (!state.renameModal.isOpen || !state.renameModal.item) return;

  const item = state.renameModal.item;
  const newName = state.renameModal.newName;

  const valRes = validateRename({
    currentName: item.name,
    newName,
    isDirectory: item.type === 'directory',
    parentChildrenNames: state.renameModal.parentChildrenNames || [],
    parentPath: state.renameModal.parentPath,
    maxPathLength: 260,
  });

  const extRes = isExtensionModified(item.name, newName, item.type === 'directory');

  state.renameModal.validationError = valRes.isValid ? null : valRes.error;
  if (extRes.isModified) {
    state.renameModal.extensionWarning = `Vous modifiez l’extension ${extRes.oldExt || 'du fichier'}. Le fichier pourrait ne plus s’ouvrir correctement.`;
  } else {
    state.renameModal.extensionWarning = null;
  }
}

export function closeRenameModal() {
  state.renameModal = {
    isOpen: false,
    step: 'input',
    item: null,
    newName: '',
    parentPath: '',
    parentChildrenNames: [],
    validationError: null,
    extensionWarning: null,
  };
  render();
}

export function submitRenameInputStep() {
  validateCurrentRenameInput();
  if (state.renameModal.validationError) {
    return;
  }
  state.renameModal.step = 'confirm';
  render();
}

export async function executeRename() {
  if (!state.renameModal.item || state.renameModal.validationError) return;

  const item = state.renameModal.item;
  const oldPath = item.path;
  const newName = state.renameModal.newName.trim();
  const parentPath = state.renameModal.parentPath;

  const normalizedParent = parentPath.replace(/\\/g, '/').replace(/\/+$/, '');
  const newPath = parentPath ? `${normalizedParent}/${newName}` : `/${newName}`;

  const res = await renameFileOrDirectory(oldPath, newPath);

  if (!res.success) {
    console.error('Failed to rename element:', res.error);
    state.renameErrorMessage = res.error || "Impossible de renommer l'élément. Aucune autre modification n'a été effectuée.";
    state.renameModal.isOpen = false;
    render();
    return;
  }

  const oldName = item.name;
  const targetNode = state.nodes.get(oldPath) || item;
  state.nodes.delete(oldPath);
  targetNode.name = newName;
  targetNode.path = newPath;
  if (targetNode.file) {
    targetNode.file = new File([targetNode.file], newName, { type: targetNode.file.type });
  }
  state.nodes.set(newPath, targetNode);

  if (targetNode.parentPath && state.nodes.has(targetNode.parentPath)) {
    const parentNode = state.nodes.get(targetNode.parentPath);
    if (Array.isArray(parentNode.childrenPaths)) {
      parentNode.childrenPaths = parentNode.childrenPaths.map((cp) => (cp === oldPath ? newPath : cp));
      parentNode.childrenPaths = sortNodePaths(parentNode.childrenPaths, state.nodes);
    }
  }

  if (targetNode.type === 'directory') {
    const oldPrefix = oldPath + '/';
    const newPrefix = newPath + '/';
    const entriesToUpdate = [];

    for (const [pathKey, node] of state.nodes.entries()) {
      if (pathKey.startsWith(oldPrefix)) {
        entriesToUpdate.push({ oldKey: pathKey, node });
      }
    }

    for (const { oldKey, node } of entriesToUpdate) {
      state.nodes.delete(oldKey);
      const updatedPath = node.path.replace(oldPrefix, newPrefix);
      const updatedParent = node.parentPath ? node.parentPath.replace(oldPrefix, newPrefix) : newPath;
      node.path = updatedPath;
      node.parentPath = updatedParent;
      if (Array.isArray(node.childrenPaths)) {
        node.childrenPaths = node.childrenPaths.map((cp) => (cp.startsWith(oldPrefix) ? cp.replace(oldPrefix, newPrefix) : cp));
      }
      state.nodes.set(updatedPath, node);
    }
  }

  if (state.treeRootPath === oldPath) {
    state.treeRootPath = newPath;
  }
  if (state.rootPath === oldPath) {
    state.rootPath = newPath;
    state.rootName = newName;
  }

  state.selectedItem = targetNode;

  state.undoState = {
    available: true,
    itemType: targetNode.type,
    oldPath,
    newPath,
    oldName,
    newName,
    parentPath,
  };

  state.undoToast = {
    visible: true,
    message: `Le ${targetNode.type === 'directory' ? 'dossier' : 'fichier'} a été renommé.`,
  };

  state.renameModal = {
    isOpen: false,
    step: 'input',
    item: null,
    newName: '',
    parentPath: '',
    parentChildrenNames: [],
    validationError: null,
    extensionWarning: null,
  };

  render();
}

export async function handleUndoRename() {
  if (!state.undoState || !state.undoState.available) return;

  const { oldPath, newPath, oldName, parentPath, itemType } = state.undoState;

  if (parentPath && state.nodes.has(parentPath)) {
    const parentNode = state.nodes.get(parentPath);
    const hasConflict = (parentNode.childrenPaths || []).some((cp) => {
      const child = state.nodes.get(cp);
      return child && child.path !== newPath && child.name.toLowerCase() === oldName.toLowerCase();
    });

    if (hasConflict) {
      state.undoToast.visible = false;
      state.renameErrorMessage = `Impossible d'annuler : un autre élément portant le nom '${oldName}' existe déjà dans cet emplacement. Aucune autre modification n'a été effectuée.`;
      render();
      return;
    }
  }

  const res = await renameFileOrDirectory(newPath, oldPath);
  if (!res.success) {
    state.undoToast.visible = false;
    state.renameErrorMessage = res.error || "Impossible d'annuler le renommage. Aucune autre modification n'a été effectuée.";
    render();
    return;
  }

  const targetNode = state.nodes.get(newPath);
  if (targetNode) {
    state.nodes.delete(newPath);
    targetNode.name = oldName;
    targetNode.path = oldPath;
    state.nodes.set(oldPath, targetNode);

    if (targetNode.parentPath && state.nodes.has(targetNode.parentPath)) {
      const parentNode = state.nodes.get(targetNode.parentPath);
      if (Array.isArray(parentNode.childrenPaths)) {
        parentNode.childrenPaths = parentNode.childrenPaths.map((cp) => (cp === newPath ? oldPath : cp));
        parentNode.childrenPaths = sortNodePaths(parentNode.childrenPaths, state.nodes);
      }
    }

    if (targetNode.type === 'directory') {
      const newPrefix = newPath + '/';
      const oldPrefix = oldPath + '/';
      const entriesToUpdate = [];

      for (const [pathKey, node] of state.nodes.entries()) {
        if (pathKey.startsWith(newPrefix)) {
          entriesToUpdate.push({ newKey: pathKey, node });
        }
      }

      for (const { newKey, node } of entriesToUpdate) {
        state.nodes.delete(newKey);
        const updatedPath = node.path.replace(newPrefix, oldPrefix);
        const updatedParent = node.parentPath ? node.parentPath.replace(newPrefix, oldPrefix) : oldPath;
        node.path = updatedPath;
        node.parentPath = updatedParent;
        if (Array.isArray(node.childrenPaths)) {
          node.childrenPaths = node.childrenPaths.map((cp) => (cp.startsWith(newPrefix) ? cp.replace(newPrefix, oldPrefix) : cp));
        }
        state.nodes.set(updatedPath, node);
      }
    }

    if (state.treeRootPath === newPath) state.treeRootPath = oldPath;
    if (state.rootPath === newPath) {
      state.rootPath = oldPath;
      state.rootName = oldName;
    }

    state.selectedItem = targetNode;
  }

  state.undoState = { available: false };
  state.undoToast = {
    visible: true,
    message: `Le renommage a été annulé. ${itemType === 'directory' ? 'Le dossier' : 'Le fichier'} a retrouvé son nom d'origine.`,
  };

  render();
}

export function openCopyModal(item = state.selectedItem) {
  if (!item) return;

  let defaultDest = item.parentPath || '';
  if (!defaultDest && item.path) {
    const parts = item.path.split(/[/\\]/).filter(Boolean);
    if (parts.length > 1) {
      parts.pop();
      defaultDest = item.path.startsWith('/') ? '/' + parts.join('/') : parts.join('/');
    } else {
      defaultDest = item.path;
    }
  }
  if (!defaultDest && state.rootPath) {
    defaultDest = state.rootPath;
  }

  state.copyModal = {
    isOpen: true,
    step: 'wizard',
    sourceItem: item,
    destDirPath: defaultDest,
    copyName: item.name,
    validationError: null,
    extensionWarning: null,
    hasConflict: false,
    conflictChoice: null,
    progressState: { currentItem: '', percentage: 0, copiedCount: 0, totalCount: 0 },
    resultState: { sourcePath: item.path, copyPath: '', copyName: item.name },
    copyId: 'copy_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
  };

  validateCurrentCopyInput();
  render();

  setTimeout(() => {
    const inputEl = document.getElementById('input-copy-name');
    if (inputEl) {
      inputEl.focus();
      if (item.type !== 'directory') {
        const { baseName } = splitFileName(item.name);
        if (baseName && baseName.length > 0) {
          inputEl.setSelectionRange(0, baseName.length);
        } else {
          inputEl.select();
        }
      } else {
        inputEl.select();
      }
    }
  }, 50);
}

export function validateCurrentCopyInput() {
  if (!state.copyModal.isOpen || !state.copyModal.sourceItem) return;

  const item = state.copyModal.sourceItem;
  const copyName = state.copyModal.copyName;
  const destDirPath = state.copyModal.destDirPath;

  const targetCheck = validateCopyTarget(item.path, destDirPath);
  if (!targetCheck.isValid) {
    state.copyModal.validationError = targetCheck.error;
    state.copyModal.hasConflict = false;
    state.copyModal.extensionWarning = null;
    return;
  }

  const valRes = validateRename({
    currentName: '',
    newName: copyName,
    isDirectory: item.type === 'directory',
    parentChildrenNames: [],
    parentPath: destDirPath,
    maxPathLength: 260,
  });

  state.copyModal.validationError = valRes.isValid ? null : valRes.error;

  const extRes = isExtensionModified(item.name, copyName, item.type === 'directory');
  state.copyModal.extensionWarning = extRes.isModified
    ? `Vous modifiez l’extension ${extRes.oldExt || 'du fichier'}. Le fichier pourrait ne plus s’ouvrir correctement.`
    : null;

  if (valRes.isValid) {
    let destChildrenNames = [];
    if (state.nodes.has(destDirPath)) {
      const parentNode = state.nodes.get(destDirPath);
      destChildrenNames = (parentNode.childrenPaths || [])
        .map((cp) => state.nodes.get(cp)?.name)
        .filter(Boolean);
    }
    const lowerCopyName = copyName.trim().toLowerCase();
    const conflictExists = destChildrenNames.some(
      (existingName) => existingName && existingName.toLowerCase() === lowerCopyName
    );
    state.copyModal.hasConflict = conflictExists;
  } else {
    state.copyModal.hasConflict = false;
  }
}

export function closeCopyModal() {
  state.copyModal = {
    isOpen: false,
    step: 'wizard',
    sourceItem: null,
    destDirPath: '',
    copyName: '',
    validationError: null,
    extensionWarning: null,
    hasConflict: false,
    progressState: { currentItem: '', percentage: 0, copiedCount: 0, totalCount: 0 },
    resultState: { sourcePath: '', copyPath: '', copyName: '' },
    copyId: null,
  };
  render();
}

export async function handleChooseCopyDestination() {
  if (!state.copyModal.isOpen) return;
  try {
    const handle = await openDirectory();
    if (handle && handle.path) {
      state.copyModal.destDirPath = handle.path;
      validateCurrentCopyInput();
      render();
    }
  } catch {
    // Aborted or unavailable
  }
}

export function handleApplyAutoCopyName() {
  if (!state.copyModal.isOpen || !state.copyModal.sourceItem) return;
  const item = state.copyModal.sourceItem;
  const destDirPath = state.copyModal.destDirPath;
  let destChildrenNames = [];
  if (state.nodes.has(destDirPath)) {
    const parentNode = state.nodes.get(destDirPath);
    destChildrenNames = (parentNode.childrenPaths || [])
      .map((cp) => state.nodes.get(cp)?.name)
      .filter(Boolean);
  }
  const autoName = generateAutoCopyName(item.name, destChildrenNames, item.type === 'directory');
  state.copyModal.copyName = autoName;
  validateCurrentCopyInput();
  render();
}

export function submitCopyWizardStep() {
  validateCurrentCopyInput();
  if (state.copyModal.validationError || state.copyModal.hasConflict) {
    return;
  }
  state.copyModal.step = 'confirm';
  render();
}

export async function executeCopy() {
  if (!state.copyModal.isOpen || !state.copyModal.sourceItem) return;
  if (state.copyModal.validationError || state.copyModal.hasConflict) return;

  const { sourceItem, destDirPath, copyName, copyId } = state.copyModal;

  state.copyModal.step = 'progress';
  state.copyModal.progressState = {
    currentItem: sourceItem.name,
    percentage: 0,
    copiedCount: 0,
    totalCount: 1,
  };
  render();

  const unsubscribeProgress = subscribeCopyProgress((data) => {
    if (state.copyModal.isOpen && state.copyModal.copyId === data.copyId) {
      state.copyModal.progressState = {
        currentItem: data.currentItem || '',
        percentage: data.percentage || 0,
        copiedCount: data.copiedCount || 0,
        totalCount: data.totalCount || 0,
      };
      const nameEl = document.getElementById('copy-progress-item-name');
      if (nameEl) nameEl.textContent = data.currentItem || sourceItem.name;
      const barEl = document.querySelector('#modal-copy-progress-overlay .bg-gradient-to-r');
      if (barEl) barEl.style.width = `${data.percentage || 0}%`;
    }
  });

  try {
    const res = await copyFileOrDirectory({
      sourcePath: sourceItem.path,
      destDirPath,
      newName: copyName,
      copyId,
    });

    unsubscribeProgress();

    if (res.cancelled) {
      state.copyModal.isOpen = false;
      state.copyErrorMessage = 'La copie a été annulée. L’élément original n’a pas été modifié.';
      render();
      return;
    }

    if (!res.success) {
      state.copyModal.isOpen = false;
      state.copyErrorMessage = res.error || 'La copie n\'a pas pu être créée. Le fichier original n\'a pas été modifié.';
      render();
      return;
    }

    const createdCopyPath = res.targetPath;

    if (state.nodes.has(destDirPath)) {
      await loadFolderContents(destDirPath, true);
    }

    state.copyModal.resultState = {
      sourcePath: sourceItem.path,
      copyPath: createdCopyPath,
      copyName,
    };
    state.copyModal.step = 'success';

    state.lastCopyUndoState = {
      available: true,
      copyPath: createdCopyPath,
      copyName,
      sourcePath: sourceItem.path,
      isDir: sourceItem.type === 'directory',
      destDirPath,
    };

    state.copyUndoToast = {
      visible: true,
      message: `La copie a été créée.`,
    };

    render();
  } catch (err) {
    unsubscribeProgress();
    state.copyModal.isOpen = false;
    state.copyErrorMessage = err instanceof Error ? err.message : 'La copie n\'a pas pu être créée. Le fichier original n\'a pas été modifié.';
    render();
  }
}

export async function handleCancelCopyInProgress() {
  if (state.copyModal.copyId) {
    await cancelCopyOperation(state.copyModal.copyId);
  }
}

export async function handleUndoCopy() {
  if (!state.lastCopyUndoState || !state.lastCopyUndoState.available) return;

  const { copyPath, destDirPath } = state.lastCopyUndoState;

  const res = await undoCopyOperation(copyPath);
  if (!res.success) {
    state.copyUndoToast.visible = false;
    state.copyErrorMessage = res.error || "Impossible d'annuler la copie. L'élément original n'a pas été modifié.";
    render();
    return;
  }

  if (destDirPath && state.nodes.has(destDirPath)) {
    await loadFolderContents(destDirPath, true);
  }

  state.lastCopyUndoState = { available: false };
  state.copyUndoToast = {
    visible: true,
    message: "La copie a été annulée et placée dans la Corbeille. L'élément original est intact.",
  };

  render();
}

export function handleShowCreatedCopy() {
  const copyPath = state.copyModal?.resultState?.copyPath || state.lastCopyUndoState?.copyPath;
  state.copyModal.isOpen = false;

  if (copyPath && state.nodes.has(copyPath)) {
    const copyNode = state.nodes.get(copyPath);
    if (copyNode) {
      handleNodeSingleClick(copyNode);
      setTimeout(scrollToSelectedNode, 100);
    }
  }
  render();
}

export function openMoveModal(item = state.selectedItem) {
  if (!item) return;

  let defaultDest = item.parentPath || '';
  if (!defaultDest && item.path) {
    const parts = item.path.split(/[/\\]/).filter(Boolean);
    if (parts.length > 1) {
      parts.pop();
      defaultDest = item.path.startsWith('/') ? '/' + parts.join('/') : parts.join('/');
    } else {
      defaultDest = item.path;
    }
  }
  if (!defaultDest && state.rootPath) {
    defaultDest = state.rootPath;
  }

  state.moveModal = {
    isOpen: true,
    step: 'wizard',
    sourceItem: item,
    destDirPath: defaultDest,
    moveName: item.name,
    validationError: null,
    extensionWarning: null,
    hasConflict: false,
    progressState: { currentItem: '', percentage: 0, movedCount: 0, totalCount: 0 },
    resultState: { sourcePath: item.path, targetPath: '', moveName: item.name },
    moveId: 'move_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
  };

  validateCurrentMoveInput();
  render();

  setTimeout(() => {
    const inputEl = document.getElementById('input-move-name');
    if (inputEl) {
      inputEl.focus();
      if (item.type !== 'directory') {
        const { baseName } = splitFileName(item.name);
        if (baseName && baseName.length > 0) {
          inputEl.setSelectionRange(0, baseName.length);
        } else {
          inputEl.select();
        }
      } else {
        inputEl.select();
      }
    }
  }, 50);
}

export function validateCurrentMoveInput() {
  if (!state.moveModal.isOpen || !state.moveModal.sourceItem) return;

  const item = state.moveModal.sourceItem;
  const moveName = state.moveModal.moveName;
  const destDirPath = state.moveModal.destDirPath;

  const targetCheck = validateMoveTarget(item.path, destDirPath, item.type === 'directory');
  if (!targetCheck.isValid) {
    state.moveModal.validationError = targetCheck.error;
    state.moveModal.hasConflict = false;
    state.moveModal.extensionWarning = null;
    return;
  }

  let destChildrenNames = [];
  if (state.nodes.has(destDirPath)) {
    const parentNode = state.nodes.get(destDirPath);
    destChildrenNames = (parentNode.childrenPaths || [])
      .map((cp) => state.nodes.get(cp)?.name)
      .filter(Boolean);
  }

  const nameCheck = validateMoveName({
    currentName: item.name,
    moveName,
    isDirectory: item.type === 'directory',
    parentChildrenNames: destChildrenNames,
    parentPath: destDirPath,
    maxPathLength: 260,
  });

  if (!nameCheck.isValid) {
    if (nameCheck.hasConflict) {
      state.moveModal.validationError = null;
      state.moveModal.hasConflict = true;
    } else {
      state.moveModal.validationError = nameCheck.error;
      state.moveModal.hasConflict = false;
    }
  } else {
    state.moveModal.validationError = null;
    state.moveModal.hasConflict = false;
  }

  const extRes = isExtensionModified(item.name, moveName, item.type === 'directory');
  state.moveModal.extensionWarning = extRes.isModified
    ? `Vous modifiez l’extension ${extRes.oldExt || 'du fichier'}. Le fichier pourrait ne plus s’ouvrir correctement.`
    : null;
}

export function closeMoveModal() {
  state.moveModal = {
    isOpen: false,
    step: 'wizard',
    sourceItem: null,
    destDirPath: '',
    moveName: '',
    validationError: null,
    extensionWarning: null,
    hasConflict: false,
    progressState: { currentItem: '', percentage: 0, movedCount: 0, totalCount: 0 },
    resultState: { sourcePath: '', targetPath: '', moveName: '' },
    moveId: null,
  };
  render();
}

export async function handleChooseMoveDestination() {
  if (!state.moveModal.isOpen) return;
  try {
    const handle = await openDirectory();
    if (handle && handle.path) {
      state.moveModal.destDirPath = handle.path;
      validateCurrentMoveInput();
      render();
    }
  } catch {
    // Aborted or unavailable
  }
}

export function submitMoveWizardStep() {
  validateCurrentMoveInput();
  if (state.moveModal.validationError || state.moveModal.hasConflict) {
    return;
  }
  state.moveModal.step = 'confirm';
  render();
}

export async function executeMove() {
  if (!state.moveModal.isOpen || !state.moveModal.sourceItem) return;
  if (state.moveModal.validationError || state.moveModal.hasConflict) return;

  const { sourceItem, destDirPath, moveName, moveId } = state.moveModal;

  state.moveModal.step = 'progress';
  state.moveModal.progressState = {
    currentItem: sourceItem.name,
    percentage: 0,
    movedCount: 0,
    totalCount: 1,
  };
  render();

  const unsubscribeProgress = subscribeMoveProgress((data) => {
    if (state.moveModal.isOpen && state.moveModal.moveId === data.moveId) {
      state.moveModal.progressState = {
        currentItem: data.currentItem || '',
        percentage: data.percentage || 0,
        movedCount: data.movedCount || 0,
        totalCount: data.totalCount || 0,
      };
      const nameEl = document.getElementById('move-progress-item-name');
      if (nameEl) nameEl.textContent = data.currentItem || sourceItem.name;
      const barEl = document.querySelector('#modal-move-progress-overlay .bg-gradient-to-r');
      if (barEl) barEl.style.width = `${data.percentage || 0}%`;
    }
  });

  try {
    const res = await moveFileOrDirectory({
      sourcePath: sourceItem.path,
      destDirPath,
      newName: moveName,
      moveId,
    });

    unsubscribeProgress();

    if (res.cancelled) {
      state.moveModal.isOpen = false;
      state.moveErrorMessage = 'Le déplacement a été annulé. L’élément original est resté à son emplacement initial.';
      render();
      return;
    }

    if (!res.success) {
      state.moveModal.isOpen = false;
      state.moveErrorMessage = res.error || 'Le déplacement n\'a pas pu être terminé. L’élément original est resté à son emplacement initial.';
      render();
      return;
    }

    const createdTargetPath = res.targetPath;
    const oldPath = sourceItem.path;

    const node = state.nodes.get(oldPath) || sourceItem;

    if (node.parentPath && state.nodes.has(node.parentPath)) {
      const oldParent = state.nodes.get(node.parentPath);
      if (Array.isArray(oldParent.childrenPaths)) {
        oldParent.childrenPaths = oldParent.childrenPaths.filter((p) => p !== oldPath);
      }
    }
    state.nodes.delete(oldPath);

    node.path = createdTargetPath;
    node.name = moveName;
    node.parentPath = destDirPath;

    if (node.file) {
      node.file = new File([node.file], moveName, { type: node.file.type });
    }

    if (state.nodes.has(destDirPath)) {
      const destNode = state.nodes.get(destDirPath);
      node.level = (destNode.level || 0) + 1;
      if (Array.isArray(destNode.childrenPaths)) {
        if (!destNode.childrenPaths.includes(createdTargetPath)) {
          destNode.childrenPaths.push(createdTargetPath);
        }
        destNode.childrenPaths = sortNodePaths(destNode.childrenPaths, state.nodes);
      }
    }

    state.nodes.set(createdTargetPath, node);

    if (sourceItem.type === 'directory') {
      const oldPrefix = oldPath + '/';
      const newPrefix = createdTargetPath + '/';
      const entriesToUpdate = [];

      for (const [pathKey, childNode] of state.nodes.entries()) {
        if (pathKey.startsWith(oldPrefix)) {
          entriesToUpdate.push({ oldKey: pathKey, childNode });
        }
      }

      for (const { oldKey, childNode } of entriesToUpdate) {
        state.nodes.delete(oldKey);
        const updatedPath = childNode.path.replace(oldPrefix, newPrefix);
        const updatedParent = childNode.parentPath ? childNode.parentPath.replace(oldPrefix, newPrefix) : createdTargetPath;
        childNode.path = updatedPath;
        childNode.parentPath = updatedParent;
        if (Array.isArray(childNode.childrenPaths)) {
          childNode.childrenPaths = childNode.childrenPaths.map((cp) => (cp.startsWith(oldPrefix) ? cp.replace(oldPrefix, newPrefix) : cp));
        }
        state.nodes.set(updatedPath, childNode);
      }
    }

    if (state.treeRootPath === oldPath) state.treeRootPath = createdTargetPath;
    if (state.rootPath === oldPath) {
      state.rootPath = createdTargetPath;
      state.rootName = moveName;
    }

    state.selectedItem = node;

    state.lastMoveUndoState = {
      available: true,
      sourcePath: oldPath,
      targetPath: createdTargetPath,
      moveName,
      isDir: sourceItem.type === 'directory',
      destDirPath,
    };

    state.moveModal.resultState = {
      sourcePath: oldPath,
      targetPath: createdTargetPath,
      moveName,
    };
    state.moveModal.step = 'success';

    state.moveUndoToast = {
      visible: true,
      message: `Le ${sourceItem.type === 'directory' ? 'dossier' : 'fichier'} a été déplacé.`,
    };

    render();
  } catch (err) {
    unsubscribeProgress();
    state.moveModal.isOpen = false;
    state.moveErrorMessage = err instanceof Error ? err.message : 'Le déplacement n\'a pas pu être terminé. L’élément original est resté à son emplacement initial.';
    render();
  }
}

export async function handleCancelMoveInProgress() {
  if (state.moveModal.moveId) {
    await cancelMoveOperation(state.moveModal.moveId);
  }
}

export async function handleUndoMove() {
  if (!state.lastMoveUndoState || !state.lastMoveUndoState.available) return;

  const { sourcePath, targetPath, isDir, moveName } = state.lastMoveUndoState;

  const res = await undoMoveOperation({ sourcePath, targetPath });
  if (!res.success) {
    state.moveUndoToast.visible = false;
    state.moveErrorMessage = res.error || "Impossible d'annuler le déplacement. L'élément original n'a pas été modifié.";
    render();
    return;
  }

  const node = state.nodes.get(targetPath);
  if (node) {
    state.nodes.delete(targetPath);
    if (node.parentPath && state.nodes.has(node.parentPath)) {
      const destParent = state.nodes.get(node.parentPath);
      if (Array.isArray(destParent.childrenPaths)) {
        destParent.childrenPaths = destParent.childrenPaths.filter((p) => p !== targetPath);
      }
    }

    const sourceParentPath = sourcePath.substring(0, sourcePath.lastIndexOf('/'));
    node.path = sourcePath;
    node.parentPath = sourceParentPath;

    if (sourceParentPath && state.nodes.has(sourceParentPath)) {
      const srcParent = state.nodes.get(sourceParentPath);
      node.level = (srcParent.level || 0) + 1;
      if (Array.isArray(srcParent.childrenPaths)) {
        if (!srcParent.childrenPaths.includes(sourcePath)) {
          srcParent.childrenPaths.push(sourcePath);
        }
        srcParent.childrenPaths = sortNodePaths(srcParent.childrenPaths, state.nodes);
      }
    }

    state.nodes.set(sourcePath, node);

    if (isDir) {
      const targetPrefix = targetPath + '/';
      const sourcePrefix = sourcePath + '/';
      const entriesToUpdate = [];

      for (const [pathKey, childNode] of state.nodes.entries()) {
        if (pathKey.startsWith(targetPrefix)) {
          entriesToUpdate.push({ targetKey: pathKey, childNode });
        }
      }

      for (const { targetKey, childNode } of entriesToUpdate) {
        state.nodes.delete(targetKey);
        const updatedPath = childNode.path.replace(targetPrefix, sourcePrefix);
        const updatedParent = childNode.parentPath ? childNode.parentPath.replace(targetPrefix, sourcePrefix) : sourcePath;
        childNode.path = updatedPath;
        childNode.parentPath = updatedParent;
        if (Array.isArray(childNode.childrenPaths)) {
          childNode.childrenPaths = childNode.childrenPaths.map((cp) => (cp.startsWith(targetPrefix) ? cp.replace(targetPrefix, sourcePrefix) : cp));
        }
        state.nodes.set(updatedPath, childNode);
      }
    }

    if (state.treeRootPath === targetPath) state.treeRootPath = sourcePath;
    if (state.rootPath === targetPath) {
      state.rootPath = sourcePath;
      state.rootName = moveName;
    }

    state.selectedItem = node;
  }

  state.lastMoveUndoState = { available: false };
  state.moveUndoToast = {
    visible: true,
    message: "Le déplacement a été annulé. L'élément a retrouvé son emplacement d'origine.",
  };

  render();
}

export function handleShowMovedItem() {
  const targetPath = state.moveModal?.resultState?.targetPath || state.lastMoveUndoState?.targetPath;
  state.moveModal.isOpen = false;

  if (targetPath && state.nodes.has(targetPath)) {
    const movedNode = state.nodes.get(targetPath);
    if (movedNode) {
      handleNodeSingleClick(movedNode);
      setTimeout(scrollToSelectedNode, 100);
    }
  }
  render();
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

  document.getElementById('btn-trigger-rename')?.addEventListener('click', () => {
    if (state.selectedItem) {
      openRenameModal(state.selectedItem);
    }
  });

  const renameInputEl = document.getElementById('input-rename-name');
  if (renameInputEl) {
    renameInputEl.addEventListener('input', (e) => {
      state.renameModal.newName = e.target.value;
      validateCurrentRenameInput();
      const submitBtn = document.getElementById('btn-rename-modal-submit');
      const errorEl = document.getElementById('rename-validation-error');

      if (submitBtn) {
        if (state.renameModal.validationError) {
          submitBtn.disabled = true;
          submitBtn.className = 'px-4 py-2 rounded-xl text-xs font-medium bg-purple-400/40 text-purple-200/50 cursor-not-allowed transition-all';
        } else {
          submitBtn.disabled = false;
          submitBtn.className = 'px-4 py-2 rounded-xl text-xs font-medium bg-purple-600 hover:bg-purple-500 text-white shadow-md focus:outline-none focus:ring-2 focus:ring-purple-400 transition-all';
        }
      }

      if (state.renameModal.validationError) {
        if (!errorEl) {
          render();
        } else {
          const spanEl = errorEl.querySelector('span');
          if (spanEl) spanEl.textContent = state.renameModal.validationError;
        }
      } else if (errorEl) {
        render();
      }
    });
  }

  document.getElementById('btn-rename-modal-cancel')?.addEventListener('click', closeRenameModal);
  document.getElementById('btn-rename-modal-submit')?.addEventListener('click', submitRenameInputStep);
  document.getElementById('btn-rename-confirm-back')?.addEventListener('click', () => {
    state.renameModal.step = 'input';
    render();
  });
  document.getElementById('btn-rename-confirm-execute')?.addEventListener('click', executeRename);

  document.getElementById('btn-undo-rename')?.addEventListener('click', handleUndoRename);
  document.getElementById('btn-dismiss-undo-toast')?.addEventListener('click', () => {
    state.undoToast.visible = false;
    render();
  });

  document.getElementById('btn-rename-error-dismiss')?.addEventListener('click', () => {
    state.renameErrorMessage = null;
    render();
  });

  document.getElementById('btn-trigger-copy')?.addEventListener('click', () => {
    if (state.selectedItem) {
      openCopyModal(state.selectedItem);
    }
  });

  const copyInputEl = document.getElementById('input-copy-name');
  if (copyInputEl) {
    copyInputEl.addEventListener('input', (e) => {
      state.copyModal.copyName = e.target.value;
      validateCurrentCopyInput();
      const submitBtn = document.getElementById('btn-copy-modal-next');
      const errorEl = document.getElementById('copy-validation-error');
      const conflictBox = document.getElementById('copy-conflict-box');

      if (submitBtn) {
        if (state.copyModal.validationError || state.copyModal.hasConflict) {
          submitBtn.disabled = true;
          submitBtn.className = 'px-4 py-2 rounded-xl text-xs font-medium bg-purple-400/40 text-purple-200/50 cursor-not-allowed transition-all';
        } else {
          submitBtn.disabled = false;
          submitBtn.className = 'px-4 py-2 rounded-xl text-xs font-medium bg-purple-600 hover:bg-purple-500 text-white shadow-md focus:outline-none focus:ring-2 focus:ring-purple-400 transition-all';
        }
      }

      if (state.copyModal.validationError) {
        if (!errorEl) {
          render();
        } else {
          const spanEl = errorEl.querySelector('span');
          if (spanEl) spanEl.textContent = state.copyModal.validationError;
        }
      } else if (errorEl || conflictBox || state.copyModal.hasConflict) {
        render();
      }
    });
  }

  document.getElementById('btn-copy-browse-dest')?.addEventListener('click', handleChooseCopyDestination);
  document.getElementById('btn-copy-conflict-edit')?.addEventListener('click', () => {
    const inputEl = document.getElementById('input-copy-name');
    if (inputEl) inputEl.focus();
  });
  document.getElementById('btn-copy-conflict-auto')?.addEventListener('click', handleApplyAutoCopyName);
  document.getElementById('btn-copy-modal-cancel')?.addEventListener('click', closeCopyModal);
  document.getElementById('btn-copy-modal-next')?.addEventListener('click', submitCopyWizardStep);
  document.getElementById('btn-copy-confirm-back')?.addEventListener('click', () => {
    state.copyModal.step = 'wizard';
    render();
  });
  document.getElementById('btn-copy-confirm-execute')?.addEventListener('click', executeCopy);
  document.getElementById('btn-copy-cancel-progress')?.addEventListener('click', handleCancelCopyInProgress);
  document.getElementById('btn-copy-success-show')?.addEventListener('click', handleShowCreatedCopy);
  document.getElementById('btn-copy-success-open-folder')?.addEventListener('click', () => {
    if (state.copyModal?.destDirPath) {
      openExternalFile(state.copyModal.destDirPath);
    }
    closeCopyModal();
  });
  document.getElementById('btn-copy-success-close')?.addEventListener('click', closeCopyModal);

  document.getElementById('btn-undo-copy')?.addEventListener('click', handleUndoCopy);
  document.getElementById('btn-dismiss-undo-copy-toast')?.addEventListener('click', () => {
    state.copyUndoToast.visible = false;
    render();
  });

  document.getElementById('btn-copy-error-dismiss')?.addEventListener('click', () => {
    state.copyErrorMessage = null;
    render();
  });

  document.getElementById('btn-trigger-move')?.addEventListener('click', () => {
    if (state.selectedItem) {
      openMoveModal(state.selectedItem);
    }
  });

  const moveInputEl = document.getElementById('input-move-name');
  if (moveInputEl) {
    moveInputEl.addEventListener('input', (e) => {
      state.moveModal.moveName = e.target.value;
      validateCurrentMoveInput();
      const submitBtn = document.getElementById('btn-move-modal-next');
      const errorEl = document.getElementById('move-validation-error');
      const conflictBox = document.getElementById('move-conflict-box');

      if (submitBtn) {
        if (state.moveModal.validationError || state.moveModal.hasConflict) {
          submitBtn.disabled = true;
          submitBtn.className = 'px-4 py-2 rounded-xl text-xs font-medium bg-indigo-400/40 text-indigo-200/50 cursor-not-allowed transition-all';
        } else {
          submitBtn.disabled = false;
          submitBtn.className = 'px-4 py-2 rounded-xl text-xs font-medium bg-indigo-600 hover:bg-indigo-500 text-white shadow-md focus:outline-none focus:ring-2 focus:ring-indigo-400 transition-all';
        }
      }

      if (state.moveModal.validationError) {
        if (!errorEl) {
          render();
        } else {
          const spanEl = errorEl.querySelector('span');
          if (spanEl) spanEl.textContent = state.moveModal.validationError;
        }
      } else if (errorEl || conflictBox || state.moveModal.hasConflict) {
        render();
      }
    });
  }

  document.getElementById('btn-move-browse-dest')?.addEventListener('click', handleChooseMoveDestination);
  document.getElementById('btn-move-conflict-edit')?.addEventListener('click', () => {
    const inputEl = document.getElementById('input-move-name');
    if (inputEl) inputEl.focus();
  });
  document.getElementById('btn-move-conflict-browse')?.addEventListener('click', handleChooseMoveDestination);
  document.getElementById('btn-move-modal-cancel')?.addEventListener('click', closeMoveModal);
  document.getElementById('btn-move-modal-next')?.addEventListener('click', submitMoveWizardStep);
  document.getElementById('btn-move-confirm-back')?.addEventListener('click', () => {
    state.moveModal.step = 'wizard';
    render();
  });
  document.getElementById('btn-move-confirm-execute')?.addEventListener('click', executeMove);
  document.getElementById('btn-move-cancel-progress')?.addEventListener('click', handleCancelMoveInProgress);
  document.getElementById('btn-move-success-show')?.addEventListener('click', handleShowMovedItem);
  document.getElementById('btn-move-success-undo')?.addEventListener('click', handleUndoMove);
  document.getElementById('btn-move-success-close')?.addEventListener('click', closeMoveModal);

  document.getElementById('btn-undo-move')?.addEventListener('click', handleUndoMove);
  document.getElementById('btn-dismiss-move-toast')?.addEventListener('click', () => {
    state.moveUndoToast.visible = false;
    render();
  });

  document.getElementById('btn-move-error-dismiss')?.addEventListener('click', () => {
    state.moveErrorMessage = null;
    render();
  });

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

  const updateWidth = (clientX) => {
    const delta = startX - clientX;
    const minWidth = 300;
    const maxWidth = Math.max(minWidth, window.innerWidth - 280);
    const newWidth = Math.max(minWidth, Math.min(maxWidth, startWidth + delta));
    state.panelWidth = newWidth;
    previewPanelContainer.style.width = `${newWidth}px`;
    previewPanelContainer.style.flex = `0 0 ${newWidth}px`;
  };

  const onMouseMove = (e) => {
    updateWidth(e.clientX);
  };

  const onMouseUp = () => {
    document.body.style.cursor = '';
    document.body.style.userSelect = '';
    previewPanelContainer.style.pointerEvents = '';
    window.removeEventListener('mousemove', onMouseMove);
    window.removeEventListener('mouseup', onMouseUp);
  };

  resizer.addEventListener('mousedown', (e) => {
    e.preventDefault();
    startX = e.clientX;
    startWidth = state.panelWidth;
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
    previewPanelContainer.style.pointerEvents = 'none';
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  });

  const getTouchX = (e) => (e.touches && e.touches[0] ? e.touches[0].clientX : 0);

  const onTouchMove = (e) => {
    updateWidth(getTouchX(e));
  };

  const onTouchEnd = () => {
    document.body.style.cursor = '';
    document.body.style.userSelect = '';
    previewPanelContainer.style.pointerEvents = '';
    window.removeEventListener('touchmove', onTouchMove);
    window.removeEventListener('touchend', onTouchEnd);
  };

  resizer.addEventListener('touchstart', (e) => {
    startX = getTouchX(e);
    startWidth = state.panelWidth;
    document.body.style.userSelect = 'none';
    previewPanelContainer.style.pointerEvents = 'none';
    window.addEventListener('touchmove', onTouchMove, { passive: true });
    window.addEventListener('touchend', onTouchEnd);
  }, { passive: true });

  resizer.addEventListener('keydown', (e) => {
    const minWidth = 300;
    const maxWidth = Math.max(minWidth, window.innerWidth - 280);
    let newWidth = state.panelWidth;

    if (e.key === 'ArrowLeft') {
      e.preventDefault();
      newWidth = Math.min(maxWidth, state.panelWidth + 20);
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      newWidth = Math.max(minWidth, state.panelWidth - 20);
    } else if (e.key === 'Home') {
      e.preventDefault();
      newWidth = minWidth;
    } else if (e.key === 'End') {
      e.preventDefault();
      newWidth = maxWidth;
    }

    if (newWidth !== state.panelWidth) {
      state.panelWidth = newWidth;
      previewPanelContainer.style.width = `${newWidth}px`;
      previewPanelContainer.style.flex = `0 0 ${newWidth}px`;
    }
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

    if (state.copyErrorMessage) {
      if (e.key === 'Escape' || e.key === 'Enter') {
        e.preventDefault();
        state.copyErrorMessage = null;
        render();
      }
      return;
    }

    if (state.copyModal?.isOpen) {
      if (e.key === 'Escape') {
        e.preventDefault();
        closeCopyModal();
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (state.copyModal.step === 'wizard') {
          submitCopyWizardStep();
        } else if (state.copyModal.step === 'confirm') {
          executeCopy();
        } else if (state.copyModal.step === 'success') {
          closeCopyModal();
        }
      }
      return;
    }

    if (state.renameModal?.isOpen) {
      if (e.key === 'Escape') {
        e.preventDefault();
        closeRenameModal();
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (state.renameModal.step === 'input') {
          submitRenameInputStep();
        } else if (state.renameModal.step === 'confirm') {
          executeRename();
        }
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

    if (e.key === 'F2') {
      if (state.selectedItem) {
        e.preventDefault();
        openRenameModal(state.selectedItem);
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
    const isText = isTextFile({ name: node.name, type: '' });
    const options = isText ? { maxBytes: MAX_TEXT_PREVIEW_BYTES } : undefined;
    const file = await getElectronFile(node.path, node.name, options);

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
    const dirDir = { kind: 'electron-directory', name: node.name, path: node.path };
    const { files } = await listDirectory(dirDir, node.path);

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
    const path = handle.path;

    state.rootHandle = handle;
    state.rootPath = path;
    state.rootName = handle.name;
    state.nodes.clear();

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
    if (err instanceof DOMException && err.name === 'AbortError') {
      // Cancelled
    } else {
      state.error = err instanceof Error ? err.message : 'Impossible d\'ouvrir le dossier sélectionné.';
    }
    render();
  }
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
