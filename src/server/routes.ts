import { Router, Request, Response, NextFunction } from 'express';
import { verifyFirebaseIdToken } from './firebaseVerifier.js';
import { supabaseAdmin } from './supabaseAdmin.js';
import {
  dispatchEmergencyToResponders,
  getResponderProfile,
  acceptRescueRequest,
  markResponderArrived,
  resolveRescueRequest,
  logRescueEvent
} from './dispatchService.js';
import { registerResponderDevice, getPushProviderStatus } from './notificationService.js';

export { supabaseAdmin };
export const backendRouter = Router();

export interface AuthenticatedRequest extends Request {
  user?: {
    uid: string;
    email?: string;
    name?: string;
    picture?: string;
    [key: string]: any;
  };
}

/**
 * Middleware: Verifies Firebase ID token in Authorization header
 * Sets req.user with verified Firebase UID.
 * Rejects missing/invalid tokens with HTTP 401.
 */
export async function requireFirebaseAuth(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized: Missing or invalid Authorization header.' });
  }

  const idToken = authHeader.split('Bearer ')[1]?.trim();
  if (!idToken) {
    return res.status(401).json({ error: 'Unauthorized: Empty token.' });
  }

  try {
    const decoded = await verifyFirebaseIdToken(idToken);
    req.user = decoded;
    next();
  } catch (err: any) {
    console.error('[Backend Auth] Token verification failed:', err.message);
    return res.status(401).json({ error: `Unauthorized: ${err.message}` });
  }
}

// Allowed Storage Buckets
const ALLOWED_BUCKETS = ['post-media', 'story-media', 'profile-images', 'general-media'];

// Ensure all buckets are set to public on startup (skip in serverless functions to avoid blocking)
async function ensurePublicBuckets() {
  if (process.env.VERCEL) return;
  try {
    for (const b of ALLOWED_BUCKETS) {
      await supabaseAdmin.storage.updateBucket(b, { public: true });
    }
    console.log('[Supabase Storage] Verified all media buckets are public.');
  } catch (err: any) {
    console.warn('[Supabase Storage] Notice updating buckets to public:', err.message);
  }
}
ensurePublicBuckets();

import { analyzeImageAuthenticity } from './aiImageDetector';

// =============================================================================
// 1a. VERIFY MEDIA AUTHENTICITY (POST /api/media/verify-authenticity)
// =============================================================================
backendRouter.post('/media/verify-authenticity', requireFirebaseAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { fileBase64, mimeType } = req.body;

    if (!fileBase64 || !mimeType) {
      return res.status(400).json({ error: 'Missing required file data (fileBase64, mimeType).' });
    }

    // Video files pass image-specific visual AI analysis
    if (mimeType.startsWith('video/')) {
      return res.json({
        success: true,
        isAiGenerated: false,
        classification: 'real_photograph',
        confidence: 1.0,
        reason: 'Video file verified.',
        provider: 'system',
      });
    }

    try {
      const result = await analyzeImageAuthenticity(fileBase64, mimeType);

      // Decision rules based on documented confidence thresholds:
      // 1. High-confidence AI detection (classification === 'ai_generated' && confidence >= 0.75) -> REJECT
      if (result.classification === 'ai_generated' && result.confidence >= 0.75) {
        return res.status(422).json({
          success: false,
          isAiGenerated: true,
          classification: 'ai_generated',
          confidence: result.confidence,
          reason: result.reason,
          provider: result.provider,
          userMessage: 'AI-generated photos are not allowed. Please upload a real photograph.',
        });
      }

      // 2. Uncertain / ambiguous result -> REJECT with instruction to upload a real photograph
      if (result.classification === 'uncertain' || (result.isAiGenerated && result.confidence < 0.75)) {
        return res.status(422).json({
          success: false,
          isAiGenerated: false,
          classification: 'uncertain',
          confidence: result.confidence,
          reason: result.reason,
          provider: result.provider,
          userMessage: "We couldn't verify this image as a real photograph. Please upload a different real photograph.",
        });
      }

      // 3. High-confidence real photograph (classification === 'real_photograph') -> ALLOW
      return res.json({
        success: true,
        isAiGenerated: false,
        classification: result.classification,
        confidence: result.confidence,
        reason: result.reason,
        provider: result.provider,
      });
    } catch (detectorErr: any) {
      if (detectorErr.message?.includes('REAL AI IMAGE DETECTION PROVIDER REQUIRED')) {
        return res.status(503).json({
          error: 'Image authenticity verification is currently unavailable. Real server-side AI detection provider is not configured.',
          code: 'AI_DETECTION_UNCONFIGURED',
          requiredEnv: 'GEMINI_API_KEY',
          userMessage: 'Image authenticity verification is currently unavailable. Please try again later.',
        });
      }
      return res.status(503).json({
        error: 'Image authenticity verification is currently unavailable. Please try again later.',
        code: 'AI_DETECTION_UNAVAILABLE',
        userMessage: 'Image authenticity verification is currently unavailable. Please try again later.',
        details: detectorErr.message,
      });
    }
  } catch (err: any) {
    console.error('[Backend Authenticity Check] Error:', err);
    return res.status(500).json({ error: err.message || 'Authenticity verification failed.' });
  }
});

