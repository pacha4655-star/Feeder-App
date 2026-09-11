import { createClient, SupabaseClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const FALLBACK_SUPABASE_URL = 'https://hrrmvobrdgqcsdzwtcjr.supabase.co';
const FALLBACK_SUPABASE_KEY = 'sb_publishable_1B17n2ac9r_8BtdNIEWzug_u8K9qHa8';

const SUPABASE_URL = (process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || FALLBACK_SUPABASE_URL).trim();
const SUPABASE_SERVICE_ROLE_KEY = (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || FALLBACK_SUPABASE_KEY).trim();

if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
  console.warn('[Supabase Admin] SUPABASE_SERVICE_ROLE_KEY is not set. Using publishable client key.');
}

export const supabaseAdmin: SupabaseClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});
