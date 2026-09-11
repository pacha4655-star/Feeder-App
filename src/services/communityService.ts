import { Community } from '../types';

/**
 * Notice: The 'communities' and 'community_members' tables do not exist in the connected Supabase database.
 * No fake data is created. Missing schema is reported.
 */
export const fetchCommunitiesFromSupabase = async (_currentUserId?: string): Promise<Community[]> => {
  return [];
};

export const subscribeToCommunities = (
  onUpdate: (communities: Community[]) => void,
  _onError?: (err: Error) => void,
  _currentUserId?: string
) => {
  onUpdate([]);
  return () => {};
};

export const createCommunityInSupabase = async (_community: Partial<Community>): Promise<string> => {
  throw new Error('Communities feature is currently unavailable (table "communities" does not exist in database).');
};

export const toggleJoinCommunityInSupabase = async (
  _communityId: string,
  _optionalUserId?: string
): Promise<{ isJoined: boolean }> => {
  throw new Error('Communities feature is currently unavailable (table "communities" does not exist in database).');
};