// =============================================================================
// 1. MEDIA UPLOAD (POST /api/media/upload)
// =============================================================================
backendRouter.post('/media/upload', requireFirebaseAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const verifiedUid = req.user!.uid;
    const { fileBase64, fileName, mimeType, bucket } = req.body;

    if (!fileBase64 || !fileName || !mimeType) {
      return res.status(400).json({ error: 'Missing required file data (fileBase64, fileName, mimeType).' });
    }

    const targetBucket = ALLOWED_BUCKETS.includes(bucket) ? bucket : 'general-media';

    // Server-side guard: enforce AI image analysis before saving to post-media or story-media
    if ((targetBucket === 'post-media' || targetBucket === 'story-media') && mimeType.startsWith('image/')) {
      try {
        const checkResult = await analyzeImageAuthenticity(fileBase64, mimeType);
        if (checkResult.classification === 'ai_generated' && checkResult.confidence >= 0.75) {
          return res.status(422).json({
            error: 'AI-generated photos are not allowed. Please upload a real photograph.',
            code: 'AI_IMAGE_REJECTED',
            confidence: checkResult.confidence,
            reason: checkResult.reason,
          });
        }
        if (checkResult.classification === 'uncertain') {
          return res.status(422).json({
            error: "We couldn't verify this image as a real photograph. Please upload a different real photograph.",
            code: 'AI_IMAGE_UNCERTAIN',
          });
        }
      } catch (checkErr: any) {
        if (checkErr.message?.includes('REAL AI IMAGE DETECTION PROVIDER REQUIRED')) {
          return res.status(503).json({
            error: 'Image authenticity verification is currently unavailable. Please try again later.',
            code: 'AI_DETECTION_UNCONFIGURED',
            requiredEnv: 'GEMINI_API_KEY',
          });
        }
        return res.status(503).json({
          error: 'Image authenticity verification is currently unavailable. Please try again later.',
          code: 'AI_DETECTION_UNAVAILABLE',
        });
      }
    }

    const cleanFileName = fileName.replace(/[^a-zA-Z0-9._-]/g, '_');
    // Store under verified Firebase UID namespace: {verifiedUid}/{timestamp}_{filename}
    const storagePath = `${verifiedUid}/${Date.now()}_${cleanFileName}`;

    const fileBuffer = Buffer.from(fileBase64, 'base64');

    const { data: uploadData, error: uploadError } = await supabaseAdmin.storage
      .from(targetBucket)
      .upload(storagePath, fileBuffer, {
        contentType: mimeType,
        upsert: true,
      });

    if (uploadError) {
      console.error('[Backend Upload] Supabase Storage error:', uploadError);
      return res.status(500).json({ error: `Storage upload failed: ${uploadError.message}` });
    }

    const { data: urlData } = supabaseAdmin.storage
      .from(targetBucket)
      .getPublicUrl(storagePath);

    return res.json({
      success: true,
      publicUrl: urlData.publicUrl,
      path: storagePath,
      bucket: targetBucket,
    });
  } catch (err: any) {
    console.error('[Backend Upload] Error:', err);
    return res.status(500).json({ error: err.message || 'Media upload failed.' });
  }
});

// =============================================================================
// 1b. MEDIA DELETION / CLEANUP (POST /api/media/delete)
// =============================================================================
backendRouter.post('/media/delete', requireFirebaseAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const verifiedUid = req.user!.uid;
    const { mediaUrl, path, bucket } = req.body;

    let targetBucket = bucket;
    let storagePath = path;

    if (mediaUrl && !storagePath) {
      for (const b of ALLOWED_BUCKETS) {
        const marker = `/storage/v1/object/public/${b}/`;
        if (mediaUrl.includes(marker)) {
          targetBucket = b;
          storagePath = decodeURIComponent(mediaUrl.split(marker)[1]);
          break;
        }
      }
    }

    if (targetBucket && storagePath) {
      // Ensure users can only delete files in their own UID folder
      if (storagePath.startsWith(`${verifiedUid}/`) || storagePath.startsWith(verifiedUid)) {
        const { error } = await supabaseAdmin.storage
          .from(targetBucket)
          .remove([storagePath]);
        if (error) {
          console.warn('[Backend Media Delete] Supabase remove notice:', error.message);
        }
      }
    }

    return res.json({ success: true });
  } catch (err: any) {
    console.warn('[Backend Media Delete] Error:', err);
    return res.status(500).json({ error: err.message || 'Media delete failed.' });
  }
});

// =============================================================================
// 2a. CHECK USERNAME AVAILABILITY (GET /api/profile/check-username)
// =============================================================================
backendRouter.get('/profile/check-username', async (req: Request, res: Response) => {
  try {
    const rawUsername = (req.query.username as string) || '';
    const cleanUsername = rawUsername.trim().toLowerCase().replace(/^@/, '');

    // Format validation: 3-30 chars, alphanumeric + underscores + periods
    if (!cleanUsername || cleanUsername.length < 3) {
      return res.json({ available: false, reason: 'Username must be at least 3 characters long.' });
    }
    if (cleanUsername.length > 30) {
      return res.json({ available: false, reason: 'Username cannot exceed 30 characters.' });
    }
    if (!/^[a-z0-9._]+$/.test(cleanUsername)) {
      return res.json({ available: false, reason: 'Username can only contain lowercase letters, numbers, underscores, and dots.' });
    }
    if (cleanUsername.startsWith('.') || cleanUsername.endsWith('.') || cleanUsername.includes('..')) {
      return res.json({ available: false, reason: 'Username cannot begin, end, or contain consecutive dots.' });
    }

    // Check availability in Supabase profiles table
    try {
      const { data, error } = await supabaseAdmin
        .from('profiles')
        .select('firebase_uid, username')
        .ilike('username', cleanUsername);

      if (error) {
        // If column username doesn't exist yet, don't block user
        if (error.code === '42703') {
          return res.json({ available: true, username: cleanUsername });
        }
        console.warn('[Check Username] Query notice:', error.message);
        return res.json({ available: true, username: cleanUsername });
      }

      if (data && data.length > 0) {
        // If caller is authenticated and matches this UID, it is their own username (available)
        const authHeader = req.headers.authorization;
        let callerUid: string | null = null;
        if (authHeader && authHeader.startsWith('Bearer ')) {
          try {
            const decoded = await verifyFirebaseIdToken(authHeader.split('Bearer ')[1].trim());
            callerUid = decoded.uid;
          } catch {}
        }

        const isSelf = callerUid && data.some(p => p.firebase_uid === callerUid);
        if (isSelf) {
          return res.json({ available: true, username: cleanUsername });
        }

        return res.json({ available: false, reason: 'Username is already taken by another user.' });
      }

      return res.json({ available: true, username: cleanUsername });
    } catch (dbErr: any) {
      return res.json({ available: true, username: cleanUsername });
    }
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Username check failed.' });
  }
});

