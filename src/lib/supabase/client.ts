import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://jmwbyultcdjduwormsbi.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

let client: SupabaseClient | null = null;

/**
 * Public Supabase client for browser/client-side use.
 * Only uses the anonymous public key.
 * NEVER exposed to service role keys.
 */
export function getSupabaseClient(): SupabaseClient {
  if (!client) {
    if (!supabaseUrl || !supabaseAnonKey) {
      console.warn('[Supabase Client] NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY is not configured');
    }
    client = createClient(supabaseUrl, supabaseAnonKey);
  }
  return client;
}

export const supabase = getSupabaseClient();
export default supabase;
