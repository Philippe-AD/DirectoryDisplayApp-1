const { contextBridge, ipcRenderer } = require('electron');

const api = {
  isElectron: true,
  selectDirectory: () => ipcRenderer.invoke('dialog:openDirectory'),
  readDirectory: (dirPath) => ipcRenderer.invoke('fs:readDirectory', dirPath),
  readFileBuffer: (filePath, options) => ipcRenderer.invoke('fs:readFileBuffer', filePath, options),
  openExternal: (filePath) => ipcRenderer.invoke('app:openExternal', filePath),
};


contextBridge.exposeInMainWorld('electronAPI', api);
