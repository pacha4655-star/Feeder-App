-- =============================================================================
-- Migration: Add Username and Profile Search Enhancements
-- Date: 2026-09-11
-- Description:
-- 1. Adds username column to profiles table if not present
-- 2. Backfills usernames for existing profiles
-- 3. Creates a unique case-insensitive index on LOWER(username)
-- 4. Ensures follower/following indexes and policies
-- =============================================================================

DO $$
BEGIN
  -- 1. Add username column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'profiles' 
      AND column_name = 'username'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN username TEXT;
  END IF;
END $$;

-- 2. Backfill existing profiles with empty/null username
UPDATE public.profiles
SET username = LOWER(REGEXP_REPLACE(name, '[^a-zA-Z0-9_]', '', 'g'))
WHERE (username IS NULL OR username = '') AND name IS NOT NULL AND name <> '';

-- For any remaining nulls, fallback to firebase_uid prefix
UPDATE public.profiles
SET username = 'user_' || SUBSTRING(REPLACE(firebase_uid, '-', ''), 1, 8)
WHERE username IS NULL OR username = '';

-- 3. Case-insensitive unique index on username
CREATE UNIQUE INDEX IF NOT EXISTS idx_profiles_username_lower 
ON public.profiles (LOWER(username)) 
WHERE username IS NOT NULL AND username <> '';

-- 4. Fast search index on name and username
CREATE INDEX IF NOT EXISTS idx_profiles_name_search 
ON public.profiles (LOWER(name));

-- 5. Ensure followers table indexes for high performance
CREATE INDEX IF NOT EXISTS idx_followers_follower_uid 
ON public.followers(follower_uid);

CREATE INDEX IF NOT EXISTS idx_followers_following_uid 
ON public.followers(following_uid);

CREATE UNIQUE INDEX IF NOT EXISTS idx_followers_unique_pair 
ON public.followers(follower_uid, following_uid);