// =============================================================================
// 2b. PROFILE SYNC (POST /api/profile/sync)
// =============================================================================
backendRouter.post('/profile/sync', requireFirebaseAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const verifiedUid = req.user!.uid;
    const user = req.body || {};

    const avatarUrl = (user.avatar || user.photo_url || '').trim() || req.user!.picture || `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(verifiedUid)}`;
    const name = (user.name || '').trim() || req.user!.name || 'Feeder Caregiver';
    const email = (user.email || '').trim() || req.user!.email || null;
    const bio = user.bio !== undefined ? String(user.bio).trim() : 'Compassionate animal lover, street feeder & pet protector.';
    const location = user.location !== undefined ? String(user.location).trim() : '';

    // Clean and validate username if provided
    let rawUsername = user.username ? String(user.username).trim().toLowerCase().replace(/^@/, '') : '';
    if (rawUsername && !/^[a-z0-9._]{3,30}$/.test(rawUsername)) {
      rawUsername = rawUsername.replace(/[^a-z0-9._]/g, '').slice(0, 30);
    }
    const finalUsername = rawUsername || null;

    // Check if profile already exists
    const { data: existingProfile } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .eq('firebase_uid', verifiedUid)
      .maybeSingle();

    // Check username uniqueness against other users if provided
    if (finalUsername) {
      try {
        const { data: existingUsersWithUsername } = await supabaseAdmin
          .from('profiles')
          .select('firebase_uid')
          .ilike('username', finalUsername);

        if (existingUsersWithUsername && existingUsersWithUsername.length > 0) {
          const conflict = existingUsersWithUsername.find(p => p.firebase_uid !== verifiedUid);
          if (conflict) {
            return res.status(409).json({
              error: 'Username is already taken by another user. Please choose another.',
              code: 'USERNAME_TAKEN',
            });
          }
        }
      } catch (checkErr: any) {
        // If column username doesn't exist yet, proceed gracefully
      }
    }

    let profileResult;
    if (existingProfile) {
      const updatePayload: Record<string, any> = {
        name: name || existingProfile.name,
        email: email || existingProfile.email,
        photo_url: (user.avatar || user.photo_url || '').trim() || existingProfile.photo_url || avatarUrl,
        bio: user.bio !== undefined ? bio : existingProfile.bio,
        location: user.location !== undefined ? location : existingProfile.location,
      };
      if (finalUsername) {
        updatePayload.username = finalUsername;
      }

      let { data, error } = await supabaseAdmin
        .from('profiles')
        .update(updatePayload)
        .eq('firebase_uid', verifiedUid)
        .select('*')
        .single();

      // Graceful fallback if username column doesn't exist in DB schema yet
      if (error && error.code === '42703' && updatePayload.username) {
        delete updatePayload.username;
        const retry = await supabaseAdmin
          .from('profiles')
          .update(updatePayload)
          .eq('firebase_uid', verifiedUid)
          .select('*')
          .single();
        data = retry.data;
        error = retry.error;
      }

      if (error) throw error;
      profileResult = data;
    } else {
      const insertPayload: Record<string, any> = {
        firebase_uid: verifiedUid,
        name,
        email,
        photo_url: avatarUrl,
        bio,
        location,
        created_at: new Date().toISOString(),
      };
      if (finalUsername) {
        insertPayload.username = finalUsername;
      }

      let { data, error } = await supabaseAdmin
        .from('profiles')
        .insert(insertPayload)
        .select('*')
        .single();

      // Graceful fallback if username column doesn't exist in DB schema yet
      if (error && error.code === '42703' && insertPayload.username) {
        delete insertPayload.username;
        const retry = await supabaseAdmin
          .from('profiles')
          .insert(insertPayload)
          .select('*')
          .single();
        data = retry.data;
        error = retry.error;
      }

      if (error) throw error;
      profileResult = data;
    }

    return res.json({ success: true, profile: profileResult });
  } catch (err: any) {
    console.error('[Backend Profile] Error:', err);
    return res.status(500).json({ error: err.message || 'Profile sync failed.' });
  }
});

