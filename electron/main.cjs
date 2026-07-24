const { app, BrowserWindow, ipcMain, dialog } = require('electron');
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
    },
  });

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
    mainWindow.webContents.openDevTools();
  } else {
    const indexPath = path.join(__dirname, '../dist/index.html');
    mainWindow.loadFile(indexPath);
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// IPC Handlers
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

ipcMain.handle('fs:readFileBuffer', async (_event, filePath) => {
  try {
    const buffer = await fs.promises.readFile(filePath);
    return buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength);
  } catch (err) {
    console.error('Failed to read file:', filePath, err);
    return null;
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
