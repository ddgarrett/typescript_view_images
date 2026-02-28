import { contextBridge, ipcRenderer } from 'electron';
import type { ElectronAPI, FolderNode } from './types';

const api: ElectronAPI = {
  openFolder: () => ipcRenderer.invoke('dialog:openFolder') as Promise<FolderNode | null>,
  saveFile: (data: string) => ipcRenderer.invoke('dialog:saveFile', data) as Promise<boolean>,
  openFile: () => ipcRenderer.invoke('dialog:openFile') as Promise<FolderNode | null>,
  openMediaViewer: (filePath: string, type: 'image' | 'video') =>
    ipcRenderer.invoke('openMediaViewer', filePath, type) as Promise<void>
};

contextBridge.exposeInMainWorld('electronAPI', api);

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}