// =============================================================================
// 3. GET PROFILE (GET /api/profile/:uid)
// =============================================================================
backendRouter.get('/profile/:uid', async (req: Request, res: Response) => {
  try {
    const { uid } = req.params;
    const { data, error } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .eq('firebase_uid', uid)
      .maybeSingle();

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    return res.json({ success: true, profile: data });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// =============================================================================
// 3b. FOLLOW / UNFOLLOW USER (POST /api/users/:targetUserId/follow)
// =============================================================================
backendRouter.post('/users/:targetUserId/follow', requireFirebaseAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const followerUid = req.user!.uid;
    const targetUid = req.params.targetUserId;

    if (!targetUid) {
      return res.status(400).json({ error: 'Target user ID is required.' });
    }

    if (followerUid === targetUid) {
      return res.status(400).json({ error: 'You cannot follow yourself.' });
    }

    // Check if relationship already exists
    const { data: existingFollow, error: fetchErr } = await supabaseAdmin
      .from('followers')
      .select('id')
      .eq('follower_uid', followerUid)
      .eq('following_uid', targetUid)
      .maybeSingle();

    if (fetchErr) {
      console.error('[Follow Route] Error checking follow relation:', fetchErr);
      return res.status(500).json({ error: fetchErr.message });
    }

    let isFollowing = false;
    if (existingFollow) {
      // Unfollow
      const { error: delErr } = await supabaseAdmin
        .from('followers')
        .delete()
        .eq('id', existingFollow.id);

      if (delErr) throw delErr;
      isFollowing = false;
    } else {
      // Follow
      const { error: insErr } = await supabaseAdmin
        .from('followers')
        .insert({
          follower_uid: followerUid,
          following_uid: targetUid,
          created_at: new Date().toISOString(),
        });

      if (insErr) throw insErr;
      isFollowing = true;
    }

    // Get exact follower count for target user
    const { count: followersCount } = await supabaseAdmin
      .from('followers')
      .select('*', { count: 'exact', head: true })
      .eq('following_uid', targetUid);

    // Get exact following count for current user
    const { count: followingCount } = await supabaseAdmin
      .from('followers')
      .select('*', { count: 'exact', head: true })
      .eq('follower_uid', followerUid);

    return res.json({
      success: true,
      following: isFollowing,
      isFollowing,
      targetFollowersCount: followersCount ?? 0,
      currentFollowingCount: followingCount ?? 0,
    });
  } catch (err: any) {
    console.error('[Follow Route] Error:', err);
    return res.status(500).json({ error: err.message || 'Follow action failed.' });
  }
});

// =============================================================================
// 3c. GET FOLLOWERS (GET /api/users/:targetUserId/followers)
// =============================================================================
backendRouter.get('/users/:targetUserId/followers', async (req: Request, res: Response) => {
  try {
    const { targetUserId } = req.params;
    const { data: followRows, error: followErr } = await supabaseAdmin
      .from('followers')
      .select('follower_uid')
      .eq('following_uid', targetUserId);

    if (followErr) throw followErr;

    const followerUids = (followRows || []).map(r => r.follower_uid).filter(Boolean);
    if (followerUids.length === 0) {
      return res.json({ success: true, followers: [] });
    }

    const { data: profiles, error: profErr } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .in('firebase_uid', followerUids);

    if (profErr) throw profErr;

    const followers = (profiles || []).map(p => {
      const uid = p.firebase_uid || p.id || '';
      return {
        id: uid,
        firebase_uid: uid,
        name: p.name || 'Feeder Caregiver',
        username: p.username || (p.name || 'feeder').toLowerCase().replace(/[^a-z0-9_]/g, '') || 'feeder',
        avatar: p.photo_url || `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(uid)}`,
        bio: p.bio || '',
        location: p.location || '',
      };
    });

    return res.json({ success: true, followers });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Failed to fetch followers.' });
  }
});

// =============================================================================
// 3d. GET FOLLOWING (GET /api/users/:targetUserId/following)
// =============================================================================
backendRouter.get('/users/:targetUserId/following', async (req: Request, res: Response) => {
  try {
    const { targetUserId } = req.params;
    const { data: followRows, error: followErr } = await supabaseAdmin
      .from('followers')
      .select('following_uid')
      .eq('follower_uid', targetUserId);

    if (followErr) throw followErr;

    const followingUids = (followRows || []).map(r => r.following_uid).filter(Boolean);
    if (followingUids.length === 0) {
      return res.json({ success: true, following: [] });
    }

    const { data: profiles, error: profErr } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .in('firebase_uid', followingUids);

    if (profErr) throw profErr;

    const following = (profiles || []).map(p => {
      const uid = p.firebase_uid || p.id || '';
      return {
        id: uid,
        firebase_uid: uid,
        name: p.name || 'Feeder Caregiver',
        username: p.username || (p.name || 'feeder').toLowerCase().replace(/[^a-z0-9_]/g, '') || 'feeder',
        avatar: p.photo_url || `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(uid)}`,
        bio: p.bio || '',
        location: p.location || '',
      };
    });

    return res.json({ success: true, following });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Failed to fetch following.' });
  }
});

// =============================================================================
// 3e. USER DISCOVERY / PEOPLE SEARCH (GET /api/users/search)
// =============================================================================
backendRouter.get('/users/search', async (req: Request, res: Response) => {
  try {
    const rawQuery = (req.query.q as string) || '';
    const cleanQuery = rawQuery.trim().replace(/^@/, '').trim();

    if (!cleanQuery) {
      return res.json({ success: true, users: [] });
    }

    // Escape characters that break PostgREST clauses while preserving spaces, letters, numbers, and Unicode
    const sanitized = cleanQuery.replace(/[%_,()\\:*]/g, ' ').replace(/\s+/g, ' ').trim();
    if (!sanitized) {
      return res.json({ success: true, users: [] });
    }

    let profiles: any[] = [];
    try {
      // First try searching name, username, and bio
      const { data, error } = await supabaseAdmin
        .from('profiles')
        .select('*')
        .or(`name.ilike.%${sanitized}%,username.ilike.%${sanitized}%,bio.ilike.%${sanitized}%`)
        .limit(25);

      if (error) {
        // Fallback if username column does not exist yet (code 42703)
        if (error.code === '42703') {
          const fallback = await supabaseAdmin
            .from('profiles')
            .select('*')
            .or(`name.ilike.%${sanitized}%,bio.ilike.%${sanitized}%`)
            .limit(25);
          profiles = fallback.data || [];
        } else {
          console.warn('[User Search] Supabase query notice:', error.message);
          profiles = [];
        }
      } else {
        profiles = data || [];
      }
    } catch (searchErr) {
      console.warn('[User Search] Search error:', searchErr);
    }

    // Fallback: If 0 matches and continuous query length >= 3, check prefix match on name
    if (profiles.length === 0 && sanitized.length >= 3) {
      const prefix = sanitized.slice(0, 4);
      const { data: prefixProfiles } = await supabaseAdmin
        .from('profiles')
        .select('*')
        .ilike('name', `%${prefix}%`)
        .limit(20);

      if (prefixProfiles && prefixProfiles.length > 0) {
        const queryNormalized = sanitized.toLowerCase();
        profiles = prefixProfiles.filter(p => {
          const normName = (p.name || '').toLowerCase().replace(/[^a-z0-9_]/g, '');
          const normUser = (p.username || '').toLowerCase();
          return normName.includes(queryNormalized) || normUser.includes(queryNormalized);
        });
      }
    }

    // Fetch follow stats for matched profiles
    const users = await Promise.all(
      profiles.map(async p => {
        const uid = p.firebase_uid || p.id || '';
        const defaultAvatar = `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(uid || 'feeder')}`;

        // Get follower and following IDs
        const [followersRes, followingRes] = await Promise.all([
          supabaseAdmin.from('followers').select('follower_uid').eq('following_uid', uid),
          supabaseAdmin.from('followers').select('following_uid').eq('follower_uid', uid),
        ]);

        const followerIds = (followersRes.data || []).map(r => r.follower_uid);
        const followingIds = (followingRes.data || []).map(r => r.following_uid);

        return {
          id: uid,
          firebase_uid: uid,
          name: p.name || 'Feeder Caregiver',
          username: p.username || (p.name || 'feeder').toLowerCase().replace(/[^a-z0-9_]/g, '') || 'feeder',
          avatar: p.photo_url || defaultAvatar,
          bio: p.bio || '',
          location: p.location || '',
          roles: ['Feeder', 'Animal Lover'],
          interests: ['Community Care'],
          postsCount: 0,
          followersCount: followerIds.length,
          followingCount: followingIds.length,
          followerIds,
          followingIds,
          joinedDate: p.created_at
            ? new Date(p.created_at).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
            : 'Joined recently',
          isVerified: true,
        };
      })
    );

    return res.json({ success: true, users });
  } catch (err: any) {
    console.error('[User Search] Unexpected error:', err);
    return res.status(500).json({ error: err.message || 'Search failed', users: [] });
  }
});

// =============================================================================
// 4. POSTS (POST /api/posts & DELETE /api/posts/:id)
// =============================================================================
backendRouter.post('/posts', requireFirebaseAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const verifiedUid = req.user!.uid;
    const { content, mediaUrl, mediaType, media } = req.body;

    const resolvedMediaUrl = mediaUrl || (Array.isArray(media) && media.length > 0 ? media[0] : null);
    const resolvedMediaType = mediaType || (resolvedMediaUrl ? 'image' : null);

    const postPayload = {
      firebase_uid: verifiedUid,
      content: (content || '').trim(),
      media_url: resolvedMediaUrl,
      media_type: resolvedMediaType,
      created_at: new Date().toISOString(),
    };

    const { data, error } = await supabaseAdmin
      .from('posts')
      .insert(postPayload)
      .select('*')
      .single();

    if (error) {
      console.error('[Backend Posts] Post insert error:', error);
      return res.status(500).json({ error: `Failed to create post: ${error.message}` });
    }

    return res.json({ success: true, post: data });
  } catch (err: any) {
    console.error('[Backend Posts] Error:', err);
    return res.status(500).json({ error: err.message || 'Post creation failed.' });
  }
});

