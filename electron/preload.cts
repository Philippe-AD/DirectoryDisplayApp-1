import { contextBridge, ipcRenderer } from 'electron';

export interface NativeFileItem {
  name: string;
  type: 'file' | 'directory';
  size?: number;
  path: string;
}

export interface ElectronAPI {
  isElectron: boolean;
  selectDirectory: () => Promise<string | null>;
  readDirectory: (dirPath: string) => Promise<{ files: NativeFileItem[]; error?: string }>;
  readFileBuffer: (filePath: string) => Promise<ArrayBuffer | null>;
}

const api: ElectronAPI = {
  isElectron: true,
  selectDirectory: () => ipcRenderer.invoke('dialog:openDirectory'),
  readDirectory: (dirPath: string) => ipcRenderer.invoke('fs:readDirectory', dirPath),
  readFileBuffer: (filePath: string) => ipcRenderer.invoke('fs:readFileBuffer', filePath),
};

contextBridge.exposeInMainWorld('electronAPI', api);
