const { app, BrowserWindow, ipcMain, dialog, shell, protocol, net } = require('electron');
const path = require('path');
const fs = require('fs');
const { pathToFileURL } = require('url');
const crypto = require('crypto');
const { checkFileOperation, inspectItemAttributes, isDriveRoot } = require('./security/fileOperationPolicy.cjs');

function logSecurityPolicyViolation(operation, code, failedStep, details = {}) {
  const timestamp = new Date().toISOString();
  console.warn(`[SECURITY_POLICY_REFUSAL] ${timestamp} | Op: ${operation} | Code: ${code} | Step: ${failedStep}`, details);
}

protocol.registerSchemesAsPrivileged([
  {
    scheme: 'app-media',
    privileges: {
      standard: true,
      secure: true,
      supportFetchAPI: true,
      corsEnabled: true,
      stream: true,
    },
  },
]);

const activePreviewTokens = new Map();

function validatePathAccess(targetPath) {
  if (typeof targetPath !== 'string' || !targetPath) {
    return { valid: false, reason: 'INVALID_PATH' };
  }

  if (targetPath.includes('\0')) {
    return { valid: false, reason: 'NULL_BYTE_DETECTED' };
  }

  const normalized = path.normalize(targetPath);

  if (!path.isAbsolute(normalized)) {
    return { valid: false, reason: 'RELATIVE_PATH_REFUSED' };
  }

  const resolved = path.resolve(normalized);
  if (resolved !== normalized && resolved.toLowerCase() !== normalized.toLowerCase()) {
    return { valid: false, reason: 'PATH_TRAVERSAL_DETECTED' };
  }

  return { valid: true, normalizedPath: normalized };
}

let mainWindow = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    title: 'DirectoryDisplayApp',
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: false,
      plugins: true,
    },
  });

  mainWindow.maximize();

  const isPreview = process.argv.includes('--preview') || process.env.NODE_ENV === 'production';
  const isDev = !app.isPackaged && !isPreview && (process.argv.includes('--dev') || process.env.VITE_DEV_SERVER_URL || process.env.NODE_ENV === 'development');

  if (isDev) {
    const devServerUrl = process.env.VITE_DEV_SERVER_URL || 'http://localhost:5173';
    mainWindow.loadURL(devServerUrl).catch(() => {
      // Fallback if dev server is starting slowly
      setTimeout(() => {
        if (mainWindow) {
          mainWindow.loadURL(devServerUrl);
        }
      }, 1500);
    });
  } else {
    const indexPath = path.join(__dirname, '../dist/index.html');
    mainWindow.loadFile(indexPath);
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// IPC Handlers
ipcMain.handle('app:getVersion', () => {
  return app.getVersion() || '1.0.0-rc.1';
});

ipcMain.handle('app:openExternal', async (_event, filePath) => {
  if (!filePath) return { success: false, error: 'Chemin invalide' };
  try {
    const errorMsg = await shell.openPath(filePath);
    if (errorMsg) {
      return { success: false, error: errorMsg };
    }
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message || 'Impossible d\'ouvrir le fichier.' };
  }
});

ipcMain.handle('dialog:openDirectory', async () => {
  if (!mainWindow) return null;
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openDirectory'],
    title: 'Sélectionner un dossier',
  });
  if (result.canceled || result.filePaths.length === 0) {
    return null;
  }
  const selectedPath = result.filePaths[0];
  const decision = checkFileOperation({ operation: 'select-destination', destinationPath: selectedPath });
  if (!decision.allowed) {
    logSecurityPolicyViolation('select-destination', decision.code, 'dialog_selection', { selectedPath });
    return null;
  }
  return selectedPath;
});

ipcMain.handle('fs:readDirectory', async (_event, dirPath) => {
  try {
    const entries = await fs.promises.readdir(dirPath, { withFileTypes: true });
    const files = await Promise.all(
      entries.map(async (entry) => {
        const fullPath = path.join(dirPath, entry.name);
        const isDirectory = entry.isDirectory();
        let size = undefined;

        if (!isDirectory) {
          try {
            const stat = await fs.promises.stat(fullPath);
            size = stat.size;
          } catch {
            // Ignore stat errors for unreadable files
          }
        }

        return {
          name: entry.name,
          type: isDirectory ? 'directory' : 'file',
          size,
          path: fullPath.replace(/\\/g, '/'),
        };
      })
    );

    files.sort((a, b) => {
      if (a.type !== b.type) return a.type === 'directory' ? -1 : 1;
      return a.name.localeCompare(b.name, undefined, { sensitivity: 'base', numeric: true });
    });

    return { files };
  } catch (err) {
    return { files: [], error: err.message || 'Impossible de lire le dossier.' };
  }
});

const activeCopies = new Map();
const activeMoves = new Map();