backendRouter.delete('/posts/:id', requireFirebaseAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const verifiedUid = req.user!.uid;
    const postId = req.params.id;

    // Verify ownership
    const { data: existingPost, error: fetchError } = await supabaseAdmin
      .from('posts')
      .select('id, firebase_uid')
      .eq('id', postId)
      .single();

    if (fetchError || !existingPost) {
      return res.status(404).json({ error: 'Post not found.' });
    }

    if (existingPost.firebase_uid !== verifiedUid) {
      return res.status(403).json({ error: 'Forbidden: You do not own this post.' });
    }

    const { error: deleteError } = await supabaseAdmin
      .from('posts')
      .delete()
      .eq('id', postId)
      .eq('firebase_uid', verifiedUid);

    if (deleteError) {
      return res.status(500).json({ error: deleteError.message });
    }

    return res.json({ success: true });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// =============================================================================
// 5. STORIES (POST /api/stories & DELETE /api/stories/:id)
// =============================================================================
backendRouter.post('/stories', requireFirebaseAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const verifiedUid = req.user!.uid;
    const { mediaUrl, mediaType } = req.body;

    if (!mediaUrl) {
      return res.status(400).json({ error: 'Media URL is required for stories.' });
    }

    const now = new Date();
    const expiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000);

    const storyPayload = {
      firebase_uid: verifiedUid,
      media_url: mediaUrl,
      media_type: mediaType || 'image',
      created_at: now.toISOString(),
      expires_at: expiresAt.toISOString(),
    };

    const { data, error } = await supabaseAdmin
      .from('stories')
      .insert(storyPayload)
      .select('*')
      .single();

    if (error) {
      console.error('[Backend Stories] Story insert error:', error);
      return res.status(500).json({ error: `Failed to create story: ${error.message}` });
    }

    return res.json({ success: true, story: data });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Story creation failed.' });
  }
});

