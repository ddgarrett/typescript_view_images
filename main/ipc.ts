/**
 * Registers all IPC handlers for the main process: folder open/save, file open/save,
 * open media viewer, and get-media-viewer-args for the viewer window.
 */

import { ipcMain, dialog } from 'electron';
import * as fs from 'fs';
import type { FolderNode } from '../types.js';
import { scanDirectory } from './folderTree.js';
import { createMediaViewerWindow, mediaViewerArgs } from './windows.js';

export function registerIpcHandlers(): void {
  ipcMain.handle('dialog:openFolder', async (): Promise<FolderNode | null> => {
    const { canceled, filePaths } = await dialog.showOpenDialog({
      properties: ['openDirectory']
    });
    if (canceled || filePaths.length === 0) return null;
    return scanDirectory(filePaths[0]);
  });

  ipcMain.handle('dialog:saveFile', async (_event, jsonData: string): Promise<boolean> => {
    const { canceled, filePath } = await dialog.showSaveDialog({
      title: 'Save Folder Structure',
      filters: [{ name: 'JSON Files', extensions: ['json'] }]
    });
    if (!canceled && filePath) {
      fs.writeFileSync(filePath, jsonData, 'utf-8');
      return true;
    }
    return false;
  });

  ipcMain.handle('dialog:openFile', async (): Promise<FolderNode | null> => {
    const { canceled, filePaths } = await dialog.showOpenDialog({
      title: 'Open Folder Structure',
      properties: ['openFile'],
      filters: [{ name: 'JSON Files', extensions: ['json'] }]
    });
    if (!canceled && filePaths.length > 0) {
      const rawData = fs.readFileSync(filePaths[0], 'utf-8');
      return JSON.parse(rawData) as FolderNode;
    }
    return null;
  });

  ipcMain.handle(
    'openMediaViewer',
    (_event, filePath: string, type: 'image' | 'video'): void => {
      createMediaViewerWindow(filePath, type);
    }
  );

  ipcMain.handle(
    'get-media-viewer-args',
    (event): { filePath: string; type: 'image' | 'video' } | null => {
      return mediaViewerArgs.get(event.sender.id) ?? null;
    }
  );
}
