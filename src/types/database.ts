/**
 * Database definitions for Feeder.life Supabase PostgreSQL schema.
 * Matches exactly the 5 production tables:
 * 1. users
 * 2. social_posts
 * 3. communities
 * 4. animals
 * 5. platform_data
 */

export interface DbUser {
  id: string; // UUID primary key
  firebase_uid: string; // Unique Firebase Auth UID
  email: string | null;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  country_code: string | null;
  region: string | null;
  city: string | null;
  timezone: string | null;
  locale: string | null;
  profile_data: Record<string, any>;
  settings: Record<string, any>;
  interests: string[];
  onboarding_completed: boolean;
  is_active: boolean;
  is_verified: boolean;
  privacy_settings: Record<string, any>;
  location?: any;
  created_at: string;
  updated_at: string;
  last_seen_at?: string | null;
}

export type SocialPostRecordType =
  | 'post'
  | 'story'
  | 'comment'
  | 'reaction'
  | 'bookmark'
  | 'share';

export type SocialPostVisibility = 'public' | 'community' | 'private';

export interface DbSocialPost {
  id: string; // UUID primary key
  record_type: SocialPostRecordType;
  user_id: string; // FK to users.id
  parent_id?: string | null; // Self FK for comments/replies
  community_id?: string | null; // FK to communities.id
  content?: string | null;
  data: Record<string, any>;
  media: Array<{
    url: string;
    type?: 'image' | 'video';
    aspect_ratio?: string;
    caption?: string;
  }>;
  reactions: Record<string, any>;
  comments: Record<string, any>;
  hashtags: string[];
  mentions: string[];
  location?: any;
  visibility: SocialPostVisibility;
  is_active: boolean;
  is_deleted: boolean;
  stats: Record<string, any>;
  created_at: string;
  updated_at: string;
  expires_at?: string | null; // for 24h stories
}

export type CommunityType =
  | 'general'
  | 'country'
  | 'region'
  | 'city'
  | 'species'
  | 'topic'
  | 'organization';

export interface DbCommunity {
  id: string; // UUID primary key
  name: string;
  slug: string;
  description?: string | null;
  community_type: CommunityType;
  country_code?: string | null;
  region?: string | null;
  city?: string | null;
  avatar_url?: string | null;
  cover_url?: string | null;
  created_by?: string | null; // FK to users.id
  members: string[] | Record<string, any>;
  roles: Record<string, string>;
  rules: string[];
  settings: Record<string, any>;
  is_private: boolean;
  is_active: boolean;
  stats: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export type AnimalStatus =
  | 'active'
  | 'missing'
  | 'rescued'
  | 'adopted'
  | 'reunited'
  | 'deceased'
  | 'inactive';

export interface DbAnimal {
  id: string; // UUID primary key
  name?: string | null;
  species: string;
  breed?: string | null;
  sex?: string | null;
  description?: string | null;
  avatar_url?: string | null;
  country_code?: string | null;
  region?: string | null;
  city?: string | null;
  location?: any;
  created_by?: string | null; // FK to users.id
  profile_data: Record<string, any>;
  media: Array<{
    url: string;
    type?: string;
    is_cover?: boolean;
  }>;
  medical_data: Record<string, any>;
  feeding_data: Record<string, any>;
  sos_data: Record<string, any>;
  rescue_data: Record<string, any>;
  adoption_data: Record<string, any>;
  veterinary_data: Record<string, any>;
  followers: string[];
  status: AnimalStatus;
  created_at: string;
  updated_at: string;
}

export type PlatformDataType =
  | 'follow'
  | 'block'
  | 'notification'
  | 'message'
  | 'conversation'
  | 'report'
  | 'moderation'
  | 'ai_conversation'
  | 'ai_message'
  | 'search'
  | 'audit'
  | 'device'
  | 'system';

export interface DbPlatformData {
  id: string; // UUID primary key
  data_type: PlatformDataType;
  user_id?: string | null; // FK to users.id
  target_user_id?: string | null; // FK to users.id
  target_id?: string | null; // Polymorphic reference (post ID, comment ID, community ID, animal ID)
  data: Record<string, any>;
  status?: string | null;
  created_at: string;
  updated_at: string;
}