ipcMain.handle('fs:renameEntry', async (_event, oldPath, newPath) => {
  if (!oldPath || !newPath) {
    return { success: false, error: 'Chemin d\'accès invalide.', code: 'INVALID_PATH' };
  }

  const newName = path.basename(newPath);
  const decision = checkFileOperation({ operation: 'rename', sourcePath: oldPath, newName });
  if (!decision.allowed) {
    logSecurityPolicyViolation('rename', decision.code, 'pre_execution_policy', { oldPath, newPath });
    return {
      success: false,
      error: decision.message,
      code: decision.code,
    };
  }

  const attr = await inspectItemAttributes(oldPath);
  if (!attr.exists) {
    return {
      success: false,
      error: 'Élément d\'origine introuvable. Il a peut-être été supprimé ou déplacé.',
      code: 'SOURCE_NOT_FOUND',
    };
  }

  if (attr.isReadOnly) {
    return {
      success: false,
      error: 'Cet élément est en lecture seule et ne peut pas être renommé. Aucune modification n\'a été effectuée.',
      code: 'READ_ONLY_ITEM',
    };
  }

  const parentDir = path.dirname(newPath);
  try {
    await fs.promises.access(parentDir);
  } catch {
    return {
      success: false,
      error: 'Le dossier parent n\'est pas accessible. Aucune autre modification n\'a été effectuée.',
      code: 'DESTINATION_NOT_FOUND',
    };
  }

  try {
    await fs.promises.rename(oldPath, newPath);
    return { success: true };
  } catch (err) {
    let errorMsg = 'Impossible de renommer l\'élément.';
    let code = err.code || 'UNKNOWN';
    if (err.code === 'ENOENT') {
      errorMsg = 'Élément introuvable.';
      code = 'SOURCE_NOT_FOUND';
    } else if (err.code === 'EACCES' || err.code === 'EPERM') {
      errorMsg = 'Accès refusé.';
      code = 'ACCESS_DENIED';
    } else if (err.code === 'EBUSY') {
      errorMsg = 'Le fichier est utilisé par une autre application.';
      code = 'EBUSY';
    } else if (err.code === 'EEXIST') {
      errorMsg = 'Un fichier ou dossier portant ce nom existe déjà.';
      code = 'NAME_CONFLICT';
    }
    return {
      success: false,
      error: `${errorMsg} Aucune autre modification n'a été effectuée.`,
      code,
    };
  }
});

