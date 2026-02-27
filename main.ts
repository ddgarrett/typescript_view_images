import { app, BrowserWindow, ipcMain, dialog } from 'electron';
import * as path from 'path';
import * as fs from 'fs';
import { FolderNode, FileNode, MediaNode } from './types';

function createWindow(): void {
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  void win.loadFile('index.html');
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

const mediaExts = new Set(['.jpg', '.jpeg', '.png', '.gif', '.webp', '.mp4', '.webm', '.ogg']);

function createFolderNode(dirPath: string): FolderNode {
  return {
    name: path.basename(dirPath),
    path: dirPath,
    type: 'folder',
    children: []
  };
}

function createFileNode(filePath: string, stat: fs.Stats): FileNode | null {
  const ext = path.extname(filePath).toLowerCase();
  if (!mediaExts.has(ext)) {
    return null;
  }

  const isVideo = ['.mp4', '.webm', '.ogg'].includes(ext);

  return {
    name: path.basename(filePath),
    path: filePath,
    type: isVideo ? 'video' : 'image',
    size: stat.size
  };
}

function scanDirectory(dirPath: string): FolderNode {
  const result = createFolderNode(dirPath);
  try {
    const items = fs.readdirSync(dirPath);
    for (const item of items) {
      const fullPath = path.join(dirPath, item);
      const stat = fs.statSync(fullPath);

      if (stat.isDirectory()) {
        const subDir = scanDirectory(fullPath);
        if (subDir.children.length > 0) {
          result.children.push(subDir);
        }
      } else {
        const fileNode = createFileNode(fullPath, stat);
        if (fileNode) {
          result.children.push(fileNode);
        }
      }
    }
  } catch (err) {
    console.error('Error reading dir:', err);
  }
  return result;
}

ipcMain.handle('dialog:openFolder', async (): Promise<FolderNode | null> => {
  const { canceled, filePaths } = await dialog.showOpenDialog({
    properties: ['openDirectory']
  });
  if (canceled || filePaths.length === 0) return null;

  const rootDir = filePaths[0];
  return scanDirectory(rootDir);
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

