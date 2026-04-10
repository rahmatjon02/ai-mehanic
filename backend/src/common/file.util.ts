import { extname } from 'path';
import { randomUUID } from 'crypto';

export function buildStoredFileName(originalName: string): string {
  return `${randomUUID()}${extname(originalName)}`;
}

export function detectFileType(
  mimeType: string,
  fallback?: string,
): 'image' | 'audio' | 'video' {
  if (mimeType.startsWith('image/')) {
    return 'image';
  }

  if (mimeType.startsWith('audio/')) {
    return 'audio';
  }

  if (mimeType.startsWith('video/')) {
    return 'video';
  }

  if (fallback === 'image' || fallback === 'audio' || fallback === 'video') {
    return fallback;
  }

  throw new Error('Unsupported file type');
}