ipcMain.handle('fs:copyEntry', async (event, { sourcePath, destDirPath, newName, copyId }) => {
  if (!sourcePath || !destDirPath || !newName || !copyId) {
    return { success: false, error: 'Paramètres invalides. Le fichier original n\'a pas été modified.', code: 'INVALID_PATH' };
  }

  const decision = checkFileOperation({ operation: 'copy', sourcePath, destinationPath: destDirPath, newName });
  if (!decision.allowed) {
    logSecurityPolicyViolation('copy', decision.code, 'pre_execution_policy', { sourcePath, destDirPath, newName });
    return {
      success: false,
      error: decision.message,
      code: decision.code,
    };
  }

  let sourceStat;
  try {
    const attr = await inspectItemAttributes(sourcePath);
    if (!attr.exists) {
      return {
        success: false,
        error: 'Élément d\'origine introuvable ou inaccessible. Le fichier original n\'a pas été modifié.',
        code: 'SOURCE_NOT_FOUND',
      };
    }
    sourceStat = attr.stat;
  } catch (err) {
    return {
      success: false,
      error: 'Élément d\'origine introuvable ou inaccessible. Le fichier original n\'a pas été modifié.',
      code: err.code || 'ENOENT',
    };
  }

  let destStat;
  try {
    destStat = await fs.promises.stat(destDirPath);
    if (!destStat.isDirectory()) {
      return { success: false, error: 'Le dossier de destination n\'est pas valide. Le fichier original n\'a pas été modifié.', code: 'DESTINATION_NOT_DIRECTORY' };
    }
  } catch (err) {
    return {
      success: false,
      error: 'Le dossier de destination est introuvable ou inaccessible. Le fichier original n\'a pas été modifié.',
      code: err.code || 'EACCES',
    };
  }

  const targetPath = path.join(destDirPath, newName);
  try {
    await fs.promises.access(targetPath);
    return {
      success: false,
      error: `Un ${sourceStat.isDirectory() ? 'dossier' : 'fichier'} portant ce nom existe déjà dans la destination. Aucun fichier n'a été modifié.`,
      code: 'NAME_CONFLICT',
    };
  } catch {
    // Expected targetPath does not exist
  }

  activeCopies.set(copyId, { cancelled: false });

  const notifyProgress = (data) => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('fs:copyProgress', { copyId, ...data });
    }
  };

  try {
    if (!sourceStat.isDirectory()) {
      notifyProgress({ currentItem: newName, percentage: 30, copiedCount: 0, totalCount: 1 });

      if (activeCopies.get(copyId)?.cancelled) {
        throw { code: 'CANCELLED' };
      }

      await fs.promises.copyFile(sourcePath, targetPath);

      if (activeCopies.get(copyId)?.cancelled) {
        try { await fs.promises.unlink(targetPath); } catch {}
        throw { code: 'CANCELLED' };
      }

      const checkStat = await fs.promises.stat(targetPath);
      if (sourceStat.size > 0 && checkStat.size === 0) {
        try { await fs.promises.unlink(targetPath); } catch {}
        return { success: false, error: 'La copie créée est incomplète. Le fichier original n\'a pas été modifié.', code: 'OPERATION_RESULT_INVALID' };
      }

      notifyProgress({ currentItem: newName, percentage: 100, copiedCount: 1, totalCount: 1 });
      return { success: true, targetPath: targetPath.replace(/\\/g, '/') };
    } else {
      const allEntries = [];
      const visitedSymlinks = new Set();

      async function collectEntries(srcDir, relativePath = '') {
        const entries = await fs.promises.readdir(srcDir, { withFileTypes: true });
        for (const entry of entries) {
          const entrySrc = path.join(srcDir, entry.name);
          const entryRel = path.join(relativePath, entry.name);

          let isDir = entry.isDirectory();
          if (entry.isSymbolicLink()) {
            const symKey = entrySrc.toLowerCase();
            if (visitedSymlinks.has(symKey)) continue;
            visitedSymlinks.add(symKey);
            try {
              const realStat = await fs.promises.stat(entrySrc);
              isDir = realStat.isDirectory();
            } catch {
              isDir = false;
            }
          }

          allEntries.push({ src: entrySrc, rel: entryRel, isDir });
          if (isDir && !entry.isSymbolicLink()) {
            await collectEntries(entrySrc, entryRel);
          }
        }
      }
      await collectEntries(sourcePath);

      const totalCount = allEntries.length + 1;
      let copiedCount = 0;

      await fs.promises.mkdir(targetPath, { recursive: true });
      copiedCount++;
      notifyProgress({ currentItem: newName, percentage: Math.round((copiedCount / totalCount) * 100), copiedCount, totalCount });

      for (const item of allEntries) {
        if (activeCopies.get(copyId)?.cancelled) {
          throw { code: 'CANCELLED' };
        }

        const itemTarget = path.join(targetPath, item.rel);
        if (item.isDir) {
          await fs.promises.mkdir(itemTarget, { recursive: true });
        } else {
          await fs.promises.copyFile(item.src, itemTarget);
        }

        copiedCount++;
        notifyProgress({ currentItem: item.rel, percentage: Math.round((copiedCount / totalCount) * 100), copiedCount, totalCount });
      }

      return { success: true, targetPath: targetPath.replace(/\\/g, '/') };
    }
  } catch (err) {
    try {
      if (fs.existsSync(targetPath)) {
        await fs.promises.rm(targetPath, { recursive: true, force: true });
      }
    } catch {}

    if (err && (err.code === 'CANCELLED' || activeCopies.get(copyId)?.cancelled)) {
      return {
        success: false,
        cancelled: true,
        error: 'La copie a été annulée. L’élément original n’a pas été modifié.',
      };
    }

    let msg = 'La copie n\'a pas pu être créée.';
    if (err.code === 'ENOSPC') {
      msg = 'Espace disque insuffisant pour réaliser la copie.';
    } else if (err.code === 'EACCES' || err.code === 'EPERM') {
      msg = 'Accès refusé lors de la création de la copie.';
    } else if (err.code === 'EBUSY') {
      msg = 'Fichier verrouillé par une autre application.';
    }
    return {
      success: false,
      error: `${msg} Le fichier original n'a pas été modifié.`,
      code: err.code || 'UNKNOWN',
    };
  } finally {
    activeCopies.delete(copyId);
  }
});

ipcMain.handle('fs:cancelCopy', async (_event, copyId) => {
  if (copyId && activeCopies.has(copyId)) {
    activeCopies.get(copyId).cancelled = true;
    return { success: true };
  }
  return { success: false };
});

