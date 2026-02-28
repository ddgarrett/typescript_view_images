/**
 * Reads GPS (latitude/longitude) and capture date from image and video files.
 * Images: exifr. Videos: exiftool-vendored. Returns MediaMetadata for attachment to file nodes.
 */

import exifr from 'exifr';
import { exiftool } from 'exiftool-vendored';
import type { Tags } from 'exiftool-vendored';
import type { MediaMetadata } from './metadata-types.js';

// ----- Helpers (used by both image and video readers) -----

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

function parseCoord(value: number | string | undefined): number | undefined {
  if (value === undefined || value === null) return undefined;
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  const n = parseFloat(String(value).trim());
  return Number.isFinite(n) ? n : undefined;
}

function tagToIso(value: unknown): string | undefined {
  if (value === undefined || value === null) return undefined;
  if (
    typeof value === 'object' &&
    value !== null &&
    'toISOString' in value &&
    typeof (value as { toISOString: () => string }).toISOString === 'function'
  ) {
    const s = (value as { toISOString: () => string | undefined }).toISOString();
    return s ?? undefined;
  }
  return exifDateToIso(value);
}

// ----- Image EXIF (exifr) -----

const IMAGE_DATE_KEYS = [
  'DateTimeOriginal',
  'EXIF DateTimeOriginal',
  'CreateDate',
  'DateTime',
  'Image DateTime',
  'ModifyDate',
  'GPSDateStamp',
  'GPS GPSDate'
];

/** Read GPS and date from image EXIF. */
export async function readImageMetadata(filePath: string): Promise<MediaMetadata> {
  const result: MediaMetadata = {};

  try {
    const gps = await exifr.gps(filePath);
    if (gps?.latitude != null && Number.isFinite(gps.latitude)) {
      result.latitude = gps.latitude;
    }
    if (gps?.longitude != null && Number.isFinite(gps.longitude)) {
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
      const dateRaw = getExifValue(exif as Record<string, unknown>, IMAGE_DATE_KEYS);
      const dateTaken = dateRaw !== undefined ? exifDateToIso(dateRaw) : undefined;
      if (dateTaken) result.dateTaken = dateTaken;
    }
  } catch {
    // No date tags or unsupported format
  }

  return result;
}

// ----- Video metadata (ExifTool) -----

const VIDEO_DATE_KEYS = [
  'DateTimeOriginal',
  'CreateDate',
  'DateTime',
  'ModifyDate',
  'GPSDateStamp',
  'FileCreateDate',
  'FileModifyDate'
];

/** Read GPS and date from video file via ExifTool. */
export async function readVideoMetadata(filePath: string): Promise<MediaMetadata> {
  try {
    const tags = (await exiftool.read(filePath)) as Tags & Record<string, unknown>;
    if (!tags || typeof tags !== 'object') return {};

    const latitude = parseCoord(tags.GPSLatitude as number | string | undefined);
    const longitude = parseCoord(tags.GPSLongitude as number | string | undefined);
    const dateRaw = getExifValue(tags, VIDEO_DATE_KEYS);
    const dateTaken = dateRaw !== undefined ? tagToIso(dateRaw) : undefined;

    return {
      ...(latitude !== undefined && { latitude }),
      ...(longitude !== undefined && { longitude }),
      ...(dateTaken !== undefined && { dateTaken })
    };
  } catch {
    return {};
  }
}
