import Prism from 'prismjs';
import 'prismjs/themes/prism.css';
import { icons } from './icons';
import { getSyntaxLanguage, isImageFile, isAudioFile, isVideoFile } from './filePreview';

export const COLOR_PALETTE = [
  { bg: 'bg-blue-600',    light: 'bg-blue-50',    text: 'text-blue-600',    badge: 'bg-blue-100 text-blue-700' },
  { bg: 'bg-emerald-600', light: 'bg-emerald-50', text: 'text-emerald-600', badge: 'bg-emerald-100 text-emerald-700' },
  { bg: 'bg-orange-500',  light: 'bg-orange-50',  text: 'text-orange-600',  badge: 'bg-orange-100 text-orange-700' },
  { bg: 'bg-teal-600',    light: 'bg-teal-50',    text: 'text-teal-600',    badge: 'bg-teal-100 text-teal-700' },
  { bg: 'bg-amber-600',   light: 'bg-amber-50',   text: 'text-amber-600',   badge: 'bg-amber-100 text-amber-700' },
  { bg: 'bg-rose-600',    light: 'bg-rose-50',    text: 'text-rose-600',    badge: 'bg-rose-100 text-rose-700' },
];

export function getColorForPath(path) {
  const hash = (path || '/').split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
  return COLOR_PALETTE[hash % COLOR_PALETTE.length];
}

