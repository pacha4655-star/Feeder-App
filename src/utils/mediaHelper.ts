/**
 * Utility functions for media URL validation and media type detection
 */

export function isMediaVideo(url?: string | null, mediaType?: string | null): boolean {
  if (!url) return false;
  
  if (mediaType) {
    const mt = mediaType.toLowerCase();
    if (mt === 'video' || mt.startsWith('video/')) {
      return true;
    }
    if (mt === 'image' || mt.startsWith('image/')) {
      return false;
    }
  }

  // Check file extension in URL (ignoring query strings/tokens)
  try {
    const cleanUrl = url.split('?')[0].split('#')[0].toLowerCase();
    return /\.(mp4|webm|mov|m4v|ogv|mkv)$/i.test(cleanUrl);
  } catch (e) {
    return false;
  }
}

export function isValidMediaUrl(url?: string | null): boolean {
  if (!url || typeof url !== 'string') return false;
  const trimmed = url.trim();
  return (
    trimmed.startsWith('http://') ||
    trimmed.startsWith('https://') ||
    trimmed.startsWith('data:image/') ||
    trimmed.startsWith('blob:')
  );
}
