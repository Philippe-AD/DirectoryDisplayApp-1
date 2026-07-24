const { contextBridge, ipcRenderer } = require('electron');

const api = {
  isElectron: true,
  selectDirectory: () => ipcRenderer.invoke('dialog:openDirectory'),
  readDirectory: (dirPath) => ipcRenderer.invoke('fs:readDirectory', dirPath),
  readFileBuffer: (filePath) => ipcRenderer.invoke('fs:readFileBuffer', filePath),
};

contextBridge.exposeInMainWorld('electronAPI', api);
