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

