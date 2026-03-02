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

/** Review status for image review workflow (matches legacy CSV img_status). */
export type ReviewStatus =
  | 'tbd'
  | 'reject'
  | 'bad'
  | 'dup'
  | 'ok'
  | 'good'
  | 'best';

/** Review level 0–5 (matches legacy CSV rvw_lvl). */
export type ReviewLevel = 0 | 1 | 2 | 3 | 4 | 5;

export interface FileNode extends BaseNode {
  type: 'image' | 'video';
  size: number;
  /** GPS latitude (decimal degrees), from EXIF when available */
  latitude?: number;
  /** GPS longitude (decimal degrees), from EXIF when available */
  longitude?: number;
  /** Date/time image was taken (ISO string), from EXIF when available */
  dateTaken?: string;
  /** Review status (default 'tbd'). */
  status?: ReviewStatus;
  /** Review level 0–5 (default 0). */
  reviewLevel?: ReviewLevel;
  /** Free-form notes. */
  notes?: string;
  /** From CSV: file_id. */
  fileId?: number;
  /** From CSV: img_width. */
  imgWidth?: number;
  /** From CSV: img_len. */
  imgLength?: number;
  /** From CSV: img_date_time (e.g. YYYY:MM:DD HH:mm:ss). */
  imgDateTime?: string;
  /** From CSV: img_make. */
  imgMake?: string;
  /** From CSV: img_model. */
  imgModel?: string;
  /** From CSV: img_rotate. */
  imgRotate?: number;
  /** From CSV: img_tags. */
  imgTags?: string;
}

export type MediaNode = FolderNode | FileNode;

export interface ElectronAPI {
  openFolder(): Promise<FolderNode | null>;
  saveFile(data: string): Promise<boolean>;
  openFile(): Promise<FolderNode | null>;
  /** Import collection from legacy CSV; returns tree with CSV attributes merged. */
  openCsv(): Promise<FolderNode | null>;
  openMediaViewer(filePath: string, type: 'image' | 'video'): Promise<void>;
}
