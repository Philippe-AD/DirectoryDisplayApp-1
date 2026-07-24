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

export function renderWelcomeScreen(error) {
  return `
    <div class="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50">
      <div class="max-w-2xl mx-auto px-4 pt-20 pb-12">
        <div class="text-center mb-12">
          <div class="inline-flex items-center justify-center w-16 h-16 bg-blue-600 rounded-3xl shadow-lg shadow-blue-600/20 mb-6">
            ${icons.hardDrive({ size: 32, className: 'text-white' })}
          </div>
          <h1 class="text-4xl font-bold text-gray-900 tracking-tight">Explorateur de répertoires</h1>
          <p class="text-gray-500 mt-3 text-lg">Parcourez et prévisualisez n'importe quel dossier de votre ordinateur</p>
        </div>

        <div class="bg-white rounded-3xl border border-gray-100 shadow-xl p-8 space-y-6">
          <div class="space-y-4">
            <div class="flex items-center gap-3.5">
              <div class="p-3 bg-blue-50 rounded-2xl">
                ${icons.folderOpen({ size: 28, className: 'text-blue-600' })}
              </div>
              <div>
                <h2 class="text-lg font-semibold text-gray-900">Ouvrir un dossier</h2>
                <p class="text-sm text-gray-500">Sélectionnez n'importe quel dossier local pour afficher son contenu</p>
              </div>
            </div>
            <button
              id="btn-open-folder"
              class="w-full flex items-center justify-center gap-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-4 text-base rounded-2xl transition-all shadow-md shadow-blue-600/20 active:scale-[0.99]"
            >
              ${icons.folderOpen({ size: 22 })}
              Ouvrir un dossier
            </button>
          </div>

          ${error ? `
            <div class="mt-5 p-4 bg-red-50 rounded-2xl flex flex-col gap-3">
              <div class="flex items-start gap-3">
                ${icons.alertCircle({ size: 20, className: 'text-red-600 flex-shrink-0 mt-0.5' })}
                <p class="text-sm text-red-700">${escapeHtml(error)}</p>
              </div>
              <button
                id="btn-use-fallback"
                class="self-start text-xs font-semibold text-red-700 hover:text-red-900 underline transition-colors"
              >
                Utiliser le sélecteur alternatif
              </button>
            </div>
          ` : ''}
        </div>
      </div>
    </div>
  `;
}

export function renderFallbackUploadScreen() {
  return `
    <div class="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50">
      <div class="max-w-2xl mx-auto px-4 pt-20 pb-12">
        <div class="text-center mb-12">
          <div class="inline-flex items-center justify-center w-16 h-16 bg-blue-600 rounded-3xl shadow-lg shadow-blue-600/20 mb-6">
            ${icons.hardDrive({ size: 32, className: 'text-white' })}
          </div>
          <h1 class="text-4xl font-bold text-gray-900 tracking-tight">File Explorer</h1>
          <p class="text-gray-500 mt-3 text-lg">Choose files from your computer</p>
        </div>

        <div class="bg-white rounded-3xl border border-gray-100 shadow-xl p-8">
          <label class="w-full flex flex-col items-center justify-center gap-3 border-2 border-dashed border-gray-200 hover:border-blue-400 rounded-2xl py-12 cursor-pointer transition-colors group">
            ${icons.upload({ size: 32, className: 'text-gray-400 group-hover:text-blue-600 transition-colors' })}
            <span class="font-semibold text-gray-700 group-hover:text-blue-600 transition-colors">Choose a folder or files</span>
            <span class="text-sm text-gray-400">Files stay on your computer</span>
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
            class="mt-4 text-sm text-gray-500 hover:text-gray-700 transition-colors"
          >
            Back
          </button>
        </div>
      </div>
    </div>
  `;
}

