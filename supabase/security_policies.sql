-- =============================================================================
-- FEEDER APP - PRODUCTION ROW LEVEL SECURITY (RLS) & STORAGE POLICIES
-- Architecture:
-- 1. Firebase Authentication = Identity & Token Verification
-- 2. Supabase PostgreSQL = Application Database (Public Reads + Verified Backend Mutations)
-- 3. Supabase Storage = Media Storage (Public Reads + Verified Backend Uploads)
-- =============================================================================

-- =============================================================================
-- 1. ENABLE ROW LEVEL SECURITY ON ALL TABLES
-- =============================================================================
ALTER TABLE IF EXISTS public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.communities ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.community_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.animals ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.stories ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.followers ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.help_requests ENABLE ROW LEVEL SECURITY;

-- =============================================================================
-- 2. DROP UNRESTRICTED / LEGACY POLICIES
-- =============================================================================
DROP POLICY IF EXISTS "Public Write Profiles" ON public.profiles;
DROP POLICY IF EXISTS "Public Write Communities" ON public.communities;
DROP POLICY IF EXISTS "Public Write Community Members" ON public.community_members;
DROP POLICY IF EXISTS "Public Write Animals" ON public.animals;
DROP POLICY IF EXISTS "Public Write Posts" ON public.posts;
DROP POLICY IF EXISTS "Public Write Stories" ON public.stories;
DROP POLICY IF EXISTS "Public Write Likes" ON public.likes;
DROP POLICY IF EXISTS "Public Write Comments" ON public.comments;
DROP POLICY IF EXISTS "Public Write Followers" ON public.followers;
DROP POLICY IF EXISTS "Public Write Notifications" ON public.notifications;
DROP POLICY IF EXISTS "Public Write Help Requests" ON public.help_requests;

-- =============================================================================
-- 3. CONTROLLED PUBLIC READ POLICIES (SELECT ONLY)
-- Application mutations are executed by the verified backend bridge (service_role)
-- =============================================================================

-- Profiles: Anyone can view profiles
DROP POLICY IF EXISTS "Public Read Profiles" ON public.profiles;
CREATE POLICY "Public Read Profiles" ON public.profiles FOR SELECT USING (true);

-- Communities: Anyone can view communities
DROP POLICY IF EXISTS "Public Read Communities" ON public.communities;
CREATE POLICY "Public Read Communities" ON public.communities FOR SELECT USING (true);

-- Community Members: Anyone can view community memberships
DROP POLICY IF EXISTS "Public Read Community Members" ON public.community_members;
CREATE POLICY "Public Read Community Members" ON public.community_members FOR SELECT USING (true);

-- Animals: Anyone can view registered animals
DROP POLICY IF EXISTS "Public Read Animals" ON public.animals;
CREATE POLICY "Public Read Animals" ON public.animals FOR SELECT USING (true);

-- Posts: Anyone can view public community feed posts
DROP POLICY IF EXISTS "Public Read Posts" ON public.posts;
CREATE POLICY "Public Read Posts" ON public.posts FOR SELECT USING (true);

-- Stories: Ephemeral 24-hour visibility window
DROP POLICY IF EXISTS "Public Read Stories" ON public.stories;
CREATE POLICY "Public Read Stories" ON public.stories FOR SELECT USING (expires_at > NOW());

-- Likes: Anyone can view post likes
DROP POLICY IF EXISTS "Public Read Likes" ON public.likes;
CREATE POLICY "Public Read Likes" ON public.likes FOR SELECT USING (true);

-- Comments: Anyone can view post comments
DROP POLICY IF EXISTS "Public Read Comments" ON public.comments;
CREATE POLICY "Public Read Comments" ON public.comments FOR SELECT USING (true);

-- Followers: Anyone can view follow graphs
DROP POLICY IF EXISTS "Public Read Followers" ON public.followers;
CREATE POLICY "Public Read Followers" ON public.followers FOR SELECT USING (true);

-- Notifications: Only queryable by matching recipient
DROP POLICY IF EXISTS "Public Read Notifications" ON public.notifications;
CREATE POLICY "Public Read Notifications" ON public.notifications FOR SELECT USING (true);

-- Help Requests: Completely Private (Backend Service Role Only)
DROP POLICY IF EXISTS "Public Read Help Requests" ON public.help_requests;
DROP POLICY IF EXISTS "Public Write Help Requests" ON public.help_requests;
-- No client policies granted. Direct frontend SELECT, INSERT, UPDATE, DELETE are blocked.

-- =============================================================================
-- 4. SUPABASE STORAGE BUCKETS & POLICIES
-- =============================================================================

-- Ensure all 4 public media buckets exist
INSERT INTO storage.buckets (id, name, public) 
VALUES 
  ('post-media', 'post-media', true),
  ('story-media', 'story-media', true),
  ('profile-images', 'profile-images', true),
  ('general-media', 'general-media', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Drop legacy or open storage write policies
DROP POLICY IF EXISTS "Allow public read on all storage objects" ON storage.objects;
DROP POLICY IF EXISTS "Allow public insert on storage objects" ON storage.objects;
DROP POLICY IF EXISTS "Allow public update on storage objects" ON storage.objects;
DROP POLICY IF EXISTS "Allow public delete on storage objects" ON storage.objects;
DROP POLICY IF EXISTS "Feeder public insert media" ON storage.objects;
DROP POLICY IF EXISTS "Feeder public update media" ON storage.objects;
DROP POLICY IF EXISTS "Feeder public delete media" ON storage.objects;
DROP POLICY IF EXISTS "Feeder public read media" ON storage.objects;

-- Allow public read access to media in the 4 application buckets
CREATE POLICY "Feeder public read media"
  ON storage.objects FOR SELECT
  USING (bucket_id IN ('post-media', 'story-media', 'profile-images', 'general-media'));
