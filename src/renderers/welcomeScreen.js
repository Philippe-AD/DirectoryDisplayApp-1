import { icons } from '../icons';
import { escapeHtml } from './formatters';

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