ipcMain.handle('fs:undoCopy', async (_event, copyPath) => {
  if (!copyPath) {
    return { success: false, error: 'Chemin d\'accès de la copie invalide.', code: 'INVALID_PATH' };
  }

  const decision = checkFileOperation({ operation: 'restore', targetPath: copyPath });
  if (!decision.allowed) {
    logSecurityPolicyViolation('undoCopy', decision.code, 'pre_execution_policy', { copyPath });
    return {
      success: false,
      error: 'L’opération ne peut plus être annulée automatiquement, car les fichiers ont changé depuis son exécution. Aucun fichier existant n’a été remplacé.',
      code: 'UNDO_CONFLICT',
    };
  }

  try {
    try {
      await fs.promises.access(copyPath);
    } catch {
      return {
        success: false,
        error: 'L’opération ne peut plus être annulée automatiquement, car les fichiers ont changé depuis son exécution. Aucun fichier existant n’a été remplacé.',
        code: 'UNDO_CONFLICT',
      };
    }

    const winCopyPath = path.win32 ? path.win32.normalize(path.resolve(copyPath)) : path.resolve(copyPath);
    if (shell && typeof shell.trashItem === 'function') {
      await shell.trashItem(winCopyPath);
      return { success: true };
    } else {
      return {
        success: false,
        error: 'Windows ne permet pas de placer cet élément dans la Corbeille. Aucune suppression définitive n’a été effectuée.',
        code: 'TRASH_UNSUPPORTED',
      };
    }
  } catch (err) {
    return {
      success: false,
      error: 'L’opération ne peut plus être annulée automatiquement, car les fichiers ont changé depuis son exécution. Aucun fichier existant n’a été remplacé.',
      code: 'UNDO_CONFLICT',
    };
  }
});

