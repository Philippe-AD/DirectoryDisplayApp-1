import Prism from 'prismjs';
import 'prismjs/themes/prism.css';
import { icons } from '../icons';
import { getSyntaxLanguage, isImageFile, isAudioFile, isVideoFile } from '../filePreview';
import { escapeHtml, formatFileSize, getFileExtension } from './formatters';
import { renderOverviewGrid } from './treeRenderer';

export function highlightCode(code, lang) {
  const grammar = Prism.languages[lang] || Prism.languages.markup;
  try {
    return Prism.highlight(code, grammar, lang);
  } catch {
    return escapeHtml(code);
  }
}

export function renderPreviewPanel(selectedItem, previewState = { status: 'idle' }, objectUrl = null) {
  if (!selectedItem) {
    return `
      <div id="preview-panel" class="h-full flex flex-col p-2 bg-[#F8F9FE] rounded-2xl border border-slate-200/80 overflow-hidden">
        <div class="p-4 mb-2 bg-white rounded-2xl border border-slate-200/80 flex items-center gap-3 shadow-2xs">
          <div class="p-2.5 bg-purple-50 text-purple-600 rounded-xl">
            ${icons.file({ size: 22 })}
          </div>
          <div>
            <h3 class="font-bold text-slate-800 text-xs">Aucun fichier sélectionné</h3>
            <p class="text-[11px] text-slate-400">Sélectionnez un fichier dans l'arborescence pour afficher sa prévisualisation ou parcourez la vue d'ensemble ci-dessous.</p>
          </div>
        </div>
        ${renderOverviewGrid([], null)}
      </div>
    `;
  }

  if (selectedItem.type === 'directory' || previewState.status === 'folder') {
    return `
      <div id="preview-panel" class="h-full flex flex-col p-5 bg-[#F8F9FE] rounded-2xl border border-slate-200/80 overflow-y-auto">
        <div class="flex items-center justify-between pb-4 border-b border-slate-200/60">
          <div class="flex items-center gap-3 min-w-0 flex-1">
            <div class="p-3 rounded-2xl bg-gradient-to-br from-amber-400 to-amber-600 text-white shadow-md flex-shrink-0">
              ${icons.folderOpen({ size: 26 })}
            </div>
            <div class="min-w-0 flex-1">
              <h3 class="font-bold text-slate-900 text-base truncate">${escapeHtml(selectedItem.name)}</h3>
              <span class="inline-block text-[10px] font-semibold uppercase tracking-wider text-amber-800 px-2 py-0.5 rounded-full bg-amber-100 border border-amber-300/60 mt-1">Dossier de fichiers</span>
            </div>
          </div>
          <button
            id="btn-trigger-copy"
            type="button"
            data-item-path="${escapeHtml(selectedItem.path)}"
            class="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-[11px] font-medium text-white transition-colors shadow-2xs flex-shrink-0"
            title="Créer une copie de ce dossier…"
            aria-label="Créer une copie de ce dossier"
          >
            ${icons.copy({ size: 14 })}
            <span>Créer une copie…</span>
          </button>
          <button
            id="btn-trigger-rename"
            type="button"
            data-item-path="${escapeHtml(selectedItem.path)}"
            class="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-700 hover:bg-slate-600 text-[11px] font-medium text-slate-200 transition-colors shadow-2xs flex-shrink-0"
            title="Renommer ce dossier (F2)"
            aria-label="Renommer ce dossier"
          >
            ${icons.edit({ size: 14 })}
            <span>Renommer</span>
          </button>
        </div>

        <div class="mt-5 space-y-3 text-xs">
          <div class="flex items-center justify-between p-3 rounded-xl bg-white border border-slate-200/80 shadow-2xs">
            <span class="text-slate-500 font-medium">Type</span>
            <span class="font-semibold text-slate-800">Dossier de fichiers</span>
          </div>
          <div class="flex flex-col gap-1 p-3 rounded-xl bg-white border border-slate-200/80 shadow-2xs">
            <span class="text-slate-500 font-medium">Chemin d'accès</span>
            <span class="font-mono text-[11px] text-slate-700 break-all">${escapeHtml(selectedItem.path)}</span>
          </div>
        </div>

        <div class="mt-6 p-4 rounded-xl bg-purple-50 border border-purple-200/80 text-xs text-purple-900 flex items-start gap-2.5">
          ${icons.folder({ size: 18, className: 'text-purple-600 flex-shrink-0 mt-0.5' })}
          <span>Cliquez sur la flèche ou double-cliquez pour développer le contenu de ce dossier dans l'arborescence.</span>
        </div>
      </div>
    `;
  }

  if (previewState.status === 'loading') {
    return `
      <div id="preview-panel" class="h-full flex flex-col items-center justify-center text-center p-6 bg-white rounded-2xl border border-slate-200/80">
        <div class="animate-spin text-purple-600 mb-3">
          ${icons.loader({ size: 32 })}
        </div>
        <p class="font-semibold text-slate-800 text-xs">Chargement de la prévisualisation...</p>
        <p class="text-[11px] text-slate-400 mt-1 truncate max-w-xs">${escapeHtml(selectedItem.name)}</p>
      </div>
    `;
  }

  const preview = previewState.preview || {};

  let previewBodyHtml = '';

  if (preview.kind === 'image' && objectUrl) {
    previewBodyHtml = `
      <div class="mt-3 flex-1 flex flex-col min-h-0">
        <p class="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Aperçu image</p>
        <div class="flex-1 flex items-center justify-center p-4 bg-slate-900 rounded-xl border border-slate-800 overflow-hidden shadow-inner">
          <img
            src="${objectUrl}"
            alt="${escapeHtml(selectedItem.name)}"
            class="max-w-full max-h-full object-contain rounded-lg shadow-md"
          />
        </div>
      </div>
    `;
  } else if (preview.kind === 'audio' && objectUrl) {
    previewBodyHtml = `
      <div class="mt-3 flex-1 flex flex-col justify-center items-center p-6 bg-slate-900 rounded-xl border border-slate-800 text-slate-100 gap-4">
        <p class="text-[10px] font-semibold text-slate-400 uppercase tracking-wider self-start">Aperçu audio</p>
        <div class="p-4 bg-purple-600/30 text-purple-300 rounded-full border border-purple-500/40 shadow-lg">
          ${icons.music({ size: 40 })}
        </div>
        <div class="text-center">
          <p class="font-semibold text-sm text-slate-100">${escapeHtml(selectedItem.name)}</p>
          <p class="text-[11px] text-slate-400 mt-0.5">Fichier Audio</p>
        </div>
        <audio
          controls
          src="${objectUrl}"
          class="w-full max-w-md mt-2"
          preload="metadata"
        >
          Votre navigateur ne supporte pas la lecture audio.
        </audio>
      </div>
    `;
  } else if (preview.kind === 'video' && objectUrl) {
    previewBodyHtml = `
      <div class="mt-3 flex-1 flex flex-col min-h-0">
        <p class="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Aperçu vidéo</p>
        <div class="flex-1 flex items-center justify-center p-2 bg-black rounded-xl border border-slate-800 overflow-hidden shadow-inner">
          <video
            controls
            src="${objectUrl}"
            class="max-w-full max-h-full rounded-lg"
            preload="metadata"
          >
            Votre navigateur ne supporte pas la lecture vidéo.
          </video>
        </div>
      </div>
    `;
  } else if (preview.kind === 'pdf' && objectUrl) {
    previewBodyHtml = `
      <div class="mt-3 flex-1 flex flex-col min-h-0">
        <p class="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Aperçu PDF</p>
        <object
          data="${objectUrl}"
          type="application/pdf"
          title="Prévisualisation PDF de ${escapeHtml(selectedItem.name)}"
          class="w-full flex-1 rounded-xl border border-slate-200 bg-slate-50 overflow-hidden shadow-sm"
        >
          <iframe
            src="${objectUrl}"
            type="application/pdf"
            title="Prévisualisation PDF de ${escapeHtml(selectedItem.name)}"
            class="w-full h-full border-0"
          ></iframe>
        </object>
      </div>
    `;
  } else if (preview.kind === 'word-docx') {
    previewBodyHtml = `
      <div class="mt-3 flex-1 flex flex-col min-h-0">
        <p class="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Aperçu Document Word (.docx)</p>
        <div
          id="docx-preview-container"
          class="w-full flex-1 overflow-auto rounded-xl border border-slate-200 bg-slate-100 p-3 shadow-inner"
        >
          <div class="flex items-center justify-center h-full text-xs text-slate-400">
            Chargement de la mise en page Word...
          </div>
        </div>
      </div>
    `;
  } else if (preview.kind === 'text' || preview.kind === 'word') {
    const content = preview.content ?? '';
    const syntaxLang = preview.kind === 'text' ? getSyntaxLanguage(selectedItem.name) ?? 'markup' : 'markup';
    const highlightedCode = content ? highlightCode(content, syntaxLang) : '';
    const isTruncated = preview.kind === 'text' && Boolean(preview.truncated);
    const totalSize = preview.totalSize ?? selectedItem.size;

    previewBodyHtml = `
      <div class="mt-3 flex-1 flex flex-col min-h-0">
        ${isTruncated ? `
          <div class="mb-2 p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-[11px] font-medium text-amber-900 flex items-center gap-2 flex-shrink-0" id="preview-truncated-warning">
            ${icons.alertCircle({ size: 15, className: 'text-amber-600 flex-shrink-0' })}
            <span>Aperçu limité au premier mégaoctet — taille totale : ${formatFileSize(totalSize)}</span>
          </div>
        ` : ''}
        <p class="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
          ${preview.kind === 'word' ? 'Aperçu Document Word' : 'Aperçu contenu'}
        </p>
        ${content === '' ? `
          <div class="p-4 bg-white rounded-xl border border-slate-200 text-xs text-slate-500 italic">
            Ce fichier est vide.
          </div>
        ` : `
          <pre
            class="flex-1 text-xs rounded-xl p-4 overflow-auto bg-slate-900 text-slate-100 font-mono leading-relaxed shadow-inner border border-slate-800 min-h-0"
            aria-label="Source code preview for ${escapeHtml(selectedItem.name)}"
          ><code>${highlightedCode}</code></pre>
        `}
      </div>
    `;
  } else if (preview.kind === 'unsupported-word' || previewState.status === 'unsupported-word') {
    previewBodyHtml = `
      <div class="mt-3 p-4 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900 flex items-start gap-2.5">
        ${icons.alertCircle({ size: 18, className: 'text-amber-600 flex-shrink-0 mt-0.5' })}
        <div>
          <p class="font-bold text-xs">Format Word hérité (.doc)</p>
          <p class="mt-0.5 text-[11px] text-amber-800 leading-relaxed">Les fichiers .doc ne peuvent pas être prévisualisés directement. Aucun fichier n'a été modifié.</p>
        </div>
      </div>
    `;
  } else if (preview.kind === 'word-error' || previewState.status === 'word-error' || previewState.status === 'error') {
    const rawError = previewState.error || '';
    let errorMessageText = 'Ce fichier ne peut pas être prévisualisé. Aucun fichier n\'a été modifié.';
    if (/accès refusé|permission|denied|eacces|eperm/i.test(rawError)) {
      errorMessageText = 'Accès refusé. Vous n\'avez pas la permission de lire ce fichier. Aucun fichier n\'a été modifié.';
    } else if (/introuvable|not found|enoent/i.test(rawError)) {
      errorMessageText = 'Fichier introuvable. Le fichier n\'existe plus à cet emplacement. Aucun fichier n\'a été modifié.';
    } else if (/déplacé|moved/i.test(rawError)) {
      errorMessageText = 'Le fichier a été déplacé depuis la dernière actualisation. Aucun fichier n\'a été modifié.';
    } else if (/verrouillé|locked|ebusy/i.test(rawError)) {
      errorMessageText = 'Le fichier est verrouillé par une autre application. Aucun fichier n\'a été modifié.';
    }

    previewBodyHtml = `
      <div class="mt-3 p-4 rounded-xl bg-red-50 border border-red-200 text-xs text-red-900 flex items-start gap-2.5">
        ${icons.alertCircle({ size: 18, className: 'text-red-600 flex-shrink-0 mt-0.5' })}
        <div>
          <p class="font-bold text-xs">Erreur de lecture</p>
          <p class="mt-0.5 text-[11px] text-red-800 leading-relaxed">${escapeHtml(errorMessageText)}</p>
        </div>
      </div>
    `;
  } else {
    previewBodyHtml = `
      <div class="mt-3 p-4 rounded-xl bg-slate-100 border border-slate-200 text-xs text-slate-600 flex items-start gap-2.5">
        ${icons.alertCircle({ size: 18, className: 'text-slate-400 flex-shrink-0 mt-0.5' })}
        <div>
          <p class="font-bold text-xs">Format non pris en charge</p>
          <p class="mt-0.5 text-[11px] text-slate-500 leading-relaxed">Ce format de fichier n'est pas pris en charge pour la prévisualisation. Aucun fichier n'a été modifié.</p>
        </div>
      </div>
    `;
  }

  const isImageHeader = isImageFile({ name: selectedItem.name, type: '' });
  const isAudioHeader = isAudioFile({ name: selectedItem.name, type: '' });
  const isVideoHeader = isVideoFile({ name: selectedItem.name, type: '' });

  const headerIcon = isImageHeader
    ? icons.image({ size: 20, className: 'text-purple-600' })
    : isAudioHeader
      ? icons.music({ size: 20, className: 'text-emerald-600' })
      : isVideoHeader
        ? icons.video({ size: 20, className: 'text-rose-600' })
        : icons.fileText({ size: 20, className: 'text-purple-600' });

  const ext = getFileExtension(selectedItem.name);

  return `
    <div id="preview-panel" class="h-full flex flex-col p-5 bg-white rounded-2xl border border-slate-200/80 overflow-hidden shadow-sm">
      <!-- File Header Bar -->
      <div class="flex items-center justify-between gap-3 pb-4 border-b border-slate-100 flex-shrink-0">
        <div class="flex items-center gap-3 min-w-0">
          <div class="p-2.5 rounded-xl bg-purple-50 text-purple-600 border border-purple-100 flex-shrink-0">
            ${headerIcon}
          </div>
          <div class="min-w-0 flex-1">
            <div class="flex items-center gap-2">
              <h3 class="font-bold text-slate-900 text-sm truncate max-w-sm" title="${escapeHtml(selectedItem.name)}">${escapeHtml(selectedItem.name)}</h3>
              <span class="text-[10px] font-mono font-semibold px-2 py-0.5 bg-slate-100 text-slate-600 rounded-full border border-slate-200 flex-shrink-0">${ext}</span>
            </div>
            <p class="text-[11px] text-slate-400 font-mono truncate mt-0.5">
              ${selectedItem.size !== undefined ? `${formatFileSize(selectedItem.size)} • ` : ''}${escapeHtml(selectedItem.path)}
            </p>
          </div>
        </div>

        <div class="flex items-center gap-2 flex-shrink-0">
          <button
            id="btn-trigger-copy"
            type="button"
            data-item-path="${escapeHtml(selectedItem.path)}"
            class="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-[11px] font-medium text-white transition-colors shadow-2xs flex-shrink-0"
            title="Créer une copie de ce fichier…"
            aria-label="Créer une copie de ce fichier"
          >
            ${icons.copy({ size: 14 })}
            <span class="hidden sm:inline">Créer une copie…</span>
          </button>

          <button
            id="btn-trigger-rename"
            type="button"
            data-item-path="${escapeHtml(selectedItem.path)}"
            class="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-700 hover:bg-slate-600 text-[11px] font-medium text-slate-200 transition-colors shadow-2xs flex-shrink-0"
            title="Renommer ce fichier (F2)"
            aria-label="Renommer ce fichier"
          >
            ${icons.edit({ size: 14 })}
            <span class="hidden sm:inline">Renommer</span>
          </button>

          <button
            id="btn-open-external"
            type="button"
            data-file-path="${escapeHtml(selectedItem.path)}"
            class="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-[11px] font-medium text-slate-200 transition-colors shadow-2xs flex-shrink-0"
            title="Ouvrir avec une application externe"
            aria-label="Ouvrir avec une application externe"
          >
            ${icons.externalLink({ size: 14 })}
            <span class="hidden sm:inline">Ouvrir avec…</span>
          </button>

          ${objectUrl ? `
            <a
              href="${objectUrl}"
              download="${escapeHtml(selectedItem.name)}"
              class="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-[11px] font-medium text-white transition-colors shadow-2xs flex-shrink-0"
              title="Enregistrer une copie du fichier"
              aria-label="Enregistrer une copie du fichier"
            >
              ${icons.download({ size: 14 })}
              <span class="hidden sm:inline">Enregistrer une copie…</span>
            </a>
          ` : ''}
        </div>
      </div>

      <!-- Preview Body -->
      ${previewBodyHtml}
    </div>
  `;
}
