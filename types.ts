export type MediaKind = 'folder' | 'image' | 'video';

export interface BaseNode {
  name: string;
  path: string;
  type: MediaKind;
}

export interface FolderNode extends BaseNode {
  type: 'folder';
  children: MediaNode[];
}

export interface FileNode extends BaseNode {
  type: 'image' | 'video';
  size: number;
}

export type MediaNode = FolderNode | FileNode;

export interface ElectronAPI {
  openFolder(): Promise<FolderNode | null>;
  saveFile(data: string): Promise<boolean>;
  openFile(): Promise<FolderNode | null>;
}
