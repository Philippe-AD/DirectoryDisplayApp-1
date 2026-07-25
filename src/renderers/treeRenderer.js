import { icons } from '../icons';
import { isImageFile, isAudioFile, isVideoFile } from '../filePreview';
import { escapeHtml, formatFileSize, getFileExtension } from './formatters';

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
