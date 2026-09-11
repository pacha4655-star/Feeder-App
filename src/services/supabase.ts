import { createClient } from '@supabase/supabase-js';

const getEnv = (key: string, defaultValue: string): string => {
  try {
    if (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env[key]) {
      return import.meta.env[key];
    }
  } catch (e) {}
  try {
    if (typeof process !== 'undefined' && process.env && process.env[key]) {
      return process.env[key] as string;
    }
  } catch (e) {}
  return defaultValue;
};

// Safe frontend Supabase configuration
export const supabaseUrl = getEnv('VITE_SUPABASE_URL', 'https://your-supabase-project.supabase.co');
export const supabaseAnonKey = getEnv(
  'VITE_SUPABASE_ANON_KEY',
  getEnv('VITE_SUPABASE_PUBLISHABLE_KEY', 'your-supabase-anon-key')
);

// Create and export the Supabase client
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storage: typeof window !== 'undefined' ? window.localStorage : undefined,
  },
  realtime: {
    params: {
      eventsPerSecond: 10,
    },
  },
});

// Safely unmount and remove a Realtime channel without triggering
// Chromium's "WebSocket is closed before the connection is established" warning
// during rapid React component remounts or StrictMode execution.
export const safeRemoveChannel = (channel: any) => {
  if (!channel) return;
  try {
    if (channel.state === 'joined' || channel.state === 'closed' || channel.state === 'errored') {
      supabase.removeChannel(channel);
      return;
    }
    // If still in the process of joining/connecting, delay unsubscription until after handshake
    setTimeout(() => {
      try {
        supabase.removeChannel(channel);
      } catch (e) {}
    }, 1000);
  } catch (e) {}
};

/**
 * Safely creates a fresh Supabase Realtime channel instance with a unique suffix.
 * This guarantees that concurrent React StrictMode mount/unmount cycles or component remounts
 * never attempt to re-register postgres_changes listeners on an already-subscribing or joined channel.
 */
export const createRealtimeChannel = (topicPrefix: string) => {
  const uniqueId = Math.random().toString(36).slice(2, 9);
  return supabase.channel(`${topicPrefix}-${uniqueId}`);
};

export default supabase;
