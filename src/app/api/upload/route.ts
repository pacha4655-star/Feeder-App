import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/session';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import { checkRateLimit, createRateLimitResponse, RATE_LIMIT_CONFIG } from '@/lib/security/rate-limit';
import crypto from 'crypto';
import logger from '@/lib/monitoring/logger';

// Allowed MIME types and corresponding safe extensions
const ALLOWED_MIME_TYPES: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
  'video/mp4': 'mp4',
  'video/webm': 'webm',
  'video/quicktime': 'mov',
};

// Magic bytes signatures for MIME sniffing verification
function matchesMagicBytes(buffer: Buffer, mime: string): boolean {
  if (buffer.length < 4) return false;

  switch (mime) {
    case 'image/jpeg':
      // JPEG starts with FF D8 FF
      return buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
    case 'image/png':
      // PNG starts with 89 50 4E 47
      return (
        buffer[0] === 0x89 &&
        buffer[1] === 0x50 &&
        buffer[2] === 0x4e &&
        buffer[3] === 0x47
      );
    case 'image/gif':
      // GIF starts with GIF87a or GIF89a
      return (
        buffer[0] === 0x47 &&
        buffer[1] === 0x49 &&
        buffer[2] === 0x46 &&
        buffer[3] === 0x38
      );
    case 'image/webp':
      // WEBP has RIFF at 0..3 and WEBP at 8..11
      return (
        buffer.length >= 12 &&
        buffer.toString('ascii', 0, 4) === 'RIFF' &&
        buffer.toString('ascii', 8, 12) === 'WEBP'
      );
    case 'video/mp4':
    case 'video/quicktime':
      // MP4 / MOV ftyp box
      return (
        buffer.length >= 8 &&
        (buffer.toString('ascii', 4, 8) === 'ftyp' ||
          buffer.toString('ascii', 4, 8) === 'moov' ||
          buffer.toString('ascii', 4, 8) === 'mdat')
      );
    case 'video/webm':
      // WebM starts with 1A 45 DF A3 (EBML)
      return (
        buffer[0] === 0x1a &&
        buffer[1] === 0x45 &&
        buffer[2] === 0xdf &&
        buffer[3] === 0xa3
      );
    default:
      return false;
  }
}

const MAX_IMAGE_SIZE = 10 * 1024 * 1024; // 10MB
const MAX_VIDEO_SIZE = 50 * 1024 * 1024; // 50MB

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized. Please sign in.' }, { status: 401 });
    }

    // Rate limiting: File upload
    const rateLimit = checkRateLimit('file_upload', user.id, RATE_LIMIT_CONFIG.uploads);
    if (!rateLimit.allowed) {
      return createRateLimitResponse(rateLimit);
    }

    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ success: false, error: 'No file provided' }, { status: 400 });
    }

    const clientMime = file.type?.toLowerCase();
    const safeExt = ALLOWED_MIME_TYPES[clientMime];

    if (!safeExt) {
      logger.security('Blocked upload of unauthorized MIME type', {
        userId: user.id,
        mime: clientMime,
        filename: file.name,
      });
      return NextResponse.json(
        {
          success: false,
          error: 'Unsupported file type. Only JPEG, PNG, WebP, GIF, MP4, and WebM are permitted.',
        },
        { status: 400 }
      );
    }

    const isVideo = clientMime.startsWith('video/');
    const maxSize = isVideo ? MAX_VIDEO_SIZE : MAX_IMAGE_SIZE;

    if (file.size > maxSize) {
      return NextResponse.json(
        {
          success: false,
          error: `File size exceeds limit (${isVideo ? '50MB for videos' : '10MB for images'}).`,
        },
        { status: 400 }
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Deep inspection: verify file header magic bytes match the claimed MIME
    if (!matchesMagicBytes(buffer, clientMime)) {
      logger.security('Blocked spoofed file upload: magic bytes mismatch', {
        userId: user.id,
        claimedMime: clientMime,
      });
      return NextResponse.json(
        { success: false, error: 'Corrupt or mismatched file format.' },
        { status: 400 }
      );
    }

    // Generate safe cryptographically random filename
    const fileUuid = crypto.randomUUID();
    const safeFilename = `${fileUuid}.${safeExt}`;
    // Extract optional category (posts, stories, chat, sos, animals)
    const urlCategory = request.nextUrl.searchParams.get('category');
    const formCategory = formData.get('category') as string | null;
    const rawCategory = (formCategory || urlCategory || '').toLowerCase().replace(/[^a-z0-9_-]/g, '') || 'general';
    const validCategories = ['posts', 'stories', 'chat', 'sos', 'animals', 'profiles', 'general'];
    const category = validCategories.includes(rawCategory) ? rawCategory : 'general';

    // User-scoped path prevents path traversal and cross-user overwriting
    const ownerScope = user.firebaseUid || user.id;
    const storagePath = `uploads/${ownerScope}/${category}/${safeFilename}`;

    const supabase = getSupabaseServerClient();
    const bucketName = 'feeder-uploads';

    // Upload to Supabase Storage
    const { data: uploadData, error: uploadErr } = await supabase.storage
      .from(bucketName)
      .upload(storagePath, buffer, {
        contentType: clientMime,
        upsert: false, // Prevent accidental overwriting
      });

    if (uploadErr) {
      logger.error('Supabase storage upload failure', { error: uploadErr.message });
      return NextResponse.json(
        { success: false, error: 'Failed to upload media to storage.' },
        { status: 500 }
      );
    }

    const { data: urlData } = supabase.storage.from(bucketName).getPublicUrl(storagePath);
    const publicUrl = urlData.publicUrl;

    logger.info('File uploaded successfully', {
      userId: user.id,
      path: storagePath,
      sizeBytes: file.size,
      mime: clientMime,
    });

    return NextResponse.json({
      success: true,
      url: publicUrl,
      storagePath,
      filename: safeFilename,
      mime: clientMime,
      size: file.size,
      type: isVideo ? 'video' : 'image',
    });
  } catch (error: any) {
    logger.error('File upload server error', error);
    return NextResponse.json({ success: false, error: 'Upload failed. Please try again.' }, { status: 500 });
  }
}
