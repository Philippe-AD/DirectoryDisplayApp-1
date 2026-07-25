import { icons } from '../icons';
import { escapeHtml } from './formatters';
import { renderTreeView } from './treeRenderer';
import { renderPreviewPanel } from './previewRenderer';

function renderBreadcrumbs(pathStr) {
  if (!pathStr) return '';
  const parts = pathStr.split(/[/\\]/).filter(Boolean);
  if (parts.length === 0) return escapeHtml(pathStr);

  return parts
    .map((part, index) => {
      const isLast = index === parts.length - 1;
      return `<span class="${isLast ? 'text-purple-300 font-semibold' : 'text-slate-400'}">${escapeHtml(part)}</span>`;
    })
    .join('<span class="text-slate-600 mx-1">/</span>');
}

export function renderExternalOpenModal() {
  return `
    <div
      id="modal-external-open-overlay"
      class="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-external-title"
    >
      <div class="bg-[#181528] border border-purple-500/30 rounded-2xl p-6 max-w-md w-full shadow-2xl text-slate-100 space-y-4">
        <div class="flex items-center gap-3 text-amber-400">
          <div class="p-2.5 bg-amber-500/20 border border-amber-500/40 rounded-xl flex-shrink-0">
            ${icons.alertCircle({ size: 22 })}
          </div>
          <h2 id="modal-external-title" class="text-sm font-bold text-white">Ouverture dans une application externe</h2>
        </div>

        <p class="text-xs text-slate-300 leading-relaxed">
          Ce fichier va être ouvert dans une autre application. Cette application pourra éventuellement le modifier.
        </p>

        <label class="flex items-center gap-2.5 text-xs text-slate-400 cursor-pointer pt-1 select-none">
          <input
            type="checkbox"
            id="chk-skip-external-warning"
            class="w-4 h-4 rounded border-slate-600 bg-slate-700 text-purple-600 focus:ring-purple-500 cursor-pointer"
          />
          <span>Ne plus afficher cet avertissement pendant cette session</span>
        </label>

        <div class="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-700/80">
          <button
            id="btn-modal-cancel"
            type="button"
            class="px-4 py-2 rounded-xl text-xs font-medium bg-slate-700 hover:bg-slate-600 text-slate-200 transition-colors focus:outline-none focus:ring-2 focus:ring-slate-400"
          >
            Annuler
          </button>
          <button
            id="btn-modal-confirm"
            type="button"
            class="px-4 py-2 rounded-xl text-xs font-medium bg-amber-600 hover:bg-amber-500 text-white transition-colors shadow-2xs focus:outline-none focus:ring-2 focus:ring-amber-400"
          >
            Ouvrir quand même
          </button>
        </div>
      </div>
    </div>
  `;
}

