import { authenticatedFetch } from './apiClient';
import { supabase } from './supabase';
import { auth } from './firebaseAuth';

/**
 * Toggles a follow relationship between users in Supabase via authenticated backend bridge
 */
export const toggleFollowUserInSupabase = async (
  firstId: string,
  secondId?: string
): Promise<{ isFollowing: boolean; targetFollowersCount: number }> => {
  const currentUser = auth.currentUser;
  if (!currentUser) {
    throw new Error('Authentication required to follow users. Please sign in with Firebase.');
  }

  const targetUserId = secondId ? secondId : firstId;

  const res = await authenticatedFetch<{ success: boolean; following: boolean }>(
    `/api/users/${encodeURIComponent(targetUserId)}/follow`,
    {
      method: 'POST',
    }
  );

  // Fetch updated count from Supabase
  const { count: followersCount } = await supabase
    .from('followers')
    .select('*', { count: 'exact', head: true })
    .eq('following_uid', targetUserId);

  return {
    isFollowing: res.following,
    targetFollowersCount: typeof followersCount === 'number' ? followersCount : 0,
  };
};
