/**
 * Shared types for the main process: folder tree (FolderNode, FileNode, MediaNode),
 * optional EXIF fields on files, and the ElectronAPI interface used by preload.
 */

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
  /** GPS latitude (decimal degrees), from EXIF when available */
  latitude?: number;
  /** GPS longitude (decimal degrees), from EXIF when available */
  longitude?: number;
  /** Date/time image was taken (ISO string), from EXIF when available */
  dateTaken?: string;
}

export type MediaNode = FolderNode | FileNode;

export interface ElectronAPI {
  openFolder(): Promise<FolderNode | null>;
  saveFile(data: string): Promise<boolean>;
  openFile(): Promise<FolderNode | null>;
  openMediaViewer(filePath: string, type: 'image' | 'video'): Promise<void>;
}
