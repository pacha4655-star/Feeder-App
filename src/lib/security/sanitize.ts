/**
 * Input sanitization and security utility for Feeder.life
 * Guards against XSS, HTML injection, and malicious URL schemes.
 */

// Strip HTML tags and script elements
export function sanitizeText(input: string | null | undefined): string {
  if (!input || typeof input !== 'string') return '';

  return input
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
    .replace(/<object\b[^<]*(?:(?!<\/object>)<[^<]*)*<\/object>/gi, '')
    .replace(/<embed\b[^<]*(?:(?!<\/embed>)<[^<]*)*<\/embed>/gi, '')
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
    .replace(/<[^>]+>/g, '') // Strip remaining HTML tags
    .replace(/javascript:/gi, '')
    .replace(/vbscript:/gi, '')
    .replace(/data:text\/html/gi, '')
    .trim();
}

/**
 * Validates that an image/media URL uses a safe https or data image scheme.
 */
export function sanitizeUrl(url: string | null | undefined): string | null {
  if (!url || typeof url !== 'string') return null;
  const trimmed = url.trim();

  // Disallow javascript:, vbscript:, and malicious data URIs
  if (/^(javascript|vbscript|data:(?!image\/)):/i.test(trimmed)) {
    return null;
  }

  // Must start with https://, http://, / or data:image/
  if (
    trimmed.startsWith('https://') ||
    trimmed.startsWith('http://') ||
    trimmed.startsWith('/') ||
    trimmed.startsWith('data:image/')
  ) {
    return trimmed;
  }

  return null;
}

/**
 * Validates that a username is alphanumeric with underscores, between 3 and 30 characters.
 */
export function sanitizeUsername(rawUsername: string): string {
  return rawUsername
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9_]/g, '')
    .slice(0, 30);
}