export function formatFileSize(bytes) {
  if (bytes === undefined || bytes === null) return '';
  if (bytes === 0) return '0 B';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

export function getFileExtension(name) {
  if (!name) return 'FILE';
  const parts = name.split('.');
  return parts.length > 1 ? parts[parts.length - 1].toUpperCase() : 'FILE';
}

function renderBreadcrumbs(pathStr) {
  if (!pathStr) return '';
  const parts = pathStr.split(/[/\\]/).filter(Boolean);
  if (parts.length === 0) return escapeHtml(pathStr);

  return parts
    .map((part, index) => {
      const isLast = index === parts.length - 1;
      return `<span class="${isLast ? 'text-slate-200 font-semibold' : 'text-slate-400'}">${escapeHtml(part)}</span>`;
    })
    .join('<span class="text-slate-600 mx-1">/</span>');
}

export function renderWelcomeScreen(error) {
  return `
    <div class="h-screen w-screen bg-slate-900 text-slate-100 flex items-center justify-center p-6">
      <div class="max-w-md w-full bg-slate-800/90 border border-slate-700/80 rounded-xl p-8 shadow-2xl backdrop-blur-sm text-center">
        <div class="inline-flex items-center justify-center w-14 h-14 bg-blue-600/20 text-blue-400 rounded-xl mb-4 border border-blue-500/30">
          ${icons.hardDrive({ size: 28 })}
        </div>
        <h1 class="text-2xl font-bold text-white tracking-tight">Explorateur de répertoires</h1>
        <p class="text-slate-400 mt-2 text-xs">Parcourez et prévisualisez vos répertoires et fichiers locaux avec une interface bureau moderne.</p>

        <div class="mt-6 space-y-3">
          <button
            id="btn-open-folder"
            class="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 text-white font-medium py-2.5 px-4 text-xs rounded-lg transition-colors shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
          >
            ${icons.folderOpen({ size: 18 })}
            Ouvrir un dossier
          </button>
        </div>

        ${error ? `
          <div class="mt-4 p-3 bg-red-900/40 border border-red-700/50 rounded-lg text-left flex flex-col gap-2">
            <div class="flex items-start gap-2">
              ${icons.alertCircle({ size: 16, className: 'text-red-400 flex-shrink-0 mt-0.5' })}
              <p class="text-xs text-red-200">${escapeHtml(error)}</p>
            </div>
            <button
              id="btn-use-fallback"
              class="self-start text-[11px] font-medium text-red-300 hover:text-white underline transition-colors"
            >
              Utiliser le sélecteur alternatif
            </button>
          </div>
        ` : ''}
      </div>
    </div>
  `;
}

export function renderFallbackUploadScreen() {
  return `
    <div class="h-screen w-screen bg-slate-900 text-slate-100 flex items-center justify-center p-6">
      <div class="max-w-md w-full bg-slate-800/90 border border-slate-700/80 rounded-xl p-8 shadow-2xl text-center">
        <div class="inline-flex items-center justify-center w-14 h-14 bg-blue-600/20 text-blue-400 rounded-xl mb-4 border border-blue-500/30">
          ${icons.hardDrive({ size: 28 })}
        </div>
        <h1 class="text-2xl font-bold text-white tracking-tight">Sélecteur de fichiers</h1>
        <p class="text-slate-400 mt-2 text-xs">Sélectionnez les fichiers ou le répertoire depuis votre disque.</p>

        <div class="mt-6">
          <label class="w-full flex flex-col items-center justify-center gap-2 border border-dashed border-slate-600 hover:border-blue-400 bg-slate-800 hover:bg-slate-750 rounded-lg py-8 cursor-pointer transition-colors group">
            ${icons.upload({ size: 26, className: 'text-slate-400 group-hover:text-blue-400 transition-colors' })}
            <span class="font-medium text-xs text-slate-200 group-hover:text-white">Choisir des fichiers ou un dossier</span>
            <span class="text-[11px] text-slate-400">Les fichiers restent localement sur votre machine</span>
            <input
              type="file"
              id="input-fallback-files"
              multiple
              webkitdirectory=""
              directory=""
              class="hidden"
            />
          </label>
          <button
            id="btn-cancel-fallback"
            class="mt-4 text-xs text-slate-400 hover:text-slate-200 transition-colors"
          >
            Retour
          </button>
        </div>
      </div>
    </div>
  `;
}

export function renderTreeNode(node, isSelected = false) {
  const level = node.level || 0;
  const indentPx = Math.min(level * 16 + 6, 200);

  const isDir = node.type === 'directory';
  const isDocument = !isDir && (/\.(pdf|docx?)$/i.test(node.name));
  const isImage = !isDir && (node.file ? isImageFile(node.file) : /\.(png|jpe?g|gif|webp|svg|bmp|ico|avif|tiff|apng)$/i.test(node.name));
  const isAudio = !isDir && (node.file ? isAudioFile(node.file) : /\.(mp3|wav|ogg|m4a|aac|flac|wma|opus|mid|midi|amr|aiff|alac)$/i.test(node.name));
  const isVideo = !isDir && (node.file ? isVideoFile(node.file) : /\.(mp4|webm|ogv|mov|mkv|avi|wmv|m4v|3gp|flv)$/i.test(node.name));

  let iconHtml = '';
  if (isDir) {
    iconHtml = node.isExpanded
      ? icons.folderOpen({ size: 16, className: 'text-amber-500 flex-shrink-0' })
      : icons.folder({ size: 16, className: 'text-amber-500 flex-shrink-0' });
  } else if (isImage) {
    iconHtml = icons.image({ size: 16, className: 'text-purple-600 flex-shrink-0' });
  } else if (isAudio) {
    iconHtml = icons.music({ size: 16, className: 'text-emerald-600 flex-shrink-0' });
  } else if (isVideo) {
    iconHtml = icons.video({ size: 16, className: 'text-rose-600 flex-shrink-0' });
  } else if (isDocument) {
    iconHtml = icons.fileText({ size: 16, className: 'text-blue-600 flex-shrink-0' });
  } else {
    iconHtml = icons.file({ size: 16, className: 'text-slate-400 flex-shrink-0' });
  }

  let toggleBtnHtml = '';
  if (isDir) {
    if (node.isLoading) {
      toggleBtnHtml = `
        <span class="w-4 h-4 flex items-center justify-center animate-spin text-blue-600 flex-shrink-0" aria-label="Chargement du dossier">
          ${icons.loader({ size: 12 })}
        </span>
      `;
    } else {
      const iconCaret = node.isExpanded
        ? icons.chevronDown({ size: 12, className: 'text-slate-600' })
        : icons.chevronRight({ size: 12, className: 'text-slate-400 group-hover:text-slate-600' });
      toggleBtnHtml = `
        <button
          type="button"
          tabindex="-1"
          aria-label="${node.isExpanded ? 'Replier le dossier' : 'Développer le dossier'}"
          data-node-toggle="${escapeHtml(node.path)}"
          class="btn-toggle-folder w-4 h-4 flex items-center justify-center rounded hover:bg-slate-200/80 transition-colors flex-shrink-0"
        >
          ${iconCaret}
        </button>
      `;
    }
  } else {
    toggleBtnHtml = `<span class="w-4 h-4 flex-shrink-0"></span>`;
  }

  const selectedClasses = isSelected
    ? 'bg-blue-100/80 text-blue-900 font-medium border-l-2 border-blue-600 shadow-2xs'
    : 'text-slate-700 hover:bg-slate-100/90 border-l-2 border-transparent';

  const expandedAttr = isDir ? `aria-expanded="${node.isExpanded ? 'true' : 'false'}"` : '';

  let errorHtml = '';
  if (isDir && node.error) {
    errorHtml = `
      <div class="my-1 ml-5 p-1.5 bg-red-50 border border-red-200 rounded text-[11px] text-red-700 flex items-center justify-between gap-2">
        <div class="flex items-center gap-1 min-w-0">
          ${icons.alertCircle({ size: 13, className: 'text-red-600 flex-shrink-0' })}
          <span class="truncate">${escapeHtml(node.error)}</span>
        </div>
        <button
          type="button"
          data-node-retry="${escapeHtml(node.path)}"
          class="btn-retry-folder px-1.5 py-0.5 bg-red-600 text-white rounded font-medium hover:bg-red-700 text-[10px] flex-shrink-0 transition-colors"
        >
          Réessayer
        </button>
      </div>
    `;
  }

  return `
    <div
      role="treeitem"
      tabindex="${isSelected ? '0' : '-1'}"
      data-node-path="${escapeHtml(node.path)}"
      data-node-type="${escapeHtml(node.type)}"
      aria-selected="${isSelected ? 'true' : 'false'}"
      aria-level="${level + 1}"
      aria-label="${escapeHtml(node.name)}"
      ${expandedAttr}
      class="tree-node-item group flex flex-col focus:outline-none focus-visible:ring-1 focus-visible:ring-blue-500 rounded"
    >
      <div
        class="flex items-center gap-1.5 py-1 px-1.5 rounded cursor-pointer transition-colors duration-100 text-xs select-none ${selectedClasses}"
        style="padding-left: ${indentPx}px;"
      >
        ${toggleBtnHtml}
        ${iconHtml}
        <span class="truncate flex-1 tracking-tight">${escapeHtml(node.name)}</span>
        ${node.size !== undefined && !isDir ? `<span class="text-[10px] text-slate-400 group-hover:text-slate-500 font-normal flex-shrink-0 ml-2">${formatFileSize(node.size)}</span>` : ''}
      </div>
      ${errorHtml}
    </div>
  `;
}

export function renderTreeView(visibleNodes = [], selectedPath = null) {
  if (visibleNodes.length === 0) {
    return `
      <div class="text-center py-10 text-slate-400 p-4">
        ${icons.folder({ size: 32, className: 'mx-auto mb-2 opacity-40 text-slate-400' })}
        <p class="font-normal text-xs">Aucun élément dans cette arborescence</p>
      </div>
    `;
  }

  return `
    <div
      id="tree-root"
      role="tree"
      aria-label="Arborescence du dossier"
      class="space-y-0.5 pb-4"
    >
      ${visibleNodes.map((node) => renderTreeNode(node, node.path === selectedPath)).join('')}
    </div>
  `;
}

export function renderPreviewPanel(selectedItem, previewState = { status: 'idle' }, objectUrl = null) {
  if (!selectedItem) {
    return `
      <div id="preview-panel" class="h-full flex flex-col items-center justify-center text-center p-6 bg-white rounded-lg border border-slate-200/80">
        <div class="p-3 bg-slate-100 rounded-lg mb-3 text-slate-400">
          ${icons.file({ size: 32 })}
        </div>
        <p class="font-medium text-slate-700 text-sm">Aucun fichier sélectionné</p>
        <p class="text-xs text-slate-400 mt-1 max-w-xs">Sélectionnez un fichier dans l'arborescence pour afficher immédiatement sa prévisualisation.</p>
      </div>
    `;
  }

  if (selectedItem.type === 'directory' || previewState.status === 'folder') {
    return `
      <div id="preview-panel" class="h-full flex flex-col p-5 bg-white rounded-lg border border-slate-200/80 overflow-y-auto">
        <div class="flex items-center gap-3 pb-3 border-b border-slate-100">
          <div class="p-2.5 rounded-lg bg-amber-50 text-amber-600 flex-shrink-0">
            ${icons.folderOpen({ size: 24 })}
          </div>
          <div class="min-w-0 flex-1">
            <h3 class="font-semibold text-slate-900 text-sm truncate">${escapeHtml(selectedItem.name)}</h3>
            <span class="inline-block text-[10px] font-medium uppercase tracking-wider text-amber-800 px-1.5 py-0.5 rounded bg-amber-50 border border-amber-200/60">Dossier</span>
          </div>
        </div>

        <div class="mt-4 space-y-2 text-xs">
          <div class="flex items-center justify-between p-2.5 rounded bg-slate-50 border border-slate-100">
            <span class="text-slate-500 font-medium">Type</span>
            <span class="font-medium text-slate-800">Dossier de fichiers</span>
          </div>
          <div class="flex flex-col gap-1 p-2.5 rounded bg-slate-50 border border-slate-100">
            <span class="text-slate-500 font-medium">Chemin d'accès</span>
            <span class="font-mono text-[11px] text-slate-800 break-all">${escapeHtml(selectedItem.path)}</span>
          </div>
        </div>

        <div class="mt-6 p-3 rounded bg-blue-50/60 border border-blue-100 text-xs text-blue-900 flex items-start gap-2">
          ${icons.folder({ size: 16, className: 'text-blue-600 flex-shrink-0 mt-0.5' })}
          <span>Cliquez sur la flèche ou double-cliquez pour développer le contenu de ce dossier dans l'arborescence.</span>
        </div>
      </div>
    `;
  }

  if (previewState.status === 'loading') {
    return `
      <div id="preview-panel" class="h-full flex flex-col items-center justify-center text-center p-6 bg-white rounded-lg border border-slate-200/80">
        <div class="animate-spin text-blue-600 mb-3">
          ${icons.loader({ size: 28 })}
        </div>
        <p class="font-medium text-slate-800 text-xs">Chargement de la prévisualisation...</p>
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
        <div class="flex-1 flex items-center justify-center p-3 bg-slate-900/95 rounded-lg border border-slate-800 overflow-hidden">
          <img
            src="${objectUrl}"
            alt="${escapeHtml(selectedItem.name)}"
            class="max-w-full max-h-full object-contain rounded shadow-sm"
          />
        </div>
      </div>
    `;
  } else if (preview.kind === 'audio' && objectUrl) {
    previewBodyHtml = `
      <div class="mt-3 flex-1 flex flex-col justify-center items-center p-6 bg-slate-900 rounded-lg border border-slate-800 text-slate-100 gap-4">
        <p class="text-[10px] font-semibold text-slate-400 uppercase tracking-wider self-start">Aperçu audio</p>
        <div class="p-3.5 bg-blue-600/20 text-blue-400 rounded-full border border-blue-500/30">
          ${icons.music({ size: 36 })}
        </div>
        <div class="text-center">
          <p class="font-medium text-xs text-slate-200">${escapeHtml(selectedItem.name)}</p>
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
        <div class="flex-1 flex items-center justify-center p-2 bg-black rounded-lg border border-slate-800 overflow-hidden">
          <video
            controls
            src="${objectUrl}"
            class="max-w-full max-h-full rounded"
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
          class="w-full flex-1 rounded-lg border border-slate-200 bg-slate-50 overflow-hidden"
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
          class="w-full flex-1 overflow-auto rounded-lg border border-slate-200 bg-slate-100 p-2 shadow-inner"
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
          <div class="mb-2 p-2 rounded-lg bg-amber-50 border border-amber-200 text-[11px] font-medium text-amber-900 flex items-center gap-2 flex-shrink-0" id="preview-truncated-warning">
            ${icons.alertCircle({ size: 15, className: 'text-amber-600 flex-shrink-0' })}
            <span>Aperçu limité au premier mégaoctet — taille totale : ${formatFileSize(totalSize)}</span>
          </div>
        ` : ''}
        <p class="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
          ${preview.kind === 'word' ? 'Aperçu Document Word' : 'Aperçu contenu'}
        </p>
        ${content === '' ? `
          <div class="p-4 bg-slate-50 rounded-lg border border-slate-200 text-xs text-slate-500 italic">
            Ce fichier est vide.
          </div>
        ` : `
          <pre
            class="flex-1 text-xs rounded-lg p-3 overflow-auto bg-slate-900 text-slate-100 font-mono leading-relaxed shadow-inner border border-slate-800 min-h-0"
            aria-label="Source code preview for ${escapeHtml(selectedItem.name)}"
          ><code>${highlightedCode}</code></pre>
        `}
      </div>
    `;
  } else if (preview.kind === 'unsupported-word' || previewState.status === 'unsupported-word') {
    previewBodyHtml = `
      <div class="mt-3 p-3 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-900 flex items-start gap-2">
        ${icons.alertCircle({ size: 16, className: 'text-amber-600 flex-shrink-0 mt-0.5' })}
        <div>
          <p class="font-semibold text-xs">Format Word hérité (.doc)</p>
          <p class="mt-0.5 text-[11px] text-amber-800">Les fichiers .doc ne peuvent pas être prévisualisés directement. Téléchargez le fichier pour l'ouvrir dans Microsoft Word.</p>
        </div>
      </div>
    `;
  } else if (preview.kind === 'word-error' || previewState.status === 'word-error' || previewState.status === 'error') {
    previewBodyHtml = `
      <div class="mt-3 p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-red-900 flex items-start gap-2">
        ${icons.alertCircle({ size: 16, className: 'text-red-600 flex-shrink-0 mt-0.5' })}
        <div>
          <p class="font-semibold text-xs">Erreur de lecture</p>
          <p class="mt-0.5 text-[11px] text-red-800">Impossible de lire le contenu de ce fichier. Il est peut-être corrompu ou protégé.</p>
        </div>
      </div>
    `;
  } else {
    previewBodyHtml = `
      <div class="mt-3 p-3 rounded-lg bg-slate-100 border border-slate-200 text-xs text-slate-600 flex items-start gap-2">
        ${icons.alertCircle({ size: 16, className: 'text-slate-400 flex-shrink-0 mt-0.5' })}
        <div>
          <p class="font-semibold text-xs">Format non pris en charge</p>
          <p class="mt-0.5 text-[11px] text-slate-500">Aucun aperçu disponible dans l'application pour ce type de fichier.</p>
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
        : icons.fileText({ size: 20, className: 'text-blue-600' });

  const ext = getFileExtension(selectedItem.name);

  return `
    <div id="preview-panel" class="h-full flex flex-col p-4 bg-white rounded-lg border border-slate-200/80 overflow-hidden">
      <!-- File Header Bar -->
      <div class="flex items-center justify-between gap-3 pb-3 border-b border-slate-100 flex-shrink-0">
        <div class="flex items-center gap-2.5 min-w-0">
          <div class="p-2 rounded bg-slate-100 flex-shrink-0">
            ${headerIcon}
          </div>
          <div class="min-w-0 flex-1">
            <div class="flex items-center gap-2">
              <h3 class="font-semibold text-slate-900 text-xs truncate max-w-sm" title="${escapeHtml(selectedItem.name)}">${escapeHtml(selectedItem.name)}</h3>
              <span class="text-[10px] font-mono font-medium px-1.5 py-0.2 bg-slate-100 text-slate-600 rounded border border-slate-200/80 flex-shrink-0">${ext}</span>
            </div>
            <p class="text-[11px] text-slate-400 font-mono truncate mt-0.5">
              ${selectedItem.size !== undefined ? `${formatFileSize(selectedItem.size)} • ` : ''}${escapeHtml(selectedItem.path)}
            </p>
          </div>
        </div>

        ${objectUrl ? `
          <a
            href="${objectUrl}"
            download="${escapeHtml(selectedItem.name)}"
            class="flex items-center gap-1.5 px-2.5 py-1.5 rounded bg-blue-600 hover:bg-blue-500 text-[11px] font-medium text-white transition-colors shadow-2xs flex-shrink-0"
            title="Télécharger le fichier"
          >
            ${icons.download({ size: 14 })}
            <span class="hidden sm:inline">Télécharger</span>
          </a>
        ` : ''}
      </div>

      <!-- Preview Body -->
      ${previewBodyHtml}
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
  isHeaderCollapsed = false
) {
  const selectedPath = selectedItem ? selectedItem.path : null;

  let contentHtml = '';

  if (loading) {
    contentHtml = `
      <div class="space-y-1 py-1 px-1">
        ${[1, 2, 3, 4, 5, 6].map(() => `
          <div class="bg-slate-100 rounded p-2 animate-pulse flex items-center gap-2">
            <div class="w-4 h-4 rounded bg-slate-200"></div>
            <div class="h-3 bg-slate-200 rounded flex-1"></div>
          </div>
        `).join('')}
      </div>
    `;
  } else {
    contentHtml = renderTreeView(visibleNodes, selectedPath);
  }

  const headerContentHtml = isHeaderCollapsed
    ? `
      <div class="flex items-center justify-between gap-4 w-full">
        <div class="flex items-center gap-2.5 min-w-0">
          <div class="p-1 bg-blue-600/30 rounded text-blue-400 flex-shrink-0">
            ${icons.folder({ size: 16 })}
          </div>
          <div class="min-w-0 flex items-center gap-2">
            <h1 class="text-xs font-semibold text-slate-100 truncate">${escapeHtml(displayName)}</h1>
            <span class="text-slate-400 text-[11px] font-mono hidden md:inline truncate max-w-xs">(${escapeHtml(currentPath)})</span>
          </div>
        </div>

        <div class="flex items-center gap-1.5 flex-shrink-0">
          <button
            id="btn-refresh-root"
            class="flex items-center gap-1 bg-slate-800 hover:bg-slate-700 text-slate-200 px-2 py-1 rounded text-xs font-medium transition-colors border border-slate-700/60"
            aria-label="Actualiser l'arborescence"
            title="Actualiser l'arborescence"
          >
            ${icons.refreshCw({ size: 13 })}
            <span class="hidden sm:inline">Actualiser</span>
          </button>

          <button
            id="btn-toggle-header"
            class="flex items-center gap-1 bg-slate-800 hover:bg-slate-700 text-slate-200 px-2 py-1 rounded text-xs font-medium transition-colors border border-slate-700/60"
            aria-label="Agrandir l'en-tête"
            title="Agrandir l'en-tête"
          >
            ${icons.chevronDown({ size: 13 })}
            <span class="hidden sm:inline">Agrandir</span>
          </button>

          <button
            id="btn-toggle-panel"
            class="flex items-center gap-1 bg-slate-800 hover:bg-slate-700 text-slate-200 px-2 py-1 rounded text-xs font-medium transition-colors border border-slate-700/60"
            aria-label="${isPanelVisible ? 'Masquer le panneau' : 'Afficher le panneau'}"
            title="${isPanelVisible ? 'Masquer le panneau' : 'Afficher le panneau'}"
          >
            ${isPanelVisible ? icons.eyeOff({ size: 13 }) : icons.eye({ size: 13 })}
            <span class="hidden sm:inline">${isPanelVisible ? 'Masquer' : 'Panneau'}</span>
          </button>

          ${!usingFallback ? `
            <button
              id="btn-open-another"
              class="flex items-center gap-1 bg-blue-600 hover:bg-blue-500 text-white px-2 py-1 rounded text-xs font-medium transition-colors shadow-2xs"
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
          <div class="p-2 bg-blue-600/25 rounded-lg text-blue-400 border border-blue-500/30 flex-shrink-0">
            ${icons.folder({ size: 20 })}
          </div>
          <div class="min-w-0">
            <div class="flex items-center gap-2">
              <h1 class="text-sm font-bold text-white truncate tracking-tight">${escapeHtml(displayName)}</h1>
              <span class="text-[10px] font-mono uppercase bg-blue-900/60 text-blue-300 px-1.5 py-0.5 rounded border border-blue-700/50">Explorateur</span>
            </div>
            <div class="text-xs text-slate-400 truncate max-w-lg mt-0.5 flex items-center font-mono">
              ${renderBreadcrumbs(currentPath)}
            </div>
          </div>
        </div>

        <div class="flex items-center gap-1.5 flex-shrink-0">
          <button
            id="btn-refresh-root"
            class="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 px-2.5 py-1.5 rounded text-xs font-medium transition-colors border border-slate-700/60"
            aria-label="Actualiser l'arborescence"
            title="Actualiser l'arborescence"
          >
            ${icons.refreshCw({ size: 14 })}
            <span class="hidden sm:inline">Actualiser</span>
          </button>

          <button
            id="btn-toggle-header"
            class="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 px-2.5 py-1.5 rounded text-xs font-medium transition-colors border border-slate-700/60"
            aria-label="Réduire l'en-tête"
            title="Réduire l'en-tête"
          >
            ${icons.chevronUp({ size: 14 })}
            <span class="hidden sm:inline">Réduire</span>
          </button>

          <button
            id="btn-toggle-panel"
            class="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 px-2.5 py-1.5 rounded text-xs font-medium transition-colors border border-slate-700/60"
            aria-label="${isPanelVisible ? 'Masquer le panneau de prévisualisation' : 'Afficher le panneau de prévisualisation'}"
            title="${isPanelVisible ? 'Masquer le panneau' : 'Afficher le panneau'}"
          >
            ${isPanelVisible ? icons.eyeOff({ size: 14 }) : icons.eye({ size: 14 })}
            <span class="hidden sm:inline">${isPanelVisible ? 'Masquer panneau' : 'Afficher panneau'}</span>
          </button>

          ${!usingFallback ? `
            <button
              id="btn-open-another"
              class="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-500 text-white px-2.5 py-1.5 rounded text-xs font-medium transition-colors shadow-2xs"
            >
              ${icons.folderTree({ size: 14 })}
              <span class="hidden sm:inline">Changer de dossier</span>
            </button>
          ` : ''}
        </div>
      </div>
    `;

  return `
    <div class="h-screen w-screen flex flex-col bg-slate-100 overflow-hidden font-sans">
      <!-- Fixed Header Bar -->
      <header id="app-header" class="bg-slate-900 text-slate-100 px-4 ${isHeaderCollapsed ? 'py-2.5' : 'py-3'} border-b border-slate-800 shadow-sm transition-all duration-150 z-20 flex-shrink-0">
        ${headerContentHtml}
      </header>

      <!-- Main Layout Content -->
      <div class="flex-1 w-full p-2 flex flex-row overflow-hidden gap-1.5">
        <!-- Zone 1: Unique TreeView Navigation -->
        <div id="file-list-container" class="flex flex-col min-w-[240px] max-w-[600px] h-full overflow-hidden bg-white rounded-lg border border-slate-200/90 shadow-2xs">
          <!-- Search input bar -->
          <div class="p-2 border-b border-slate-100 flex-shrink-0 bg-slate-50/50">
            <div class="relative">
              <div class="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400">
                ${icons.search({ size: 14 })}
              </div>
              <input
                type="text"
                id="input-search"
                placeholder="Rechercher dans les éléments chargés..."
                value="${escapeHtml(search)}"
                class="w-full pl-8 pr-7 py-1.5 bg-white rounded border border-slate-200 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition-colors"
              />
              ${search ? `
                <button id="btn-clear-search" aria-label="Effacer la recherche" class="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                  ${icons.x({ size: 13 })}
                </button>
              ` : ''}
            </div>
          </div>

          ${error ? `
            <div class="m-2 p-2 bg-amber-50 border border-amber-200 rounded flex items-start justify-between gap-2 flex-shrink-0 text-xs">
              <div class="flex items-start gap-1.5">
                ${icons.alertCircle({ size: 14, className: 'text-amber-600 flex-shrink-0 mt-0.5' })}
                <p class="text-[11px] text-amber-900 font-medium">${escapeHtml(error)}</p>
              </div>
              <button id="btn-dismiss-error" aria-label="Fermer l'alerte" class="text-amber-700 hover:text-amber-900 text-[11px] font-semibold underline flex-shrink-0">
                OK
              </button>
            </div>
          ` : ''}

          <!-- Tree View Scroll Container -->
          <div id="file-list" class="flex-1 overflow-y-auto p-1.5">
            ${contentHtml}
          </div>
        </div>

        <!-- Zone 2: Draggable Resizer Separator -->
        ${isPanelVisible ? `
          <div
            id="resizer"
            role="separator"
            aria-orientation="vertical"
            aria-label="Redimensionner le panneau"
            tabindex="0"
            class="hidden md:flex w-2 cursor-col-resize items-center justify-center group flex-shrink-0 select-none px-0.5 hover:bg-blue-500/10 active:bg-blue-600/20 rounded transition-colors"
          >
            <div class="w-1 h-12 bg-slate-300 rounded-full group-hover:bg-blue-500 group-active:bg-blue-600 transition-colors flex items-center justify-center">
              ${icons.gripVertical({ size: 10, className: 'text-white opacity-0 group-hover:opacity-100 transition-opacity' })}
            </div>
          </div>
        ` : ''}

        <!-- Zone 3: Integrated Preview Side Panel -->
        <div
          id="preview-panel-container"
          class="${isPanelVisible ? 'flex' : 'hidden'} flex-col min-w-[300px] ${isPanelVisible ? 'w-full md:w-auto' : ''} flex-1 h-full overflow-hidden"
          style="${isPanelVisible ? `width: ${panelWidth}px; flex: 1 1 ${panelWidth}px;` : ''}"
        >
          ${renderPreviewPanel(selectedItem, previewState, objectUrl)}
        </div>
      </div>
    </div>
  `;
}

function highlightCode(code, lang) {
  const grammar = Prism.languages[lang] || Prism.languages.markup;
  try {
    return Prism.highlight(code, grammar, lang);
  } catch {
    return escapeHtml(code);
  }
}

function escapeHtml(str) {
  if (typeof str !== 'string') return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