export function renderFileCard(item, isSelected = false) {
  const color = getColorForPath(item.path);
  const isDocument = item.type === 'file' && (/\.(pdf|docx?)$/i.test(item.name));
  const isImage = item.type === 'file' && (item.file ? isImageFile(item.file) : /\.(png|jpe?g|gif|webp|svg|bmp|ico|avif|tiff|apng)$/i.test(item.name));
  const isAudio = item.type === 'file' && (item.file ? isAudioFile(item.file) : /\.(mp3|wav|ogg|m4a|aac|flac|wma|opus|mid|midi|amr|aiff|alac)$/i.test(item.name));
  const isVideo = item.type === 'file' && (item.file ? isVideoFile(item.file) : /\.(mp4|webm|ogv|mov|mkv|avi|wmv|m4v|3gp|flv)$/i.test(item.name));
  const icon = item.type === 'directory'
    ? icons.folderOpen({ size: 20, className: color.text })
    : isImage
      ? icons.image({ size: 20, className: color.text })
      : isAudio
        ? icons.music({ size: 20, className: color.text })
        : isVideo
          ? icons.video({ size: 20, className: color.text })
          : isDocument
            ? icons.fileText({ size: 20, className: color.text })
            : icons.file({ size: 20, className: color.text });

  const selectedClasses = isSelected
    ? 'ring-2 ring-blue-500 bg-blue-50/70 border-blue-300 shadow-sm'
    : 'bg-white border-gray-100 hover:border-gray-200 hover:shadow-md';

  return `
    <button
      role="option"
      aria-selected="${isSelected ? 'true' : 'false'}"
      data-item-path="${escapeHtml(item.path)}"
      data-item-type="${escapeHtml(item.type)}"
      class="btn-file-card group w-full text-left rounded-2xl border p-4 transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-blue-500 ${selectedClasses}"
    >
      <div class="flex items-center gap-3.5">
        <div class="p-2.5 rounded-xl ${color.light} group-hover:scale-105 transition-transform flex-shrink-0">
          ${icon}
        </div>
        <div class="flex-1 min-w-0">
          <p class="font-semibold text-gray-900 text-sm truncate">${escapeHtml(item.name)}</p>
          <p class="text-xs text-gray-500 mt-0.5">
            ${item.type === 'directory' ? 'Dossier' : getFileExtension(item.name)}
            ${item.size !== undefined ? ` • ${formatFileSize(item.size)}` : ''}
          </p>
        </div>
        ${icons.chevronRight({ size: 16, className: 'text-gray-300 group-hover:text-gray-400 flex-shrink-0 transition-colors' })}
      </div>
    </button>
  `;
}

