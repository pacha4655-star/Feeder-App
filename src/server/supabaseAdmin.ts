import { createClient, SupabaseClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || '';

if (!SUPABASE_URL) {
  console.warn('[Supabase Admin] SUPABASE_URL / VITE_SUPABASE_URL is not set in environment.');
}

if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
  console.warn('[Supabase Admin] SUPABASE_SERVICE_ROLE_KEY is not set. Falling back to ANON key. For full security, provide SUPABASE_SERVICE_ROLE_KEY in .env.');
}

export const supabaseAdmin: SupabaseClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});