ipcMain.handle('fs:moveEntry', async (event, { sourcePath, destDirPath, newName, moveId }) => {
  if (!sourcePath || !destDirPath || !newName || !moveId) {
    return { success: false, error: 'Paramètres invalides. L’élément original n’a pas été modifié.', code: 'INVALID_PATH' };
  }

  const decision = checkFileOperation({ operation: 'move', sourcePath, destinationPath: destDirPath, newName });
  if (!decision.allowed) {
    logSecurityPolicyViolation('move', decision.code, 'pre_execution_policy', { sourcePath, destDirPath, newName });
    return {
      success: false,
      error: decision.message,
      code: decision.code,
    };
  }

  let sourceStat;
  try {
    const attr = await inspectItemAttributes(sourcePath);
    if (!attr.exists) {
      return {
        success: false,
        error: 'Élément d\'origine introuvable ou inaccessible. L’élément original n\'a pas été modifié.',
        code: 'SOURCE_NOT_FOUND',
      };
    }
    sourceStat = attr.stat;
  } catch (err) {
    return {
      success: false,
      error: 'Élément d\'origine introuvable ou inaccessible. L’élément original n\'a pas été modifié.',
      code: err.code || 'ENOENT',
    };
  }

  let destStat;
  try {
    destStat = await fs.promises.stat(destDirPath);
    if (!destStat.isDirectory()) {
      return { success: false, error: 'Le dossier de destination n\'est pas valide. L’élément original n\'a pas été modifié.', code: 'DESTINATION_NOT_DIRECTORY' };
    }
  } catch (err) {
    return {
      success: false,
      error: 'Le dossier de destination est introuvable ou inaccessible. L’élément original n\'a pas été modifié.',
      code: err.code || 'EACCES',
    };
  }

  const targetPath = path.join(destDirPath, newName);
  try {
    await fs.promises.access(targetPath);
    return {
      success: false,
      error: `Un ${sourceStat.isDirectory() ? 'dossier' : 'fichier'} portant ce nom existe déjà dans la destination. Aucun fichier n'a été modifié.`,
      code: 'NAME_CONFLICT',
    };
  } catch {
    // Expected targetPath does not exist
  }

  activeMoves.set(moveId, { cancelled: false });

  const notifyProgress = (data) => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('fs:moveProgress', { moveId, ...data });
    }
  };

  const sourceRoot = path.parse(sourcePath).root.toLowerCase();
  const destRoot = path.parse(destDirPath).root.toLowerCase();
  const isSameVolume = sourceRoot === destRoot;

  try {
    if (isSameVolume) {
      notifyProgress({ currentItem: newName, percentage: 50, movedCount: 0, totalCount: 1 });
      if (activeMoves.get(moveId)?.cancelled) {
        throw { code: 'CANCELLED' };
      }

      await fs.promises.rename(sourcePath, targetPath);

      try {
        await fs.promises.access(targetPath);
      } catch {
        return {
          success: false,
          error: 'Impossible de vérifier la destination après déplacement. Le fichier original n\'a pas été déplacé.',
          code: 'OPERATION_RESULT_INVALID',
        };
      }

      notifyProgress({ currentItem: newName, percentage: 100, movedCount: 1, totalCount: 1 });
      return { success: true, targetPath: targetPath.replace(/\\/g, '/'), sameVolume: true };
    } else {
      if (!sourceStat.isDirectory()) {
        notifyProgress({ currentItem: newName, percentage: 30, movedCount: 0, totalCount: 1 });

        if (activeMoves.get(moveId)?.cancelled) {
          throw { code: 'CANCELLED' };
        }

        await fs.promises.copyFile(sourcePath, targetPath);

        if (activeMoves.get(moveId)?.cancelled) {
          try { await fs.promises.unlink(targetPath); } catch {}
          throw { code: 'CANCELLED' };
        }

        const checkStat = await fs.promises.stat(targetPath);
        if (sourceStat.size > 0 && checkStat.size === 0) {
          try { await fs.promises.unlink(targetPath); } catch {}
          return { success: false, error: 'La copie intermédiaire est incomplète. Le fichier original n\'a pas été modifié.', code: 'OPERATION_RESULT_INVALID' };
        }

        await fs.promises.unlink(sourcePath);

        notifyProgress({ currentItem: newName, percentage: 100, movedCount: 1, totalCount: 1 });
        return { success: true, targetPath: targetPath.replace(/\\/g, '/'), sameVolume: false };
      } else {
        const allEntries = [];
        const visitedSymlinks = new Set();

        async function collectEntries(srcDir, relativePath = '') {
          const entries = await fs.promises.readdir(srcDir, { withFileTypes: true });
          for (const entry of entries) {
            const entrySrc = path.join(srcDir, entry.name);
            const entryRel = path.join(relativePath, entry.name);

            let isDir = entry.isDirectory();
            if (entry.isSymbolicLink()) {
              const symKey = entrySrc.toLowerCase();
              if (visitedSymlinks.has(symKey)) continue;
              visitedSymlinks.add(symKey);
              try {
                const realStat = await fs.promises.stat(entrySrc);
                isDir = realStat.isDirectory();
              } catch {
                isDir = false;
              }
            }

            allEntries.push({ src: entrySrc, rel: entryRel, isDir });
            if (isDir && !entry.isSymbolicLink()) await collectEntries(entrySrc, entryRel);
          }
        }
        await collectEntries(sourcePath);

        const totalCount = allEntries.length + 1;
        let copiedCount = 0;

        await fs.promises.mkdir(targetPath, { recursive: true });
        copiedCount++;
        notifyProgress({ currentItem: newName, percentage: Math.round((copiedCount / totalCount) * 100), movedCount: copiedCount, totalCount });

        for (const item of allEntries) {
          if (activeMoves.get(moveId)?.cancelled) {
            throw { code: 'CANCELLED' };
          }
          const itemTarget = path.join(targetPath, item.rel);
          if (item.isDir) {
            await fs.promises.mkdir(itemTarget, { recursive: true });
          } else {
            await fs.promises.copyFile(item.src, itemTarget);
          }
          copiedCount++;
          notifyProgress({ currentItem: item.rel, percentage: Math.round((copiedCount / totalCount) * 100), movedCount: copiedCount, totalCount });
        }

        if (activeMoves.get(moveId)?.cancelled) {
          throw { code: 'CANCELLED' };
        }

        await fs.promises.rm(sourcePath, { recursive: true, force: true });

        return { success: true, targetPath: targetPath.replace(/\\/g, '/'), sameVolume: false };
      }
    }
  } catch (err) {
    if (!isSameVolume && fs.existsSync(targetPath)) {
      try { await fs.promises.rm(targetPath, { recursive: true, force: true }); } catch {}
    }

    if (err && (err.code === 'CANCELLED' || activeMoves.get(moveId)?.cancelled)) {
      return {
        success: false,
        cancelled: true,
        error: 'Le déplacement a été annulé. L’élément original est resté à son emplacement initial.',
      };
    }

    let msg = 'Le déplacement n\'a pas pu être terminé.';
    if (err.code === 'ENOSPC') {
      msg = 'Espace disque insuffisant pour réaliser le déplacement.';
    } else if (err.code === 'EACCES' || err.code === 'EPERM') {
      msg = 'Accès refusé lors du déplacement.';
    } else if (err.code === 'EBUSY') {
      msg = 'Fichier utilisé par une autre application.';
    }
    return {
      success: false,
      error: `${msg} L’élément original est resté à son emplacement initial.`,
      code: err.code || 'UNKNOWN',
    };
  } finally {
    activeMoves.delete(moveId);
  }
});

ipcMain.handle('fs:cancelMove', async (_event, moveId) => {
  if (moveId && activeMoves.has(moveId)) {
    activeMoves.get(moveId).cancelled = true;
    return { success: true };
  }
  return { success: false };
});

