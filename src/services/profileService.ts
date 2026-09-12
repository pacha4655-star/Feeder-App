import { supabase, safeRemoveChannel, createRealtimeChannel } from './supabase';
import { User } from '../types';
import { authenticatedFetch } from './apiClient';
import { resolveApiUrl } from '../utils/apiConfig';

/**
 * Maps a Supabase `profiles` record to the frontend `User` interface
 */
export const mapProfileToUser = (row: any): User => {
  const uid = row.firebase_uid || row.id || '';
  const defaultAvatar = `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(uid || 'feeder')}`;
  return {
    id: uid,
    name: row.name || 'Feeder Caregiver',
    username: row.username || (row.name || 'feeder').toLowerCase().replace(/[^a-z0-9_]/g, '') || 'feeder',
    email: row.email || undefined,
    phone: undefined,
    avatar: row.photo_url || defaultAvatar,
    bio: row.bio !== undefined && row.bio !== null ? row.bio : 'Compassionate animal lover, street feeder & pet protector.',
    location: row.location || '',
    roles: ['Feeder', 'Animal Lover'],
    interests: ['Street Animals', 'Community Care', 'Adoption'],
    postsCount: 0,
    followersCount: 0,
    followingCount: 0,
    followerIds: [],
    followingIds: [],
    joinedDate: row.created_at ? new Date(row.created_at).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }) : 'Joined recently',
    isVerified: true,
    karmaPoints: 100,
    mealsFedCount: 0,
    rescuesSupportedCount: 0,
    registeredAnimalsCount: 0,
  };
};

/**
 * Checks if a username is available and valid format via backend API
 */
export const checkUsernameAvailability = async (
  username: string
): Promise<{ available: boolean; reason?: string }> => {
  try {
    const targetUrl = resolveApiUrl(`/api/profile/check-username?username=${encodeURIComponent(username)}`);
    const res = await fetch(targetUrl);
    if (!res.ok) {
      return { available: true };
    }
    return await res.json();
  } catch {
    return { available: true };
  }
};

/**
 * Fetches a user's full profile from Supabase using their Firebase UID
 */
export const getUserProfileFromSupabase = async (userId: string): Promise<User | null> => {
  try {
    if (!userId) return null;

    // 1. Direct Supabase Query
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('firebase_uid', userId)
      .maybeSingle();

    if (!error && data) {
      // Fetch following and follower IDs from followers table
      const [followingRes, followersRes, postsCountRes] = await Promise.all([
        supabase.from('followers').select('following_uid').eq('follower_uid', userId),
        supabase.from('followers').select('follower_uid').eq('following_uid', userId),
        supabase.from('posts').select('*', { count: 'exact', head: true }).eq('firebase_uid', userId),
      ]);

      const followingIds = (followingRes.data || []).map(r => r.following_uid);
      const followerIds = (followersRes.data || []).map(r => r.follower_uid);
      const postsCount = typeof postsCountRes.count === 'number' ? postsCountRes.count : 0;

      const user = mapProfileToUser(data);
      return {
        ...user,
        followingIds,
        followerIds,
        followingCount: followingIds.length,
        followersCount: followerIds.length,
        postsCount,
      };
    }

    // 2. Fallback: Query backend GET /api/profile/:uid (runs with service role privileges)
    try {
      const targetUrl = resolveApiUrl(`/api/profile/${encodeURIComponent(userId)}`);
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 6000);
      const res = await fetch(targetUrl, {
        headers: { Accept: 'application/json' },
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (res.ok) {
        const json = await res.json();
        if (json && json.profile) {
          return mapProfileToUser(json.profile);
        }
      }
    } catch (e) {
      // Non-blocking fallback
    }

    return null;
  } catch (err) {
    console.error('[Profile Service] Unexpected error in getUserProfileFromSupabase:', err);
    return null;
  }
};

/**
 * Inserts or updates a user profile in Supabase via authenticated backend bridge
 */
export const syncUserProfileToSupabase = async (user: User): Promise<void> => {
  try {
    await authenticatedFetch('/api/profile/sync', {
      method: 'POST',
      body: JSON.stringify(user),
    });
  } catch (err: any) {
    console.warn('[Profile Service] Backend profile sync error:', err.message || err);
    throw err;
  }
};

/**
 * Subscribes to real-time updates on public profiles
 */
export const subscribeToUsers = (
  onUpdate: (users: User[]) => void,
  onError?: (err: Error) => void
) => {
  const fetchAllUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) {
        if (onError) onError(new Error(error.message));
        return;
      }

      const users = (data || []).map(mapProfileToUser);
      onUpdate(users);
    } catch (err: any) {
      if (onError) onError(err);
    }
  };

  // Initial fetch
  fetchAllUsers();

  // Realtime subscription with unique instance channel
  const channel = createRealtimeChannel('public:profiles')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'profiles' },
      () => {
        fetchAllUsers();
      }
    )
    .subscribe();

  return () => {
    safeRemoveChannel(channel);
  };
};
