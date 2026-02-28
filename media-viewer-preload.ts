/**
 * Preload script for the media viewer window (image/video popup). Exposes mediaViewerAPI.getArgs()
 * so the viewer page can request the file path and type passed when the window was opened.
 */

import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('mediaViewerAPI', {
  getArgs: () => ipcRenderer.invoke('get-media-viewer-args') as Promise<{ filePath: string; type: 'image' | 'video' } | null>
});
