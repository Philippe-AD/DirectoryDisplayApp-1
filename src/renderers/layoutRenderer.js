import { icons } from '../icons';
import { escapeHtml, formatFileSize } from './formatters';
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

export function renderCopyWizardModal(copyState, theme = 'dark') {
  if (!copyState || !copyState.isOpen || !copyState.sourceItem) return '';
  const {
    step = 'wizard',
    sourceItem,
    destDirPath = '',
    copyName = '',
    validationError = null,
    extensionWarning = null,
    hasConflict = false,
    progressState = { currentItem: '', percentage: 0, copiedCount: 0, totalCount: 0 },
    resultState = { sourcePath: '', copyPath: '', copyName: '' },
  } = copyState;

  const isDir = sourceItem.type === 'directory';
  const itemTypeLabel = isDir ? 'dossier' : 'fichier';
  const isLight = theme === 'light';

  if (step === 'wizard') {
    return `
      <div
        id="modal-copy-wizard-overlay"
        class="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4"
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-copy-title"
      >
        <div class="${isLight ? 'bg-white text-slate-900 border-slate-300' : 'bg-[#181528] text-slate-100 border-purple-500/30'} border rounded-2xl p-6 max-w-xl w-full shadow-2xl space-y-4">
          <div class="flex items-center gap-3">
            <div class="p-2.5 ${isLight ? 'bg-purple-100 text-purple-700 border-purple-200' : 'bg-purple-600/20 text-purple-300 border-purple-500/30'} border rounded-xl flex-shrink-0">
              ${icons.copy({ size: 22 })}
            </div>
            <div>
              <h2 id="modal-copy-title" class="text-sm font-bold ${isLight ? 'text-slate-900' : 'text-white'}">
                Assistant de copie — Créer une copie de ce ${itemTypeLabel}
              </h2>
              <p class="text-[11px] ${isLight ? 'text-slate-500' : 'text-slate-400'}">
                Parcours guidé pour dupliquer l'élément en toute sécurité sans toucher à l'original.
              </p>
            </div>
          </div>

          <!-- Section 1: Élément original -->
          <div class="p-3.5 ${isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-900/60 border-slate-800'} border rounded-xl space-y-2 text-xs">
            <div class="flex items-center justify-between border-b ${isLight ? 'border-slate-200' : 'border-slate-800'} pb-1.5">
              <span class="text-[11px] font-bold uppercase tracking-wider ${isLight ? 'text-purple-700' : 'text-purple-300'}">Élément original</span>
              <span class="text-[10px] font-semibold px-2 py-0.5 rounded-full ${isDir ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' : 'bg-blue-500/20 text-blue-300 border border-blue-500/30'} font-mono">${isDir ? 'Dossier' : 'Fichier'}</span>
            </div>
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              <div>
                <span class="text-[11px] ${isLight ? 'text-slate-500' : 'text-slate-400'}">Nom original :</span>
                <p class="font-mono font-semibold ${isLight ? 'text-slate-800' : 'text-slate-200'} truncate" id="copy-modal-source-name" title="${escapeHtml(sourceItem.name)}">${escapeHtml(sourceItem.name)}</p>
              </div>
              ${sourceItem.size !== undefined && !isDir ? `
                <div>
                  <span class="text-[11px] ${isLight ? 'text-slate-500' : 'text-slate-400'}">Taille :</span>
                  <p class="font-mono ${isLight ? 'text-slate-700' : 'text-slate-300'}">${formatFileSize(sourceItem.size)}</p>
                </div>
              ` : ''}
            </div>
            <div>
              <span class="text-[11px] ${isLight ? 'text-slate-500' : 'text-slate-400'}">Emplacement actuel :</span>
              <p class="font-mono text-[11px] ${isLight ? 'text-slate-600' : 'text-slate-400'} break-all" id="copy-modal-source-path">${escapeHtml(sourceItem.path)}</p>
            </div>
          </div>

          <!-- Section 2: Destination -->
          <div class="space-y-1.5">
            <label class="block text-xs font-semibold ${isLight ? 'text-slate-700' : 'text-slate-300'}">
              Dossier de destination :
            </label>
            <div class="flex items-center gap-2">
              <div class="flex-1 px-3 py-2 text-xs font-mono rounded-xl border ${isLight ? 'border-slate-300 bg-slate-100 text-slate-800' : 'border-slate-700 bg-slate-900 text-slate-200'} truncate" id="copy-modal-dest-path" title="${escapeHtml(destDirPath)}">
                ${escapeHtml(destDirPath || 'Aucun dossier choisi')}
              </div>
              <button
                id="btn-copy-browse-dest"
                type="button"
                class="px-3 py-2 rounded-xl text-xs font-medium ${isLight ? 'bg-purple-100 hover:bg-purple-200 text-purple-800 border border-purple-300' : 'bg-purple-600/30 hover:bg-purple-600/50 text-purple-200 border border-purple-500/40'} transition-colors flex-shrink-0"
              >
                ${icons.folderOpen({ size: 14, className: 'inline mr-1' })}
                <span>Choisir le dossier…</span>
              </button>
            </div>
          </div>

          <!-- Section 3: Nom de la copie -->
          <div class="space-y-1.5">
            <label for="input-copy-name" class="block text-xs font-semibold ${isLight ? 'text-slate-700' : 'text-slate-300'}">
              Nom de la nouvelle copie :
            </label>
            <input
              type="text"
              id="input-copy-name"
              value="${escapeHtml(copyName)}"
              class="w-full px-3.5 py-2 text-xs font-mono rounded-xl border ${validationError || hasConflict ? 'border-red-500 focus:ring-red-500' : (isLight ? 'border-slate-300 bg-white text-slate-900 focus:ring-purple-500' : 'border-slate-700 bg-slate-900 text-slate-100 focus:ring-purple-500')} focus:outline-none focus:ring-2 shadow-inner"
              placeholder="Nom de la copie..."
              autocomplete="off"
              spellcheck="false"
            />
            ${validationError ? `
              <p id="copy-validation-error" class="text-[11px] text-red-500 font-medium flex items-center gap-1 mt-1">
                ${icons.alertCircle({ size: 13, className: 'flex-shrink-0' })}
                <span>${escapeHtml(validationError)}</span>
              </p>
            ` : ''}
          </div>

          <!-- Section 4: Avertissement extension -->
          ${extensionWarning ? `
            <div id="copy-extension-warning" class="p-3 bg-amber-500/15 border border-amber-500/40 rounded-xl text-amber-300 text-xs flex items-start gap-2.5">
              ${icons.alertCircle({ size: 16, className: 'text-amber-400 flex-shrink-0 mt-0.5' })}
              <div class="text-[11px] leading-relaxed">
                <span class="font-bold">Avertissement modification d'extension :</span>
                <p class="mt-0.5">${escapeHtml(extensionWarning)}</p>
              </div>
            </div>
          ` : ''}

          <!-- Section 5: Conflict Handling UI -->
          ${hasConflict ? `
            <div id="copy-conflict-box" class="p-3.5 bg-red-950/40 border border-red-500/50 rounded-xl text-xs space-y-2.5">
              <div class="flex items-center gap-2 text-red-400 font-semibold text-xs">
                ${icons.alertCircle({ size: 16, className: 'flex-shrink-0' })}
                <span>Nom déjà existant dans la destination !</span>
              </div>
              <p class="text-[11px] text-red-200">
                Un ${itemTypeLabel} nommé <span class="font-mono font-bold">${escapeHtml(copyName)}</span> existe déjà dans ce dossier.
                Afin d'éviter tout écrasement, aucun fichier ne sera remplacé.
              </p>
              <div class="flex flex-wrap items-center gap-2 pt-1">
                <button
                  id="btn-copy-conflict-edit"
                  type="button"
                  class="px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-700 hover:bg-slate-600 text-slate-100 transition-colors"
                >
                  Choisir un autre nom
                </button>
                <button
                  id="btn-copy-conflict-auto"
                  type="button"
                  class="px-3 py-1.5 rounded-lg text-xs font-medium bg-purple-600 hover:bg-purple-500 text-white transition-colors"
                >
                  Utiliser un nom automatique
                </button>
              </div>
            </div>
          ` : ''}

          <!-- Section 6: Permanent Explanation of Consequences -->
          <div id="copy-consequences-text" class="p-3 ${isLight ? 'bg-purple-50 border-purple-200 text-purple-900' : 'bg-purple-950/40 border-purple-500/30 text-purple-200'} border rounded-xl text-xs leading-relaxed">
            <p class="font-medium">
              L’élément original restera à son emplacement actuel. Une nouvelle copie sera créée dans le dossier choisi. Aucun élément existant ne sera remplacé.
            </p>
          </div>

          <!-- Buttons -->
          <div class="flex items-center justify-end gap-2.5 pt-3 border-t ${isLight ? 'border-slate-200' : 'border-slate-700/80'}">
            <button
              id="btn-copy-modal-cancel"
              type="button"
              class="px-4 py-2 rounded-xl text-xs font-medium ${isLight ? 'bg-slate-200 hover:bg-slate-300 text-slate-800' : 'bg-slate-700 hover:bg-slate-600 text-slate-200'} transition-colors focus:outline-none focus:ring-2 focus:ring-slate-400"
            >
              Annuler
            </button>
            <button
              id="btn-copy-modal-next"
              type="button"
              ${validationError || hasConflict ? 'disabled' : ''}
              class="px-4 py-2 rounded-xl text-xs font-medium ${validationError || hasConflict ? 'bg-purple-400/40 text-purple-200/50 cursor-not-allowed' : 'bg-purple-600 hover:bg-purple-500 text-white shadow-md focus:outline-none focus:ring-2 focus:ring-purple-400'} transition-all"
            >
              Suivant
            </button>
          </div>
        </div>
      </div>
    `;
  }

  if (step === 'confirm') {
    return `
      <div
        id="modal-copy-confirm-overlay"
        class="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4"
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-copy-confirm-title"
      >
        <div class="${isLight ? 'bg-white text-slate-900 border-slate-300' : 'bg-[#181528] text-slate-100 border-purple-500/30'} border rounded-2xl p-6 max-w-lg w-full shadow-2xl space-y-4">
          <div class="flex items-center gap-3 text-purple-400">
            <div class="p-2.5 ${isLight ? 'bg-purple-100 text-purple-700' : 'bg-purple-600/20 text-purple-300'} border border-purple-500/30 rounded-xl flex-shrink-0">
              ${icons.copy({ size: 22 })}
            </div>
            <h2 id="modal-copy-confirm-title" class="text-sm font-bold ${isLight ? 'text-slate-900' : 'text-white'}">
              Résumé avant création de la copie
            </h2>
          </div>

          <div class="space-y-3 text-xs">
            <p class="font-medium ${isLight ? 'text-slate-700' : 'text-slate-300'}">Vous allez créer une copie de :</p>
            <div class="p-2.5 rounded-xl font-mono ${isLight ? 'bg-slate-100 text-purple-800 border-slate-300' : 'bg-slate-900 text-purple-300 border-slate-800'} border break-all font-semibold" id="confirm-copy-source">
              ${escapeHtml(sourceItem.path)}
            </div>

            <p class="font-medium ${isLight ? 'text-slate-700' : 'text-slate-300'}">dans :</p>
            <div class="p-2.5 rounded-xl font-mono ${isLight ? 'bg-slate-100 text-slate-800 border-slate-300' : 'bg-slate-900 text-slate-200 border-slate-800'} border break-all font-semibold" id="confirm-copy-dest">
              ${escapeHtml(destDirPath)}
            </div>

            <p class="font-medium ${isLight ? 'text-slate-700' : 'text-slate-300'}">La copie sera nommée :</p>
            <div class="p-2.5 rounded-xl font-mono ${isLight ? 'bg-emerald-50 text-emerald-800 border-emerald-300' : 'bg-slate-900 text-emerald-300 border-slate-800'} border break-all font-semibold" id="confirm-copy-name">
              ${escapeHtml(copyName)}
            </div>

            <div class="p-3 rounded-xl ${isLight ? 'bg-purple-50 text-purple-900 border-purple-200' : 'bg-purple-950/40 text-purple-200 border-purple-500/30'} border text-[11px] space-y-1">
              <p class="font-medium">• Le ${itemTypeLabel} original restera dans son dossier actuel.</p>
              <p class="font-medium">• Aucun fichier existant ne sera remplacé.</p>
            </div>
          </div>

          <div class="flex items-center justify-end gap-2.5 pt-3 border-t ${isLight ? 'border-slate-200' : 'border-slate-700/80'}">
            <button
              id="btn-copy-confirm-back"
              type="button"
              class="px-4 py-2 rounded-xl text-xs font-medium ${isLight ? 'bg-slate-200 hover:bg-slate-300 text-slate-800' : 'bg-slate-700 hover:bg-slate-600 text-slate-200'} transition-colors focus:outline-none focus:ring-2 focus:ring-slate-400"
            >
              Retour
            </button>
            <button
              id="btn-copy-confirm-execute"
              type="button"
              class="px-4 py-2 rounded-xl text-xs font-medium bg-purple-600 hover:bg-purple-500 text-white shadow-md transition-colors focus:outline-none focus:ring-2 focus:ring-purple-400"
            >
              Créer la copie
            </button>
          </div>
        </div>
      </div>
    `;
  }

  if (step === 'progress') {
    const percentage = progressState.percentage || 0;
    return `
      <div
        id="modal-copy-progress-overlay"
        class="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4"
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-copy-progress-title"
      >
        <div class="${isLight ? 'bg-white text-slate-900 border-slate-300' : 'bg-[#181528] text-slate-100 border-purple-500/30'} border rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4 text-center">
          <div class="flex items-center justify-center">
            <div class="p-3 bg-purple-600/20 text-purple-400 border border-purple-500/30 rounded-2xl animate-pulse">
              ${icons.copy({ size: 28 })}
            </div>
          </div>
          <h2 id="modal-copy-progress-title" class="text-sm font-bold ${isLight ? 'text-slate-900' : 'text-white'}">
            Copie en cours…
          </h2>

          <div class="space-y-2 text-xs">
            <p class="font-mono text-purple-300 text-[11px] truncate max-w-xs mx-auto" id="copy-progress-item-name">
              ${escapeHtml(progressState.currentItem || sourceItem.name)}
            </p>
            <p class="text-[11px] ${isLight ? 'text-slate-500' : 'text-slate-400'} truncate">
              Destination : <span class="font-mono">${escapeHtml(destDirPath)}</span>
            </p>

            <div class="w-full bg-slate-800 rounded-full h-2.5 overflow-hidden border border-slate-700 mt-3">
              <div class="bg-gradient-to-r from-purple-500 to-indigo-500 h-2.5 rounded-full transition-all duration-200" style="width: ${percentage}%;"></div>
            </div>
            <p class="text-[10px] font-mono text-slate-400 text-right">${percentage}%</p>
          </div>

          <div class="pt-2 border-t ${isLight ? 'border-slate-200' : 'border-slate-700/80'}">
            <button
              id="btn-copy-cancel-progress"
              type="button"
              class="px-4 py-2 rounded-xl text-xs font-medium bg-red-600/80 hover:bg-red-600 text-white transition-colors focus:outline-none focus:ring-2 focus:ring-red-400"
            >
              Annuler la copie
            </button>
          </div>
        </div>
      </div>
    `;
  }

  if (step === 'success') {
    return `
      <div
        id="modal-copy-success-overlay"
        class="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4"
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-copy-success-title"
      >
        <div class="${isLight ? 'bg-white text-slate-900 border-slate-300' : 'bg-[#181528] text-slate-100 border-purple-500/30'} border rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4">
          <div class="flex items-center gap-3 text-emerald-400">
            <div class="p-2.5 bg-emerald-500/20 border border-emerald-500/40 rounded-xl flex-shrink-0">
              ${icons.refreshCw({ size: 22 })}
            </div>
            <h2 id="modal-copy-success-title" class="text-sm font-bold ${isLight ? 'text-slate-900' : 'text-white'}">
              La copie a été créée.
            </h2>
          </div>

          <div class="space-y-3 text-xs">
            <div>
              <span class="text-[11px] font-medium ${isLight ? 'text-slate-500' : 'text-slate-400'}">Original :</span>
              <p class="font-mono text-[11px] ${isLight ? 'text-slate-700' : 'text-slate-300'} break-all mt-0.5 p-2 rounded-lg bg-slate-900/40 border border-slate-800">
                ${escapeHtml(resultState.sourcePath || sourceItem.path)}
              </p>
            </div>
            <div>
              <span class="text-[11px] font-medium ${isLight ? 'text-slate-500' : 'text-slate-400'}">Copie :</span>
              <p class="font-mono text-[11px] text-emerald-400 font-semibold break-all mt-0.5 p-2 rounded-lg bg-slate-900/60 border border-emerald-500/30">
                ${escapeHtml(resultState.copyPath)}
              </p>
            </div>
          </div>

          <div class="flex items-center justify-end gap-2 pt-3 border-t ${isLight ? 'border-slate-200' : 'border-slate-700/80'} flex-wrap">
            <button
              id="btn-copy-success-show"
              type="button"
              class="px-3 py-2 rounded-xl text-xs font-medium bg-purple-600 hover:bg-purple-500 text-white transition-colors"
            >
              Afficher la copie
            </button>
            <button
              id="btn-copy-success-open-folder"
              type="button"
              class="px-3 py-2 rounded-xl text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors"
            >
              Ouvrir son dossier
            </button>
            <button
              id="btn-copy-success-close"
              type="button"
              class="px-3 py-2 rounded-xl text-xs font-medium ${isLight ? 'bg-slate-200 hover:bg-slate-300 text-slate-800' : 'bg-slate-700 hover:bg-slate-600 text-slate-200'} transition-colors"
            >
              Fermer
            </button>
          </div>
        </div>
      </div>
    `;
  }

  return '';
}

