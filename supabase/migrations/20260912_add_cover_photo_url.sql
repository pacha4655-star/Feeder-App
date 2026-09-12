-- =============================================================================
-- Migration: Add cover_photo_url to profiles table
-- =============================================================================

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS cover_photo_url TEXT;

COMMENT ON COLUMN public.profiles.cover_photo_url IS 'Public URL of user profile cover/background image';