export function renderPreviewPanel(selectedItem, previewState = { status: 'idle' }, objectUrl = null) {
  if (!selectedItem) {
    return `
      <div id="preview-panel" class="h-full flex flex-col items-center justify-center text-center p-8 bg-white rounded-3xl border border-gray-200/80 shadow-sm">
        <div class="p-4 bg-gray-50 rounded-2xl mb-4 text-gray-400">
          ${icons.file({ size: 36 })}
        </div>
        <p class="font-semibold text-gray-700 text-base">Aucun fichier sélectionné</p>
        <p class="text-xs text-gray-400 mt-1.5 max-w-xs">Cliquez sur un fichier dans la liste pour afficher sa prévisualisation immédiate.</p>
      </div>
    `;
  }

  if (selectedItem.type === 'directory' || previewState.status === 'folder') {
    const color = getColorForPath(selectedItem.path);
    return `
      <div id="preview-panel" class="h-full flex flex-col p-6 bg-white rounded-3xl border border-gray-200/80 shadow-sm overflow-y-auto">
        <div class="flex items-center gap-3.5 pb-4 border-b border-gray-100">
          <div class="p-3.5 rounded-2xl ${color.light} ${color.text}">
            ${icons.folderOpen({ size: 28 })}
          </div>
          <div class="min-w-0 flex-1">
            <h3 class="font-bold text-gray-900 text-lg truncate">${escapeHtml(selectedItem.name)}</h3>
            <span class="inline-block text-xs font-semibold uppercase tracking-wider text-blue-600 px-2 py-0.5 rounded bg-blue-50">Dossier</span>
          </div>
        </div>

        <div class="mt-6 space-y-3">
          <div class="flex items-center justify-between p-3.5 rounded-2xl bg-gray-50 text-sm">
            <span class="text-gray-500 font-medium">Type</span>
            <span class="font-semibold text-gray-900">Dossier de fichiers</span>
          </div>
          <div class="flex flex-col gap-1 p-3.5 rounded-2xl bg-gray-50 text-sm">
            <span class="text-gray-500 font-medium">Chemin d'accès</span>
            <span class="font-mono text-xs text-gray-800 break-all">${escapeHtml(selectedItem.path)}</span>
          </div>
        </div>

        <div class="mt-8 p-4 rounded-2xl bg-blue-50/70 border border-blue-100 text-xs text-blue-900 flex items-start gap-2.5">
          ${icons.folder({ size: 18, className: 'text-blue-600 flex-shrink-0 mt-0.5' })}
          <span>Double-cliquez sur ce dossier dans la liste pour y naviguer.</span>
        </div>
      </div>
    `;
  }

  if (previewState.status === 'loading') {
    return `
      <div id="preview-panel" class="h-full flex flex-col items-center justify-center text-center p-8 bg-white rounded-3xl border border-gray-200/80 shadow-sm">
        <div class="animate-spin text-blue-600 mb-4">
          ${icons.loader({ size: 36 })}
        </div>
        <p class="font-semibold text-gray-800 text-sm">Chargement de la prévisualisation...</p>
        <p class="text-xs text-gray-400 mt-1 truncate max-w-xs">${escapeHtml(selectedItem.name)}</p>
      </div>
    `;
  }

  const color = getColorForPath(selectedItem.path);
  const preview = previewState.preview || {};

  let previewBodyHtml = '';

  if (preview.kind === 'image' && objectUrl) {
    previewBodyHtml = `
      <div class="mt-4">
        <p class="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Aperçu image</p>
        <div class="flex items-center justify-center p-4 bg-gray-100 rounded-2xl border border-gray-200 overflow-hidden max-h-[50vh]">
          <img
            src="${objectUrl}"
            alt="${escapeHtml(selectedItem.name)}"
            class="max-w-full max-h-[45vh] object-contain rounded-xl shadow-sm"
          />
        </div>
      </div>
    `;
  } else if (preview.kind === 'audio' && objectUrl) {
    previewBodyHtml = `
      <div class="mt-4">
        <p class="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Aperçu audio</p>
        <div class="flex flex-col items-center justify-center p-6 bg-slate-900 rounded-2xl border border-gray-200 shadow-sm gap-4">
          <div class="p-4 bg-blue-600/20 text-blue-400 rounded-full">
            ${icons.music({ size: 40 })}
          </div>
          <audio
            controls
            src="${objectUrl}"
            class="w-full"
            preload="metadata"
          >
            Votre navigateur ne supporte pas la lecture audio.
          </audio>
        </div>
      </div>
    `;
  } else if (preview.kind === 'video' && objectUrl) {
    previewBodyHtml = `
      <div class="mt-4">
        <p class="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Aperçu vidéo</p>
        <div class="flex items-center justify-center p-2 bg-black rounded-2xl border border-gray-200 overflow-hidden max-h-[50vh]">
          <video
            controls
            src="${objectUrl}"
            class="max-w-full max-h-[45vh] rounded-xl"
            preload="metadata"
          >
            Votre navigateur ne supporte pas la lecture vidéo.
          </video>
        </div>
      </div>
    `;
  } else if (preview.kind === 'pdf' && objectUrl) {
    previewBodyHtml = `
      <div class="mt-4">
        <p class="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Aperçu PDF</p>
        <object
          data="${objectUrl}"
          type="application/pdf"
          title="Prévisualisation PDF de ${escapeHtml(selectedItem.name)}"
          class="w-full h-[50vh] rounded-2xl border border-gray-200 bg-gray-50 overflow-hidden"
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
  } else if (preview.kind === 'text' || preview.kind === 'word') {
    const content = preview.content ?? '';
    const syntaxLang = preview.kind === 'text' ? getSyntaxLanguage(selectedItem.name) ?? 'markup' : 'markup';
    const highlightedCode = highlightCode(content || '(fichier vide)', syntaxLang);
    const isTruncated = preview.kind === 'text' && Boolean(preview.truncated);
    const totalSize = preview.totalSize ?? selectedItem.size;

    previewBodyHtml = `
      <div class="mt-4">
        ${isTruncated ? `
          <div class="mb-3 p-3 rounded-2xl bg-amber-50 border border-amber-200/80 text-xs font-medium text-amber-900 flex items-center gap-2 shadow-sm" id="preview-truncated-warning">
            ${icons.alertCircle({ size: 18, className: 'text-amber-600 flex-shrink-0' })}
            <span>Aperçu limité au premier mégaoctet — taille totale : ${formatFileSize(totalSize)}</span>
          </div>
        ` : ''}
        <p class="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
          ${preview.kind === 'word' ? 'Aperçu Document Word' : 'Aperçu contenu'}
        </p>
        <pre
          class="text-xs rounded-2xl p-4 max-h-[50vh] overflow-auto bg-gray-900 text-gray-100 font-mono leading-relaxed shadow-inner"
          aria-label="Source code preview for ${escapeHtml(selectedItem.name)}"
        ><code>${highlightedCode}</code></pre>
      </div>
    `;
  } else if (preview.kind === 'unsupported-word' || previewState.status === 'unsupported-word') {
    previewBodyHtml = `
      <div class="mt-4 p-4 rounded-2xl bg-amber-50 border border-amber-200 text-xs text-amber-900 flex items-start gap-2.5">
        ${icons.alertCircle({ size: 18, className: 'text-amber-600 flex-shrink-0 mt-0.5' })}
        <div>
          <p class="font-semibold">Format Word hérité (.doc)</p>
          <p class="mt-1 text-amber-800">Les fichiers .doc ne peuvent pas être prévisualisés directement. Téléchargez le fichier pour l'ouvrir dans Microsoft Word.</p>
        </div>
      </div>
    `;
  } else if (preview.kind === 'word-error' || previewState.status === 'word-error' || previewState.status === 'error') {
    previewBodyHtml = `
      <div class="mt-4 p-4 rounded-2xl bg-red-50 border border-red-200 text-xs text-red-900 flex items-start gap-2.5">
        ${icons.alertCircle({ size: 18, className: 'text-red-600 flex-shrink-0 mt-0.5' })}
        <div>
          <p class="font-semibold">Erreur de lecture</p>
          <p class="mt-1 text-red-800">Impossible de lire le contenu de ce fichier. Il est peut-être corrompu ou protégé.</p>
        </div>
      </div>
    `;
  } else {
    previewBodyHtml = `
      <div class="mt-4 p-4 rounded-2xl bg-gray-100 border border-gray-200 text-xs text-gray-600 flex items-start gap-2.5">
        ${icons.alertCircle({ size: 18, className: 'text-gray-400 flex-shrink-0 mt-0.5' })}
        <div>
          <p class="font-semibold">Format non pris en charge</p>
          <p class="mt-1 text-gray-500">Aucun aperçu disponible dans l'application pour ce type de fichier.</p>
        </div>
      </div>
    `;
  }

  const isImageHeader = isImageFile({ name: selectedItem.name, type: '' });
  const isAudioHeader = isAudioFile({ name: selectedItem.name, type: '' });
  const isVideoHeader = isVideoFile({ name: selectedItem.name, type: '' });

  const headerIcon = isImageHeader
    ? icons.image({ size: 24 })
    : isAudioHeader
      ? icons.music({ size: 24 })
      : isVideoHeader
        ? icons.video({ size: 24 })
        : icons.fileText({ size: 24 });

  return `
    <div id="preview-panel" class="h-full flex flex-col p-6 bg-white rounded-3xl border border-gray-200/80 shadow-sm overflow-y-auto">
      <div class="flex items-start gap-3.5 pb-4 border-b border-gray-100">
        <div class="p-3 rounded-2xl ${color.light} ${color.text} flex-shrink-0">
          ${headerIcon}
        </div>
        <div class="min-w-0 flex-1">
          <h3 class="font-bold text-gray-900 text-base truncate">${escapeHtml(selectedItem.name)}</h3>
          <p class="text-xs text-gray-500 mt-0.5">
            ${getFileExtension(selectedItem.name)}
            ${selectedItem.size !== undefined ? ` • ${formatFileSize(selectedItem.size)}` : ''}
          </p>
        </div>
      </div>

      <div class="mt-4 space-y-2">
        <div class="flex items-center justify-between p-2.5 rounded-xl bg-gray-50 text-xs">
          <span class="text-gray-500 font-medium">Chemin</span>
          <span class="font-mono text-gray-800 truncate max-w-[180px]">${escapeHtml(selectedItem.path)}</span>
        </div>
      </div>

      ${previewBodyHtml}

      ${objectUrl ? `
        <div class="mt-6 pt-4 border-t border-gray-100">
          <a
            href="${objectUrl}"
            download="${escapeHtml(selectedItem.name)}"
            class="inline-flex items-center justify-center gap-2 w-full rounded-2xl bg-blue-600 px-4 py-3 text-xs font-semibold text-white hover:bg-blue-700 transition-colors shadow-md shadow-blue-600/20"
          >
            ${icons.download({ size: 16 })}
            Télécharger le fichier
          </a>
        </div>
      ` : ''}
    </div>
  `;
}

export function renderMainLayout(
  displayName,
  currentPath,
  crumbs,
  items,
  loading,
  search,
  usingFallback,
  error = null,
  selectedItem = null,
  previewState = { status: 'idle' },
  objectUrl = null,
  isPanelVisible = true,
  panelWidth = 380,
  isHeaderCollapsed = false
) {
  const color = getColorForPath(currentPath || '/files');
  const selectedPath = selectedItem ? selectedItem.path : null;

  const crumbsHtml = crumbs.length > 1 ? `
    <div class="flex items-center flex-wrap gap-1 mt-3 text-white/80 text-xs">
      ${crumbs.map((crumb, i) => `
        <span class="flex items-center gap-1">
          ${i > 0 ? icons.chevronRight({ size: 12, className: 'text-white/50' }) : ''}
          <button
            data-crumb-index="${i}"
            class="btn-crumb hover:text-white transition-colors ${i === crumbs.length - 1 ? 'text-white font-semibold' : ''}"
          >
            ${escapeHtml(crumb.name)}
          </button>
        </span>
      `).join('')}
    </div>
  ` : '';

  let contentHtml = '';

  if (loading) {
    contentHtml = `
      <div class="space-y-3">
        ${[1, 2, 3, 4].map(() => `
          <div class="bg-white rounded-2xl border border-gray-100 p-4 animate-pulse">
            <div class="flex gap-4">
              <div class="w-10 h-10 rounded-xl bg-gray-200"></div>
              <div class="flex-1 space-y-2 pt-1">
                <div class="h-4 bg-gray-200 rounded w-2/3"></div>
                <div class="h-3 bg-gray-100 rounded w-1/2"></div>
              </div>
            </div>
          </div>
        `).join('')}
      </div>
    `;
  } else if (items.length === 0) {
    contentHtml = `
      <div class="text-center py-16 text-gray-400 bg-white rounded-3xl border border-gray-200/80">
        ${icons.folder({ size: 40, className: 'mx-auto mb-3 opacity-30' })}
        <p class="font-medium text-sm">Aucun fichier ou dossier trouvé</p>
        ${search ? '<p class="text-xs mt-1 text-gray-400">Essayez une recherche différente.</p>' : ''}
      </div>
    `;
  } else {
    contentHtml = `
      <div class="space-y-2 pb-6" role="listbox" aria-label="Fichiers et dossiers">
        <p class="text-xs font-semibold text-gray-400 uppercase tracking-widest px-1 mb-2">
          ${items.length} ${items.length === 1 ? 'élément' : 'éléments'}
        </p>
        ${items.map(item => renderFileCard(item, item.path === selectedPath)).join('')}
      </div>
    `;
  }

  const headerContentHtml = isHeaderCollapsed
    ? `
      <div class="max-w-7xl mx-auto flex items-center justify-between gap-4">
        <div class="flex items-center gap-3 min-w-0">
          ${crumbs.length > 1 ? `
            <button
              id="btn-go-back"
              class="flex items-center gap-1.5 bg-white/10 hover:bg-white/20 text-white text-xs font-semibold px-2.5 py-1 rounded-lg transition-colors flex-shrink-0"
            >
              ${icons.arrowLeft({ size: 14 })}
              <span class="hidden sm:inline">Retour</span>
            </button>
          ` : ''}
          <div class="p-1.5 bg-white/20 rounded-lg text-white flex-shrink-0">
            ${icons.folder({ size: 18 })}
          </div>
          <div class="min-w-0 flex items-center gap-2">
            <h1 class="text-sm font-bold text-white truncate">${escapeHtml(displayName)}</h1>
            <span class="text-white/60 text-xs hidden md:inline truncate max-w-xs">(${escapeHtml(currentPath)})</span>
          </div>
        </div>

        <div class="flex items-center gap-2 flex-shrink-0">
          <button
            id="btn-toggle-header"
            class="flex items-center gap-1.5 bg-white/20 hover:bg-white/30 text-white px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-white/50"
            aria-label="Agrandir l'en-tête"
            title="Agrandir l'en-tête"
          >
            ${icons.chevronDown({ size: 16 })}
            <span class="hidden sm:inline">Agrandir</span>
          </button>

          <button
            id="btn-toggle-panel"
            class="flex items-center gap-1.5 bg-white/10 hover:bg-white/20 text-white px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-white/50"
            aria-label="${isPanelVisible ? 'Masquer le panneau' : 'Afficher le panneau'}"
            title="${isPanelVisible ? 'Masquer le panneau' : 'Afficher le panneau'}"
          >
            ${isPanelVisible ? icons.eyeOff({ size: 16 }) : icons.eye({ size: 16 })}
            <span class="hidden sm:inline">${isPanelVisible ? 'Masquer' : 'Panneau'}</span>
          </button>

          ${!usingFallback ? `
            <button
              id="btn-open-another"
              class="flex items-center gap-1.5 bg-white text-gray-800 hover:bg-gray-100 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors shadow-sm"
            >
              ${icons.folderTree({ size: 16, className: 'text-blue-600' })}
              <span class="hidden sm:inline">Changer dossier</span>
            </button>
          ` : ''}
        </div>
      </div>
    `
    : `
      <div class="max-w-7xl mx-auto flex items-center justify-between gap-4">
        <div class="flex items-center gap-3">
          ${crumbs.length > 1 ? `
            <button
              id="btn-go-back"
              class="flex items-center gap-1.5 bg-white/10 hover:bg-white/20 text-white text-xs font-semibold px-3 py-2 rounded-xl transition-colors"
            >
              ${icons.arrowLeft({ size: 14 })}
              Retour
            </button>
          ` : ''}
          <div class="p-2.5 bg-white/20 rounded-2xl text-white">
            ${icons.folder({ size: 24 })}
          </div>
          <div class="min-w-0">
            <h1 class="text-xl font-bold text-white truncate">${escapeHtml(displayName)}</h1>
            <p class="text-white/70 text-xs truncate max-w-md">${escapeHtml(currentPath)}</p>
          </div>
        </div>

        <div class="flex items-center gap-2">
          <button
            id="btn-toggle-header"
            class="flex items-center gap-2 bg-white/10 hover:bg-white/20 text-white px-3.5 py-2 rounded-xl text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-white/50"
            aria-label="Réduire l'en-tête"
            title="Réduire l'en-tête"
          >
            ${icons.chevronUp({ size: 16 })}
            <span class="hidden sm:inline">Réduire</span>
          </button>

          <button
            id="btn-toggle-panel"
            class="flex items-center gap-2 bg-white/10 hover:bg-white/20 text-white px-3.5 py-2 rounded-xl text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-white/50"
            aria-label="${isPanelVisible ? 'Masquer le panneau de prévisualisation' : 'Afficher le panneau de prévisualisation'}"
            title="${isPanelVisible ? 'Masquer le panneau' : 'Afficher le panneau'}"
          >
            ${isPanelVisible ? icons.eyeOff({ size: 16 }) : icons.eye({ size: 16 })}
            <span class="hidden sm:inline">${isPanelVisible ? 'Masquer panneau' : 'Afficher panneau'}</span>
          </button>

          ${!usingFallback ? `
            <button
              id="btn-open-another"
              class="flex items-center gap-2 bg-white text-gray-800 hover:bg-gray-100 px-3.5 py-2 rounded-xl text-xs font-semibold transition-colors shadow-sm"
            >
              ${icons.folderTree({ size: 16, className: 'text-blue-600' })}
              <span class="hidden sm:inline">Changer de dossier</span>
            </button>
          ` : ''}
        </div>
      </div>

      <div class="max-w-7xl mx-auto">
        ${crumbsHtml}
      </div>
    `;

  return `
    <div class="h-screen flex flex-col bg-gray-50 overflow-hidden">
      <!-- Fixed Header Bar -->
      <header id="app-header" class="${color.bg} px-6 ${isHeaderCollapsed ? 'py-2.5' : 'pt-5 pb-8'} shadow-md transition-all duration-200 z-20 flex-shrink-0">
        ${headerContentHtml}
      </header>

      <!-- Main Layout Content -->
      <div class="flex-1 max-w-7xl w-full mx-auto px-4 ${isHeaderCollapsed ? 'pt-3' : '-mt-5'} pb-4 flex flex-col md:flex-row gap-0 overflow-hidden">
        <!-- Zone 1: File Navigation & List -->
        <div id="file-list-container" class="flex-1 flex flex-col min-w-[260px] h-full overflow-hidden pr-0 md:pr-1">
          <!-- Search input -->
          <div class="relative mb-3 flex-shrink-0">
            <div class="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
              ${icons.search({ size: 18 })}
            </div>
            <input
              type="text"
              id="input-search"
              placeholder="Rechercher un fichier..."
              value="${escapeHtml(search)}"
              class="w-full pl-11 pr-10 py-3 bg-white rounded-2xl border border-gray-200/80 shadow-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
            />
            ${search ? `
              <button id="btn-clear-search" class="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                ${icons.x({ size: 16 })}
              </button>
            ` : ''}
          </div>

          ${error ? `
            <div class="mb-3 p-3.5 bg-amber-50 border border-amber-200 rounded-2xl flex items-start justify-between gap-3 shadow-sm flex-shrink-0">
              <div class="flex items-start gap-2.5">
                ${icons.alertCircle({ size: 18, className: 'text-amber-600 flex-shrink-0 mt-0.5' })}
                <p class="text-xs text-amber-900 font-medium">${escapeHtml(error)}</p>
              </div>
              <button id="btn-dismiss-error" aria-label="Fermer l'alerte" class="text-amber-700 hover:text-amber-900 text-xs font-semibold underline flex-shrink-0">
                OK
              </button>
            </div>
          ` : ''}

          <!-- File List -->
          <div id="file-list" class="flex-1 overflow-y-auto pr-1">
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
            class="hidden md:flex w-4 cursor-col-resize items-center justify-center group flex-shrink-0 select-none px-0.5"
          >
            <div class="w-1.5 h-16 bg-gray-300/80 rounded-full group-hover:bg-blue-500 group-active:bg-blue-600 transition-colors flex items-center justify-center">
              ${icons.gripVertical({ size: 12, className: 'text-white opacity-0 group-hover:opacity-100 transition-opacity' })}
            </div>
          </div>
        ` : ''}

        <!-- Zone 3: Integrated Preview Side Panel -->
        <div
          id="preview-panel-container"
          class="${isPanelVisible ? 'flex' : 'hidden'} flex-col min-w-[260px] ${isPanelVisible ? 'w-full md:w-auto' : ''} mt-4 md:mt-0 flex-shrink-0 h-full overflow-hidden"
          style="${isPanelVisible ? `width: ${panelWidth}px;` : ''}"
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
