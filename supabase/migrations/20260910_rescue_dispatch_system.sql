-- =============================================================================
-- Migration: Real Rescue Team Notification & Dispatch System
-- Date: 2026-09-10
-- Architecture:
-- 1. Identity: Firebase Authentication
-- 2. Role Verification: Server-side RBAC (user, responder, admin)
-- 3. Database: Supabase PostgreSQL (Strict RLS, 100% private, Backend Service-Role Only)
-- 4. Audit Trail: rescue_audit_logs
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. Responder Profiles / Roles Table
CREATE TABLE IF NOT EXISTS public.responder_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  firebase_uid TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  role TEXT NOT NULL DEFAULT 'responder' CHECK (role IN ('user', 'responder', 'admin')),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_responder_profiles_uid ON public.responder_profiles(firebase_uid);
CREATE INDEX IF NOT EXISTS idx_responder_profiles_role_active ON public.responder_profiles(role, is_active);

-- 2. Rescue Assignments Table
CREATE TABLE IF NOT EXISTS public.rescue_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  help_request_id UUID NOT NULL REFERENCES public.help_requests(id) ON DELETE CASCADE,
  responder_uid TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('PENDING', 'NOTIFIED', 'ACCEPTED', 'ARRIVED', 'RESOLVED', 'CANCELLED')),
  assigned_at TIMESTAMPTZ DEFAULT NOW(),
  accepted_at TIMESTAMPTZ,
  arrived_at TIMESTAMPTZ,
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_rescue_assignments_request ON public.rescue_assignments(help_request_id);
CREATE INDEX IF NOT EXISTS idx_rescue_assignments_responder ON public.rescue_assignments(responder_uid);
CREATE INDEX IF NOT EXISTS idx_rescue_assignments_status ON public.rescue_assignments(status);

-- 3. Responder Devices (FCM Web Push / Device Tokens)
CREATE TABLE IF NOT EXISTS public.responder_devices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  firebase_uid TEXT NOT NULL,
  push_token TEXT NOT NULL UNIQUE,
  platform TEXT NOT NULL DEFAULT 'web',
  device_type TEXT NOT NULL DEFAULT 'web',
  is_active BOOLEAN NOT NULL DEFAULT true,
  last_seen_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Ensure columns exist if table was already partially created
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'responder_devices' AND column_name = 'device_type') THEN
    ALTER TABLE public.responder_devices ADD COLUMN device_type TEXT NOT NULL DEFAULT 'web';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'responder_devices' AND column_name = 'last_seen_at') THEN
    ALTER TABLE public.responder_devices ADD COLUMN last_seen_at TIMESTAMPTZ DEFAULT NOW();
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_responder_devices_uid ON public.responder_devices(firebase_uid);
CREATE INDEX IF NOT EXISTS idx_responder_devices_token ON public.responder_devices(push_token);
CREATE INDEX IF NOT EXISTS idx_responder_devices_active ON public.responder_devices(is_active);

-- 4. Rescue Audit Logs Table
CREATE TABLE IF NOT EXISTS public.rescue_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  help_request_id UUID NOT NULL REFERENCES public.help_requests(id) ON DELETE CASCADE,
  actor_uid TEXT NOT NULL,
  event_type TEXT NOT NULL,
  details TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_rescue_audit_logs_request ON public.rescue_audit_logs(help_request_id);
CREATE INDEX IF NOT EXISTS idx_rescue_audit_logs_created_at ON public.rescue_audit_logs(created_at DESC);

-- 5. Row Level Security (RLS) - 100% Private (Zero Client Direct Access)
ALTER TABLE public.responder_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rescue_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.responder_devices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rescue_audit_logs ENABLE ROW LEVEL SECURITY;

-- Drop any accidental public/client policies
DROP POLICY IF EXISTS "Public Read Responder Profiles" ON public.responder_profiles;
DROP POLICY IF EXISTS "Public Write Responder Profiles" ON public.responder_profiles;
DROP POLICY IF EXISTS "Public Read Rescue Assignments" ON public.rescue_assignments;
DROP POLICY IF EXISTS "Public Write Rescue Assignments" ON public.rescue_assignments;
DROP POLICY IF EXISTS "Public Read Responder Devices" ON public.responder_devices;
DROP POLICY IF EXISTS "Public Write Responder Devices" ON public.responder_devices;
DROP POLICY IF EXISTS "Public Read Rescue Audit Logs" ON public.rescue_audit_logs;
DROP POLICY IF EXISTS "Public Write Rescue Audit Logs" ON public.rescue_audit_logs;

-- 6. Initial Admin Bootstrap
-- Promotes pacha4655@gmail.com to system administrator based on public.profiles:
INSERT INTO public.responder_profiles (firebase_uid, name, email, role, is_active)
SELECT firebase_uid, name, email, 'admin', true FROM public.profiles WHERE email = 'pacha4655@gmail.com'
ON CONFLICT (firebase_uid) DO UPDATE SET role = 'admin', is_active = true, updated_at = NOW();
