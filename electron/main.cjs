const { app, BrowserWindow, ipcMain, dialog, shell } = require('electron');
const path = require('path');
const fs = require('fs');

let mainWindow = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    title: 'Directory Display App',
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: false,
      plugins: true,
    },
  });

  mainWindow.maximize();

  const devServerUrl = process.env.VITE_DEV_SERVER_URL || 'http://localhost:5173';

  if (!app.isPackaged && process.env.NODE_ENV !== 'production') {
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
  return result.filePaths[0];
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
  try {
    try {
      await fs.promises.access(oldPath);
    } catch {
      return {
        success: false,
        error: 'Élément introuvable. Il a peut-être été supprimé ou déplacé. Aucune autre modification n\'a été effectuée.',
        code: 'ENOENT',
      };
    }

    const parentDir = path.dirname(newPath);
    try {
      await fs.promises.access(parentDir);
    } catch {
      return {
        success: false,
        error: 'Le dossier parent n\'est pas accessible. Aucune autre modification n\'a été effectuée.',
        code: 'EACCES',
      };
    }

    await fs.promises.rename(oldPath, newPath);
    return { success: true };
  } catch (err) {
    let errorMsg = 'Impossible de renommer l\'élément.';
    if (err.code === 'ENOENT') {
      errorMsg = 'Élément introuvable.';
    } else if (err.code === 'EACCES' || err.code === 'EPERM') {
      errorMsg = 'Accès refusé.';
    } else if (err.code === 'EBUSY') {
      errorMsg = 'Le fichier est utilisé par une autre application.';
    } else if (err.code === 'EEXIST') {
      errorMsg = 'Un fichier ou dossier portant ce nom existe déjà.';
    }
    return {
      success: false,
      error: `${errorMsg} Aucune autre modification n'a été effectuée.`,
      code: err.code || 'UNKNOWN',
    };
  }
});

