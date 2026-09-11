-- =============================================================================
-- Migration: Enable Realtime Publication and Safe Read Policies for Community Feed
-- Date: 2026-09-11
-- Description:
-- 1. Sets REPLICA IDENTITY FULL on community feed tables (posts, stories, profiles, comments, likes)
-- 2. Idempotently adds tables to supabase_realtime publication for Change Data Capture (CDC)
-- 3. Enables safe public SELECT policies so anon clients and Realtime subscriptions can receive changes
-- 4. Strictly preserves RLS and enforces zero public write policies (writes stay authenticated on backend)
-- =============================================================================

-- 1. Ensure REPLICA IDENTITY FULL for complete payload changes on UPDATE / DELETE
ALTER TABLE IF EXISTS public.posts REPLICA IDENTITY FULL;
ALTER TABLE IF EXISTS public.stories REPLICA IDENTITY FULL;
ALTER TABLE IF EXISTS public.profiles REPLICA IDENTITY FULL;
ALTER TABLE IF EXISTS public.comments REPLICA IDENTITY FULL;
ALTER TABLE IF EXISTS public.likes REPLICA IDENTITY FULL;

-- 2. Idempotently add community tables to the supabase_realtime publication
DO $$
BEGIN
  -- public.posts
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'posts'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.posts;
  END IF;

  -- public.stories
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'stories'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.stories;
  END IF;

  -- public.profiles
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'profiles'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.profiles;
  END IF;

  -- public.comments
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'comments'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.comments;
  END IF;

  -- public.likes
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'likes'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.likes;
  END IF;
END $$;

-- 3. Maintain RLS on all tables
ALTER TABLE IF EXISTS public.posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.stories ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.likes ENABLE ROW LEVEL SECURITY;

-- 4. Safe Public Read (SELECT only) policies for community feed
-- Allows frontend anon clients and Realtime CDC to receive published rows
DROP POLICY IF EXISTS "Public Read Posts" ON public.posts;
CREATE POLICY "Public Read Posts" ON public.posts FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public Read Stories" ON public.stories;
CREATE POLICY "Public Read Stories" ON public.stories FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public Read Profiles" ON public.profiles;
CREATE POLICY "Public Read Profiles" ON public.profiles FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public Read Comments" ON public.comments;
CREATE POLICY "Public Read Comments" ON public.comments FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public Read Likes" ON public.likes;
CREATE POLICY "Public Read Likes" ON public.likes FOR SELECT USING (true);

-- 5. Explicitly drop any accidental client write policies to guarantee backend-only writes
DROP POLICY IF EXISTS "Public Insert Posts" ON public.posts;
DROP POLICY IF EXISTS "Public Update Posts" ON public.posts;
DROP POLICY IF EXISTS "Public Delete Posts" ON public.posts;

DROP POLICY IF EXISTS "Public Insert Stories" ON public.stories;
DROP POLICY IF EXISTS "Public Update Stories" ON public.stories;
DROP POLICY IF EXISTS "Public Delete Stories" ON public.stories;

DROP POLICY IF EXISTS "Public Insert Profiles" ON public.profiles;
DROP POLICY IF EXISTS "Public Update Profiles" ON public.profiles;
DROP POLICY IF EXISTS "Public Delete Profiles" ON public.profiles;

DROP POLICY IF EXISTS "Public Insert Comments" ON public.comments;
DROP POLICY IF EXISTS "Public Update Comments" ON public.comments;
DROP POLICY IF EXISTS "Public Delete Comments" ON public.comments;

DROP POLICY IF EXISTS "Public Insert Likes" ON public.likes;
DROP POLICY IF EXISTS "Public Update Likes" ON public.likes;
DROP POLICY IF EXISTS "Public Delete Likes" ON public.likes;
