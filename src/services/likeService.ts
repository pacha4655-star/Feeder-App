import { authenticatedFetch } from './apiClient';
import { supabase } from './supabase';
import { auth } from './firebaseAuth';

/**
 * Toggles a like on a post in Supabase via authenticated backend bridge
 */
export const toggleLikePostInSupabase = async (
  postId: string,
  _optionalUserId?: string
): Promise<{ isLiked: boolean; likesCount: number; likedUserIds: string[] }> => {
  const currentUser = auth.currentUser;
  if (!currentUser) {
    throw new Error('Authentication required to like posts. Please sign in with Firebase.');
  }

  const res = await authenticatedFetch<{ success: boolean; liked: boolean }>(
    `/api/posts/${encodeURIComponent(postId)}/like`,
    {
      method: 'POST',
    }
  );

  // Query updated likes list directly from Supabase
  const { data: allLikes, error } = await supabase
    .from('likes')
    .select('firebase_uid')
    .eq('post_id', postId);

  if (error) {
    console.warn('[Like Service] Error querying likes:', error.message);
  }

  const likedUserIds = (allLikes || []).map((l: any) => l.firebase_uid).filter(Boolean);
  const likesCount = likedUserIds.length;

  return {
    isLiked: res.liked,
    likesCount,
    likedUserIds,
  };
};