export function renderCopyUndoToast(undoCopyToastState, theme = 'dark') {
  if (!undoCopyToastState || !undoCopyToastState.visible) return '';
  const isLight = theme === 'light';

  return `
    <div
      id="undo-copy-toast"
      role="status"
      aria-live="polite"
      class="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 px-4 py-3 ${isLight ? 'bg-slate-900 text-slate-100 shadow-2xl border border-slate-700' : 'bg-[#181528] text-slate-100 shadow-2xl border border-purple-500/40'} rounded-2xl text-xs"
    >
      <div class="p-1 bg-emerald-500/20 text-emerald-400 rounded-lg flex-shrink-0">
        ${icons.copy({ size: 16 })}
      </div>
      <span class="font-medium">${escapeHtml(undoCopyToastState.message || 'Une nouvelle copie a été créée.')}</span>
      <div class="flex items-center gap-2 ml-2">
        <button
          id="btn-undo-copy"
          type="button"
          class="px-3 py-1 bg-purple-600 hover:bg-purple-500 text-white font-medium rounded-xl transition-colors focus:outline-none focus:ring-2 focus:ring-purple-400 text-xs"
        >
          Annuler cette copie
        </button>
        <button
          id="btn-dismiss-undo-copy-toast"
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

export function renderCopyErrorModal(copyErrorMessage, theme = 'dark') {
  if (!copyErrorMessage) return '';
  const isLight = theme === 'light';

  return `
    <div
      id="modal-copy-error-overlay"
      class="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-copy-error-title"
    >
      <div class="${isLight ? 'bg-white text-slate-900 border-red-200' : 'bg-[#181528] text-slate-100 border-red-500/40'} border rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4">
        <div class="flex items-center gap-3 text-red-500">
          <div class="p-2.5 bg-red-500/20 border border-red-500/40 rounded-xl flex-shrink-0">
            ${icons.alertCircle({ size: 22 })}
          </div>
          <h2 id="modal-copy-error-title" class="text-sm font-bold text-red-500">Impossible de créer la copie</h2>
        </div>

        <p class="text-xs ${isLight ? 'text-slate-700' : 'text-slate-300'} leading-relaxed" id="copy-error-message-text">
          ${escapeHtml(copyErrorMessage)}
        </p>

        <div class="flex items-center justify-end pt-3 border-t ${isLight ? 'border-slate-200' : 'border-slate-700/80'}">
          <button
            id="btn-copy-error-dismiss"
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

export function renderMoveWizardModal(moveState, theme = 'dark') {
  if (!moveState || !moveState.isOpen || !moveState.sourceItem) return '';
  const {
    step = 'wizard',
    sourceItem,
    destDirPath = '',
    moveName = '',
    validationError = null,
    extensionWarning = null,
    hasConflict = false,
    progressState = { currentItem: '', percentage: 0, movedCount: 0, totalCount: 0 },
    resultState = { sourcePath: '', targetPath: '', moveName: '' },
  } = moveState;

  const isDir = sourceItem.type === 'directory';
  const itemTypeLabel = isDir ? 'dossier' : 'fichier';
  const isLight = theme === 'light';

  const futurePath = destDirPath && moveName ? `${destDirPath.replace(/\\/g, '/').replace(/\/+$/, '')}/${moveName}` : '';

  if (step === 'wizard') {
    return `
      <div
        id="modal-move-wizard-overlay"
        class="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4"
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-move-title"
      >
        <div class="${isLight ? 'bg-white text-slate-900 border-slate-300' : 'bg-[#181528] text-slate-100 border-indigo-500/30'} border rounded-2xl p-6 max-w-xl w-full shadow-2xl space-y-4">
          <div class="flex items-center gap-3">
            <div class="p-2.5 ${isLight ? 'bg-indigo-100 text-indigo-700 border-indigo-200' : 'bg-indigo-600/20 text-indigo-300 border-indigo-500/30'} border rounded-xl flex-shrink-0">
              ${icons.move ? icons.move({ size: 22 }) : icons.folderOpen({ size: 22 })}
            </div>
            <div>
              <h2 id="modal-move-title" class="text-sm font-bold ${isLight ? 'text-slate-900' : 'text-white'}">
                Assistant de déplacement — Déplacer ce ${itemTypeLabel}
              </h2>
              <p class="text-[11px] ${isLight ? 'text-slate-500' : 'text-slate-400'}">
                Parcours guidé et sécurisé pour déplacer l'élément vers un autre dossier.
              </p>
            </div>
          </div>

          <!-- Section 1: Élément à déplacer -->
          <div class="p-3.5 ${isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-900/60 border-slate-800'} border rounded-xl space-y-2 text-xs">
            <div class="flex items-center justify-between border-b ${isLight ? 'border-slate-200' : 'border-slate-800'} pb-1.5">
              <span class="text-[11px] font-bold uppercase tracking-wider ${isLight ? 'text-indigo-700' : 'text-indigo-300'}">Élément à déplacer</span>
              <span class="text-[10px] font-semibold px-2 py-0.5 rounded-full ${isDir ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' : 'bg-blue-500/20 text-blue-300 border border-blue-500/30'} font-mono">${isDir ? 'Dossier' : 'Fichier'}</span>
            </div>
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              <div>
                <span class="text-[11px] ${isLight ? 'text-slate-500' : 'text-slate-400'}">Nom :</span>
                <p class="font-mono font-semibold ${isLight ? 'text-slate-800' : 'text-slate-200'} truncate" id="move-modal-source-name" title="${escapeHtml(sourceItem.name)}">${escapeHtml(sourceItem.name)}</p>
              </div>
              ${sourceItem.size !== undefined && !isDir ? `
                <div>
                  <span class="text-[11px] ${isLight ? 'text-slate-500' : 'text-slate-400'}">Taille :</span>
                  <p class="font-mono ${isLight ? 'text-slate-700' : 'text-slate-300'}">${formatFileSize(sourceItem.size)}</p>
                </div>
              ` : ''}
            </div>
            <div>
              <span class="text-[11px] ${isLight ? 'text-slate-500' : 'text-slate-400'}">Emplacement actuel :</span>
              <p class="font-mono text-[11px] ${isLight ? 'text-slate-600' : 'text-slate-400'} break-all" id="move-modal-source-path">${escapeHtml(sourceItem.path)}</p>
            </div>
          </div>

          <!-- Section 2: Destination -->
          <div class="space-y-1.5">
            <label class="block text-xs font-semibold ${isLight ? 'text-slate-700' : 'text-slate-300'}">
              Dossier de destination :
            </label>
            <div class="flex items-center gap-2">
              <div class="flex-1 px-3 py-2 text-xs font-mono rounded-xl border ${isLight ? 'border-slate-300 bg-slate-100 text-slate-800' : 'border-slate-700 bg-slate-900 text-slate-200'} truncate" id="move-modal-dest-path" title="${escapeHtml(destDirPath)}">
                ${escapeHtml(destDirPath || 'Aucun dossier choisi')}
              </div>
              <button
                id="btn-move-browse-dest"
                type="button"
                class="px-3 py-2 rounded-xl text-xs font-medium ${isLight ? 'bg-indigo-100 hover:bg-indigo-200 text-indigo-800 border border-indigo-300' : 'bg-indigo-600/30 hover:bg-indigo-600/50 text-indigo-200 border border-indigo-500/40'} transition-colors flex-shrink-0"
              >
                ${icons.folderOpen({ size: 14, className: 'inline mr-1' })}
                <span>Choisir le dossier…</span>
              </button>
            </div>
          </div>

          <!-- Section 3: Futur chemin complet -->
          ${futurePath ? `
            <div class="space-y-1">
              <span class="text-[11px] font-semibold ${isLight ? 'text-slate-600' : 'text-slate-400'}">Futur chemin complet :</span>
              <p class="font-mono text-[11px] p-2 rounded-xl border ${isLight ? 'bg-slate-100 border-slate-300 text-indigo-900' : 'bg-slate-900/80 border-slate-800 text-indigo-300'} break-all font-semibold" id="move-modal-future-path">
                ${escapeHtml(futurePath)}
              </p>
            </div>
          ` : ''}

          <!-- Section 4: Nom de l'élément -->
          <div class="space-y-1.5">
            <label for="input-move-name" class="block text-xs font-semibold ${isLight ? 'text-slate-700' : 'text-slate-300'}">
              Nom de l'élément :
            </label>
            <input
              type="text"
              id="input-move-name"
              value="${escapeHtml(moveName)}"
              class="w-full px-3.5 py-2 text-xs font-mono rounded-xl border ${validationError || hasConflict ? 'border-red-500 focus:ring-red-500' : (isLight ? 'border-slate-300 bg-white text-slate-900 focus:ring-indigo-500' : 'border-slate-700 bg-slate-900 text-slate-100 focus:ring-indigo-500')} focus:outline-none focus:ring-2 shadow-inner"
              placeholder="Nom de l'élément..."
              autocomplete="off"
              spellcheck="false"
            />
            ${validationError ? `
              <p id="move-validation-error" class="text-[11px] text-red-500 font-medium flex items-center gap-1 mt-1">
                ${icons.alertCircle({ size: 13, className: 'flex-shrink-0' })}
                <span>${escapeHtml(validationError)}</span>
              </p>
            ` : ''}
          </div>

          <!-- Section 5: Extension Warning -->
          ${extensionWarning ? `
            <div id="move-extension-warning" class="p-3 bg-amber-500/15 border border-amber-500/40 rounded-xl text-amber-300 text-xs flex items-start gap-2.5">
              ${icons.alertCircle({ size: 16, className: 'text-amber-400 flex-shrink-0 mt-0.5' })}
              <div class="text-[11px] leading-relaxed">
                <span class="font-bold">Avertissement modification d'extension :</span>
                <p class="mt-0.5">${escapeHtml(extensionWarning)}</p>
              </div>
            </div>
          ` : ''}

          <!-- Section 6: Conflict Box -->
          ${hasConflict ? `
            <div id="move-conflict-box" class="p-3.5 bg-red-950/40 border border-red-500/50 rounded-xl text-xs space-y-2.5">
              <div class="flex items-center gap-2 text-red-400 font-semibold text-xs">
                ${icons.alertCircle({ size: 16, className: 'flex-shrink-0' })}
                <span>Nom déjà existant dans la destination !</span>
              </div>
              <p class="text-[11px] text-red-200">
                Un ${itemTypeLabel} nommé <span class="font-mono font-bold">${escapeHtml(moveName)}</span> existe déjà dans ce dossier.
                Afin d'éviter toute perte de données, aucun élément ne sera remplacé ni fusionné.
              </p>
              <div class="flex flex-wrap items-center gap-2 pt-1">
                <button
                  id="btn-move-conflict-edit"
                  type="button"
                  class="px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-700 hover:bg-slate-600 text-slate-100 transition-colors"
                >
                  Modifier le nom
                </button>
                <button
                  id="btn-move-conflict-browse"
                  type="button"
                  class="px-3 py-1.5 rounded-lg text-xs font-medium bg-indigo-600 hover:bg-indigo-500 text-white transition-colors"
                >
                  Choisir une autre destination
                </button>
              </div>
            </div>
          ` : ''}

          <!-- Section 7: Permanent Explanation of Consequences -->
          <div id="move-consequences-text" class="p-3 ${isLight ? 'bg-indigo-50 border-indigo-200 text-indigo-900' : 'bg-indigo-950/40 border-indigo-500/30 text-indigo-200'} border rounded-xl text-xs leading-relaxed space-y-1">
            <p class="font-semibold">Après le déplacement, cet élément ne sera plus présent dans son dossier actuel. Son contenu ne sera pas modifié.</p>
            <p class="font-normal text-[11px] opacity-90">Cette opération ne créera pas une deuxième copie permanente.</p>
          </div>

          <!-- Buttons -->
          <div class="flex items-center justify-end gap-2.5 pt-3 border-t ${isLight ? 'border-slate-200' : 'border-slate-700/80'}">
            <button
              id="btn-move-modal-cancel"
              type="button"
              class="px-4 py-2 rounded-xl text-xs font-medium ${isLight ? 'bg-slate-200 hover:bg-slate-300 text-slate-800' : 'bg-slate-700 hover:bg-slate-600 text-slate-200'} transition-colors focus:outline-none focus:ring-2 focus:ring-slate-400"
            >
              Annuler
            </button>
            <button
              id="btn-move-modal-next"
              type="button"
              ${validationError || hasConflict || !destDirPath ? 'disabled' : ''}
              class="px-4 py-2 rounded-xl text-xs font-medium ${validationError || hasConflict || !destDirPath ? 'bg-indigo-400/40 text-indigo-200/50 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-md focus:outline-none focus:ring-2 focus:ring-indigo-400'} transition-all"
            >
              Suivant
            </button>
          </div>
        </div>
      </div>
    `;
  }

  if (step === 'confirm') {
    return `
      <div
        id="modal-move-confirm-overlay"
        class="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4"
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-move-confirm-title"
      >
        <div class="${isLight ? 'bg-white text-slate-900 border-slate-300' : 'bg-[#181528] text-slate-100 border-indigo-500/30'} border rounded-2xl p-6 max-w-lg w-full shadow-2xl space-y-4">
          <div class="flex items-center gap-3 text-indigo-400">
            <div class="p-2.5 ${isLight ? 'bg-indigo-100 text-indigo-700' : 'bg-indigo-600/20 text-indigo-300'} border border-indigo-500/30 rounded-xl flex-shrink-0">
              ${icons.move ? icons.move({ size: 22 }) : icons.folderOpen({ size: 22 })}
            </div>
            <h2 id="modal-move-confirm-title" class="text-sm font-bold ${isLight ? 'text-slate-900' : 'text-white'}">
              Résumé avant confirmation du déplacement
            </h2>
          </div>

          <div class="space-y-3 text-xs">
            <p class="font-medium ${isLight ? 'text-slate-700' : 'text-slate-300'}">Vous allez déplacer :</p>
            <div class="p-2.5 rounded-xl font-mono ${isLight ? 'bg-slate-100 text-indigo-800 border-slate-300' : 'bg-slate-900 text-indigo-300 border-slate-800'} border break-all font-semibold" id="confirm-move-source">
              ${escapeHtml(sourceItem.path)}
            </div>

            <p class="font-medium ${isLight ? 'text-slate-700' : 'text-slate-300'}">vers :</p>
            <div class="p-2.5 rounded-xl font-mono ${isLight ? 'bg-emerald-50 text-emerald-800 border-emerald-300' : 'bg-slate-900 text-emerald-300 border-slate-800'} border break-all font-semibold" id="confirm-move-dest">
              ${escapeHtml(futurePath || destDirPath)}
            </div>

            <div class="p-3 rounded-xl ${isLight ? 'bg-indigo-50 text-indigo-900 border-indigo-200' : 'bg-indigo-950/40 text-indigo-200 border-indigo-500/30'} border text-[11px] space-y-1">
              <p class="font-medium">• Après l’opération, cet élément ne sera plus présent dans son dossier d’origine.</p>
              <p class="font-medium">• Son contenu ne sera pas modifié.</p>
              <p class="font-medium">• Aucun fichier ou dossier existant ne sera remplacé.</p>
            </div>
          </div>

          <div class="flex items-center justify-end gap-2.5 pt-3 border-t ${isLight ? 'border-slate-200' : 'border-slate-700/80'}">
            <button
              id="btn-move-confirm-back"
              type="button"
              class="px-4 py-2 rounded-xl text-xs font-medium ${isLight ? 'bg-slate-200 hover:bg-slate-300 text-slate-800' : 'bg-slate-700 hover:bg-slate-600 text-slate-200'} transition-colors focus:outline-none focus:ring-2 focus:ring-slate-400"
            >
              Retour
            </button>
            <button
              id="btn-move-confirm-execute"
              type="button"
              class="px-4 py-2 rounded-xl text-xs font-medium bg-indigo-600 hover:bg-indigo-500 text-white shadow-md transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-400"
            >
              Confirmer le déplacement
            </button>
          </div>
        </div>
      </div>
    `;
  }

  if (step === 'progress') {
    const percentage = progressState.percentage || 0;
    return `
      <div
        id="modal-move-progress-overlay"
        class="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4"
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-move-progress-title"
      >
        <div class="${isLight ? 'bg-white text-slate-900 border-slate-300' : 'bg-[#181528] text-slate-100 border-indigo-500/30'} border rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4 text-center">
          <div class="flex items-center justify-center">
            <div class="p-3 bg-indigo-600/20 text-indigo-400 border border-indigo-500/30 rounded-2xl animate-pulse">
              ${icons.move ? icons.move({ size: 28 }) : icons.folderOpen({ size: 28 })}
            </div>
          </div>
          <h2 id="modal-move-progress-title" class="text-sm font-bold ${isLight ? 'text-slate-900' : 'text-white'}">
            Déplacement en cours…
          </h2>

          <div class="space-y-2 text-xs">
            <p class="font-mono text-indigo-300 text-[11px] truncate max-w-xs mx-auto" id="move-progress-item-name">
              ${escapeHtml(progressState.currentItem || sourceItem.name)}
            </p>
            <p class="text-[11px] ${isLight ? 'text-slate-500' : 'text-slate-400'} truncate">
              Destination : <span class="font-mono">${escapeHtml(destDirPath)}</span>
            </p>

            <div class="w-full bg-slate-800 rounded-full h-2.5 overflow-hidden border border-slate-700 mt-3">
              <div class="bg-gradient-to-r from-indigo-500 to-purple-500 h-2.5 rounded-full transition-all duration-200" style="width: ${percentage}%;"></div>
            </div>
            <p class="text-[10px] font-mono text-slate-400 text-right">${percentage}%</p>
          </div>

          <div class="pt-2 border-t ${isLight ? 'border-slate-200' : 'border-slate-700/80'}">
            <button
              id="btn-move-cancel-progress"
              type="button"
              class="px-4 py-2 rounded-xl text-xs font-medium bg-red-600/80 hover:bg-red-600 text-white transition-colors focus:outline-none focus:ring-2 focus:ring-red-400"
            >
              Annuler le déplacement
            </button>
          </div>
        </div>
      </div>
    `;
  }

  if (step === 'success') {
    return `
      <div
        id="modal-move-success-overlay"
        class="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4"
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-move-success-title"
      >
        <div class="${isLight ? 'bg-white text-slate-900 border-slate-300' : 'bg-[#181528] text-slate-100 border-indigo-500/30'} border rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4">
          <div class="flex items-center gap-3 text-emerald-400">
            <div class="p-2.5 bg-emerald-500/20 border border-emerald-500/40 rounded-xl flex-shrink-0">
              ${icons.refreshCw({ size: 22 })}
            </div>
            <h2 id="modal-move-success-title" class="text-sm font-bold ${isLight ? 'text-slate-900' : 'text-white'}">
              Le ${itemTypeLabel} a été déplacé.
            </h2>
          </div>

          <div class="space-y-3 text-xs">
            <div>
              <span class="text-[11px] font-medium ${isLight ? 'text-slate-500' : 'text-slate-400'}">Ancien emplacement :</span>
              <p class="font-mono text-[11px] ${isLight ? 'text-slate-700' : 'text-slate-300'} break-all mt-0.5 p-2 rounded-lg bg-slate-900/40 border border-slate-800">
                ${escapeHtml(resultState.sourcePath || sourceItem.path)}
              </p>
            </div>
            <div>
              <span class="text-[11px] font-medium ${isLight ? 'text-slate-500' : 'text-slate-400'}">Nouvel emplacement :</span>
              <p class="font-mono text-[11px] text-emerald-400 font-semibold break-all mt-0.5 p-2 rounded-lg bg-slate-900/60 border border-emerald-500/30">
                ${escapeHtml(resultState.targetPath)}
              </p>
            </div>
          </div>

          <div class="flex items-center justify-end gap-2 pt-3 border-t ${isLight ? 'border-slate-200' : 'border-slate-700/80'} flex-wrap">
            <button
              id="btn-move-success-show"
              type="button"
              class="px-3 py-2 rounded-xl text-xs font-medium bg-indigo-600 hover:bg-indigo-500 text-white transition-colors"
            >
              Afficher l'élément
            </button>
            <button
              id="btn-move-success-undo"
              type="button"
              class="px-3 py-2 rounded-xl text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors"
            >
              Annuler le déplacement
            </button>
            <button
              id="btn-move-success-close"
              type="button"
              class="px-3 py-2 rounded-xl text-xs font-medium ${isLight ? 'bg-slate-200 hover:bg-slate-300 text-slate-800' : 'bg-slate-700 hover:bg-slate-600 text-slate-200'} transition-colors"
            >
              Fermer
            </button>
          </div>
        </div>
      </div>
    `;
  }

  return '';
}

export function renderMoveUndoToast(moveUndoToastState, theme = 'dark') {
  if (!moveUndoToastState || !moveUndoToastState.visible) return '';
  const isLight = theme === 'light';

  return `
    <div
      id="undo-move-toast"
      role="status"
      aria-live="polite"
      class="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 px-4 py-3 ${isLight ? 'bg-slate-900 text-slate-100 shadow-2xl border border-slate-700' : 'bg-[#181528] text-slate-100 shadow-2xl border border-indigo-500/40'} rounded-2xl text-xs"
    >
      <div class="p-1 bg-emerald-500/20 text-emerald-400 rounded-lg flex-shrink-0">
        ${icons.move ? icons.move({ size: 16 }) : icons.folderOpen({ size: 16 })}
      </div>
      <span class="font-medium">${escapeHtml(moveUndoToastState.message || 'L\'élément a été replacé à son emplacement d\'origine.')}</span>
      <button
        id="btn-dismiss-move-toast"
        type="button"
        class="ml-2 p-1 text-slate-400 hover:text-white rounded-lg transition-colors"
        aria-label="Fermer la notification"
      >
        ${icons.x({ size: 14 })}
      </button>
    </div>
  `;
}

export function renderMoveErrorModal(moveErrorMessage, theme = 'dark') {
  if (!moveErrorMessage) return '';
  const isLight = theme === 'light';

  return `
    <div
      id="modal-move-error-overlay"
      class="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-move-error-title"
    >
      <div class="${isLight ? 'bg-white text-slate-900 border-red-200' : 'bg-[#181528] text-slate-100 border-red-500/40'} border rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4">
        <div class="flex items-center gap-3 text-red-500">
          <div class="p-2.5 bg-red-500/20 border border-red-500/40 rounded-xl flex-shrink-0">
            ${icons.alertCircle({ size: 22 })}
          </div>
          <h2 id="modal-move-error-title" class="text-sm font-bold text-red-500">Impossible de déplacer l'élément</h2>
        </div>

        <p class="text-xs ${isLight ? 'text-slate-700' : 'text-slate-300'} leading-relaxed" id="move-error-message-text">
          ${escapeHtml(moveErrorMessage)}
        </p>

        <div class="flex items-center justify-end pt-3 border-t ${isLight ? 'border-slate-200' : 'border-slate-700/80'}">
          <button
            id="btn-move-error-dismiss"
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

export function renderTrashConfirmModal(trashModalState, theme = 'dark') {
  if (!trashModalState || !trashModalState.isOpen || trashModalState.step !== 'confirm' || !trashModalState.item) {
    return '';
  }

  const { item } = trashModalState;
  const isDir = item.type === 'directory';
  const isLight = theme === 'light';
  const parentPath = item.path ? item.path.substring(0, item.path.lastIndexOf('/') !== -1 ? item.path.lastIndexOf('/') : item.path.length) : '';

  return `
    <div
      id="modal-trash-confirm-overlay"
      class="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-trash-confirm-title"
      aria-describedby="modal-trash-confirm-consequence"
    >
      <div class="${isLight ? 'bg-white text-slate-900 border-slate-300' : 'bg-[#181528] text-slate-100 border-rose-500/30'} border rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4">
        <div class="flex items-center gap-3 text-rose-500">
          <div class="p-2.5 ${isLight ? 'bg-rose-100 text-rose-700' : 'bg-rose-600/20 text-rose-300'} border border-rose-500/30 rounded-xl flex-shrink-0">
            ${icons.trash ? icons.trash({ size: 22 }) : icons.alertCircle({ size: 22 })}
          </div>
          <h2 id="modal-trash-confirm-title" class="text-sm font-bold ${isLight ? 'text-slate-900' : 'text-white'}">
            Mettre ce ${isDir ? 'dossier' : 'fichier'} dans la Corbeille
          </h2>
        </div>

        <div class="space-y-3 text-xs">
          <div>
            <span class="font-medium ${isLight ? 'text-slate-700' : 'text-slate-300'}">Élément :</span>
            <div class="mt-1 p-2.5 rounded-xl font-mono ${isLight ? 'bg-slate-100 text-rose-800 border-slate-300' : 'bg-slate-900 text-rose-300 border-slate-800'} border break-all font-semibold" id="trash-item-name">
              ${escapeHtml(item.name)}
            </div>
          </div>

          <div>
            <span class="font-medium ${isLight ? 'text-slate-700' : 'text-slate-300'}">Emplacement actuel :</span>
            <div class="mt-1 p-2.5 rounded-xl font-mono text-[11px] ${isLight ? 'bg-slate-100 text-slate-700 border-slate-300' : 'bg-slate-900 text-slate-400 border-slate-800'} border break-all" id="trash-item-location">
              ${escapeHtml(parentPath || item.path)}
            </div>
          </div>

          <div id="modal-trash-confirm-consequence" class="p-3.5 rounded-xl ${isLight ? 'bg-rose-50 border-rose-200 text-rose-900' : 'bg-rose-950/40 border-rose-800/60 text-rose-200'} border text-xs leading-relaxed space-y-2">
            <p class="font-semibold text-xs flex items-center gap-2">
              ${icons.alertCircle({ size: 16, className: 'text-rose-500 flex-shrink-0' })}
              <span>Conséquence :</span>
            </p>
            <p>
              ${isDir
                ? 'Ce dossier et tout ce qu’il contient seront placés dans la Corbeille. Le dossier disparaîtra de son emplacement actuel, mais il ne sera pas supprimé définitivement. Il pourra normalement être restauré depuis la Corbeille Windows.'
                : 'Le fichier disparaîtra de ce dossier, mais il ne sera pas supprimé définitivement. Il pourra normalement être restauré depuis la Corbeille Windows.'}
            </p>
            ${isDir ? `
              <p class="text-[11px] opacity-90 italic">
                Le contenu de ce dossier n’a pas été analysé. L’ensemble du dossier sera concerné.
              </p>
            ` : ''}
          </div>
        </div>

        <div class="flex items-center justify-end gap-2.5 pt-3 border-t ${isLight ? 'border-slate-200' : 'border-slate-700/80'}">
          <button
            id="btn-trash-modal-cancel"
            type="button"
            class="px-4 py-2 rounded-xl text-xs font-medium ${isLight ? 'bg-slate-200 hover:bg-slate-300 text-slate-800' : 'bg-slate-700 hover:bg-slate-600 text-slate-200'} transition-colors focus:outline-none focus:ring-2 focus:ring-slate-400"
          >
            Annuler
          </button>
          <button
            id="btn-trash-modal-submit"
            type="button"
            class="px-4 py-2 rounded-xl text-xs font-medium bg-rose-600 hover:bg-rose-500 text-white shadow-md transition-all focus:outline-none focus:ring-2 focus:ring-rose-400 flex items-center gap-1.5"
          >
            ${icons.trash ? icons.trash({ size: 14 }) : ''}
            <span>Mettre dans la Corbeille</span>
          </button>
        </div>
      </div>
    </div>
  `;
}

export function renderTrashResultModal(trashModalState, theme = 'dark') {
  if (!trashModalState || !trashModalState.isOpen || trashModalState.step !== 'success' || !trashModalState.successInfo) {
    return '';
  }

  const { successInfo } = trashModalState;
  const { isDirectory, name, parentPath, dateTime } = successInfo;
  const isLight = theme === 'light';

  return `
    <div
      id="modal-trash-result-overlay"
      class="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-trash-result-title"
    >
      <div class="${isLight ? 'bg-white text-slate-900 border-slate-300' : 'bg-[#181528] text-slate-100 border-emerald-500/30'} border rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4">
        <div class="flex items-center gap-3 text-emerald-500">
          <div class="p-2.5 ${isLight ? 'bg-emerald-100 text-emerald-700' : 'bg-emerald-600/20 text-emerald-300'} border border-emerald-500/30 rounded-xl flex-shrink-0">
            ${icons.trash ? icons.trash({ size: 22 }) : icons.alertCircle({ size: 22 })}
          </div>
          <h2 id="modal-trash-result-title" class="text-sm font-bold ${isLight ? 'text-slate-900' : 'text-white'}">
            Le ${isDirectory ? 'dossier' : 'fichier'} a été placé dans la Corbeille.
          </h2>
        </div>

        <div class="space-y-3 text-xs">
          <div>
            <span class="font-medium ${isLight ? 'text-slate-700' : 'text-slate-300'}">Ancien nom :</span>
            <div class="mt-1 p-2.5 rounded-xl font-mono ${isLight ? 'bg-slate-100 text-slate-800 border-slate-300' : 'bg-slate-900 text-slate-200 border-slate-800'} border break-all font-semibold">
              ${escapeHtml(name)}
            </div>
          </div>

          <div>
            <span class="font-medium ${isLight ? 'text-slate-700' : 'text-slate-300'}">Ancien emplacement :</span>
            <div class="mt-1 p-2.5 rounded-xl font-mono text-[11px] ${isLight ? 'bg-slate-100 text-slate-700 border-slate-300' : 'bg-slate-900 text-slate-400 border-slate-800'} border break-all">
              ${escapeHtml(parentPath)}
            </div>
          </div>

          <div>
            <span class="font-medium ${isLight ? 'text-slate-700' : 'text-slate-300'}">Date et heure de l'opération :</span>
            <div class="mt-1 p-2.5 rounded-xl font-mono text-[11px] ${isLight ? 'bg-slate-100 text-slate-700 border-slate-300' : 'bg-slate-900 text-slate-300 border-slate-800'} border">
              ${escapeHtml(dateTime || new Date().toLocaleString())}
            </div>
          </div>
        </div>

        <div class="flex items-center justify-end gap-2.5 pt-3 border-t ${isLight ? 'border-slate-200' : 'border-slate-700/80'}">
          <button
            id="btn-trash-open-recycle-bin"
            type="button"
            class="px-4 py-2 rounded-xl text-xs font-medium ${isLight ? 'bg-slate-200 hover:bg-slate-300 text-slate-800' : 'bg-slate-700 hover:bg-slate-600 text-slate-200'} transition-colors focus:outline-none focus:ring-2 focus:ring-slate-400 flex items-center gap-1.5"
          >
            ${icons.externalLink({ size: 14 })}
            <span>Ouvrir la Corbeille</span>
          </button>
          <button
            id="btn-trash-modal-close"
            type="button"
            class="px-4 py-2 rounded-xl text-xs font-medium bg-purple-600 hover:bg-purple-500 text-white shadow-md transition-all focus:outline-none focus:ring-2 focus:ring-purple-400"
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  `;
}

export function renderTrashErrorModal(trashModalState, theme = 'dark') {
  if (!trashModalState || !trashModalState.isOpen || trashModalState.step !== 'error') {
    return '';
  }

  const { error, uncertainState } = trashModalState;
  const isLight = theme === 'light';

  return `
    <div
      id="modal-trash-error-overlay"
      class="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-trash-error-title"
    >
      <div class="${isLight ? 'bg-white text-slate-900 border-slate-300' : 'bg-[#181528] text-slate-100 border-red-500/30'} border rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4">
        <div class="flex items-center gap-3 text-red-500">
          <div class="p-2.5 ${isLight ? 'bg-red-100 text-red-700' : 'bg-red-600/20 text-red-300'} border border-red-500/30 rounded-xl flex-shrink-0">
            ${icons.alertCircle({ size: 22 })}
          </div>
          <h2 id="modal-trash-error-title" class="text-sm font-bold ${isLight ? 'text-slate-900' : 'text-white'}">
            Erreur lors de la mise à la Corbeille
          </h2>
        </div>

        <div class="p-3.5 rounded-xl ${isLight ? 'bg-red-50 border-red-200 text-red-900' : 'bg-red-950/40 border-red-800/60 text-red-200'} border text-xs leading-relaxed">
          ${escapeHtml(error || 'L’opération a échoué.')}
        </div>

        <div class="flex items-center justify-end gap-2.5 pt-3 border-t ${isLight ? 'border-slate-200' : 'border-slate-700/80'}">
          ${uncertainState ? `
            <button
              id="btn-trash-refresh-folder"
              type="button"
              class="px-4 py-2 rounded-xl text-xs font-medium bg-amber-600 hover:bg-amber-500 text-white shadow-md transition-all focus:outline-none focus:ring-2 focus:ring-amber-400 flex items-center gap-1.5"
            >
              ${icons.refreshCw({ size: 14 })}
              <span>Actualiser le dossier</span>
            </button>
          ` : ''}
          <button
            id="btn-trash-error-close"
            type="button"
            class="px-4 py-2 rounded-xl text-xs font-medium ${isLight ? 'bg-slate-200 hover:bg-slate-300 text-slate-800' : 'bg-slate-700 hover:bg-slate-600 text-slate-200'} transition-colors focus:outline-none focus:ring-2 focus:ring-slate-400"
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
  renameErrorMessage = null,
  copyModalState = null,
  copyUndoToastState = null,
  copyErrorMessage = null,
  moveModalState = null,
  moveUndoToastState = null,
  moveErrorMessage = null,
  trashModalState = null
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

          <button
            id="btn-open-another"
            class="flex items-center gap-1 bg-purple-600 hover:bg-purple-500 text-white px-2.5 py-1 rounded-lg text-xs font-medium transition-colors shadow-2xs"
          >
            ${icons.folderTree({ size: 13 })}
            <span class="hidden sm:inline">Changer dossier</span>
          </button>
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

          <button
            id="btn-open-another"
            class="flex items-center gap-1.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white px-3 py-1.5 rounded-xl text-xs font-medium transition-colors shadow-sm"
          >
            ${icons.folderTree({ size: 14 })}
            <span class="hidden sm:inline">Changer de dossier</span>
          </button>
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
            ${icons.folderOpen({ size: 14 })}
          </div>
          <span class="text-xs font-bold ${isLight ? 'text-slate-900' : 'text-white'} tracking-tight">DirectoryDisplayApp</span>
          <span class="text-[10px] font-mono px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-300">v1.0.0-rc.1</span>
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
      ${copyModalState?.isOpen ? renderCopyWizardModal(copyModalState, theme) : ''}
      ${copyUndoToastState?.visible ? renderCopyUndoToast(copyUndoToastState, theme) : ''}
      ${copyErrorMessage ? renderCopyErrorModal(copyErrorMessage, theme) : ''}
      ${moveModalState?.isOpen ? renderMoveWizardModal(moveModalState, theme) : ''}
      ${moveUndoToastState?.visible ? renderMoveUndoToast(moveUndoToastState, theme) : ''}
      ${moveErrorMessage ? renderMoveErrorModal(moveErrorMessage, theme) : ''}
      ${trashModalState?.isOpen && trashModalState.step === 'confirm' ? renderTrashConfirmModal(trashModalState, theme) : ''}
      ${trashModalState?.isOpen && trashModalState.step === 'success' ? renderTrashResultModal(trashModalState, theme) : ''}
      ${trashModalState?.isOpen && trashModalState.step === 'error' ? renderTrashErrorModal(trashModalState, theme) : ''}
    </div>
  `;
}