ipcMain.handle('fs:undoMove', async (_event, { sourcePath, targetPath }) => {
  if (!sourcePath || !targetPath) {
    return { success: false, error: 'Chemins invalides pour l\'annulation du déplacement.', code: 'INVALID_PATH' };
  }

  const decision = checkFileOperation({ operation: 'restore', sourcePath, destinationPath: targetPath });
  if (!decision.allowed) {
    logSecurityPolicyViolation('undoMove', decision.code, 'pre_execution_policy', { sourcePath, targetPath });
    return {
      success: false,
      error: 'L’opération ne peut plus être annulée automatiquement, car les fichiers ont changé depuis son exécution. Aucun fichier existant n’a été remplacé.',
      code: 'UNDO_CONFLICT',
    };
  }

  try {
    await fs.promises.access(targetPath);
  } catch {
    return {
      success: false,
      error: 'L’opération ne peut plus être annulée automatiquement, car les fichiers ont changé depuis son exécution. Aucun fichier existant n’a été remplacé.',
      code: 'UNDO_CONFLICT',
    };
  }

  const sourceParent = path.dirname(sourcePath);
  try {
    await fs.promises.access(sourceParent);
  } catch {
    return {
      success: false,
      error: 'L’opération ne peut plus être annulée automatiquement, car les fichiers ont changé depuis son exécution. Aucun fichier existant n’a été remplacé.',
      code: 'UNDO_CONFLICT',
    };
  }

  try {
    await fs.promises.access(sourcePath);
    return {
      success: false,
      error: 'L’opération ne peut plus être annulée automatiquement, car les fichiers ont changé depuis son exécution. Aucun fichier existant n’a été remplacé.',
      code: 'UNDO_CONFLICT',
    };
  } catch {
    // Expected: sourcePath does not exist
  }

  const sourceRoot = path.parse(sourcePath).root.toLowerCase();
  const targetRoot = path.parse(targetPath).root.toLowerCase();
  const isSameVolume = sourceRoot === targetRoot;

  try {
    if (isSameVolume) {
      await fs.promises.rename(targetPath, sourcePath);
    } else {
      const stat = await fs.promises.stat(targetPath);
      if (!stat.isDirectory()) {
        await fs.promises.copyFile(targetPath, sourcePath);
        await fs.promises.unlink(targetPath);
      } else {
        const allEntries = [];
        async function collectEntries(srcDir, relativePath = '') {
          const entries = await fs.promises.readdir(srcDir, { withFileTypes: true });
          for (const entry of entries) {
            const entrySrc = path.join(srcDir, entry.name);
            const entryRel = path.join(relativePath, entry.name);
            allEntries.push({ src: entrySrc, rel: entryRel, isDir: entry.isDirectory() });
            if (entry.isDirectory()) await collectEntries(entrySrc, entryRel);
          }
        }
        await collectEntries(targetPath);
        await fs.promises.mkdir(sourcePath, { recursive: true });
        for (const item of allEntries) {
          const itemDest = path.join(sourcePath, item.rel);
          if (item.isDir) await fs.promises.mkdir(itemDest, { recursive: true });
          else await fs.promises.copyFile(item.src, itemDest);
        }
        await fs.promises.rm(targetPath, { recursive: true, force: true });
      }
    }
    return { success: true };
  } catch (err) {
    return {
      success: false,
      error: 'L’opération ne peut plus être annulée automatiquement, car les fichiers ont changé depuis son exécution. Aucun fichier existant n’a été remplacé.',
      code: 'UNDO_CONFLICT',
    };
  }
});


ipcMain.handle('fs:readFileBuffer', async (_event, filePath, options) => {
  const maxBytes = typeof options === 'number' ? options : options?.maxBytes;
  let fileHandle = null;
  try {
    fileHandle = await fs.promises.open(filePath, 'r');
    const stat = await fileHandle.stat();
    const totalSize = stat.size;
    const bytesToRead = (typeof maxBytes === 'number' && maxBytes > 0)
      ? Math.min(totalSize, maxBytes)
      : totalSize;

    const buffer = Buffer.alloc(bytesToRead);
    if (bytesToRead > 0) {
      await fileHandle.read(buffer, 0, bytesToRead, 0);
    }
    const arrayBuffer = buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength);
    return {
      buffer: arrayBuffer,
      totalSize,
    };
  } catch (err) {
    console.error('Failed to read file:', filePath, err);
    return null;
  } finally {
    if (fileHandle) {
      try {
        await fileHandle.close();
      } catch {
        // Ignore handle close errors
      }
    }
  }
});

