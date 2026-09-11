-- =============================================================================
-- FEEDER APP - PRODUCTION SUPABASE DATABASE SCHEMA & SECURITY CONFIGURATION
-- Architecture: Firebase = Authentication Only | Supabase = All Data & Media
-- =============================================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================================================
-- 1. PROFILES TABLE (User profiles keyed by Firebase UID)
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.profiles (
  id TEXT PRIMARY KEY, -- Stores the Firebase UID
  username TEXT UNIQUE,
  name TEXT NOT NULL DEFAULT 'Feeder Caregiver',
  email TEXT,
  phone TEXT,
  avatar TEXT DEFAULT 'https://api.dicebear.com/7.x/bottts/svg?seed=feeder',
  bio TEXT DEFAULT 'Compassionate animal lover, street feeder & pet protector.',
  location TEXT DEFAULT '',
  roles TEXT[] DEFAULT ARRAY['Feeder', 'Animal Lover']::TEXT[],
  interests TEXT[] DEFAULT ARRAY['Street Animals', 'Community Care', 'Adoption']::TEXT[],
  posts_count INTEGER DEFAULT 0,
  followers_count INTEGER DEFAULT 0,
  following_count INTEGER DEFAULT 0,
  pet_name TEXT DEFAULT '',
  pet_species TEXT DEFAULT 'Dog',
  pet_breed TEXT DEFAULT '',
  pet_photo TEXT DEFAULT '',
  pet_age TEXT DEFAULT '',
  is_verified BOOLEAN DEFAULT TRUE,
  karma_points INTEGER DEFAULT 100,
  meals_fed_count INTEGER DEFAULT 0,
  rescues_supported_count INTEGER DEFAULT 0,
  registered_animals_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_profiles_username ON public.profiles(username);

-- =============================================================================
-- 2. COMMUNITIES TABLE
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.communities (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE,
  description TEXT DEFAULT '',
  category TEXT NOT NULL DEFAULT 'General',
  icon TEXT DEFAULT '🐾',
  cover_image TEXT DEFAULT '',
  location TEXT DEFAULT '',
  created_by TEXT REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================================================
-- 3. COMMUNITY MEMBERS TABLE
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.community_members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  community_id UUID NOT NULL REFERENCES public.communities(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(community_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_community_members_community ON public.community_members(community_id);
CREATE INDEX IF NOT EXISTS idx_community_members_user ON public.community_members(user_id);

-- =============================================================================
-- 4. ANIMALS TABLE
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.animals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  species TEXT NOT NULL DEFAULT 'Dog',
  breed TEXT DEFAULT '',
  gender TEXT DEFAULT 'Unknown',
  age TEXT DEFAULT '',
  color TEXT DEFAULT '',
  size TEXT DEFAULT 'Medium',
  location TEXT DEFAULT '',
  avatar TEXT DEFAULT '',
  cover_image TEXT DEFAULT '',
  photos TEXT[] DEFAULT ARRAY[]::TEXT[],
  about TEXT DEFAULT '',
  vaccinated BOOLEAN DEFAULT FALSE,
  neutered BOOLEAN DEFAULT FALSE,
  microchipped BOOLEAN DEFAULT FALSE,
  health_info TEXT DEFAULT '',
  owner_id TEXT REFERENCES public.profiles(id) ON DELETE SET NULL,
  community_id UUID REFERENCES public.communities(id) ON DELETE SET NULL,
  status TEXT DEFAULT 'Healthy',
  followers_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_animals_owner ON public.animals(owner_id);
CREATE INDEX IF NOT EXISTS idx_animals_community ON public.animals(community_id);

-- =============================================================================
-- 5. POSTS TABLE
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.posts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id TEXT NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL DEFAULT '',
  media TEXT[] DEFAULT ARRAY[]::TEXT[],
  type TEXT DEFAULT 'general',
  community_id UUID REFERENCES public.communities(id) ON DELETE SET NULL,
  animal_id UUID REFERENCES public.animals(id) ON DELETE SET NULL,
  location TEXT DEFAULT '',
  poll JSONB,
  likes_count INTEGER DEFAULT 0,
  comments_count INTEGER DEFAULT 0,
  shares_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_posts_user ON public.posts(user_id);
CREATE INDEX IF NOT EXISTS idx_posts_created_at ON public.posts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_posts_community ON public.posts(community_id);

-- =============================================================================
-- 6. STORIES TABLE (24-Hour Ephemeral Media Feed)
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.stories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id TEXT NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  media_url TEXT NOT NULL,
  media_type TEXT NOT NULL DEFAULT 'image',
  caption TEXT DEFAULT '',
  location TEXT DEFAULT '',
  likes_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '24 hours')
);

CREATE INDEX IF NOT EXISTS idx_stories_user ON public.stories(user_id);
CREATE INDEX IF NOT EXISTS idx_stories_expires_at ON public.stories(expires_at);

-- =============================================================================
-- 7. LIKES TABLE
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.likes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  post_id UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(post_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_likes_post ON public.likes(post_id);
CREATE INDEX IF NOT EXISTS idx_likes_user ON public.likes(user_id);

-- =============================================================================
-- 8. COMMENTS TABLE
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.comments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  post_id UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  likes_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_comments_post ON public.comments(post_id);
CREATE INDEX IF NOT EXISTS idx_comments_created_at ON public.comments(created_at ASC);

-- =============================================================================
-- 9. FOLLOWERS TABLE
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.followers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  follower_id TEXT NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  following_id TEXT NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(follower_id, following_id),
  CHECK (follower_id <> following_id)
);

CREATE INDEX IF NOT EXISTS idx_followers_follower ON public.followers(follower_id);
CREATE INDEX IF NOT EXISTS idx_followers_following ON public.followers(following_id);

-- =============================================================================
-- 10. NOTIFICATIONS TABLE
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id TEXT NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  actor_id TEXT REFERENCES public.profiles(id) ON DELETE SET NULL,
  type TEXT NOT NULL,
  post_id UUID REFERENCES public.posts(id) ON DELETE CASCADE,
  message TEXT NOT NULL,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user ON public.notifications(user_id);

-- =============================================================================
-- 11. HELP REQUESTS TABLE (PET ACCIDENT & EMERGENCY RESCUE)
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.help_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  firebase_uid TEXT NOT NULL,
  emergency_type TEXT NOT NULL,
  description TEXT,
  latitude DOUBLE PRECISION NOT NULL,
  longitude DOUBLE PRECISION NOT NULL,
  address TEXT,
  photo_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_help_requests_firebase_uid ON public.help_requests(firebase_uid);
CREATE INDEX IF NOT EXISTS idx_help_requests_created_at ON public.help_requests(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_help_requests_coords ON public.help_requests(latitude, longitude);

-- =============================================================================
-- 12. ROW LEVEL SECURITY (RLS) POLICIES
-- =============================================================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.communities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.animals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.followers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.help_requests ENABLE ROW LEVEL SECURITY;

-- Profiles Policies
DROP POLICY IF EXISTS "Public Read Profiles" ON public.profiles;
DROP POLICY IF EXISTS "Public Write Profiles" ON public.profiles;
CREATE POLICY "Public Read Profiles" ON public.profiles FOR SELECT USING (true);

-- Communities Policies
DROP POLICY IF EXISTS "Public Read Communities" ON public.communities;
DROP POLICY IF EXISTS "Public Write Communities" ON public.communities;
CREATE POLICY "Public Read Communities" ON public.communities FOR SELECT USING (true);

-- Community Members Policies
DROP POLICY IF EXISTS "Public Read Community Members" ON public.community_members;
DROP POLICY IF EXISTS "Public Write Community Members" ON public.community_members;
CREATE POLICY "Public Read Community Members" ON public.community_members FOR SELECT USING (true);

-- Animals Policies
DROP POLICY IF EXISTS "Public Read Animals" ON public.animals;
DROP POLICY IF EXISTS "Public Write Animals" ON public.animals;
CREATE POLICY "Public Read Animals" ON public.animals FOR SELECT USING (true);

-- Posts Policies
DROP POLICY IF EXISTS "Public Read Posts" ON public.posts;
DROP POLICY IF EXISTS "Public Write Posts" ON public.posts;
CREATE POLICY "Public Read Posts" ON public.posts FOR SELECT USING (true);

-- Stories Policies (24-Hour Ephemeral Visibility)
DROP POLICY IF EXISTS "Public Read Stories" ON public.stories;
DROP POLICY IF EXISTS "Public Write Stories" ON public.stories;
CREATE POLICY "Public Read Stories" ON public.stories FOR SELECT USING (expires_at > NOW());

-- Likes Policies
DROP POLICY IF EXISTS "Public Read Likes" ON public.likes;
DROP POLICY IF EXISTS "Public Write Likes" ON public.likes;
CREATE POLICY "Public Read Likes" ON public.likes FOR SELECT USING (true);

-- Comments Policies
DROP POLICY IF EXISTS "Public Read Comments" ON public.comments;
DROP POLICY IF EXISTS "Public Write Comments" ON public.comments;
CREATE POLICY "Public Read Comments" ON public.comments FOR SELECT USING (true);

-- Followers Policies
DROP POLICY IF EXISTS "Public Read Followers" ON public.followers;
DROP POLICY IF EXISTS "Public Write Followers" ON public.followers;
CREATE POLICY "Public Read Followers" ON public.followers FOR SELECT USING (true);

-- Notifications Policies
DROP POLICY IF EXISTS "Public Read Notifications" ON public.notifications;
DROP POLICY IF EXISTS "Public Write Notifications" ON public.notifications;
CREATE POLICY "Public Read Notifications" ON public.notifications FOR SELECT USING (true);

-- Help Requests Policies (Completely Private / Backend Only)
DROP POLICY IF EXISTS "Public Read Help Requests" ON public.help_requests;
DROP POLICY IF EXISTS "Public Write Help Requests" ON public.help_requests;
-- No client policies granted. All access is restricted to backend service_role.

-- =============================================================================
-- 13. SUPABASE STORAGE BUCKETS SETUP & POLICIES
-- =============================================================================

-- Ensure the 4 public media buckets exist and are set to public
INSERT INTO storage.buckets (id, name, public) 
VALUES 
  ('post-media', 'post-media', true),
  ('story-media', 'story-media', true),
  ('profile-images', 'profile-images', true),
  ('general-media', 'general-media', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Drop legacy or conflicting storage policies if any
DROP POLICY IF EXISTS "Allow public read on all storage objects" ON storage.objects;
DROP POLICY IF EXISTS "Allow public insert on storage objects" ON storage.objects;
DROP POLICY IF EXISTS "Allow public update on storage objects" ON storage.objects;
DROP POLICY IF EXISTS "Allow public delete on storage objects" ON storage.objects;
DROP POLICY IF EXISTS "Feeder public insert media" ON storage.objects;
DROP POLICY IF EXISTS "Feeder public update media" ON storage.objects;
DROP POLICY IF EXISTS "Feeder public delete media" ON storage.objects;
DROP POLICY IF EXISTS "Feeder public read media" ON storage.objects;

-- Storage public read policy for Feeder buckets
CREATE POLICY "Feeder public read media"
  ON storage.objects FOR SELECT
  USING (bucket_id IN ('post-media', 'story-media', 'profile-images', 'general-media'));
