import { authenticatedFetch } from './apiClient';
import { supabase } from './supabase';
import { auth } from './firebaseAuth';
import { Comment } from '../types';

/**
 * Fetches all comments for a post directly from Supabase with profile resolution
 */
export const fetchCommentsForPost = async (postId: string): Promise<Comment[]> => {
  const { data: commentsData, error } = await supabase
    .from('comments')
    .select('id, post_id, firebase_uid, content, created_at')
    .eq('post_id', postId)
    .order('created_at', { ascending: true });

  if (error) {
    console.error('[Comment Service] Error fetching comments:', error.message);
    return [];
  }

  if (!commentsData || commentsData.length === 0) {
    return [];
  }

  // Resolve commenter profiles
  const uids = Array.from(new Set(commentsData.map(c => c.firebase_uid).filter(Boolean)));
  const profileMap = new Map<string, any>();
  if (uids.length > 0) {
    const { data: profilesData } = await supabase
      .from('profiles')
      .select('*')
      .in('firebase_uid', uids);

    (profilesData || []).forEach(p => {
      profileMap.set(p.firebase_uid, p);
    });
  }

  return commentsData.map((c: any) => {
    const commenterProfile = profileMap.get(c.firebase_uid) || {};
    const defaultAvatar = `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(c.firebase_uid || 'commenter')}`;
    return {
      id: c.id,
      postId: c.post_id,
      userId: c.firebase_uid,
      userName: commenterProfile.name || 'Feeder Friend',
      userAvatar: commenterProfile.photo_url || defaultAvatar,
      content: c.content || '',
      createdAt: c.created_at ? new Date(c.created_at).toLocaleDateString() : 'Just now',
      likesCount: 0,
    };
  });
};

/**
 * Adds a new comment to a post via authenticated backend bridge
 */
export const addCommentToPostInSupabase = async (
  postId: string,
  commentData: Comment | string
): Promise<{ comments: Comment[]; commentsCount: number }> => {
  const currentUser = auth.currentUser;
  if (!currentUser) {
    throw new Error('Authentication required to comment. Please sign in with Firebase.');
  }

  const textContent = typeof commentData === 'string' ? commentData.trim() : (commentData.content || '').trim();

  await authenticatedFetch(`/api/posts/${encodeURIComponent(postId)}/comment`, {
    method: 'POST',
    body: JSON.stringify({ content: textContent }),
  });

  const allComments = await fetchCommentsForPost(postId);

  return {
    comments: allComments,
    commentsCount: allComments.length,
  };
};
