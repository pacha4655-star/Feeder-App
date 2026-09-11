import { supabase, safeRemoveChannel, createRealtimeChannel } from './supabase';
import { auth } from './firebaseAuth';
import { Post, Comment } from '../types';
import { authenticatedFetch } from './apiClient';

/**
 * Maps database post row + likes + comments + author profile to frontend Post
 */
export const mapRowToPost = (
  row: any,
  profileMap: Map<string, any>,
  currentUserId?: string
): Post => {
  const authorUid = row.firebase_uid || '';
  const authorProfile = profileMap.get(authorUid) || {};
  const defaultAvatar = `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(authorUid || 'feeder')}`;

  const likesList: any[] = Array.isArray(row.likes) ? row.likes : [];
  const likedUserIds = likesList.map(l => l.firebase_uid).filter(Boolean);

  const rawComments: any[] = Array.isArray(row.comments) ? row.comments : [];
  const commentsList: Comment[] = rawComments.map(c => {
    const commenterUid = c.firebase_uid || '';
    const commenterProf = profileMap.get(commenterUid) || {};
    return {
      id: c.id,
      postId: c.post_id || row.id,
      userId: commenterUid,
      userName: commenterProf.name || 'Feeder Friend',
      userAvatar: commenterProf.photo_url || `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(commenterUid || 'commenter')}`,
      content: c.content || '',
      createdAt: c.created_at ? new Date(c.created_at).toLocaleDateString() : 'Just now',
      likesCount: 0,
    };
  });

  const mediaList = row.media_url ? [row.media_url] : [];

  return {
    id: row.id,
    userId: authorUid,
    userName: authorProfile.name || 'Feeder Caregiver',
    userAvatar: authorProfile.photo_url || defaultAvatar,
    userLocation: authorProfile.location || '',
    createdAt: row.created_at ? new Date(row.created_at).toLocaleDateString() : 'Just now',
    content: row.content || '',
    media: mediaList,
    type: row.media_type || 'general',
    likedUserIds,
    likesCount: likedUserIds.length,
    commentsCount: commentsList.length,
    sharesCount: 0,
    isLiked: currentUserId ? likedUserIds.includes(currentUserId) : false,
    isSaved: false,
    comments: commentsList,
  };
};

/**
 * Fetches posts from Supabase with likes, comments, and profile resolution
 */
export const fetchPostsFromSupabase = async (currentUserId?: string): Promise<Post[]> => {
  const { data: postsData, error: postsError } = await supabase
    .from('posts')
    .select(`
      id,
      firebase_uid,
      content,
      media_url,
      media_type,
      created_at,
      likes (id, firebase_uid),
      comments (id, post_id, firebase_uid, content, created_at)
    `)
    .order('created_at', { ascending: false })
    .limit(50);

  if (postsError) {
    console.error('[Post Service] Error fetching posts:', postsError);
    throw new Error(postsError.message);
  }

  if (!postsData || postsData.length === 0) {
    return [];
  }

  // Collect all unique Firebase UIDs across posts and comments to fetch profiles in one batch
  const uids = new Set<string>();
  postsData.forEach(p => {
    if (p.firebase_uid) uids.add(p.firebase_uid);
    if (Array.isArray(p.comments)) {
      p.comments.forEach((c: any) => {
        if (c.firebase_uid) uids.add(c.firebase_uid);
      });
    }
  });

  const profileMap = new Map<string, any>();
  if (uids.size > 0) {
    const { data: profilesData } = await supabase
      .from('profiles')
      .select('*')
      .in('firebase_uid', Array.from(uids));

    (profilesData || []).forEach(prof => {
      profileMap.set(prof.firebase_uid, prof);
    });
  }

  return postsData.map(row => mapRowToPost(row, profileMap, currentUserId));
};

/**
 * Fetches all posts created by a specific user from Supabase
 */
export const fetchUserPostsFromSupabase = async (targetUserId: string, currentUserId?: string): Promise<Post[]> => {
  if (!targetUserId) return [];
  const { data: postsData, error: postsError } = await supabase
    .from('posts')
    .select(`
      id,
      firebase_uid,
      content,
      media_url,
      media_type,
      created_at,
      likes (id, firebase_uid),
      comments (id, post_id, firebase_uid, content, created_at)
    `)
    .eq('firebase_uid', targetUserId)
    .order('created_at', { ascending: false });

  if (postsError) {
    console.error('[Post Service] Error fetching user posts:', postsError);
    return [];
  }

  if (!postsData || postsData.length === 0) {
    return [];
  }

  // Fetch author profile
  const { data: profilesData } = await supabase
    .from('profiles')
    .select('*')
    .eq('firebase_uid', targetUserId);

  const profileMap = new Map<string, any>();
  (profilesData || []).forEach(prof => {
    profileMap.set(prof.firebase_uid, prof);
  });

  return postsData.map(row => mapRowToPost(row, profileMap, currentUserId));
};

/**
 * Subscribes to real-time updates for posts, likes, comments, and profiles
 */
export const subscribeToPosts = (
  onUpdate: (posts: Post[]) => void,
  onError?: (err: Error) => void,
  currentUserId?: string
) => {
  const loadPosts = async () => {
    try {
      const posts = await fetchPostsFromSupabase(currentUserId);
      onUpdate(posts);
    } catch (err: any) {
      if (onError) onError(err);
    }
  };

  // Initial load
  loadPosts();

  // Subscribe to changes on posts, likes, comments, and profiles tables with unique instance channel
  const channel = createRealtimeChannel('public:posts-realtime-feed')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'posts' },
      () => loadPosts()
    )
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'likes' },
      () => loadPosts()
    )
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'comments' },
      () => loadPosts()
    )
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'profiles' },
      () => loadPosts()
    )
    .subscribe();

  return () => {
    safeRemoveChannel(channel);
  };
};

/**
 * Creates a new post in Supabase via authenticated backend bridge
 */
export const createPostInSupabase = async (postData: Partial<Post>): Promise<string> => {
  const currentUser = auth.currentUser;
  if (!currentUser) {
    throw new Error('Authentication required to create a post. Please sign in with Firebase.');
  }

  const mediaArray = postData.media || [];
  const primaryMediaUrl = mediaArray.length > 0 ? mediaArray[0] : (postData as any).mediaUrl || null;
  const mediaType = (postData as any).mediaType || (primaryMediaUrl ? 'image' : null);

  const payload = {
    content: (postData.content || '').trim(),
    mediaUrl: primaryMediaUrl,
    mediaType,
    media: mediaArray,
  };

  const res = await authenticatedFetch<{ success: boolean; post: { id: string } }>('/api/posts', {
    method: 'POST',
    body: JSON.stringify(payload),
  });

  return res.post?.id || '';
};

/**
 * Deletes a post from Supabase via authenticated backend bridge
 */
export const deletePostInSupabase = async (postId: string): Promise<void> => {
  await authenticatedFetch(`/api/posts/${encodeURIComponent(postId)}`, {
    method: 'DELETE',
  });
};
