-- =============================================================================
-- Migration: Responder Devices FCM Push Notification Support
-- Date: 2026-09-10
-- Purpose: Adds device_type and last_seen_at columns to responder_devices
-- =============================================================================

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

-- Ensure columns exist if table was already created
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

-- Strict RLS - 100% Private (Backend Service Role Only)
ALTER TABLE public.responder_devices ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public Read Responder Devices" ON public.responder_devices;
DROP POLICY IF EXISTS "Public Write Responder Devices" ON public.responder_devices;