ipcMain.handle('fs:trashItem', async (_event, options) => {
  const targetPath = typeof options === 'string' ? options : options?.targetPath;
  const appRootDir = typeof options === 'object' ? options?.appRootDir : '';

  if (!targetPath) {
    return {
      success: false,
      error: 'Élément introuvable ou chemin d’accès invalide. Aucun fichier n’a été modifié.',
      code: 'INVALID_PATH',
    };
  }

  const decision = checkFileOperation({ operation: 'trash', targetPath, appRootDir });
  if (!decision.allowed) {
    logSecurityPolicyViolation('trash', decision.code, 'pre_execution_policy', { targetPath });
    return {
      success: false,
      isProtected: true,
      error: decision.message,
      code: decision.code,
    };
  }

  let stat;
  try {
    const attr = await inspectItemAttributes(targetPath);
    if (!attr.exists) {
      return {
        success: false,
        error: 'L’élément n’a pas pu être placé dans la Corbeille car il est introuvable ou déjà déplacé. Il est toujours présent à son emplacement initial s’il existait. Aucun autre fichier n’a été modifié.',
        code: 'SOURCE_NOT_FOUND',
      };
    }
    stat = attr.stat;
  } catch (err) {
    return {
      success: false,
      error: 'L’élément n’a pas pu être placé dans la Corbeille car il est introuvable ou déjà déplacé. Il est toujours présent à son emplacement initial s’il existait. Aucun autre fichier n’a été modified.',
      code: err.code || 'ENOENT',
    };
  }

  const isDirectory = stat.isDirectory();
  const name = path.basename(targetPath);
  const parentPath = path.dirname(targetPath).replace(/\\/g, '/');
  const dateTimeStr = new Date().toLocaleString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });

  const winPath = path.win32 ? path.win32.normalize(path.resolve(targetPath)) : path.resolve(targetPath);

  if (!shell || typeof shell.trashItem !== 'function') {
    return {
      success: false,
      error: 'Windows ne permet pas de placer cet élément dans la Corbeille. Aucune suppression définitive n’a été effectuée.',
      code: 'TRASH_UNSUPPORTED',
    };
  }

  try {
    await shell.trashItem(winPath);

    let stillExists = false;
    try {
      await fs.promises.access(winPath);
      stillExists = true;
    } catch {
      stillExists = false;
    }

    if (stillExists) {
      return {
        success: false,
        error: `Le ${isDirectory ? 'dossier' : 'fichier'} n’a pas pu être placed dans la Corbeille. Il est toujours présent à son emplacement initial. Aucun autre fichier n’a été modifié.`,
        code: 'FAILED_TO_REMOVE',
      };
    }

    return {
      success: true,
      isDirectory,
      name,
      parentPath,
      targetPath: targetPath.replace(/\\/g, '/'),
      dateTime: dateTimeStr,
    };
  } catch (err) {
    let stillExists = true;
    try {
      await fs.promises.access(winPath);
    } catch {
      stillExists = false;
    }

    if (!stillExists) {
      return {
        success: false,
        uncertainState: true,
        error: 'L’opération n’a pas pu être confirmée. Actualisez le dossier pour vérifier l’état de l’élément.',
        code: 'UNCERTAIN_STATE',
      };
    }

    let errorMsg = `Le ${isDirectory ? 'dossier' : 'fichier'} n’a pas pu être placé dans la Corbeille.`;
    if (err.code === 'EACCES' || err.code === 'EPERM') {
      errorMsg = 'Accès refusé par Windows lors de la mise à la Corbeille.';
    } else if (err.code === 'EBUSY') {
      errorMsg = 'L’élément est utilisé par une autre application.';
    } else if (err.code === 'ENOENT') {
      errorMsg = 'L’élément est introuvable ou a été déplacé.';
    }

    return {
      success: false,
      error: `${errorMsg} Il est toujours présent à son emplacement initial. Aucun autre fichier n’a été modifié.`,
      code: err.code || 'UNKNOWN',
    };
  }
});

ipcMain.handle('fs:getFileMetadata', async (_event, filePath) => {
  const val = validatePathAccess(filePath);
  if (!val.valid) {
    return { success: false, error: `Accès refusé : ${val.reason}`, code: val.reason };
  }

  try {
    const stat = await fs.promises.stat(val.normalizedPath);
    if (!stat.isFile()) {
      return { success: false, error: 'L\'élément sélectionné n\'est pas un fichier.', code: 'NOT_A_FILE' };
    }

    const token = crypto.randomBytes(16).toString('hex');
    activePreviewTokens.set(token, { filePath: val.normalizedPath, createdAt: Date.now() });

    const now = Date.now();
    for (const [t, info] of activePreviewTokens.entries()) {
      if (now - info.createdAt > 10 * 60 * 1000) {
        activePreviewTokens.delete(t);
      }
    }

    const mediaUrl = `app-media://file?path=${encodeURIComponent(val.normalizedPath)}&token=${token}`;
    const name = path.basename(val.normalizedPath);
    const dotIndex = name.lastIndexOf('.');
    const ext = dotIndex >= 0 ? name.slice(dotIndex + 1).toLowerCase() : '';

    return {
      success: true,
      path: val.normalizedPath.replace(/\\/g, '/'),
      name,
      ext,
      size: stat.size,
      mtime: stat.mtime.toISOString(),
      isFile: true,
      isDir: false,
      token,
      mediaUrl,
    };
  } catch (err) {
    let errorMsg = 'Impossible d\'accéder aux métadonnées du fichier.';
    if (err.code === 'ENOENT') errorMsg = 'Fichier introuvable.';
    else if (err.code === 'EACCES' || err.code === 'EPERM') errorMsg = 'Accès refusé.';
    return { success: false, error: `${errorMsg} Le fichier n'a pas été modifié.`, code: err.code || 'UNKNOWN' };
  }
});

