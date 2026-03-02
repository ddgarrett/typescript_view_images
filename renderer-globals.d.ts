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

/** Review status for image review workflow. */
type ReviewStatus = 'tbd' | 'reject' | 'bad' | 'dup' | 'ok' | 'good' | 'best';

interface FileNode extends BaseNode {
  type: 'image' | 'video';
  size: number;
  latitude?: number;
  longitude?: number;
  dateTaken?: string;
  status?: ReviewStatus;
  reviewLevel?: number;
  notes?: string;
  fileId?: number;
  imgWidth?: number;
  imgLength?: number;
  imgDateTime?: string;
  imgMake?: string;
  imgModel?: string;
  imgRotate?: number;
  imgTags?: string;
}

type MediaNode = FolderNode | FileNode;

interface Window {
  electronAPI: {
    openFolder: () => Promise<FolderNode | null>;
    saveFile: (data: string) => Promise<boolean>;
    openFile: () => Promise<FolderNode | null>;
    openCsv: () => Promise<FolderNode | null>;
    openMediaViewer: (filePath: string, type: 'image' | 'video') => Promise<void>;
  };
}