export function renderRenameInputModal(modalState, theme = 'dark') {
  if (!modalState || !modalState.item) return '';
  const { item, newName = '', validationError = null, extensionWarning = null, parentPath = '' } = modalState;
  const isDir = item.type === 'directory';
  const itemTypeLabel = isDir ? 'dossier' : 'fichier';
  const isLight = theme === 'light';

  return `
    <div
      id="modal-rename-input-overlay"
      class="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-rename-title"
    >
      <div class="${isLight ? 'bg-white text-slate-900 border-slate-300' : 'bg-[#181528] text-slate-100 border-purple-500/30'} border rounded-2xl p-6 max-w-lg w-full shadow-2xl space-y-4">
        <div class="flex items-center gap-3">
          <div class="p-2.5 ${isLight ? 'bg-purple-100 text-purple-700 border-purple-200' : 'bg-purple-600/20 text-purple-300 border-purple-500/30'} border rounded-xl flex-shrink-0">
            ${icons.edit({ size: 22 })}
          </div>
          <div>
            <h2 id="modal-rename-title" class="text-sm font-bold ${isLight ? 'text-slate-900' : 'text-white'}">
              Renommer ce ${itemTypeLabel}
            </h2>
            <p class="text-[11px] ${isLight ? 'text-slate-500' : 'text-slate-400'}">
              Modifiez le nom de l'élément de manière volontaire et sécurisée.
            </p>
          </div>
        </div>

        <div class="p-3 ${isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-900/60 border-slate-800'} border rounded-xl space-y-2 text-xs">
          <div>
            <span class="text-[11px] font-medium ${isLight ? 'text-slate-500' : 'text-slate-400'}">Nom actuel :</span>
            <p class="font-mono font-semibold ${isLight ? 'text-slate-800' : 'text-purple-300'} break-all mt-0.5" id="rename-modal-current-name">${escapeHtml(item.name)}</p>
          </div>
          <div>
            <span class="text-[11px] font-medium ${isLight ? 'text-slate-500' : 'text-slate-400'}">Emplacement actuel :</span>
            <p class="font-mono text-[11px] ${isLight ? 'text-slate-600' : 'text-slate-400'} break-all mt-0.5" id="rename-modal-current-location">${escapeHtml(parentPath || item.path)}</p>
          </div>
        </div>

        <div class="space-y-1.5">
          <label for="input-rename-name" class="block text-xs font-semibold ${isLight ? 'text-slate-700' : 'text-slate-300'}">
            Nouveau nom :
          </label>
          <input
            type="text"
            id="input-rename-name"
            value="${escapeHtml(newName)}"
            class="w-full px-3.5 py-2 text-xs font-mono rounded-xl border ${validationError ? 'border-red-500 focus:ring-red-500' : (isLight ? 'border-slate-300 bg-white text-slate-900 focus:ring-purple-500' : 'border-slate-700 bg-slate-900 text-slate-100 focus:ring-purple-500')} focus:outline-none focus:ring-2 shadow-inner"
            placeholder="Saisissez le nouveau nom..."
            aria-describedby="${validationError ? 'rename-validation-error' : 'rename-consequences-text'}"
            autocomplete="off"
            spellcheck="false"
          />
          ${validationError ? `
            <p id="rename-validation-error" class="text-[11px] text-red-500 font-medium flex items-center gap-1 mt-1">
              ${icons.alertCircle({ size: 13, className: 'flex-shrink-0' })}
              <span>${escapeHtml(validationError)}</span>
            </p>
          ` : ''}
        </div>

        ${extensionWarning ? `
          <div id="rename-extension-warning" class="p-3 bg-amber-500/15 border border-amber-500/40 rounded-xl text-amber-300 text-xs flex items-start gap-2.5">
            ${icons.alertCircle({ size: 16, className: 'text-amber-400 flex-shrink-0 mt-0.5' })}
            <div class="text-[11px] leading-relaxed">
              <span class="font-bold">Avertissement modification d'extension :</span>
              <p class="mt-0.5">${escapeHtml(extensionWarning)}</p>
            </div>
          </div>
        ` : ''}

        <div id="rename-consequences-text" class="p-3 ${isLight ? 'bg-purple-50 border-purple-200 text-purple-900' : 'bg-purple-950/40 border-purple-500/30 text-purple-200'} border rounded-xl text-xs space-y-1">
          <p class="font-medium">• Le ${itemTypeLabel} restera dans le même dossier.</p>
          <p class="font-medium">• Son contenu ne sera pas modifié.</p>
        </div>

        <div class="flex items-center justify-end gap-2.5 pt-3 border-t ${isLight ? 'border-slate-200' : 'border-slate-700/80'}">
          <button
            id="btn-rename-modal-cancel"
            type="button"
            class="px-4 py-2 rounded-xl text-xs font-medium ${isLight ? 'bg-slate-200 hover:bg-slate-300 text-slate-800' : 'bg-slate-700 hover:bg-slate-600 text-slate-200'} transition-colors focus:outline-none focus:ring-2 focus:ring-slate-400"
          >
            Annuler
          </button>
          <button
            id="btn-rename-modal-submit"
            type="button"
            ${validationError ? 'disabled' : ''}
            class="px-4 py-2 rounded-xl text-xs font-medium ${validationError ? 'bg-purple-400/40 text-purple-200/50 cursor-not-allowed' : 'bg-purple-600 hover:bg-purple-500 text-white shadow-md focus:outline-none focus:ring-2 focus:ring-purple-400'} transition-all"
          >
            Renommer
          </button>
        </div>
      </div>
    </div>
  `;
}

