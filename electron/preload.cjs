const { contextBridge, ipcRenderer } = require('electron');

const api = {
  isElectron: true,
  selectDirectory: () => ipcRenderer.invoke('dialog:openDirectory'),
  readDirectory: (dirPath) => ipcRenderer.invoke('fs:readDirectory', dirPath),
  readFileBuffer: (filePath, options) => ipcRenderer.invoke('fs:readFileBuffer', filePath, options),
  openExternal: (filePath) => ipcRenderer.invoke('app:openExternal', filePath),
  renameEntry: (oldPath, newPath) => ipcRenderer.invoke('fs:renameEntry', oldPath, newPath),
  copyEntry: (options) => ipcRenderer.invoke('fs:copyEntry', options),
  cancelCopy: (copyId) => ipcRenderer.invoke('fs:cancelCopy', copyId),
  undoCopy: (copyPath) => ipcRenderer.invoke('fs:undoCopy', copyPath),
  onCopyProgress: (callback) => {
    const listener = (_event, data) => callback(data);
    ipcRenderer.on('fs:copyProgress', listener);
    return () => ipcRenderer.removeListener('fs:copyProgress', listener);
  },
  moveEntry: (options) => ipcRenderer.invoke('fs:moveEntry', options),
  cancelMove: (moveId) => ipcRenderer.invoke('fs:cancelMove', moveId),
  undoMove: (options) => ipcRenderer.invoke('fs:undoMove', options),
  onMoveProgress: (callback) => {
    const listener = (_event, data) => callback(data);
    ipcRenderer.on('fs:moveProgress', listener);
    return () => ipcRenderer.removeListener('fs:moveProgress', listener);
  },
};

contextBridge.exposeInMainWorld('electronAPI', api);