ipcMain.handle('fs:readTextBuffer', async (_event, filePath, options) => {
  const val = validatePathAccess(filePath);
  if (!val.valid) return { success: false, error: `Accès refusé : ${val.reason}`, code: val.reason };

  const maxBytes = 1024 * 1024;
  const requestedMax = typeof options === 'number' ? options : options?.maxBytes;
  const limitBytes = (typeof requestedMax === 'number' && requestedMax > 0) ? Math.min(requestedMax, maxBytes) : maxBytes;

  let fileHandle = null;
  try {
    fileHandle = await fs.promises.open(val.normalizedPath, 'r');
    const stat = await fileHandle.stat();
    if (stat.size > maxBytes && (!requestedMax || requestedMax >= stat.size)) {
      return { success: false, error: 'Fichier texte supérieur à 1 Mo.', code: 'FILE_TOO_LARGE', size: stat.size };
    }
    const bytesToRead = Math.min(stat.size, limitBytes);
    const buffer = Buffer.alloc(bytesToRead);
    if (bytesToRead > 0) {
      await fileHandle.read(buffer, 0, bytesToRead, 0);
    }
    const arrayBuffer = buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength);
    return {
      success: true,
      buffer: arrayBuffer,
      totalSize: stat.size,
      truncated: stat.size > bytesToRead,
    };
  } catch (err) {
    return { success: false, error: err.message || 'Impossible de lire le fichier.', code: err.code || 'UNKNOWN' };
  } finally {
    if (fileHandle) {
      try { await fileHandle.close(); } catch {}
    }
  }
});

ipcMain.handle('fs:readDocxBuffer', async (_event, filePath) => {
  const val = validatePathAccess(filePath);
  if (!val.valid) return { success: false, error: `Accès refusé : ${val.reason}`, code: val.reason };

  const maxBytes = 20 * 1024 * 1024;
  let fileHandle = null;
  try {
    fileHandle = await fs.promises.open(val.normalizedPath, 'r');
    const stat = await fileHandle.stat();
    if (stat.size > maxBytes) {
      return { success: false, error: 'Document Word supérieur à 20 Mo.', code: 'FILE_TOO_LARGE', size: stat.size };
    }
    const buffer = Buffer.alloc(stat.size);
    if (stat.size > 0) {
      await fileHandle.read(buffer, 0, stat.size, 0);
    }
    const arrayBuffer = buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength);
    return { success: true, buffer: arrayBuffer, totalSize: stat.size };
  } catch (err) {
    return { success: false, error: err.message || 'Impossible de lire le document Word.', code: err.code || 'UNKNOWN' };
  } finally {
    if (fileHandle) {
      try { await fileHandle.close(); } catch {}
    }
  }
});

ipcMain.handle('fs:revokePreviewToken', (_event, token) => {
  if (token && activePreviewTokens.has(token)) {
    activePreviewTokens.delete(token);
    return { success: true };
  }
  return { success: false };
});

app.whenReady().then(() => {
  protocol.handle('app-media', async (request) => {
    try {
      const parsedUrl = new URL(request.url);
      const rawPath = parsedUrl.searchParams.get('path');
      const token = parsedUrl.searchParams.get('token');

      if (!rawPath || !token || !activePreviewTokens.has(token)) {
        return new Response('Access Denied: Invalid or missing token', { status: 403 });
      }

      const tokenInfo = activePreviewTokens.get(token);
      const normTarget = path.normalize(rawPath).toLowerCase();
      const normTokenPath = path.normalize(tokenInfo.filePath).toLowerCase();

      if (normTarget !== normTokenPath) {
        return new Response('Access Denied: Path mismatch', { status: 403 });
      }

      const val = validatePathAccess(rawPath);
      if (!val.valid) {
        return new Response(`Access Denied: ${val.reason}`, { status: 403 });
      }

      const stat = await fs.promises.stat(val.normalizedPath);
      if (!stat.isFile()) {
        return new Response('Access Denied: Not a file', { status: 403 });
      }

      const fileUrl = pathToFileURL(val.normalizedPath).toString();
      return net.fetch(fileUrl, { headers: request.headers });
    } catch (err) {
      console.error('app-media protocol error:', err);
      return new Response('Internal Server Error', { status: 500 });
    }
  });

  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

