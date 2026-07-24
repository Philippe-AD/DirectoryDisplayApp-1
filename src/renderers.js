import Prism from 'prismjs';
import 'prismjs/themes/prism.css';
import { icons } from './icons';
import { getSyntaxLanguage, isImageFile } from './filePreview';

export const COLOR_PALETTE = [
  { bg: 'bg-blue-600',    light: 'bg-blue-50',    text: 'text-blue-600',    badge: 'bg-blue-100 text-blue-700' },
  { bg: 'bg-emerald-600', light: 'bg-emerald-50', text: 'text-emerald-600', badge: 'bg-emerald-100 text-emerald-700' },
  { bg: 'bg-orange-500',  light: 'bg-orange-50',  text: 'text-orange-600',  badge: 'bg-orange-100 text-orange-700' },
  { bg: 'bg-teal-600',    light: 'bg-teal-50',    text: 'text-teal-600',    badge: 'bg-teal-100 text-teal-700' },
  { bg: 'bg-amber-600',   light: 'bg-amber-50',   text: 'text-amber-600',   badge: 'bg-amber-100 text-amber-700' },
  { bg: 'bg-rose-600',    light: 'bg-rose-50',    text: 'text-rose-600',    badge: 'bg-rose-100 text-rose-700' },
];

export function getColorForPath(path) {
  const hash = path.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
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
          <h1 class="text-4xl font-bold text-gray-900 tracking-tight">File Explorer</h1>
          <p class="text-gray-500 mt-3 text-lg">Browse a folder right on your computer</p>
        </div>

        <div class="bg-white rounded-3xl border border-gray-100 shadow-xl p-8 space-y-6">
          <div class="space-y-3">
            <div class="flex items-center gap-3">
              <div class="p-2.5 bg-blue-50 rounded-xl">
                ${icons.folderOpen({ size: 24, className: 'text-blue-600' })}
              </div>
              <div>
                <h2 class="font-semibold text-gray-900">Ouvrir un dossier</h2>
                <p class="text-sm text-gray-500">Pour vos dossiers personnels (Documents, Images, Projets)</p>
              </div>
            </div>
            <button
              id="btn-open-folder"
              class="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3.5 rounded-2xl transition-colors shadow-md shadow-blue-600/20"
            >
              ${icons.folderOpen({ size: 20 })}
              Ouvrir un dossier (Explorateur rapide)
            </button>
          </div>

          <div class="border-t border-gray-100 pt-6 space-y-3">
            <div class="flex items-center gap-3">
              <div class="p-2.5 bg-emerald-50 rounded-xl">
                ${icons.hardDrive({ size: 24, className: 'text-emerald-600' })}
              </div>
              <div>
                <h2 class="font-semibold text-gray-900">Mode Compatibilité / Dossier système</h2>
                <p class="text-sm text-gray-500">Permet d'ouvrir n'importe quel dossier, y compris les dossiers système ou protégés</p>
              </div>
            </div>
            <button
              id="btn-use-fallback"
              class="w-full flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-3.5 rounded-2xl transition-colors shadow-md shadow-emerald-600/20"
            >
              ${icons.upload({ size: 20 })}
              Choisir un dossier (Mode Compatibilité Système)
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

export function renderFileCard(item) {
  const color = getColorForPath(item.path);
  const isDocument = item.type === 'file' && (/\.(pdf|docx?)$/i.test(item.name));
  const isImage = item.type === 'file' && (item.file ? isImageFile(item.file) : /\.(png|jpe?g|gif|webp|svg|bmp|ico|avif|tiff|apng)$/i.test(item.name));
  const icon = item.type === 'directory'
    ? icons.folderOpen({ size: 20, className: color.text })
    : isImage
      ? icons.image({ size: 20, className: color.text })
      : isDocument
        ? icons.fileText({ size: 20, className: color.text })
        : icons.file({ size: 20, className: color.text });

  return `
    <button
      data-item-path="${escapeHtml(item.path)}"
      class="btn-file-card group w-full text-left bg-white rounded-2xl border border-gray-100 p-5 hover:border-gray-200 hover:shadow-md transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
    >
      <div class="flex items-start gap-4">
        <div class="p-3 rounded-lg ${color.light} group-hover:scale-110 transition-transform">
          ${icon}
        </div>
        <div class="flex-1 min-w-0">
          <p class="font-semibold text-gray-900 truncate">${escapeHtml(item.name)}</p>
          <p class="text-sm text-gray-500 mt-0.5">
            ${item.type === 'directory' ? 'Folder' : getFileExtension(item.name)}
            ${item.size !== undefined ? ` • ${formatFileSize(item.size)}` : ''}
          </p>
        </div>
        ${icons.chevronRight({ size: 16, className: 'text-gray-300 group-hover:text-gray-400 mt-1 flex-shrink-0 transition-colors' })}
      </div>
    </button>
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
  error = null
) {
  const color = getColorForPath(currentPath || '/files');

  const crumbsHtml = crumbs.length > 1 ? `
    <div class="flex items-center flex-wrap gap-1 mt-4 text-white/70 text-xs">
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
        ${[1, 2, 3].map(() => `
          <div class="bg-white rounded-2xl border border-gray-100 p-5 animate-pulse">
            <div class="flex gap-4">
              <div class="w-10 h-10 rounded-lg bg-gray-200"></div>
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
      <div class="text-center py-16 text-gray-400">
        ${icons.folder({ size: 40, className: 'mx-auto mb-3 opacity-30' })}
        <p class="font-medium">No files or folders found</p>
        ${search ? '<p class="text-sm mt-1">Try a different search.</p>' : ''}
      </div>
    `;
  } else {
    contentHtml = `
      <div class="space-y-3 pb-10">
        <p class="text-xs font-semibold text-gray-400 uppercase tracking-widest px-1 mb-4">
          ${items.length} ${items.length === 1 ? 'item' : 'items'}
        </p>
        ${items.map(item => renderFileCard(item)).join('')}
      </div>
    `;
  }

  return `
    <div class="min-h-screen bg-gray-50">
      <div class="${color.bg} px-4 pt-10 pb-20">
        ${crumbs.length > 1 ? `
          <button
            id="btn-go-back"
            class="flex items-center gap-2 text-white/80 hover:text-white text-sm font-medium mb-6 transition-colors"
          >
            ${icons.arrowLeft({ size: 16 })}
            Back
          </button>
        ` : ''}
        <div class="flex items-center gap-3">
          <div class="p-3 bg-white/20 rounded-2xl">
            ${icons.folder({ size: 28, className: 'text-white' })}
          </div>
          <div class="min-w-0">
            <h1 class="text-2xl font-bold text-white truncate">${escapeHtml(displayName)}</h1>
            <p class="text-white/70 text-sm mt-0.5 truncate">${escapeHtml(currentPath)}</p>
          </div>
        </div>
        ${crumbsHtml}
      </div>

      <div class="max-w-2xl mx-auto px-4 -mt-12">
        <div class="relative mb-6">
          <div class="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
            ${icons.search({ size: 18 })}
          </div>
          <input
            type="text"
            id="input-search"
            placeholder="Search files..."
            value="${escapeHtml(search)}"
            class="w-full pl-11 pr-10 py-3.5 bg-white rounded-2xl border border-gray-100 shadow-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-shadow"
          />
          ${search ? `
            <button id="btn-clear-search" class="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
              ${icons.x({ size: 16 })}
            </button>
          ` : ''}
        </div>

        ${error ? `
          <div class="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-2xl flex items-start justify-between gap-3 shadow-sm">
            <div class="flex items-start gap-3">
              ${icons.alertCircle({ size: 20, className: 'text-amber-600 flex-shrink-0 mt-0.5' })}
              <p class="text-sm text-amber-900 font-medium">${escapeHtml(error)}</p>
            </div>
            <button id="btn-dismiss-error" aria-label="Fermer l'alerte" class="text-amber-700 hover:text-amber-900 text-xs font-semibold underline flex-shrink-0">
              OK
            </button>
          </div>
        ` : ''}

        ${contentHtml}
      </div>

      ${!usingFallback ? `
        <div class="fixed bottom-6 right-6">
          <button
            id="btn-open-another"
            class="flex items-center gap-2 bg-white border border-gray-200 shadow-lg rounded-full pl-4 pr-5 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
          >
            ${icons.folderTree({ size: 18, className: 'text-blue-600' })}
            Open another folder
          </button>
        </div>
      ` : ''}
    </div>
  `;
}

export function renderPreviewModal(
  item,
  preview,
  objectUrl
) {
  const color = getColorForPath(item.path);
  const titleId = `file-preview-${item.path.replace(/[^a-zA-Z0-9_-]/g, '-')}`;
  const content = preview.kind === 'text' || preview.kind === 'word' ? preview.content : null;

  let previewBodyHtml = '';

  if (preview.kind === 'image' && objectUrl) {
    previewBodyHtml = `
      <div class="mt-4">
        <p class="text-sm font-semibold text-gray-900 mb-2">Image preview</p>
        <div class="flex items-center justify-center p-4 bg-gray-100 rounded-2xl border border-gray-200 overflow-hidden min-h-[200px] max-h-[60vh]">
          <img
            src="${objectUrl}"
            alt="${escapeHtml(item.name)}"
            class="max-w-full max-h-[55vh] object-contain rounded-xl shadow-sm"
          />
        </div>
      </div>
    `;
  } else if (preview.kind === 'pdf' && objectUrl) {
    previewBodyHtml = `
      <div class="mt-4">
        <p class="text-sm font-semibold text-gray-900 mb-2">PDF preview</p>
        <iframe
          src="${objectUrl}"
          title="PDF preview for ${escapeHtml(item.name)}"
          class="w-full h-[60vh] rounded-xl border border-gray-200 bg-gray-50"
        ></iframe>
      </div>
    `;
  } else if (content !== null) {
    const syntaxLang = preview.kind === 'text' ? getSyntaxLanguage(item.name) ?? 'markup' : 'markup';
    const highlightedCode = highlightCode(content || '(empty file)', syntaxLang);

    previewBodyHtml = `
      <div class="mt-4">
        <p class="text-sm font-semibold text-gray-900 mb-2">
          ${preview.kind === 'word' ? 'Word document preview' : 'Preview'}
        </p>
        <pre
          class="text-xs rounded-xl p-4 max-h-96 overflow-auto bg-gray-900 text-gray-100 font-mono"
          aria-label="Source code preview for ${escapeHtml(item.name)}"
        ><code>${highlightedCode}</code></pre>
      </div>
    `;
  } else if (preview.kind === 'unsupported-word') {
    previewBodyHtml = `
      <div class="mt-4 p-4 rounded-xl bg-amber-50 text-sm text-amber-800">
        Legacy .doc files cannot be previewed in the browser. You can download the file and open it in Word.
      </div>
    `;
  } else if (preview.kind === 'word-error') {
    previewBodyHtml = `
      <div class="mt-4 p-4 rounded-xl bg-red-50 text-sm text-red-800 flex items-center gap-2">
        ${icons.alertCircle({ size: 18, className: 'text-red-600 flex-shrink-0' })}
        <span>Could not read this Word document. The file may be corrupted or protected.</span>
      </div>
    `;
  } else if (preview.kind === 'unsupported') {
    previewBodyHtml = `
      <div class="mt-4 p-4 rounded-xl bg-gray-50 text-sm text-gray-600">
        No browser preview is available for this file type.
      </div>
    `;
  }

  const isImage = preview.kind === 'image' || (item.type === 'file' && (item.file ? isImageFile(item.file) : /\.(png|jpe?g|gif|webp|svg|bmp|ico|avif|tiff|apng)$/i.test(item.name)));
  const modalIcon = isImage
    ? icons.image({ size: 28, className: color.text })
    : icons.file({ size: 28, className: color.text });

  return `
    <div
      id="modal-overlay"
      class="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
    >
      <div
        id="modal-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="${titleId}"
        class="bg-white rounded-3xl shadow-2xl w-full max-h-[90vh] overflow-y-auto ${
          preview.kind === 'pdf' || preview.kind === 'image' || content !== null ? 'max-w-4xl' : 'max-w-md'
        }"
      >
        <div class="${color.bg} px-6 pt-8 pb-16 relative">
          <button
            id="btn-close-modal"
            aria-label="Close file preview"
            class="absolute top-4 right-4 p-2 rounded-full bg-white/20 hover:bg-white/30 transition-colors text-white"
          >
            ${icons.x({ size: 18 })}
          </button>
        </div>
        <div class="px-6 pb-8 -mt-10">
          <div class="flex items-end gap-4 mb-4">
            <div class="p-4 rounded-2xl ${color.light}">
              ${modalIcon}
            </div>
          </div>
          <h2 id="${titleId}" class="text-2xl font-bold text-gray-900">${escapeHtml(item.name)}</h2>
          <p class="text-gray-500 mt-1">File</p>

          <div class="mt-6 space-y-3">
            <div class="flex items-center justify-between p-3 rounded-xl bg-gray-50">
              <span class="text-sm text-gray-600">Type</span>
              <span class="text-sm font-semibold text-gray-900">${escapeHtml(getFileExtension(item.name))}</span>
            </div>
            <div class="flex items-center justify-between p-3 rounded-xl bg-gray-50">
              <span class="text-sm text-gray-600">Path</span>
              <span class="text-sm font-semibold text-gray-900 truncate max-w-[200px]">${escapeHtml(item.path)}</span>
            </div>
            ${item.size !== undefined ? `
              <div class="flex items-center justify-between p-3 rounded-xl bg-gray-50">
                <span class="text-sm text-gray-600">Size</span>
                <span class="text-sm font-semibold text-gray-900">${formatFileSize(item.size)}</span>
              </div>
            ` : ''}

            ${previewBodyHtml}

            ${objectUrl ? `
              <a
                href="${objectUrl}"
                download="${escapeHtml(item.name)}"
                class="mt-4 inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 transition-colors"
              >
                ${icons.download({ size: 16 })}
                Download file
              </a>
            ` : ''}
          </div>
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
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
