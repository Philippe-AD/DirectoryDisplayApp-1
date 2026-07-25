const { contextBridge, ipcRenderer } = require('electron');

const api = {
  isElectron: true,
  getAppVersion: () => ipcRenderer.invoke('app:getVersion'),
  selectDirectory: () => ipcRenderer.invoke('dialog:openDirectory'),
  readDirectory: (dirPath) => ipcRenderer.invoke('fs:readDirectory', dirPath),
  readFileBuffer: (filePath, options) => ipcRenderer.invoke('fs:readFileBuffer', filePath, options),
  getFileMetadata: (filePath) => ipcRenderer.invoke('fs:getFileMetadata', filePath),
  readTextBuffer: (filePath, options) => ipcRenderer.invoke('fs:readTextBuffer', filePath, options),
  readDocxBuffer: (filePath) => ipcRenderer.invoke('fs:readDocxBuffer', filePath),
  revokePreviewToken: (token) => ipcRenderer.invoke('fs:revokePreviewToken', token),
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
  trashItem: (options) => ipcRenderer.invoke('fs:trashItem', options),
};

contextBridge.exposeInMainWorld('electronAPI', api);
