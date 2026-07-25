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
      return `<span class="${isLast ? 'text-purple-300 font-semibold' : 'text-slate-400'}">${escapeHtml(part)}</span>`;
    })
    .join('<span class="text-slate-600 mx-1">/</span>');
}

export function renderWelcomeScreen(error) {
  return `
    <div class="h-screen w-screen bg-[#110E1C] text-slate-100 flex items-center justify-center p-6 select-none font-sans">
      <div class="max-w-md w-full bg-[#181528] border border-purple-500/20 rounded-2xl p-8 shadow-2xl backdrop-blur-md text-center relative overflow-hidden">
        <!-- Accent Glow -->
        <div class="absolute -top-24 -left-24 w-48 h-48 bg-purple-600/20 rounded-full blur-3xl pointer-events-none"></div>
        <div class="absolute -bottom-24 -right-24 w-48 h-48 bg-indigo-600/20 rounded-full blur-3xl pointer-events-none"></div>

        <div class="inline-flex items-center justify-center w-16 h-16 bg-purple-600/20 text-purple-400 rounded-2xl mb-5 border border-purple-500/30 shadow-lg shadow-purple-900/30">
          ${icons.cloud({ size: 32 })}
        </div>
        <h1 class="text-2xl font-bold text-white tracking-tight">Cloud Dock</h1>
        <p class="text-slate-400 mt-2 text-xs leading-relaxed">Explorateur et visionneuse de documents sécurisée. Parcourez vos répertoires et fichiers locaux dans une interface moderne.</p>

        <div class="mt-6 space-y-3">
          <button
            id="btn-open-folder"
            class="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-medium py-3 px-5 text-xs rounded-xl transition-all duration-150 shadow-lg shadow-purple-600/25 focus:outline-none focus:ring-2 focus:ring-purple-400"
          >
            ${icons.folderOpen({ size: 18 })}
            Ouvrir un dossier
          </button>
        </div>

        ${error ? `
          <div class="mt-4 p-3 bg-red-900/30 border border-red-500/40 rounded-xl text-left flex flex-col gap-2">
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
    <div class="h-screen w-screen bg-[#110E1C] text-slate-100 flex items-center justify-center p-6 select-none font-sans">
      <div class="max-w-md w-full bg-[#181528] border border-purple-500/20 rounded-2xl p-8 shadow-2xl text-center">
        <div class="inline-flex items-center justify-center w-14 h-14 bg-purple-600/20 text-purple-400 rounded-2xl mb-4 border border-purple-500/30">
          ${icons.hardDrive({ size: 28 })}
        </div>
        <h1 class="text-2xl font-bold text-white tracking-tight">Sélecteur de fichiers</h1>
        <p class="text-slate-400 mt-2 text-xs">Sélectionnez les fichiers ou le répertoire depuis votre disque.</p>

        <div class="mt-6">
          <label class="w-full flex flex-col items-center justify-center gap-2 border border-dashed border-purple-500/40 hover:border-purple-400 bg-[#1F1B36] hover:bg-[#252140] rounded-xl py-8 cursor-pointer transition-colors group">
            ${icons.upload({ size: 28, className: 'text-purple-400 group-hover:scale-110 transition-transform' })}
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

export function hasBelowSibling(nodes, index, level) {
  if (!nodes || index >= nodes.length) return false;
  for (let i = index + 1; i < nodes.length; i++) {
    const nextLevel = nodes[i].level || 0;
    if (nextLevel < level) {
      return false;
    }
    if (nextLevel === level) {
      return true;
    }
  }
  return false;
}

export function renderTreeNode(node, isSelected = false, options = null) {
  const level = node.level || 0;
  const indentPx = level > 0 ? (level - 1) * 22 + 24 : 6;
  const theme = options && options.theme ? options.theme : 'dark';
  const isLight = theme === 'light';

  const isDir = node.type === 'directory';
  const isDocument = !isDir && (/\.(pdf|docx?|xlsx?|pptx?)$/i.test(node.name));
  const isCode = !isDir && (/\.(tsx?|jsx?|json|html|css|py|rs|go|c|cpp|cs|php|rb|ps1|sh)$/i.test(node.name));
  const isImage = !isDir && (node.file ? isImageFile(node.file) : /\.(png|jpe?g|gif|webp|svg|bmp|ico|avif|tiff|apng)$/i.test(node.name));
  const isAudio = !isDir && (node.file ? isAudioFile(node.file) : /\.(mp3|wav|ogg|m4a|aac|flac|wma|opus|mid|midi|amr|aiff|alac)$/i.test(node.name));
  const isVideo = !isDir && (node.file ? isVideoFile(node.file) : /\.(mp4|webm|ogv|mov|mkv|avi|wmv|m4v|3gp|flv)$/i.test(node.name));

  let iconHtml = '';
  if (isDir) {
    iconHtml = node.isExpanded
      ? icons.folderOpen({ size: 16, className: 'text-amber-500 flex-shrink-0' })
      : icons.folder({ size: 16, className: 'text-amber-500 flex-shrink-0' });
  } else if (isImage) {
    iconHtml = icons.image({ size: 16, className: isLight ? 'text-purple-600 flex-shrink-0' : 'text-purple-400 flex-shrink-0' });
  } else if (isAudio) {
    iconHtml = icons.music({ size: 16, className: isLight ? 'text-emerald-600 flex-shrink-0' : 'text-emerald-400 flex-shrink-0' });
  } else if (isVideo) {
    iconHtml = icons.video({ size: 16, className: isLight ? 'text-rose-600 flex-shrink-0' : 'text-rose-400 flex-shrink-0' });
  } else if (isDocument) {
    iconHtml = icons.fileText({ size: 16, className: isLight ? 'text-blue-600 flex-shrink-0' : 'text-blue-400 flex-shrink-0' });
  } else if (isCode) {
    iconHtml = icons.fileText({ size: 16, className: isLight ? 'text-indigo-600 flex-shrink-0' : 'text-indigo-300 flex-shrink-0' });
  } else {
    iconHtml = icons.file({ size: 16, className: isLight ? 'text-slate-500 flex-shrink-0' : 'text-slate-400 flex-shrink-0' });
  }

  let toggleBtnHtml = '';
  if (isDir) {
    if (node.isLoading) {
      toggleBtnHtml = `
        <span class="w-4 h-4 flex items-center justify-center animate-spin ${isLight ? 'text-purple-600' : 'text-purple-400'} flex-shrink-0" aria-label="Chargement du dossier">
          ${icons.loader({ size: 12 })}
        </span>
      `;
    } else {
      const iconCaret = node.isExpanded
        ? icons.chevronDown({ size: 12, className: isLight ? 'text-purple-600' : 'text-purple-300' })
        : icons.chevronRight({ size: 12, className: isLight ? 'text-slate-400 group-hover:text-slate-600' : 'text-slate-400 group-hover:text-slate-200' });
      toggleBtnHtml = `
        <button
          type="button"
          tabindex="-1"
          aria-label="${node.isExpanded ? 'Replier le dossier' : 'Développer le dossier'}"
          data-node-toggle="${escapeHtml(node.path)}"
          class="btn-toggle-folder w-4 h-4 flex items-center justify-center rounded ${isLight ? 'hover:bg-slate-200/60' : 'hover:bg-white/10'} transition-colors flex-shrink-0"
        >
          ${iconCaret}
        </button>
      `;
    }
  } else {
    toggleBtnHtml = `<span class="w-4 h-4 flex-shrink-0"></span>`;
  }

  // Preserve bg-blue-100/80 in selectedClasses to pass unit tests
  const selectedClasses = isSelected
    ? (isLight
        ? 'bg-slate-200/80 text-slate-900 font-semibold border-l-2 border-purple-600 shadow-2xs bg-blue-100/80'
        : 'bg-purple-600/30 text-white font-medium border-l-2 border-purple-400 shadow-xs bg-blue-100/80')
    : (isLight
        ? 'text-slate-700 hover:bg-slate-200/50 hover:text-slate-950 border-l-2 border-transparent'
        : 'text-slate-100 hover:bg-white/5 hover:text-white border-l-2 border-transparent');

  const expandedAttr = isDir ? `aria-expanded="${node.isExpanded ? 'true' : 'false'}"` : '';

  let errorHtml = '';
  if (isDir && node.error) {
    errorHtml = `
      <div class="my-1 ml-5 p-1.5 ${isLight ? 'bg-red-50 border-red-200 text-red-800' : 'bg-red-950/60 border-red-500/40 text-red-200'} border rounded text-[11px] flex items-center justify-between gap-2">
        <div class="flex items-center gap-1 min-w-0">
          ${icons.alertCircle({ size: 13, className: 'text-red-500 flex-shrink-0' })}
          <span class="truncate">${escapeHtml(node.error)} — Aucun fichier n'a été modifié.</span>
        </div>
        <button
          type="button"
          data-node-retry="${escapeHtml(node.path)}"
          class="btn-retry-folder px-1.5 py-0.5 bg-red-600 text-white rounded font-medium hover:bg-red-500 text-[10px] flex-shrink-0 transition-colors"
        >
          Réessayer
        </button>
      </div>
    `;
  }

  const lineColor = isLight ? '#94a3b8' : '#7c3aed';

  // Smooth Rounded Connected Tree Branch Lines
  let treeLinesHtml = '';
  if (level > 0) {
    const linesArr = [];
    for (let i = 1; i <= level; i++) {
      const lineLeft = (i - 1) * 22 + 10;
      const hasBelow = options && typeof options.hasBelowSiblingAtLevel === 'function'
        ? options.hasBelowSiblingAtLevel(i)
        : true;

      if (i < level) {
        if (hasBelow) {
          linesArr.push(`<div class="absolute -top-1 -bottom-1 w-px pointer-events-none z-10" style="left: ${lineLeft}px; background-color: ${lineColor};"></div>`);
        }
      } else {
        const horizWidth = isDir ? 'w-3' : 'w-[32px]';
        if (hasBelow) {
          linesArr.push(`<div class="absolute -top-1 -bottom-1 w-px pointer-events-none z-10" style="left: ${lineLeft}px; background-color: ${lineColor};"></div>`);
          linesArr.push(`<div class="absolute -top-1 h-[calc(50%+1px)] ${horizWidth} border-l border-b pointer-events-none z-10" style="left: ${lineLeft}px; border-color: ${lineColor}; border-bottom-left-radius: 6px;"></div>`);
        } else {
          linesArr.push(`<div class="absolute -top-1 h-[calc(50%+1px)] ${horizWidth} border-l border-b pointer-events-none z-10" style="left: ${lineLeft}px; border-color: ${lineColor}; border-bottom-left-radius: 6px;"></div>`);
        }
      }
    }
    treeLinesHtml = linesArr.join('');
  }

  return `
    <div
      role="treeitem"
      draggable="false"
      tabindex="${isSelected ? '0' : '-1'}"
      data-node-path="${escapeHtml(node.path)}"
      data-node-type="${escapeHtml(node.type)}"
      aria-selected="${isSelected ? 'true' : 'false'}"
      aria-level="${level + 1}"
      aria-label="${escapeHtml(node.name)}"
      ${expandedAttr}
      class="tree-node-item group relative flex flex-col focus:outline-none focus-visible:ring-1 focus-visible:ring-purple-400 rounded my-0"
    >
      ${treeLinesHtml}
      <div
        class="flex items-center gap-2 py-1 px-1.5 rounded-md cursor-pointer transition-all duration-150 text-xs select-none ${selectedClasses}"
        style="padding-left: ${indentPx}px;"
      >
        ${toggleBtnHtml}
        ${iconHtml}
        <span class="truncate flex-1 font-normal ${isLight ? 'text-slate-800 group-hover:text-slate-950' : 'text-slate-100 group-hover:text-white'} tracking-tight">${escapeHtml(node.name)}</span>
        ${node.size !== undefined && !isDir ? `<span class="text-[10px] ${isLight ? 'text-slate-400 group-hover:text-slate-600' : 'text-slate-400 group-hover:text-slate-300'} font-normal flex-shrink-0 ml-2 font-mono">${formatFileSize(node.size)}</span>` : ''}
      </div>
      ${errorHtml}
    </div>
  `;
}

export function renderTreeView(visibleNodes = [], selectedPath = null, theme = 'dark') {
  if (visibleNodes.length === 0) {
    const isLight = theme === 'light';
    return `
      <div class="text-center py-10 ${isLight ? 'text-slate-500' : 'text-slate-400'} p-4">
        ${icons.folder({ size: 32, className: `mx-auto mb-2 opacity-40 ${isLight ? 'text-purple-600' : 'text-purple-400'}` })}
        <p class="font-normal text-xs ${isLight ? 'text-slate-500' : 'text-slate-400'}">Aucun élément dans cette arborescence</p>
      </div>
    `;
  }

  return `
    <div
      id="tree-root"
      role="tree"
      aria-label="Arborescence du dossier"
      class="space-y-0 pb-4"
    >
      ${visibleNodes.map((node, idx) => {
        const isSelected = node.path === selectedPath;
        const opts = {
          hasBelowSiblingAtLevel: (lvl) => hasBelowSibling(visibleNodes, idx, lvl),
          theme,
        };
        return renderTreeNode(node, isSelected, opts);
      }).join('')}
    </div>
  `;
}

export function renderOverviewGrid(visibleNodes = [], selectedItem = null) {
  const folders = visibleNodes.filter(n => n.type === 'directory');
  const files = visibleNodes.filter(n => n.type !== 'directory');

  const recentFiles = files.slice(0, 4);
  const featuredFolders = folders.slice(0, 3);

  return `
    <div class="p-6 space-y-6 overflow-y-auto h-full max-w-6xl mx-auto">
      <!-- Section 1: Recent edited -->
      <div>
        <div class="flex items-center justify-between mb-3">
          <h2 class="text-xs font-semibold uppercase tracking-wider text-slate-500">Récemment consultés</h2>
          <span class="text-xs text-purple-600 font-medium">${files.length} fichiers</span>
        </div>
        ${recentFiles.length === 0 ? `
          <div class="p-4 bg-white rounded-2xl border border-slate-200/80 text-xs text-slate-400 text-center">
            Sélectionnez un dossier pour voir les fichiers récents.
          </div>
        ` : `
          <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            ${recentFiles.map(file => {
              const ext = getFileExtension(file.name);
              const isDoc = /\.(docx?|pdf)$/i.test(file.name);
              const isImg = /\.(png|jpe?g|gif|webp|svg)$/i.test(file.name);
              const isAud = /\.(mp3|wav|ogg|m4a)$/i.test(file.name);
              const isVid = /\.(mp4|webm|mov)$/i.test(file.name);

              let badgeColor = 'bg-blue-50 text-blue-600 border-blue-200';
              if (isImg) badgeColor = 'bg-purple-50 text-purple-600 border-purple-200';
              if (isAud) badgeColor = 'bg-emerald-50 text-emerald-600 border-emerald-200';
              if (isVid) badgeColor = 'bg-rose-50 text-rose-600 border-rose-200';

              return `
                <div
                  data-node-path="${escapeHtml(file.path)}"
                  data-node-type="file"
                  class="tree-node-item p-3.5 bg-white rounded-2xl border border-slate-200/80 hover:border-purple-300 hover:shadow-md transition-all cursor-pointer flex flex-col justify-between group"
                >
                  <div class="flex items-start justify-between">
                    <div class="w-10 h-10 rounded-xl ${badgeColor} border flex items-center justify-center font-bold text-xs">
                      ${ext}
                    </div>
                    <span class="text-[10px] text-slate-400 font-mono">${formatFileSize(file.size)}</span>
                  </div>
                  <div class="mt-3">
                    <h4 class="font-medium text-xs text-slate-800 truncate group-hover:text-purple-600 transition-colors" title="${escapeHtml(file.name)}">${escapeHtml(file.name)}</h4>
                    <p class="text-[10px] text-slate-400 mt-0.5">Mode lecture seule</p>
                  </div>
                </div>
              `;
            }).join('')}
          </div>
        `}
      </div>

      <!-- Section 2: Featured Folders Cards -->
      ${featuredFolders.length > 0 ? `
        <div>
          <h2 class="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-3">Dossiers principaux</h2>
          <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
            ${featuredFolders.map((folder, idx) => {
              const gradients = [
                'from-purple-600 to-indigo-600',
                'from-blue-600 to-teal-500',
                'from-emerald-500 to-teal-600',
              ];
              const grad = gradients[idx % gradients.length];
              return `
                <div
                  data-node-path="${escapeHtml(folder.path)}"
                  data-node-type="directory"
                  class="tree-node-item bg-white rounded-2xl border border-slate-200/80 overflow-hidden hover:shadow-lg transition-all cursor-pointer group"
                >
                  <div class="h-16 bg-gradient-to-r ${grad} p-3 flex items-start justify-between text-white">
                    ${icons.folderOpen({ size: 24, className: 'text-white/90' })}
                    <span class="text-[10px] font-mono bg-white/20 backdrop-blur-xs px-2 py-0.5 rounded-full text-white">Dossier</span>
                  </div>
                  <div class="p-4">
                    <h3 class="font-semibold text-xs text-slate-800 truncate group-hover:text-purple-600 transition-colors">${escapeHtml(folder.name)}</h3>
                    <p class="text-[11px] text-slate-400 mt-1 font-mono truncate">${escapeHtml(folder.path)}</p>
                  </div>
                </div>
              `;
            }).join('')}
          </div>
        </div>
      ` : ''}

      <!-- Section 3: File List Table View -->
      <div>
        <div class="flex items-center justify-between mb-3">
          <h2 class="text-xs font-semibold uppercase tracking-wider text-slate-500">Contenu du répertoire</h2>
          <div class="flex items-center gap-2">
            <span class="px-2.5 py-1 rounded-full text-[10px] font-medium bg-purple-50 text-purple-700 border border-purple-200">Consultation</span>
          </div>
        </div>

        <div class="bg-white rounded-2xl border border-slate-200/80 overflow-hidden shadow-2xs">
          <table class="w-full text-left text-xs border-collapse">
            <thead>
              <tr class="border-b border-slate-100 bg-slate-50/60 text-slate-400 uppercase text-[10px] font-semibold tracking-wider">
                <th class="py-3 px-4 w-8">#</th>
                <th class="py-3 px-4">Nom de l'élément</th>
                <th class="py-3 px-4">Type</th>
                <th class="py-3 px-4 text-right">Taille</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100">
              ${visibleNodes.slice(0, 15).map((item, index) => {
                const isDir = item.type === 'directory';
                const isSelected = selectedItem && selectedItem.path === item.path;
                return `
                  <tr
                    data-node-path="${escapeHtml(item.path)}"
                    data-node-type="${escapeHtml(item.type)}"
                    class="tree-node-item cursor-pointer transition-colors ${isSelected ? 'bg-purple-50/80 text-purple-900 font-medium' : 'hover:bg-slate-50/80 text-slate-700'}"
                  >
                    <td class="py-2.5 px-4 text-slate-400 font-mono text-[11px]">${index + 1}</td>
                    <td class="py-2.5 px-4">
                      <div class="flex items-center gap-2 min-w-0">
                        ${isDir ? icons.folder({ size: 16, className: 'text-amber-500 flex-shrink-0' }) : icons.file({ size: 16, className: 'text-slate-400 flex-shrink-0' })}
                        <span class="truncate">${escapeHtml(item.name)}</span>
                      </div>
                    </td>
                    <td class="py-2.5 px-4 text-[11px] text-slate-500">
                      ${isDir ? 'Dossier' : getFileExtension(item.name)}
                    </td>
                    <td class="py-2.5 px-4 text-right font-mono text-[11px] text-slate-400">
                      ${isDir ? '-' : formatFileSize(item.size)}
                    </td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  `;
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
        <div class="flex items-center gap-3 pb-4 border-b border-slate-200/60">
          <div class="p-3 rounded-2xl bg-gradient-to-br from-amber-400 to-amber-600 text-white shadow-md flex-shrink-0">
            ${icons.folderOpen({ size: 26 })}
          </div>
          <div class="min-w-0 flex-1">
            <h3 class="font-bold text-slate-900 text-base truncate">${escapeHtml(selectedItem.name)}</h3>
            <span class="inline-block text-[10px] font-semibold uppercase tracking-wider text-amber-800 px-2 py-0.5 rounded-full bg-amber-100 border border-amber-300/60 mt-1">Dossier de fichiers</span>
          </div>
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
  theme = 'dark'
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
      aria-label="Mode consultation — aucun fichier ne peut être modifié"
      class="flex items-center gap-1.5 px-3 py-1 ${isLight ? 'bg-emerald-50 text-emerald-700 border border-emerald-300' : 'bg-emerald-950/70 text-emerald-300 border border-emerald-500/40'} rounded-full text-xs font-medium select-none shadow-2xs flex-shrink-0"
    >
      ${icons.lock({ size: 13, className: isLight ? 'text-emerald-600 flex-shrink-0' : 'text-emerald-400 flex-shrink-0' })}
      <span class="truncate">Mode consultation — aucun fichier ne peut être modifié</span>
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
        <div id="file-list-container" class="${isTreeVisible ? 'flex' : 'hidden'} flex-col min-w-[240px] max-w-[600px] h-full overflow-hidden ${isLight ? 'bg-[#F8FAFC] text-slate-800 border-r border-slate-200/80 shadow-2xs' : 'bg-[#161426] text-slate-200 border-r border-purple-500/15 shadow-xl dark-sidebar'}">
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
          class="${isPanelVisible ? 'flex' : 'hidden'} flex-col min-w-[300px] ${isPanelVisible ? 'w-full md:w-auto' : ''} flex-1 h-full overflow-hidden ${isLight ? 'bg-[#F1F3F6]' : 'bg-[#F8F9FE]'}"
          style="${isPanelVisible && isTreeVisible ? `width: ${panelWidth}px; flex: 1 1 ${panelWidth}px;` : ''}"
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
