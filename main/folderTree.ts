/**
 * Builds the folder/media tree when the user selects a directory.
 * Scans recursively, creates FolderNode/FileNode, and attaches EXIF metadata via metadata.ts.
 */

import * as path from 'path';
import * as fs from 'fs';
import type { FolderNode, FileNode } from '../types.js';
import { readImageMetadata, readVideoMetadata } from './metadata.js';

// ----- Supported extensions -----

const IMAGE_EXTENSIONS = new Set([
  '.jpg',
  '.jpeg',
  '.png',
  '.gif',
  '.webp'
]);

const VIDEO_EXTENSIONS = new Set(['.mp4', '.webm', '.ogg']);

const MEDIA_EXTENSIONS = new Set([
  ...IMAGE_EXTENSIONS,
  ...VIDEO_EXTENSIONS
]);

function isVideo(ext: string): boolean {
  return VIDEO_EXTENSIONS.has(ext);
}

// ----- Building tree nodes -----

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
  if (!MEDIA_EXTENSIONS.has(ext)) {
    return null;
  }

  const node: FileNode = {
    name: path.basename(filePath),
    path: filePath,
    type: isVideo(ext) ? 'video' : 'image',
    size: stat.size
  };

  const meta = isVideo(ext)
    ? await readVideoMetadata(filePath)
    : await readImageMetadata(filePath);

  if (meta.latitude !== undefined) node.latitude = meta.latitude;
  if (meta.longitude !== undefined) node.longitude = meta.longitude;
  if (meta.dateTaken !== undefined) node.dateTaken = meta.dateTaken;

  return node;
}

/** Recursively scan a directory and build a FolderNode tree with metadata. */
export async function scanDirectory(dirPath: string): Promise<FolderNode> {
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
