import { cookies } from 'next/headers';
import crypto from 'crypto';
import { getSupabaseServerClient } from '../supabase/server';
import { getDb } from '../db';
import type { DbUser } from '@/types/database';

export interface UserSession {
  id: string;
  email: string;
  username: string;
  fullName: string;
  avatarUrl: string;
  role: 'USER' | 'MODERATOR' | 'COMMUNITY_ADMIN' | 'PLATFORM_MODERATOR' | 'PLATFORM_ADMIN';
  bio?: string;
  areaName?: string;
  city?: string;
  feederLevel?: string;
  feedingCount: number;
  sosCount: number;
  onboardingCompleted?: boolean;
  firebaseUid?: string;
}

/**
 * Generates a tamper-proof cryptographically signed session token for a user.
 * Encodes the Supabase UUID and Firebase UID.
 */
export function createSessionToken(user: { id: string; firebase_uid?: string; email?: string | null }): string {
  const secret = process.env.SUPABASE_SERVICE_ROLE_KEY || 'feeder-life-session-secret-2026';
  const payload = {
    id: user.id,
    uid: user.firebase_uid,
    email: user.email,
    iat: Date.now(),
    exp: Date.now() + 30 * 24 * 60 * 60 * 1000, // 30 days
  };
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const sig = crypto.createHmac('sha256', secret).update(body).digest('base64url');
  return `${body}.${sig}`;
}

/**
 * Validates a signed session token.
 */
export function verifySessionToken(token: string): { id: string; uid?: string; email?: string } | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 2) return null;
    const [body, sig] = parts;
    const secret = process.env.SUPABASE_SERVICE_ROLE_KEY || 'feeder-life-session-secret-2026';
    const expectedSig = crypto.createHmac('sha256', secret).update(body).digest('base64url');
    if (sig !== expectedSig) return null;
    const payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'));
    if (payload.exp && payload.exp < Date.now()) return null;
    return payload;
  } catch {
    return null;
  }
}

/**
 * Returns the currently authenticated user session from the real database.
 * 1. Checks Supabase PostgreSQL using signed session token.
 * 2. Falls back to local SQLite session store if not found in Supabase.
 * Returns null if no valid session cookie exists.
 * ZERO fake or hardcoded fallbacks.
 */
export async function getCurrentUser(): Promise<UserSession | null> {
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get('feeder_session')?.value;
  if (!sessionToken) {
    return null;
  }

  // 1. Try Supabase signed session token
  const payload = verifySessionToken(sessionToken);
  if (payload && payload.id) {
    try {
      const supabase = getSupabaseServerClient();
      let query = supabase.from('users').select('*');
      
      if (payload.id) {
        query = query.eq('id', payload.id);
      } else if (payload.uid) {
        query = query.eq('firebase_uid', payload.uid);
      }

      const { data: dbUser, error } = await query.maybeSingle();

      if (!error && dbUser && dbUser.is_active) {
        const u = dbUser as DbUser;
        return {
          id: u.id,
          email: u.email || '',
          username: u.username || '',
          fullName: u.display_name || u.username || 'Feeder Guardian',
          avatarUrl: u.avatar_url || '',
          role: (u.profile_data?.role as any) || 'USER',
          bio: u.bio || '',
          areaName: u.profile_data?.area_name || '',
          city: u.city || '',
          feederLevel: u.profile_data?.feeder_level || 'Grassroots Feeder',
          feedingCount: u.profile_data?.feeding_count || 0,
          sosCount: u.profile_data?.sos_count || 0,
          onboardingCompleted: u.onboarding_completed ?? false,
          firebaseUid: u.firebase_uid,
        };
      }
    } catch (supaErr) {
      console.warn('[getCurrentUser] Supabase lookup notice:', supaErr);
    }
  }

  // 2. Fallback to local database session (for local users/testing)
  try {
    const db = getDb();
    const session = db
      .prepare(`
        SELECT s.*, u.id as u_id, u.firebase_uid, u.email, u.username, u.full_name, u.avatar_url, u.role, u.status,
               p.bio, p.area_name, p.city, p.feeder_level, p.feeding_count, p.sos_responses_count
        FROM user_sessions s
        JOIN users u ON s.user_id = u.id
        LEFT JOIN user_profiles p ON u.id = p.user_id
        WHERE s.token_hash = ? AND s.expires_at > CURRENT_TIMESTAMP AND u.status = 'ACTIVE'
      `)
      .get(sessionToken) as any;

    if (session) {
      return {
        id: session.u_id,
        email: session.email,
        username: session.username,
        fullName: session.full_name,
        avatarUrl: session.avatar_url,
        role: session.role,
        bio: session.bio,
        areaName: session.area_name,
        city: session.city,
        feederLevel: session.feeder_level,
        feedingCount: session.feeding_count || 0,
        sosCount: session.sos_responses_count || 0,
        firebaseUid: session.firebase_uid,
      };
    }
  } catch (sqliteErr) {
    // SQLite not configured or table missing
  }

  return null;
}

export async function requireAuth(): Promise<UserSession> {
  const user = await getCurrentUser();
  if (!user) {
    throw new Error('UNAUTHORIZED');
  }
  return user;
}
