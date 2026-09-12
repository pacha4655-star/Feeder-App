import { authenticatedFetch } from './apiClient';
import { auth } from './firebaseAuth';
import { optimizeImageFile } from '../utils/imageOptimizer';

/**
 * Maps application folder prefixes to corresponding Supabase Storage buckets
 */
const mapFolderToBucket = (folderPrefix: string): string => {
  switch (folderPrefix) {
    case 'posts':
      return 'post-media';
    case 'stories':
      return 'story-media';
    case 'profiles':
      return 'profile-images';
    case 'communities':
    case 'animals':
    case 'help_requests':
    default:
      return 'general-media';
  }
};

/**
 * Helper to convert a File/Blob to base64 string
 */
const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      const base64 = result.split(',')[1] || result;
      resolve(base64);
    };
    reader.onerror = (error) => reject(error);
    reader.readAsDataURL(file);
  });
};

/**
 * Uploads a media file (image/video) through the secure backend API
 * using Firebase ID Token authentication and verified Firebase UID scoping.
 */
export const uploadMediaFile = async (
  rawFile: File,
  folderPrefix: string = 'posts',
  onProgress?: (progress: number) => void,
  abortController?: AbortController
): Promise<string> => {
  // 1. Check authenticated Firebase user session
  const currentUser = auth.currentUser;
  if (!currentUser) {
    throw new Error('Your session has expired. Please sign in with Firebase again.');
  }

  // 2. Validate File
  if (!rawFile || rawFile.size === 0) {
    throw new Error('Please select a valid image or video file.');
  }

  const MAX_SIZE = 50 * 1024 * 1024; // 50MB
  if (rawFile.size > MAX_SIZE) {
    throw new Error(`File is too large (${(rawFile.size / (1024 * 1024)).toFixed(1)}MB). Maximum allowed size is 50MB.`);
  }

  if (abortController?.signal.aborted) {
    throw new Error('Upload was cancelled.');
  }

  if (onProgress) onProgress(10);

  // 3. Client-side image optimization
  let file = rawFile;
  if (file.type.startsWith('image/') && file.type !== 'image/svg+xml') {
    try {
      if (onProgress) onProgress(25);
      const maxWidth = folderPrefix === 'stories' ? 1080 : folderPrefix === 'profiles' ? 800 : 1600;
      const maxHeight = folderPrefix === 'stories' ? 1920 : folderPrefix === 'profiles' ? 800 : 1600;
      file = await optimizeImageFile(rawFile, { maxWidth, maxHeight, quality: 0.82 });
    } catch (optErr) {
      console.warn('[Storage Upload] Image optimization skipped, using original file:', optErr);
      file = rawFile;
    }
  }

  if (abortController?.signal.aborted) {
    throw new Error('Upload was cancelled.');
  }

  const bucketName = mapFolderToBucket(folderPrefix);
  if (onProgress) onProgress(45);

  // 4. Convert to base64 for authenticated upload payload
  const fileBase64 = await fileToBase64(file);
  if (onProgress) onProgress(65);

  if (abortController?.signal.aborted) {
    throw new Error('Upload was cancelled.');
  }

  // 5. Send authenticated request to backend
  if (onProgress) onProgress(80);
  const response = await authenticatedFetch<{ success: boolean; publicUrl: string; path: string }>('/api/media/upload', {
    method: 'POST',
    body: JSON.stringify({
      fileBase64,
      fileName: file.name || rawFile.name || 'media.jpg',
      mimeType: file.type || 'image/jpeg',
      bucket: bucketName,
    }),
    signal: abortController?.signal,
    timeoutMs: 60000,
  });

  if (onProgress) onProgress(100);

  if (!response.publicUrl) {
    throw new Error('Failed to obtain public media URL from server.');
  }

  // Append cache-busting timestamp for immediate UI refresh
  const separator = response.publicUrl.includes('?') ? '&' : '?';
  return `${response.publicUrl}${separator}t=${Date.now()}`;
};

/**
 * Deletes media from Supabase Storage via backend bridge (scoped to authenticated user)
 */
export const deleteMediaFromStorage = async (mediaUrl: string): Promise<void> => {
  if (!mediaUrl) return;
  try {
    await authenticatedFetch('/api/media/delete', {
      method: 'POST',
      body: JSON.stringify({ mediaUrl }),
    });
  } catch (err) {
    console.warn('[Storage Service] Media delete error:', err);
  }
};