ipcMain.handle('fs:copyEntry', async (event, { sourcePath, destDirPath, newName, copyId }) => {
  if (!sourcePath || !destDirPath || !newName || !copyId) {
    return { success: false, error: 'Paramètres invalides. Le fichier original n\'a pas été modifié.' };
  }

  let sourceStat;
  try {
    sourceStat = await fs.promises.stat(sourcePath);
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
      return { success: false, error: 'Le dossier de destination n\'est pas valide. Le fichier original n\'a pas été modifié.' };
    }
  } catch (err) {
    return {
      success: false,
      error: 'Le dossier de destination est introuvable ou inaccessible. Le fichier original n\'a pas été modifié.',
      code: err.code || 'EACCES',
    };
  }

  const normSource = path.normalize(sourcePath).toLowerCase();
  const normDest = path.normalize(destDirPath).toLowerCase();

  if (normDest === normSource) {
    return {
      success: false,
      error: 'Ce dossier ne peut pas être copié à l\'intérieur de lui-même. Aucun fichier n\'a été modifié.',
    };
  }
  if (sourceStat.isDirectory() && normDest.startsWith(normSource + path.sep)) {
    return {
      success: false,
      error: 'Ce dossier ne peut pas être copié à l\'intérieur de l\'un de ses propres descendants. Aucun fichier n\'a été modifié.',
    };
  }

  const targetPath = path.join(destDirPath, newName);
  try {
    await fs.promises.access(targetPath);
    return {
      success: false,
      error: `Un ${sourceStat.isDirectory() ? 'dossier' : 'fichier'} portant ce nom existe déjà dans la destination. Aucun fichier n'a été modifié.`,
      code: 'EEXIST',
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
        return { success: false, error: 'La copie créée est incomplète. Le fichier original n\'a pas été modifié.' };
      }

      notifyProgress({ currentItem: newName, percentage: 100, copiedCount: 1, totalCount: 1 });
      return { success: true, targetPath: targetPath.replace(/\\/g, '/') };
    } else {
      const allEntries = [];
      async function collectEntries(srcDir, relativePath = '') {
        const entries = await fs.promises.readdir(srcDir, { withFileTypes: true });
        for (const entry of entries) {
          const entrySrc = path.join(srcDir, entry.name);
          const entryRel = path.join(relativePath, entry.name);
          allEntries.push({ src: entrySrc, rel: entryRel, isDir: entry.isDirectory() });
          if (entry.isDirectory()) {
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
    return { success: false, error: 'Chemin d\'accès de la copie invalide.' };
  }

  try {
    try {
      await fs.promises.access(copyPath);
    } catch {
      return {
        success: false,
        error: 'L\'élément à annuler n\'existe plus ou a été déplacé. L\'annulation est impossible.',
      };
    }

    const winCopyPath = path.win32 ? path.win32.normalize(path.resolve(copyPath)) : path.resolve(copyPath);
    if (shell && typeof shell.trashItem === 'function') {
      await shell.trashItem(winCopyPath);
      return { success: true };
    } else {
      await fs.promises.rm(winCopyPath, { recursive: true, force: true });
      return { success: true };
    }
  } catch (err) {
    return {
      success: false,
      error: `Impossible de placer la copie dans la Corbeille : ${err.message || 'Erreur d\'accès'}. L'élément original n'a pas été modifié.`,
    };
  }
});

ipcMain.handle('fs:moveEntry', async (event, { sourcePath, destDirPath, newName, moveId }) => {
  if (!sourcePath || !destDirPath || !newName || !moveId) {
    return { success: false, error: 'Paramètres invalides. L’élément original n’a pas été modifié.' };
  }

  let sourceStat;
  try {
    sourceStat = await fs.promises.stat(sourcePath);
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
      return { success: false, error: 'Le dossier de destination n\'est pas valide. L’élément original n\'a pas été modifié.' };
    }
  } catch (err) {
    return {
      success: false,
      error: 'Le dossier de destination est introuvable ou inaccessible. L’élément original n\'a pas été modifié.',
      code: err.code || 'EACCES',
    };
  }

  const normSource = path.normalize(sourcePath).toLowerCase();
  const normDest = path.normalize(destDirPath).toLowerCase();
  const sourceParent = path.dirname(normSource);

  if (normDest === sourceParent) {
    return {
      success: false,
      error: 'L’élément se trouve déjà dans ce dossier. Aucun déplacement n’a été effectué.',
    };
  }

  if (normDest === normSource) {
    return {
      success: false,
      error: 'Ce dossier ne peut pas être déplacé à l\'intérieur de lui-même. Aucun fichier n\'a été modifié.',
    };
  }

  if (sourceStat.isDirectory() && normDest.startsWith(normSource + path.sep)) {
    return {
      success: false,
      error: 'Ce dossier ne peut pas être déplacé à l\'intérieur de l\'un de ses propres descendants. Aucun fichier n\'a été modifié.',
    };
  }

  const protectedDirs = ['c:\\windows', 'c:\\program files', 'c:\\program files (x86)', 'c:\\programdata', 'c:\\$recycle.bin', 'c:\\system volume information'];
  if (protectedDirs.some(p => normSource === p || normSource.startsWith(p + path.sep) || normDest === p || normDest.startsWith(p + path.sep))) {
    return {
      success: false,
      error: 'L\'opération concerne un emplacement système protégé ou sensible. Le déplacement est refusé.',
    };
  }

  const targetPath = path.join(destDirPath, newName);
  try {
    await fs.promises.access(targetPath);
    return {
      success: false,
      error: `Un ${sourceStat.isDirectory() ? 'dossier' : 'fichier'} portant ce nom existe déjà dans la destination. Aucun fichier n'a été modifié.`,
      code: 'EEXIST',
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
          return { success: false, error: 'La copie intermédiaire est incomplète. Le fichier original n\'a pas été modifié.' };
        }

        await fs.promises.unlink(sourcePath);

        notifyProgress({ currentItem: newName, percentage: 100, movedCount: 1, totalCount: 1 });
        return { success: true, targetPath: targetPath.replace(/\\/g, '/'), sameVolume: false };
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
    return { success: false, error: 'Chemins invalides pour l\'annulation du déplacement.' };
  }

  try {
    await fs.promises.access(targetPath);
  } catch {
    return {
      success: false,
      error: 'Le déplacement ne peut plus être annulé, car un autre fichier portant le même nom existe maintenant dans l\'ancien dossier ou l\'élément a été supprimé. Aucun fichier n’a été modifié.',
    };
  }

  const sourceParent = path.dirname(sourcePath);
  try {
    await fs.promises.access(sourceParent);
  } catch {
    return {
      success: false,
      error: 'Le déplacement ne peut plus être annulé, car l’ancien dossier n’existe plus ou n’est pas accessible. Aucun fichier n’a été modifié.',
    };
  }

  try {
    await fs.promises.access(sourcePath);
    return {
      success: false,
      error: 'Le déplacement ne peut plus être annulé, car un autre fichier portant le même nom existe maintenant dans l\'ancien dossier. Aucun fichier n\'a été modifié.',
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
      error: `L'annulation a échoué : ${err.message || 'Erreur d\'accès'}. Aucun fichier n'a été modifié.`,
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

  const norm = targetPath.replace(/\\/g, '/').replace(/\/+$/, '').toLowerCase();

  if (/^[a-z]:?$/i.test(norm) || norm === '' || norm === '/') {
    return {
      success: false,
      isProtected: true,
      error: 'Cet élément est protégé et ne peut pas être placé dans la Corbeille depuis DirectoryDisplayApp. Aucun fichier n’a été modifié.',
      code: 'PROTECTED',
    };
  }

  if (appRootDir) {
    const normAppRoot = appRootDir.replace(/\\/g, '/').replace(/\/+$/, '').toLowerCase();
    if (norm === normAppRoot) {
      return {
        success: false,
        isProtected: true,
        error: 'Cet élément est protégé et ne peut pas être placé dans la Corbeille depuis DirectoryDisplayApp. Aucun fichier n’a été modifié.',
        code: 'PROTECTED_APP_ROOT',
      };
    }
  }

  const protectedPrefixes = [
    'c:/windows',
    'c:/program files',
    'c:/program files (x86)',
    'c:/programdata',
    'c:/system volume information',
    'c:/$recycle.bin',
    'c:/boot',
    'c:/recovery',
  ];

  if (protectedPrefixes.some((prefix) => norm === prefix || norm.startsWith(prefix + '/'))) {
    return {
      success: false,
      isProtected: true,
      error: 'Cet élément est protégé et ne peut pas être placé dans la Corbeille depuis DirectoryDisplayApp. Aucun fichier n’a été modifié.',
      code: 'PROTECTED_SYSTEM',
    };
  }

  let stat;
  try {
    stat = await fs.promises.stat(targetPath);
  } catch (err) {
    return {
      success: false,
      error: 'L’élément n’a pas pu être placé dans la Corbeille car il est introuvable ou déjà déplacé. Il est toujours présent à son emplacement initial s’il existait. Aucun autre fichier n’a été modifié.',
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
  try {
    if (shell && typeof shell.trashItem === 'function') {
      await shell.trashItem(winPath);
    } else {
      await fs.promises.rm(winPath, { recursive: true, force: true });
    }

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
        error: `Le ${isDirectory ? 'dossier' : 'fichier'} n’a pas pu être placé dans la Corbeille. Il est toujours présent à son emplacement initial. Aucun autre fichier n’a été modifié.`,
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

app.whenReady().then(() => {
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
