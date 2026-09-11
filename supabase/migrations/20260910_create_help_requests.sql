-- =============================================================================
-- Migration: Create public.help_requests Table (Completely Private / Backend-Only)
-- Architecture:
-- 1. Identity: Firebase Authentication
-- 2. Authorization: Backend Firebase Bearer Token Verification
-- 3. Database Access: Server-side only via Supabase Service Role Key (BYPASSRLS)
-- 4. Frontend Access: Completely blocked (No direct SELECT, INSERT, UPDATE, DELETE)
-- =============================================================================

-- 1. Ensure pgcrypto extension for gen_random_uuid()
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. Create the help_requests table
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

-- 3. Create indexes for performance & geolocation lookups
CREATE INDEX IF NOT EXISTS idx_help_requests_firebase_uid ON public.help_requests(firebase_uid);
CREATE INDEX IF NOT EXISTS idx_help_requests_created_at ON public.help_requests(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_help_requests_coords ON public.help_requests(latitude, longitude);

-- 4. Enable Row Level Security (RLS)
ALTER TABLE public.help_requests ENABLE ROW LEVEL SECURITY;

-- 5. Drop all existing policies to ensure 100% private / zero client access
DROP POLICY IF EXISTS "Public Read Help Requests" ON public.help_requests;
DROP POLICY IF EXISTS "Public Write Help Requests" ON public.help_requests;
DROP POLICY IF EXISTS "Service Role Write Help Requests" ON public.help_requests;
DROP POLICY IF EXISTS "Service Role Full Access Help Requests" ON public.help_requests;
DROP POLICY IF EXISTS "Allow All Help Requests" ON public.help_requests;

-- NOTE: With RLS enabled and NO policies defined, all direct frontend/client 
-- operations (SELECT, INSERT, UPDATE, DELETE) are completely denied.
-- Only the backend bridge using the Supabase service_role key (which possesses 
-- BYPASSRLS privileges) can read and write to this table.