export function renderRenameConfirmModal(modalState, theme = 'dark') {
  if (!modalState || !modalState.item) return '';
  const { item, newName = '', parentPath = '' } = modalState;
  const isDir = item.type === 'directory';
  const itemTypeLabel = isDir ? 'dossier' : 'fichier';
  const isLight = theme === 'light';

  return `
    <div
      id="modal-rename-confirm-overlay"
      class="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-confirm-title"
    >
      <div class="${isLight ? 'bg-white text-slate-900 border-slate-300' : 'bg-[#181528] text-slate-100 border-purple-500/30'} border rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4">
        <div class="flex items-center gap-3 text-purple-400">
          <div class="p-2.5 ${isLight ? 'bg-purple-100 text-purple-700' : 'bg-purple-600/20 text-purple-300'} border border-purple-500/30 rounded-xl flex-shrink-0">
            ${icons.edit({ size: 22 })}
          </div>
          <h2 id="modal-confirm-title" class="text-sm font-bold ${isLight ? 'text-slate-900' : 'text-white'}">
            Confirmation du renommage
          </h2>
        </div>

        <div class="space-y-3 text-xs">
          <p class="font-medium ${isLight ? 'text-slate-700' : 'text-slate-300'}">Vous allez renommer :</p>
          <div class="p-2.5 rounded-xl font-mono ${isLight ? 'bg-slate-100 text-purple-800 border-slate-300' : 'bg-slate-900 text-purple-300 border-slate-800'} border break-all font-semibold" id="confirm-old-name">
            ${escapeHtml(item.name)}
          </div>

          <p class="font-medium ${isLight ? 'text-slate-700' : 'text-slate-300'}">en :</p>
          <div class="p-2.5 rounded-xl font-mono ${isLight ? 'bg-emerald-50 text-emerald-800 border-emerald-300' : 'bg-slate-900 text-emerald-300 border-slate-800'} border break-all font-semibold" id="confirm-new-name">
            ${escapeHtml(newName)}
          </div>

          <p class="font-medium ${isLight ? 'text-slate-700' : 'text-slate-300'}">Emplacement :</p>
          <div class="p-2.5 rounded-xl font-mono text-[11px] ${isLight ? 'bg-slate-100 text-slate-700 border-slate-300' : 'bg-slate-900 text-slate-400 border-slate-800'} border break-all" id="confirm-location">
            ${escapeHtml(parentPath || item.path)}
          </div>

          <p class="text-[11px] ${isLight ? 'text-slate-500' : 'text-slate-400'} pt-1">
            Le ${itemTypeLabel} restera dans ce dossier et son contenu ne sera pas modifié.
          </p>
        </div>

        <div class="flex items-center justify-end gap-2.5 pt-3 border-t ${isLight ? 'border-slate-200' : 'border-slate-700/80'}">
          <button
            id="btn-rename-confirm-back"
            type="button"
            class="px-4 py-2 rounded-xl text-xs font-medium ${isLight ? 'bg-slate-200 hover:bg-slate-300 text-slate-800' : 'bg-slate-700 hover:bg-slate-600 text-slate-200'} transition-colors focus:outline-none focus:ring-2 focus:ring-slate-400"
          >
            Retour
          </button>
          <button
            id="btn-rename-confirm-execute"
            type="button"
            class="px-4 py-2 rounded-xl text-xs font-medium bg-purple-600 hover:bg-purple-500 text-white shadow-md transition-colors focus:outline-none focus:ring-2 focus:ring-purple-400"
          >
            Confirmer le renommage
          </button>
        </div>
      </div>
    </div>
  `;
}

export function renderUndoToast(undoToastState, theme = 'dark') {
  if (!undoToastState || !undoToastState.visible) return '';
  const isLight = theme === 'light';

  return `
    <div
      id="undo-rename-toast"
      role="status"
      aria-live="polite"
      class="fixed bottom-16 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 px-4 py-3 ${isLight ? 'bg-slate-900 text-slate-100 shadow-2xl border border-slate-700' : 'bg-[#181528] text-slate-100 shadow-2xl border border-purple-500/40'} rounded-2xl text-xs"
    >
      <div class="p-1 bg-emerald-500/20 text-emerald-400 rounded-lg flex-shrink-0">
        ${icons.refreshCw({ size: 16 })}
      </div>
      <span class="font-medium">${escapeHtml(undoToastState.message || 'Le fichier a été renommé.')}</span>
      <div class="flex items-center gap-2 ml-2">
        <button
          id="btn-undo-rename"
          type="button"
          class="px-3 py-1 bg-purple-600 hover:bg-purple-500 text-white font-medium rounded-xl transition-colors focus:outline-none focus:ring-2 focus:ring-purple-400 text-xs"
        >
          Annuler le renommage
        </button>
        <button
          id="btn-dismiss-undo-toast"
          type="button"
          aria-label="Fermer la notification"
          class="p-1 hover:bg-white/10 rounded-lg text-slate-400 hover:text-white transition-colors"
        >
          ${icons.x({ size: 14 })}
        </button>
      </div>
    </div>
  `;
}

