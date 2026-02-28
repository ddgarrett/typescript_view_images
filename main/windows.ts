/**
 * Creates and configures Electron windows: main app window and media viewer (image/video) popups.
 * Uses app root for preload and HTML paths; media viewer args stored for IPC.
 */

import { BrowserWindow } from 'electron';
import * as path from 'path';

/** App root directory (where main.js, preload.js, index.html live). */
let appRoot: string;

export function setAppRoot(root: string): void {
  appRoot = root;
}

/** Stores (filePath, type) per media viewer window for get-media-viewer-args. */
export const mediaViewerArgs = new Map<
  number,
  { filePath: string; type: 'image' | 'video' }
>();

export function createMainWindow(): void {
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: path.join(appRoot, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  void win.loadFile(path.join(appRoot, 'index.html'));
}

export function createMediaViewerWindow(filePath: string, type: 'image' | 'video'): void {
  const win = new BrowserWindow({
    width: 800,
    height: 600,
    title: path.basename(filePath),
    webPreferences: {
      preload: path.join(appRoot, 'media-viewer-preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  const id = win.webContents.id;
  mediaViewerArgs.set(id, { filePath, type });

  win.webContents.on('destroyed', () => {
    mediaViewerArgs.delete(id);
  });

  void win.loadFile(path.join(appRoot, 'media-viewer.html'));
}