backendRouter.delete('/stories/:id', requireFirebaseAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const verifiedUid = req.user!.uid;
    const storyId = req.params.id;

    const { data: existing, error: fetchErr } = await supabaseAdmin
      .from('stories')
      .select('id, firebase_uid')
      .eq('id', storyId)
      .single();

    if (fetchErr || !existing) {
      return res.status(404).json({ error: 'Story not found.' });
    }

    if (existing.firebase_uid !== verifiedUid) {
      return res.status(403).json({ error: 'Forbidden: You do not own this story.' });
    }

    const { error: delErr } = await supabaseAdmin
      .from('stories')
      .delete()
      .eq('id', storyId)
      .eq('firebase_uid', verifiedUid);

    if (delErr) {
      return res.status(500).json({ error: delErr.message });
    }

    return res.json({ success: true });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// =============================================================================
// 6. LIKES (POST /api/posts/:id/like)
// =============================================================================
backendRouter.post('/posts/:id/like', requireFirebaseAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const verifiedUid = req.user!.uid;
    const postId = req.params.id;

    // Check if like exists
    const { data: existingLike } = await supabaseAdmin
      .from('likes')
      .select('id')
      .eq('post_id', postId)
      .eq('firebase_uid', verifiedUid)
      .maybeSingle();

    if (existingLike) {
      // Remove like
      await supabaseAdmin.from('likes').delete().eq('id', existingLike.id);
      return res.json({ success: true, liked: false });
    } else {
      // Add like
      const { error: insertErr } = await supabaseAdmin.from('likes').insert({
        post_id: postId,
        firebase_uid: verifiedUid,
        created_at: new Date().toISOString(),
      });

      if (insertErr) {
        return res.status(500).json({ error: insertErr.message });
      }

      return res.json({ success: true, liked: true });
    }
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// =============================================================================
// 7. COMMENTS (POST /api/posts/:id/comment)
// =============================================================================
backendRouter.post('/posts/:id/comment', requireFirebaseAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const verifiedUid = req.user!.uid;
    const postId = req.params.id;
    const { content } = req.body;

    if (!content || !content.trim()) {
      return res.status(400).json({ error: 'Comment content cannot be empty.' });
    }

    const { data, error } = await supabaseAdmin
      .from('comments')
      .insert({
        post_id: postId,
        firebase_uid: verifiedUid,
        content: content.trim(),
        created_at: new Date().toISOString(),
      })
      .select('*')
      .single();

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    return res.json({ success: true, comment: data });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// =============================================================================
// 8. FOLLOWS (POST /api/users/:id/follow)
// =============================================================================
backendRouter.post('/users/:id/follow', requireFirebaseAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const verifiedUid = req.user!.uid;
    const targetUserId = req.params.id;

    if (verifiedUid === targetUserId) {
      return res.status(400).json({ error: 'Cannot follow yourself.' });
    }

    const { data: existingFollow } = await supabaseAdmin
      .from('followers')
      .select('id')
      .eq('follower_uid', verifiedUid)
      .eq('following_uid', targetUserId)
      .maybeSingle();

    if (existingFollow) {
      await supabaseAdmin.from('followers').delete().eq('id', existingFollow.id);
      return res.json({ success: true, following: false });
    } else {
      const { error: insErr } = await supabaseAdmin.from('followers').insert({
        follower_uid: verifiedUid,
        following_uid: targetUserId,
        created_at: new Date().toISOString(),
      });

      if (insErr) {
        return res.status(500).json({ error: insErr.message });
      }

      return res.json({ success: true, following: true });
    }
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// =============================================================================
// 9. NOTIFICATIONS (GET /api/notifications & PATCH /api/notifications/:id/read)
// =============================================================================
backendRouter.get('/notifications', requireFirebaseAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const verifiedUid = req.user!.uid;
    const { data, error } = await supabaseAdmin
      .from('notifications')
      .select('*')
      .eq('recipient_uid', verifiedUid)
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    return res.json({ success: true, notifications: data || [] });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

backendRouter.patch('/notifications/:id/read', requireFirebaseAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const verifiedUid = req.user!.uid;
    const notifId = req.params.id;

    const { data, error } = await supabaseAdmin
      .from('notifications')
      .update({ is_read: true })
      .eq('id', notifId)
      .eq('recipient_uid', verifiedUid)
      .select('*')
      .single();

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    return res.json({ success: true, notification: data });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// =============================================================================
// 10. PET EMERGENCY / RESCUE REPORT (POST & GET /api/emergency/report)
// =============================================================================
backendRouter.post('/emergency/report', requireFirebaseAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const verifiedUid = req.user!.uid;
    const { emergencyType, description, lat, lng, address, photoUrl } = req.body;

    if (lat === undefined || lat === null || lng === undefined || lng === null || isNaN(parseFloat(lat)) || isNaN(parseFloat(lng))) {
      return res.status(400).json({ error: 'Valid GPS latitude and longitude coordinates are required.' });
    }

    if (!emergencyType || !emergencyType.trim()) {
      return res.status(400).json({ error: 'Emergency type is required (e.g. Pet Accident, Pet Injured, Animal in Danger).' });
    }

    const latitude = parseFloat(lat);
    const longitude = parseFloat(lng);
    const locationAddress = address ? address.trim() : `GPS: ${latitude.toFixed(5)}°, ${longitude.toFixed(5)}°`;

    const emergencyRecord = {
      firebase_uid: verifiedUid,
      emergency_type: emergencyType.trim(),
      description: description ? description.trim() : null,
      latitude,
      longitude,
      address: locationAddress,
      photo_url: photoUrl || null,
      created_at: new Date().toISOString(),
    };

    // Insert into Supabase help_requests table
    const { data: helpData, error: helpErr } = await supabaseAdmin
      .from('help_requests')
      .insert(emergencyRecord)
      .select('*')
      .single();

    if (helpErr) {
      console.error('[Backend Emergency] Supabase insert error:', helpErr);
      return res.status(500).json({
        error: `Unable to submit the rescue request (${helpErr.message}).`,
        code: helpErr.code,
      });
    }

    // Dispatch to eligible active responders with live accident coordinates
    const dispatchResult = await dispatchEmergencyToResponders(
      helpData.id,
      verifiedUid,
      emergencyType,
      locationAddress,
      latitude,
      longitude
    );

    return res.status(201).json({
      success: true,
      report: helpData,
      reportId: helpData.id,
      dispatch: dispatchResult,
      message: dispatchResult.message,
    });
  } catch (err: any) {
    console.error('[Backend Emergency] Fatal error:', err);
    return res.status(500).json({ error: err.message || 'Unable to submit the rescue request. Please try again.' });
  }
});

backendRouter.get('/emergency/reports', requireFirebaseAuth, async (_req: AuthenticatedRequest, res: Response) => {
  try {
    const { data: requests, error: reqErr } = await supabaseAdmin
      .from('help_requests')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50);

    if (reqErr) {
      console.error('[Backend Emergency] Error fetching help requests:', reqErr.message);
      return res.status(500).json({ error: reqErr.message });
    }

    if (!requests || requests.length === 0) {
      return res.json({ success: true, reports: [] });
    }

    // Extract unique firebase_uids from the help requests
    const uids = Array.from(new Set(requests.map(r => r.firebase_uid).filter(Boolean)));

    // Fetch corresponding profiles in application code without requiring a database foreign key
    const profileMap: Record<string, { name?: string; photo_url?: string }> = {};
    if (uids.length > 0) {
      const { data: profiles, error: profErr } = await supabaseAdmin
        .from('profiles')
        .select('firebase_uid, name, photo_url')
        .in('firebase_uid', uids);

      if (!profErr && profiles) {
        profiles.forEach(p => {
          profileMap[p.firebase_uid] = {
            name: p.name,
            photo_url: p.photo_url,
          };
        });
      }
    }

    // Combine help requests with profile information in application code
    const reports = requests.map(r => {
      const prof = profileMap[r.firebase_uid];
      return {
        ...r,
        profiles: prof ? { name: prof.name, photo_url: prof.photo_url } : null,
        userName: prof?.name || 'Feeder User',
        userAvatar: prof?.photo_url || null,
      };
    });

    return res.json({ success: true, reports });
  } catch (err: any) {
    console.error('[Backend Emergency] Exception in /emergency/reports:', err.message);
    return res.status(500).json({ error: err.message });
  }
});

// =============================================================================
// 11. RESCUE STATUS TRACKING (GET /api/emergency/status/:id)
// =============================================================================
backendRouter.get('/emergency/status/:id', requireFirebaseAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const verifiedUid = req.user!.uid;
    const requestId = req.params.id;

    // Fetch the help request
    const { data: request, error: reqErr } = await supabaseAdmin
      .from('help_requests')
      .select('*')
      .eq('id', requestId)
      .maybeSingle();

    if (reqErr || !request) {
      return res.status(404).json({ error: 'Rescue request not found.' });
    }

    // Check authorization: only the creator, active responders, or admins can track status
    const responder = await getResponderProfile(verifiedUid);
    const isOwner = request.firebase_uid === verifiedUid;
    const isAuthorizedResponder = responder && responder.is_active && (responder.role === 'responder' || responder.role === 'admin');

    if (!isOwner && !isAuthorizedResponder) {
      return res.status(403).json({ error: 'Forbidden: You are not authorized to view this emergency status.' });
    }

    // Fetch the latest assignment
    const { data: assignment } = await supabaseAdmin
      .from('rescue_assignments')
      .select('*')
      .eq('help_request_id', requestId)
      .in('status', ['ACCEPTED', 'ARRIVED', 'RESOLVED'])
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    let responderInfo = null;
    if (assignment) {
      const { data: respProfile } = await supabaseAdmin
        .from('responder_profiles')
        .select('name, phone')
        .eq('firebase_uid', assignment.responder_uid)
        .maybeSingle();

      responderInfo = respProfile || { name: 'Assigned Responder', phone: null };
    }

    // If no accepted assignment, check if there are notified assignments
    let effectiveStatus: string = 'PENDING';
    if (assignment) {
      effectiveStatus = assignment.status;
    } else {
      const { count } = await supabaseAdmin
        .from('rescue_assignments')
        .select('*', { count: 'exact', head: true })
        .eq('help_request_id', requestId)
        .eq('status', 'NOTIFIED');

      if (count && count > 0) {
        effectiveStatus = 'NOTIFIED';
      }
    }

    return res.json({
      success: true,
      request,
      status: effectiveStatus,
      assignment: assignment ? { ...assignment, responder: responderInfo } : null,
    });
  } catch (err: any) {
    console.error('[Backend Emergency Status] Error:', err.message);
    return res.status(500).json({ error: err.message });
  }
});

// =============================================================================
// 12. RESPONDER RBAC MIDDLEWARE
// =============================================================================
async function requireResponderOrAdmin(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) {
  const verifiedUid = req.user!.uid;
  const profile = await getResponderProfile(verifiedUid, req.user!.email);

  if (!profile || (profile.role !== 'responder' && profile.role !== 'admin')) {
    return res.status(403).json({ error: 'Forbidden: You are not authorized to access rescue requests.' });
  }

  if (!profile.is_active) {
    return res.status(403).json({ error: 'Forbidden: Your responder account is currently inactive.' });
  }

  (req as any).responder = profile;
  next();
}

async function requireAdmin(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) {
  const verifiedUid = req.user!.uid;
  const profile = await getResponderProfile(verifiedUid, req.user!.email);

  if (!profile || profile.role !== 'admin' || !profile.is_active) {
    return res.status(403).json({ error: 'Forbidden: Administrator privileges required.' });
  }

  (req as any).responder = profile;
  next();
}

// =============================================================================
// 13. RESPONDER DASHBOARD & LIFECYCLE (ACCEPT, ARRIVED, RESOLVE)
// =============================================================================

// GET /api/responder/requests - Active rescue requests
backendRouter.get('/responder/requests', requireFirebaseAuth, requireResponderOrAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const verifiedUid = req.user!.uid;

    // Fetch all help requests with their assignments
    const { data: requests, error: reqErr } = await supabaseAdmin
      .from('help_requests')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50);

    if (reqErr) {
      return res.status(500).json({ error: reqErr.message });
    }

    const { data: assignments } = await supabaseAdmin
      .from('rescue_assignments')
      .select('*')
      .in('help_request_id', (requests || []).map(r => r.id));

    const assignmentsMap = new Map<string, any>();
    (assignments || []).forEach(a => {
      // Prioritize ACCEPTED/ARRIVED/RESOLVED
      if (!assignmentsMap.has(a.help_request_id) || ['ACCEPTED', 'ARRIVED', 'RESOLVED'].includes(a.status)) {
        assignmentsMap.set(a.help_request_id, a);
      }
    });

    const enriched = (requests || []).map(r => {
      const assignment = assignmentsMap.get(r.id);
      return {
        ...r,
        status: assignment ? assignment.status : 'PENDING',
        assignedResponderUid: assignment ? assignment.responder_uid : null,
        isMyAssignment: assignment?.responder_uid === verifiedUid,
      };
    });

    return res.json({ success: true, requests: enriched });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// POST /api/emergency/:id/accept - Atomically accept a rescue request
backendRouter.post('/emergency/:id/accept', requireFirebaseAuth, requireResponderOrAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const verifiedUid = req.user!.uid;
    const requestId = req.params.id;

    const result = await acceptRescueRequest(requestId, verifiedUid);

    if (result.conflict) {
      return res.status(409).json({ error: result.error || 'This rescue request has already been accepted by another responder.' });
    }

    if (!result.success) {
      return res.status(400).json({ error: result.error || 'Failed to accept rescue request.' });
    }

    return res.status(200).json({
      success: true,
      status: 'ACCEPTED',
      assignmentId: result.assignment?.id,
      message: 'Rescue request accepted successfully.',
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// POST /api/emergency/:id/arrived - Mark responder arrived at accident
backendRouter.post('/emergency/:id/arrived', requireFirebaseAuth, requireResponderOrAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const verifiedUid = req.user!.uid;
    const requestId = req.params.id;

    const result = await markResponderArrived(requestId, verifiedUid);

    if (!result.success) {
      return res.status(400).json({ error: result.error || 'Failed to update status to arrived.' });
    }

    return res.status(200).json({
      success: true,
      status: 'ARRIVED',
      message: 'Status updated to arrived.',
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// POST /api/emergency/:id/resolve - Mark rescue request resolved
backendRouter.post('/emergency/:id/resolve', requireFirebaseAuth, requireResponderOrAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const verifiedUid = req.user!.uid;
    const requestId = req.params.id;
    const isAdmin = (req as any).responder?.role === 'admin';

    const result = await resolveRescueRequest(requestId, verifiedUid, isAdmin);

    if (!result.success) {
      return res.status(400).json({ error: result.error || 'Failed to resolve rescue request.' });
    }

    return res.status(200).json({
      success: true,
      status: 'RESOLVED',
      message: 'Rescue request marked resolved.',
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// =============================================================================
// 14. USER ROLE & PUSH DEVICE REGISTRATION
// =============================================================================

// GET /api/users/me/role - Get authenticated user role
backendRouter.get('/users/me/role', requireFirebaseAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const verifiedUid = req.user!.uid;
    const profile = await getResponderProfile(verifiedUid);

    return res.json({
      success: true,
      role: profile?.role || 'user',
      isActive: profile?.is_active ?? false,
      profile: profile || null,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// POST /api/notifications/register-device - Register push token for responders
backendRouter.post('/notifications/register-device', requireFirebaseAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const verifiedUid = req.user!.uid;
    const { pushToken, token, platform, deviceType } = req.body;
    const tokenToRegister = (pushToken || token || '').trim();

    if (!tokenToRegister) {
      return res.status(400).json({ error: 'Valid push notification token is required.' });
    }

    // Role check: Only registered responders or admins may register responder push devices
    const profile = await getResponderProfile(verifiedUid, req.user!.email);
    if (!profile || (profile.role !== 'responder' && profile.role !== 'admin')) {
      return res.status(403).json({ error: 'Forbidden: Only verified emergency responders or admins may register responder notification devices.' });
    }

    const result = await registerResponderDevice(verifiedUid, {
      pushToken: tokenToRegister,
      platform: platform || 'web',
      deviceType: deviceType || 'web',
    });

    if (!result.success) {
      return res.status(400).json({ error: result.error || 'Failed to register device.' });
    }

    return res.json({ success: true, message: 'Device token registered successfully.' });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// GET /api/notifications/status - Check responder device registration and push provider status
backendRouter.get('/notifications/status', requireFirebaseAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const verifiedUid = req.user!.uid;
    const profile = await getResponderProfile(verifiedUid, req.user!.email);

    const { data: userDevices } = await supabaseAdmin
      .from('responder_devices')
      .select('id, push_token, platform, device_type, is_active, last_seen_at, updated_at')
      .eq('firebase_uid', verifiedUid)
      .order('updated_at', { ascending: false });

    const serverStatus = await getPushProviderStatus();

    return res.json({
      success: true,
      role: profile?.role || 'user',
      isAuthorizedResponder: profile ? (profile.role === 'responder' || profile.role === 'admin') : false,
      registeredDevices: userDevices || [],
      serverPushStatus: serverStatus,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// =============================================================================
// 15. ADMIN CONTROL & AUDIT LOGS
// =============================================================================

// GET /api/admin/responders - List all responder profiles
backendRouter.get('/admin/responders', requireFirebaseAuth, requireAdmin, async (_req: AuthenticatedRequest, res: Response) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('responder_profiles')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) return res.status(500).json({ error: error.message });
    return res.json({ success: true, responders: data || [] });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// POST /api/admin/responders/role - Set/update responder role & status
backendRouter.post('/admin/responders/role', requireFirebaseAuth, requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { targetUid, name, email, phone, role, isActive } = req.body;

    if (!targetUid || !role) {
      return res.status(400).json({ error: 'targetUid and role are required.' });
    }

    if (!['user', 'responder', 'admin'].includes(role)) {
      return res.status(400).json({ error: 'Invalid role. Must be user, responder, or admin.' });
    }

    const now = new Date().toISOString();
    const { data, error } = await supabaseAdmin
      .from('responder_profiles')
      .upsert(
        {
          firebase_uid: targetUid,
          name: name || 'Responder User',
          email: email || '',
          phone: phone || null,
          role,
          is_active: isActive !== undefined ? !!isActive : true,
          updated_at: now,
        },
        { onConflict: 'firebase_uid' }
      )
      .select('*')
      .single();

    if (error) return res.status(500).json({ error: error.message });
    return res.json({ success: true, responder: data });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// GET /api/admin/audit-logs - View audit trail
backendRouter.get('/admin/audit-logs', requireFirebaseAuth, requireAdmin, async (_req: AuthenticatedRequest, res: Response) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('rescue_audit_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100);

    if (error) return res.status(500).json({ error: error.message });
    return res.json({ success: true, auditLogs: data || [] });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// GET /api/admin/notification-status - Diagnostic status of push provider
backendRouter.get('/admin/notification-status', requireFirebaseAuth, requireAdmin, async (_req: AuthenticatedRequest, res: Response) => {
  try {
    const status = await getPushProviderStatus();
    return res.json({ success: true, ...status });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