export function renderRenameErrorModal(errorMessage, theme = 'dark') {
  if (!errorMessage) return '';
  const isLight = theme === 'light';

  return `
    <div
      id="modal-rename-error-overlay"
      class="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-error-title"
    >
      <div class="${isLight ? 'bg-white text-slate-900 border-red-200' : 'bg-[#181528] text-slate-100 border-red-500/40'} border rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4">
        <div class="flex items-center gap-3 text-red-500">
          <div class="p-2.5 bg-red-500/20 border border-red-500/40 rounded-xl flex-shrink-0">
            ${icons.alertCircle({ size: 22 })}
          </div>
          <h2 id="modal-error-title" class="text-sm font-bold text-red-500">Erreur de renommage</h2>
        </div>

        <p class="text-xs ${isLight ? 'text-slate-700' : 'text-slate-300'} leading-relaxed" id="rename-error-message-text">
          ${escapeHtml(errorMessage)}
        </p>

        <div class="flex items-center justify-end pt-3 border-t ${isLight ? 'border-slate-200' : 'border-slate-700/80'}">
          <button
            id="btn-rename-error-dismiss"
            type="button"
            class="px-4 py-2 rounded-xl text-xs font-medium bg-red-600 hover:bg-red-500 text-white transition-colors focus:outline-none focus:ring-2 focus:ring-red-400"
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  `;
}

