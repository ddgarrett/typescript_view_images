import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('mediaViewerAPI', {
  getArgs: () => ipcRenderer.invoke('get-media-viewer-args') as Promise<{ filePath: string; type: 'image' | 'video' } | null>
});
