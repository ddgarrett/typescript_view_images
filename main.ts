import { app, BrowserWindow, ipcMain, dialog } from 'electron';
import * as path from 'path';
import * as fs from 'fs';
import exifr from 'exifr';
import { exiftool } from 'exiftool-vendored';
import type { Tags } from 'exiftool-vendored';
import { FolderNode, FileNode, MediaNode } from './types';

/** Try multiple possible EXIF key names; returns first defined value. */
function getExifValue(
  exif: Record<string, unknown>,
  keys: string[]
): string | number | undefined {
  for (const key of keys) {
    const v = exif[key];
    if (v !== undefined && v !== null) return v as string | number;
  }
  return undefined;
}

/** Parse EXIF date to ISO string; accepts Date or string. */
function exifDateToIso(value: unknown): string | undefined {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.toISOString();
  }
  if (typeof value === 'string' && value.trim().length > 0) {
    const d = new Date(value.replace(/^(\d{4}):(\d{2}):(\d{2})/, '$1-$2-$3'));
    return Number.isNaN(d.getTime()) ? undefined : d.toISOString();
  }
  return undefined;
}

/** Read GPS and date from image EXIF; returns undefined fields when not present. */
async function readImageExif(filePath: string): Promise<{
  latitude?: number;
  longitude?: number;
  dateTaken?: string;
}> {
  const result: { latitude?: number; longitude?: number; dateTaken?: string } = {};

  try {
    // exifr.gps() returns decimal lat/lon (converts from DMS); parse() does not.
    const gps = await exifr.gps(filePath);
    if (gps && typeof gps.latitude === 'number' && Number.isFinite(gps.latitude)) {
      result.latitude = gps.latitude;
    }
    if (gps && typeof gps.longitude === 'number' && Number.isFinite(gps.longitude)) {
      result.longitude = gps.longitude;
    }
  } catch {
    // No GPS or unsupported format
  }

  try {
    const exif = await exifr.parse(filePath, {
      pick: ['DateTimeOriginal', 'CreateDate', 'DateTime', 'ModifyDate', 'GPSDateStamp']
    });
    if (exif && typeof exif === 'object') {
      const dateRaw = getExifValue(exif as Record<string, unknown>, [
        'DateTimeOriginal',
        'EXIF DateTimeOriginal',
        'CreateDate',
        'DateTime',
        'Image DateTime',
        'ModifyDate',
        'GPSDateStamp',
        'GPS GPSDate'
      ]);
      const dateTaken = dateRaw !== undefined ? exifDateToIso(dateRaw) : undefined;
      if (dateTaken) result.dateTaken = dateTaken;
    }
  } catch {
    // No date tags or unsupported format
  }

  return result;
}

/** Parse numeric coordinate from ExifTool output (decimal number or string). */
function parseCoord(value: number | string | undefined): number | undefined {
  if (value === undefined || value === null) return undefined;
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  const n = parseFloat(String(value).trim());
  return Number.isFinite(n) ? n : undefined;
}

/** Get ISO date string from ExifTool tag (ExifDateTime or string). */
function tagToIso(value: unknown): string | undefined {
  if (value === undefined || value === null) return undefined;
  if (typeof value === 'object' && value !== null && 'toISOString' in value && typeof (value as { toISOString: () => string }).toISOString === 'function') {
    const s = (value as { toISOString: () => string | undefined }).toISOString();
    return s ?? undefined;
  }
  return exifDateToIso(value);
}

/** Read GPS and date from video file via ExifTool; returns undefined fields when not present. */
async function readVideoMetadata(filePath: string): Promise<{
  latitude?: number;
  longitude?: number;
  dateTaken?: string;
}> {
  try {
    const tags = await exiftool.read(filePath) as Tags & Record<string, unknown>;
    if (!tags || typeof tags !== 'object') return {};

    const lat = parseCoord(tags.GPSLatitude as number | string | undefined);
    const lon = parseCoord(tags.GPSLongitude as number | string | undefined);

    const dateRaw = getExifValue(tags, [
      'DateTimeOriginal',
      'CreateDate',
      'DateTime',
      'ModifyDate',
      'GPSDateStamp',
      'FileCreateDate',
      'FileModifyDate'
    ]);
    const dateTaken = dateRaw !== undefined ? tagToIso(dateRaw) : undefined;

    return {
      latitude: lat,
      longitude: lon,
      dateTaken: dateTaken ?? undefined
    };
  } catch {
    return {};
  }
}

const mediaViewerArgs = new Map<number, { filePath: string; type: 'image' | 'video' }>();

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

function createMediaViewerWindow(filePath: string, type: 'image' | 'video'): void {
  const win = new BrowserWindow({
    width: 800,
    height: 600,
    title: path.basename(filePath),
    webPreferences: {
      preload: path.join(__dirname, 'media-viewer-preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  const id = win.webContents.id;
  mediaViewerArgs.set(id, { filePath, type });

  win.webContents.on('destroyed', () => {
    mediaViewerArgs.delete(id);
  });

  void win.loadFile('media-viewer.html');
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

async function createFileNode(filePath: string, stat: fs.Stats): Promise<FileNode | null> {
  const ext = path.extname(filePath).toLowerCase();
  if (!mediaExts.has(ext)) {
    return null;
  }

  const isVideo = ['.mp4', '.webm', '.ogg'].includes(ext);
  const node: FileNode = {
    name: path.basename(filePath),
    path: filePath,
    type: isVideo ? 'video' : 'image',
    size: stat.size
  };

  if (isVideo) {
    const meta = await readVideoMetadata(filePath);
    if (meta.latitude !== undefined) node.latitude = meta.latitude;
    if (meta.longitude !== undefined) node.longitude = meta.longitude;
    if (meta.dateTaken !== undefined) node.dateTaken = meta.dateTaken;
  } else {
    const exif = await readImageExif(filePath);
    if (exif.latitude !== undefined) node.latitude = exif.latitude;
    if (exif.longitude !== undefined) node.longitude = exif.longitude;
    if (exif.dateTaken !== undefined) node.dateTaken = exif.dateTaken;
  }

  return node;
}

async function scanDirectory(dirPath: string): Promise<FolderNode> {
  const result = createFolderNode(dirPath);
  try {
    const items = fs.readdirSync(dirPath);
    for (const item of items) {
      const fullPath = path.join(dirPath, item);
      const stat = fs.statSync(fullPath);

      if (stat.isDirectory()) {
        const subDir = await scanDirectory(fullPath);
        if (subDir.children.length > 0) {
          result.children.push(subDir);
        }
      } else {
        const fileNode = await createFileNode(fullPath, stat);
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

ipcMain.handle('openMediaViewer', (_event, filePath: string, type: 'image' | 'video'): void => {
  createMediaViewerWindow(filePath, type);
});

ipcMain.handle('get-media-viewer-args', (event): { filePath: string; type: 'image' | 'video' } | null => {
  const args = mediaViewerArgs.get(event.sender.id);
  return args ?? null;
});