export function renderMainLayout(
  displayName,
  currentPath,
  visibleNodes = [],
  loading = false,
  search = '',
  usingFallback = false,
  error = null,
  selectedItem = null,
  previewState = { status: 'idle' },
  objectUrl = null,
  isPanelVisible = true,
  panelWidth = 380,
  isHeaderCollapsed = false,
  isTreeVisible = true,
  showExternalOpenModal = false,
  theme = 'dark',
  renameModalState = null,
  undoToastState = null,
  renameErrorMessage = null
) {
  const selectedPath = selectedItem ? selectedItem.path : null;
  const isLight = theme === 'light';

  let contentHtml = '';

  if (loading) {
    contentHtml = `
      <div class="space-y-2 py-2 px-2">
        ${[1, 2, 3, 4, 5, 6].map(() => `
          <div class="${isLight ? 'bg-slate-200/60' : 'bg-white/5'} rounded-xl p-2.5 animate-pulse flex items-center gap-2">
            <div class="w-4 h-4 rounded ${isLight ? 'bg-slate-300' : 'bg-white/10'}"></div>
            <div class="h-3 ${isLight ? 'bg-slate-300' : 'bg-white/10'} rounded flex-1"></div>
          </div>
        `).join('')}
      </div>
    `;
  } else {
    contentHtml = renderTreeView(visibleNodes, selectedPath, theme);
  }

  const consultationIndicatorHtml = `
    <div
      id="consultation-mode-indicator"
      role="status"
      aria-live="polite"
      aria-label="Mode protégé — aucune modification sans confirmation"
      class="flex items-center gap-1.5 px-3 py-1 ${isLight ? 'bg-emerald-50 text-emerald-700 border border-emerald-300' : 'bg-emerald-950/70 text-emerald-300 border border-emerald-500/40'} rounded-full text-xs font-medium select-none shadow-2xs flex-shrink-0"
    >
      ${icons.lock({ size: 13, className: isLight ? 'text-emerald-600 flex-shrink-0' : 'text-emerald-400 flex-shrink-0' })}
      <span class="truncate">Mode protégé — aucune modification sans confirmation</span>
    </div>
  `;

  const btnClass = isLight
    ? 'flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-1.5 rounded-xl text-xs font-medium transition-colors border border-slate-300'
    : 'flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 px-3 py-1.5 rounded-xl text-xs font-medium transition-colors border border-slate-700/60';

  const themeToggleBtn = `
    <button
      id="btn-toggle-theme"
      class="${btnClass}"
      aria-label="${isLight ? 'Activer le mode sombre' : 'Activer le mode clair'}"
      title="${isLight ? 'Activer le mode sombre' : 'Activer le mode clair'}"
    >
      ${isLight ? icons.moon({ size: 14 }) : icons.sun({ size: 14 })}
      <span class="hidden sm:inline">${isLight ? 'Mode sombre' : 'Mode clair'}</span>
    </button>
  `;

  const headerContentHtml = isHeaderCollapsed
    ? `
      <div class="flex items-center justify-between gap-4 w-full">
        <div class="flex items-center gap-2.5 min-w-0">
          <div class="p-1.5 ${isLight ? 'bg-purple-100 text-purple-700' : 'bg-purple-600/30 text-purple-300'} rounded-lg flex-shrink-0">
            ${icons.folder({ size: 16 })}
          </div>
          <div class="min-w-0 flex items-center gap-2">
            <h1 class="text-xs font-bold ${isLight ? 'text-slate-900' : 'text-white'} truncate tracking-tight">${escapeHtml(displayName)}</h1>
            <span class="${isLight ? 'text-slate-500' : 'text-slate-400'} text-[11px] font-mono hidden md:inline truncate max-w-xs">(${escapeHtml(currentPath)})</span>
          </div>
        </div>

        ${consultationIndicatorHtml}

        <div class="flex items-center gap-1.5 flex-shrink-0">
          ${themeToggleBtn}

          <button
            id="btn-refresh-root"
            class="${btnClass}"
            aria-label="Actualiser l'arborescence"
            title="Actualiser l'arborescence"
          >
            ${icons.refreshCw({ size: 13 })}
            <span class="hidden sm:inline">Actualiser</span>
          </button>

          <button
            id="btn-toggle-header"
            class="${btnClass}"
            aria-label="Agrandir l'aperçu"
            title="Agrandir l'aperçu"
          >
            ${icons.chevronDown({ size: 13 })}
            <span class="hidden sm:inline">Agrandir l’aperçu</span>
          </button>

          <button
            id="btn-toggle-tree"
            class="${btnClass}"
            aria-label="${isTreeVisible ? 'Masquer l’arborescence' : 'Afficher l’arborescence'}"
            title="${isTreeVisible ? 'Masquer l’arborescence' : 'Afficher l’arborescence'}"
          >
            ${isTreeVisible ? icons.eyeOff({ size: 13 }) : icons.eye({ size: 13 })}
            <span class="hidden sm:inline">${isTreeVisible ? 'Masquer l’arborescence' : 'Afficher l’arborescence'}</span>
          </button>

          ${!usingFallback ? `
            <button
              id="btn-open-another"
              class="flex items-center gap-1 bg-purple-600 hover:bg-purple-500 text-white px-2.5 py-1 rounded-lg text-xs font-medium transition-colors shadow-2xs"
            >
              ${icons.folderTree({ size: 13 })}
              <span class="hidden sm:inline">Changer dossier</span>
            </button>
          ` : ''}
        </div>
      </div>
    `
    : `
      <div class="flex items-center justify-between gap-4 w-full">
        <div class="flex items-center gap-3 min-w-0">
          <div class="p-2 ${isLight ? 'bg-purple-100 text-purple-700 border border-purple-200' : 'bg-purple-600/30 text-purple-300 border border-purple-500/40'} rounded-xl flex-shrink-0">
            ${icons.cloud({ size: 20 })}
          </div>
          <div class="min-w-0">
            <div class="flex items-center gap-2">
              <h1 class="text-sm font-bold ${isLight ? 'text-slate-900' : 'text-white'} truncate tracking-tight">${escapeHtml(displayName)}</h1>
              <span class="text-[10px] font-mono uppercase ${isLight ? 'bg-purple-100 text-purple-800 border border-purple-300' : 'bg-purple-950/80 text-purple-300 border border-purple-700/60'} px-2 py-0.5 rounded-full">Cloud Dock</span>
            </div>
            <div class="text-xs ${isLight ? 'text-slate-500' : 'text-slate-400'} truncate max-w-lg mt-0.5 flex items-center font-mono">
              ${renderBreadcrumbs(currentPath)}
            </div>
          </div>
        </div>

        ${consultationIndicatorHtml}

        <div class="flex items-center gap-1.5 flex-shrink-0">
          ${themeToggleBtn}

          <button
            id="btn-refresh-root"
            class="${btnClass}"
            aria-label="Actualiser l'arborescence"
            title="Actualiser l'arborescence"
          >
            ${icons.refreshCw({ size: 14 })}
            <span class="hidden sm:inline">Actualiser</span>
          </button>

          <button
            id="btn-toggle-header"
            class="${btnClass}"
            aria-label="Agrandir l’aperçu"
            title="Agrandir l’aperçu"
          >
            ${icons.chevronUp({ size: 14 })}
            <span class="hidden sm:inline">Agrandir l’aperçu</span>
          </button>

          <button
            id="btn-toggle-tree"
            class="${btnClass}"
            aria-label="${isTreeVisible ? 'Masquer l’arborescence' : 'Afficher l’arborescence'}"
            title="${isTreeVisible ? 'Masquer l’arborescence' : 'Afficher l’arborescence'}"
          >
            ${isTreeVisible ? icons.eyeOff({ size: 14 }) : icons.eye({ size: 14 })}
            <span class="hidden sm:inline">${isTreeVisible ? 'Masquer l’arborescence' : 'Afficher l’arborescence'}</span>
          </button>

          ${!usingFallback ? `
            <button
              id="btn-open-another"
              class="flex items-center gap-1.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white px-3 py-1.5 rounded-xl text-xs font-medium transition-colors shadow-sm"
            >
              ${icons.folderTree({ size: 14 })}
              <span class="hidden sm:inline">Changer de dossier</span>
            </button>
          ` : ''}
        </div>
      </div>
    `;

  return `
    <div class="h-screen w-screen flex flex-col ${isLight ? 'bg-[#F1F3F6]' : 'bg-[#110E1C]'} overflow-hidden font-sans select-none">
      <!-- Fixed Top Header Bar -->
      <header id="app-header" class="${isLight ? 'bg-white text-slate-800 border-b border-slate-200/80 shadow-2xs' : 'bg-[#161426] text-slate-100 border-b border-purple-500/20 shadow-md'} px-4 ${isHeaderCollapsed ? 'py-2.5' : 'py-3'} transition-all duration-150 z-20 flex-shrink-0">
        ${headerContentHtml}
      </header>

      <!-- Main Layout Body -->
      <div class="flex-1 w-full flex flex-row overflow-hidden relative">
        <!-- Far-Left Navigation Icon Rail -->
        <aside class="w-14 ${isLight ? 'bg-white border-r border-slate-200/80 text-slate-600' : 'bg-[#110E1C] border-r border-purple-500/15 text-slate-400'} flex flex-col items-center py-3 justify-between z-30 flex-shrink-0 hidden sm:flex">
          <div class="flex flex-col items-center gap-4">
            <div class="w-9 h-9 rounded-xl ${isLight ? 'bg-purple-100 border border-purple-200 text-purple-700' : 'bg-purple-600/30 border border-purple-500/40 text-purple-400'} flex items-center justify-center shadow-xs">
              ${icons.cloud({ size: 20 })}
            </div>

            <nav class="flex flex-col gap-2 mt-2">
              <button class="w-9 h-9 rounded-xl bg-purple-600 text-white flex items-center justify-center shadow-md shadow-purple-600/30" title="Vue d'ensemble">
                ${icons.grid({ size: 18 })}
              </button>
              <button class="w-9 h-9 rounded-xl ${isLight ? 'text-slate-500 hover:text-slate-900 hover:bg-slate-100' : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'} flex items-center justify-center transition-colors" title="Favoris">
                ${icons.star({ size: 18 })}
              </button>
              <button class="w-9 h-9 rounded-xl ${isLight ? 'text-slate-500 hover:text-slate-900 hover:bg-slate-100' : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'} flex items-center justify-center transition-colors" title="Téléchargements">
                ${icons.download({ size: 18 })}
              </button>
              <button class="w-9 h-9 rounded-xl ${isLight ? 'text-slate-500 hover:text-slate-900 hover:bg-slate-100' : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'} flex items-center justify-center transition-colors relative" title="Notifications">
                ${icons.bell({ size: 18 })}
                <span class="absolute top-1.5 right-1.5 w-2 h-2 bg-purple-500 rounded-full"></span>
              </button>
            </nav>
          </div>

          <div class="flex flex-col items-center gap-3">
            <div class="w-8 h-8 rounded-full ${isLight ? 'bg-purple-100 text-purple-800 border border-purple-300' : 'bg-purple-600/30 text-purple-300 border border-purple-500/30'} flex items-center justify-center text-xs font-bold">
              AD
            </div>
          </div>
        </aside>

        <!-- Zone 1: Unique TreeView Navigation Sidebar -->
        <div id="file-list-container" class="${isTreeVisible ? 'flex' : 'hidden'} flex-col min-w-[240px] flex-1 h-full overflow-hidden ${isLight ? 'bg-[#F8FAFC] text-slate-800 border-r border-slate-200/80 shadow-2xs' : 'bg-[#161426] text-slate-200 border-r border-purple-500/15 shadow-xl dark-sidebar'}">
          <!-- Sidebar Header & Search input bar -->
          <div class="p-3 ${isLight ? 'border-b border-slate-200/80 bg-[#F8FAFC]' : 'border-b border-purple-500/15 bg-[#161426]'} flex-shrink-0">
            <div class="flex items-center justify-between mb-2">
              <div class="flex items-center gap-2">
                <span class="text-xs font-bold uppercase tracking-wider ${isLight ? 'text-slate-600' : 'text-slate-400'}">Navigation</span>
              </div>
              <span class="text-[10px] font-mono ${isLight ? 'bg-purple-100 text-purple-800 border border-purple-300' : 'bg-purple-950/80 text-purple-300 border border-purple-700/50'} px-2 py-0.5 rounded-full">${visibleNodes.length} éléments</span>
            </div>

            <div class="relative">
              <div class="absolute left-2.5 top-1/2 -translate-y-1/2 ${isLight ? 'text-purple-600' : 'text-purple-400'}">
                ${icons.search({ size: 14 })}
              </div>
              <input
                type="text"
                id="input-search"
                placeholder="Rechercher dans les éléments chargés..."
                value="${escapeHtml(search)}"
                class="w-full pl-8 pr-12 py-2 ${isLight ? 'bg-white border border-slate-300 text-slate-800 placeholder-slate-400 focus:ring-purple-500 focus:border-purple-500' : 'bg-[#1F1B36] border border-purple-500/20 text-slate-200 placeholder-slate-400 focus:ring-purple-400 focus:border-purple-400'} rounded-xl text-xs transition-colors shadow-inner"
              />
              <div class="absolute right-2.5 top-1/2 -translate-y-1/2 flex items-center gap-1">
                ${search ? `
                  <button id="btn-clear-search" aria-label="Effacer la recherche" class="${isLight ? 'text-slate-400 hover:text-slate-700' : 'text-slate-400 hover:text-slate-200'}">
                    ${icons.x({ size: 13 })}
                  </button>
                ` : `
                  <span class="text-[10px] font-mono px-1.5 py-0.5 rounded ${isLight ? 'bg-slate-100 text-slate-500 border border-slate-200' : 'bg-white/10 text-slate-400 border border-white/10'}">⌘K</span>
                `}
              </div>
            </div>
          </div>

          ${error ? `
            <div class="m-3 p-2.5 ${isLight ? 'bg-amber-50 border-amber-300 text-amber-900' : 'bg-amber-950/70 border-amber-500/40 text-amber-200'} border rounded-xl flex items-start justify-between gap-2 flex-shrink-0 text-xs">
              <div class="flex items-start gap-1.5">
                ${icons.alertCircle({ size: 14, className: 'text-amber-500 flex-shrink-0 mt-0.5' })}
                <p class="text-[11px] font-medium">${escapeHtml(error)}</p>
              </div>
              <button id="btn-dismiss-error" aria-label="Fermer l'alerte" class="${isLight ? 'text-amber-800 hover:text-amber-950' : 'text-amber-300 hover:text-amber-100'} text-[11px] font-semibold underline flex-shrink-0">
                OK
              </button>
            </div>
          ` : ''}

          <!-- Tree View Scroll Container -->
          <div id="file-list" class="flex-1 overflow-y-auto p-2">
            ${contentHtml}
          </div>
        </div>

        <!-- Zone 2: Draggable Resizer Separator -->
        ${isPanelVisible && isTreeVisible ? `
          <div
            id="resizer"
            role="separator"
            aria-orientation="vertical"
            aria-label="Redimensionner le panneau"
            tabindex="0"
            class="hidden md:flex w-2 cursor-col-resize items-center justify-center group flex-shrink-0 select-none ${isLight ? 'hover:bg-purple-200/60 active:bg-purple-300/60' : 'hover:bg-purple-600/20 active:bg-purple-600/30'} transition-colors z-20"
          >
            <div class="w-1 h-12 ${isLight ? 'bg-slate-300 group-hover:bg-purple-600' : 'bg-slate-700/60 group-hover:bg-purple-500'} rounded-full transition-colors flex items-center justify-center">
              ${icons.gripVertical({ size: 10, className: 'text-white opacity-0 group-hover:opacity-100 transition-opacity' })}
            </div>
          </div>
        ` : ''}

        <!-- Zone 3: Integrated Preview & Main Content Container -->
        <div
          id="preview-panel-container"
          class="${isPanelVisible ? 'flex' : 'hidden'} flex-col min-w-[300px] ${isPanelVisible && !isTreeVisible ? 'flex-1 w-full' : ''} h-full overflow-hidden ${isLight ? 'bg-[#F1F3F6]' : 'bg-[#F8F9FE]'}"
          style="${isPanelVisible && isTreeVisible ? `width: ${panelWidth}px; flex: 0 0 ${panelWidth}px;` : ''}"
        >
          ${renderPreviewPanel(selectedItem, previewState, objectUrl)}
        </div>
      </div>

      <!-- Floating Bottom Dock Bar -->
      <div id="floating-dock" class="fixed bottom-3 left-1/2 -translate-x-1/2 ${isLight ? 'bg-white/95 text-slate-800 border border-slate-200 shadow-xl' : 'bg-[#181528]/90 text-slate-200 border border-purple-500/25 shadow-2xl'} backdrop-blur-md rounded-full px-5 py-2 hidden md:flex items-center gap-5 z-40">
        <div class="flex items-center gap-2 border-r ${isLight ? 'border-slate-200' : 'border-slate-700/60'} pr-4">
          <div class="w-6 h-6 rounded-full bg-purple-600 text-white flex items-center justify-center">
            ${icons.cloud({ size: 14 })}
          </div>
          <span class="text-xs font-bold ${isLight ? 'text-slate-900' : 'text-white'} tracking-tight">Cloud Dock</span>
        </div>

        <div class="flex items-center gap-2 text-xs font-mono ${isLight ? 'text-slate-700' : 'text-slate-300'} truncate max-w-xs">
          <span class="text-purple-600 font-semibold">Racine</span>
          <span class="${isLight ? 'text-slate-400' : 'text-slate-600'}">&gt;</span>
          <span class="truncate">${escapeHtml(displayName)}</span>
        </div>

        <div class="flex items-center gap-2 border-l ${isLight ? 'border-slate-200' : 'border-slate-700/60'} pl-4 text-xs ${isLight ? 'text-slate-600' : 'text-slate-400'}">
          <span class="w-2 h-2 rounded-full bg-emerald-500 inline-block animate-pulse"></span>
          <span>Consultation sécurisée</span>
        </div>
      </div>

      ${showExternalOpenModal ? renderExternalOpenModal() : ''}
      ${renameModalState?.isOpen && renameModalState.step === 'input' ? renderRenameInputModal(renameModalState, theme) : ''}
      ${renameModalState?.isOpen && renameModalState.step === 'confirm' ? renderRenameConfirmModal(renameModalState, theme) : ''}
      ${undoToastState?.visible ? renderUndoToast(undoToastState, theme) : ''}
      ${renameErrorMessage ? renderRenameErrorModal(renameErrorMessage, theme) : ''}
    </div>
  `;
}
