import { supabase, safeRemoveChannel, createRealtimeChannel } from './supabase';
import { auth } from './firebaseAuth';
import { Story } from '../types';
import { authenticatedFetch } from './apiClient';

/**
 * Maps a database story row + author profile to the frontend Story interface
 */
export const mapRowToStory = (row: any, profileMap: Map<string, any>): Story => {
  const uid = row.firebase_uid || '';
  const authorProfile = profileMap.get(uid) || {};
  const defaultAvatar = `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(uid || 'story')}`;

  return {
    id: row.id,
    userId: uid,
    userName: authorProfile.name || 'Feeder',
    userAvatar: authorProfile.photo_url || defaultAvatar,
    userBadge: 'Feeder',
    mediaUrl: row.media_url,
    mediaType: row.media_type || 'image',
    caption: '',
    location: authorProfile.location || '',
    createdAt: row.created_at,
    expiresAt: row.expires_at,
    likesCount: 0,
    seen: false,
  };
};

/**
 * Fetches active stories (expires_at > now()) from Supabase
 */
export const fetchStoriesFromSupabase = async (): Promise<Story[]> => {
  const now = new Date().toISOString();
  const { data: storiesData, error } = await supabase
    .from('stories')
    .select('*')
    .gt('expires_at', now)
    .order('created_at', { ascending: false })
    .limit(40);

  if (error) {
    console.error('[Story Service] Error fetching stories:', error);
    throw new Error(error.message);
  }

  if (!storiesData || storiesData.length === 0) {
    return [];
  }

  // Resolve author profiles
  const uids = Array.from(new Set(storiesData.map(s => s.firebase_uid).filter(Boolean)));
  const profileMap = new Map<string, any>();
  if (uids.length > 0) {
    const { data: profilesData } = await supabase
      .from('profiles')
      .select('*')
      .in('firebase_uid', uids);

    (profilesData || []).forEach(prof => {
      profileMap.set(prof.firebase_uid, prof);
    });
  }

  return storiesData.map(row => mapRowToStory(row, profileMap));
};

/**
 * Subscribes to real-time updates for community stories
 */
export const subscribeToStories = (
  onUpdate: (stories: Story[]) => void,
  onError?: (err: Error) => void
) => {
  const loadStories = async () => {
    try {
      const stories = await fetchStoriesFromSupabase();
      onUpdate(stories);
    } catch (err: any) {
      if (onError) onError(err);
    }
  };

  // Initial load
  loadStories();

  // Realtime subscription with unique instance channel
  const channel = createRealtimeChannel('public:stories-realtime-feed')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'stories' },
      () => loadStories()
    )
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'profiles' },
      () => loadStories()
    )
    .subscribe();

  return () => {
    safeRemoveChannel(channel);
  };
};

/**
 * Creates a new 24h ephemeral community story via authenticated backend bridge
 */
export const createStoryInSupabase = async (storyData: Partial<Story>): Promise<string> => {
  const currentUser = auth.currentUser;
  if (!currentUser) {
    throw new Error('Authentication required to create a story. Please sign in with Firebase.');
  }

  if (!storyData.mediaUrl) {
    throw new Error('Story requires a valid media URL.');
  }

  const payload = {
    mediaUrl: storyData.mediaUrl,
    mediaType: storyData.mediaType || 'image',
  };

  const res = await authenticatedFetch<{ success: boolean; story: { id: string } }>('/api/stories', {
    method: 'POST',
    body: JSON.stringify(payload),
  });

  return res.story?.id || '';
};

/**
 * Deletes a story from Supabase via authenticated backend bridge
 */
export const deleteStoryInSupabase = async (storyId: string): Promise<void> => {
  await authenticatedFetch(`/api/stories/${encodeURIComponent(storyId)}`, {
    method: 'DELETE',
  });
};
