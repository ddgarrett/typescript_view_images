/**
 * Loads a legacy image_collection CSV and builds a FolderNode tree with all CSV
 * attributes merged into FileNodes. Collection root is required to resolve paths.
 */

import * as path from 'path';
import * as fs from 'fs';
import type { FolderNode, FileNode, ReviewStatus } from '../types.js';

const MEDIA_EXT = new Set([
  '.jpg', '.jpeg', '.png', '.gif', '.webp', '.tiff', '.tif',
  '.mp4', '.webm', '.ogg', '.mov', '.avi', '.mkv'
]);

/** Parse one CSV line respecting quoted fields. */
function parseCsvLine(line: string): string[] {
  const out: string[] = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if ((c === ',' && !inQuotes) || (c === '\r' && !inQuotes)) {
      out.push(current);
      current = '';
    } else if (c !== '\r') {
      current += c;
    }
  }
  out.push(current);
  return out;
}

/** Parse CSV string into rows of key->value (first row = headers). */
function parseCsv(csvText: string): Record<string, string>[] {
  const lines = csvText.split(/\n/).filter(l => l.trim().length > 0);
  if (lines.length === 0) return [];
  const headers = parseCsvLine(lines[0]).map(h => h.trim());
  const rows: Record<string, string>[] = [];
  for (let i = 1; i < lines.length; i++) {
    const values = parseCsvLine(lines[i]);
    const row: Record<string, string> = {};
    headers.forEach((h, j) => {
      row[h] = values[j] !== undefined ? values[j].trim() : '';
    });
    rows.push(row);
  }
  return rows;
}

function get(row: Record<string, string>, key: string): string {
  const v = row[key];
  return typeof v === 'string' ? v : '';
}

function num(row: Record<string, string>, key: string): number | undefined {
  const v = get(row, key);
  if (v === '') return undefined;
  const n = parseInt(v, 10);
  return Number.isNaN(n) ? undefined : n;
}

const STATUS_SET: Set<string> = new Set(['tbd', 'reject', 'bad', 'dup', 'ok', 'good', 'best']);
function status(row: Record<string, string>): ReviewStatus {
  const s = (get(row, 'img_status') || 'tbd').toLowerCase();
  return STATUS_SET.has(s) ? (s as ReviewStatus) : 'tbd';
}

function reviewLevel(row: Record<string, string>): number {
  const n = num(row, 'rvw_lvl');
  if (n === undefined) return 0;
  return Math.max(0, Math.min(5, n));
}

/** Build a FileNode from a CSV row and the collection root. */
function rowToFileNode(row: Record<string, string>, collectionRoot: string): FileNode | null {
  const fileLocation = get(row, 'file_location').replace(/\\/g, '/').replace(/^\//, '');
  const fileName = get(row, 'file_name');
  if (!fileName) return null;
  const relativePath = fileLocation ? path.join(fileLocation, fileName) : fileName;
  const fullPath = path.join(collectionRoot, relativePath);
  const ext = path.extname(fileName).toLowerCase();
  const isVideo = ['.mp4', '.webm', '.ogg', '.mov', '.avi', '.mkv'].includes(ext);
  const type = isVideo ? 'video' : 'image';
  const size = num(row, 'file_size') ?? 0;
  const lat = parseFloat(get(row, 'img_lat'));
  const lon = parseFloat(get(row, 'img_lon'));
  const node: FileNode = {
    name: fileName,
    path: fullPath,
    type,
    size,
    status: status(row),
    reviewLevel: reviewLevel(row) as 0 | 1 | 2 | 3 | 4 | 5,
    notes: get(row, 'notes') || undefined
  };
  if (Number.isFinite(lat)) node.latitude = lat;
  if (Number.isFinite(lon)) node.longitude = lon;
  const dt = get(row, 'img_date_time');
  if (dt) {
    node.imgDateTime = dt;
    // Try to convert YYYY:MM:DD HH:mm:ss to ISO for dateTaken
    const iso = dt.replace(/^(\d{4}):(\d{2}):(\d{2})\s+(\d{2}):(\d{2}):(\d{2})/, '$1-$2-$3T$4:$5:$6');
    if (iso !== dt) node.dateTaken = iso;
  }
  const d = get(row, 'dateTaken');
  if (d) node.dateTaken = d;
  const fid = num(row, 'file_id');
  if (fid !== undefined) node.fileId = fid;
  const w = num(row, 'img_width');
  if (w !== undefined) node.imgWidth = w;
  const len = num(row, 'img_len');
  if (len !== undefined) node.imgLength = len;
  const make = get(row, 'img_make');
  if (make) node.imgMake = make;
  const model = get(row, 'img_model');
  if (model) node.imgModel = model;
  const rot = num(row, 'img_rotate');
  if (rot !== undefined) node.imgRotate = rot;
  const tags = get(row, 'img_tags');
  if (tags) node.imgTags = tags;
  return node;
}

/** Ensure folder exists in map and return it; create parent folders as needed. */
function ensureFolder(
  pathToFolder: string,
  root: FolderNode,
  collectionRoot: string,
  map: Map<string, FolderNode>
): FolderNode {
  const normalized = pathToFolder.replace(/\\/g, '/').replace(/^\/+/, '') || '';
  if (normalized === '' || normalized === '.') return root;
  const existing = map.get(normalized);
  if (existing) return existing;
  const fullPath = path.join(collectionRoot, normalized);
  const parentPath = path.dirname(normalized).replace(/\\/g, '/');
  const parent = (parentPath === '.' || parentPath === '') ? root : ensureFolder(parentPath, root, collectionRoot, map);
  const folder: FolderNode = {
    name: path.basename(fullPath),
    path: fullPath,
    type: 'folder',
    children: []
  };
  map.set(normalized, folder);
  parent.children.push(folder);
  return folder;
}

/**
 * Load CSV file and build a FolderNode tree. collectionRoot is the folder that
 * contains the images (file_location is relative to this).
 */
export function loadCsvToTree(csvPath: string, collectionRoot: string): FolderNode {
  const csvText = fs.readFileSync(csvPath, 'utf-8');
  const rows = parseCsv(csvText);
  const rootName = path.basename(collectionRoot);
  const root: FolderNode = {
    name: rootName,
    path: collectionRoot,
    type: 'folder',
    children: []
  };
  const folderMap = new Map<string, FolderNode>();
  folderMap.set('', root);

  for (const row of rows) {
    const fileLocation = get(row, 'file_location').replace(/\\/g, '/').replace(/^\//, '');
    const fileName = get(row, 'file_name');
    if (!fileName) continue;
    const folder = ensureFolder(fileLocation, root, collectionRoot, folderMap);
    const fileNode = rowToFileNode(row, collectionRoot);
    if (fileNode) folder.children.push(fileNode);
  }

  return root;
}
