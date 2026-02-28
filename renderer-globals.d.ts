/**
 * Global type declarations for the renderer: MediaNode tree types and Window.electronAPI.
 * Ensures renderer.ts sees the same types without importing from main-process modules.
 */

type MediaKind = 'folder' | 'image' | 'video';

interface BaseNode {
  name: string;
  path: string;
  type: MediaKind;
}

interface FolderNode extends BaseNode {
  type: 'folder';
  children: MediaNode[];
}

interface FileNode extends BaseNode {
  type: 'image' | 'video';
  size: number;
  latitude?: number;
  longitude?: number;
  dateTaken?: string;
}

type MediaNode = FolderNode | FileNode;

interface Window {
  electronAPI: {
    openFolder: () => Promise<FolderNode | null>;
    saveFile: (data: string) => Promise<boolean>;
    openFile: () => Promise<FolderNode | null>;
    openMediaViewer: (filePath: string, type: 'image' | 'video') => Promise<void>;
  };
}

