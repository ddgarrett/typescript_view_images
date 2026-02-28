/**
 * Shared type for media metadata (GPS + date) read from EXIF/ExifTool.
 * Used by both image and video metadata readers in metadata.ts.
 */

export interface MediaMetadata {
  latitude?: number;
  longitude?: number;
  dateTaken?: string;
}
