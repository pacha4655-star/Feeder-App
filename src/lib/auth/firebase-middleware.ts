import { NextRequest, NextResponse } from 'next/server';
import { verifyFirebaseIdToken } from '@/lib/firebase/admin';
import { findUserByFirebaseUid, syncUserWithSupabase } from '@/lib/supabase/admin';
import type { DbUser } from '@/types/database';

export interface AuthenticatedContext {
  user: DbUser;
  firebaseUid: string;
  email?: string;
  token: string;
}

export interface AuthErrorResponse {
  error: string;
  status: number;
}

/**
 * Extracts and verifies the Firebase ID token from the request.
 * Checks:
 * 1. Authorization: Bearer <idToken> header
 * 2. feeder_token or feeder_session cookie
 * Cryptographically verifies via Firebase Admin SDK.
 * Resolves or synchronizes the user in Supabase PostgreSQL using firebase_uid.
 */
export async function authenticateServerRequest(
  request: NextRequest
): Promise<AuthenticatedContext | AuthErrorResponse> {
  try {
    let token: string | null = null;

    // 1. Check Authorization header
    const authHeader = request.headers.get('authorization');
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7).trim();
    }

    // 2. Check cookies if header not present
    if (!token) {
      token =
        request.cookies.get('feeder_token')?.value ||
        request.cookies.get('firebase_token')?.value ||
        null;
    }

    if (!token) {
      return { error: 'Authentication required. No token provided.', status: 401 };
    }

    // 3. Cryptographically verify Firebase ID token
    const verification = await verifyFirebaseIdToken(token);
    if (!verification.success || !verification.uid) {
      return {
        error: verification.error || 'Invalid or expired authentication token',
        status: 401,
      };
    }

    const firebaseUid = verification.uid;

    // 4. Look up user in Supabase PostgreSQL by firebase_uid
    let user = await findUserByFirebaseUid(firebaseUid);

    // 5. If user not found in Supabase, auto-sync from verified token claims
    if (!user) {
      const syncRes = await syncUserWithSupabase({
        firebase_uid: firebaseUid,
        email: verification.email,
        display_name: verification.name,
        avatar_url: verification.picture,
      });

      if (syncRes.synced && syncRes.user) {
        user = syncRes.user;
      }
    }

    if (!user) {
      return { error: 'User profile could not be synchronized with database.', status: 500 };
    }

    if (!user.is_active) {
      return { error: 'Your account has been deactivated.', status: 403 };
    }

    return {
      user,
      firebaseUid,
      email: verification.email,
      token,
    };
  } catch (err: any) {
    console.error('[authenticateServerRequest] Exception:', err);
    return { error: 'Internal authentication error', status: 500 };
  }
}

/**
 * Type guard to check if authentication was successful.
 */
export function isAuthenticated(
  result: AuthenticatedContext | AuthErrorResponse
): result is AuthenticatedContext {
  return !('error' in result && typeof (result as AuthErrorResponse).status === 'number');
}
