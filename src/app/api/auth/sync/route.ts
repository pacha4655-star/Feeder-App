import { NextRequest, NextResponse } from 'next/server';
import { verifyFirebaseIdToken } from '@/lib/firebase/admin';
import { syncUserWithSupabase } from '@/lib/supabase/admin';
import { createSessionToken } from '@/lib/auth/session';
import { getDb } from '@/lib/db';
import crypto from 'crypto';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const { idToken } = body;

    if (!idToken || typeof idToken !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Authentication token is required' },
        { status: 400 }
      );
    }

    // 1. Cryptographically verify the Firebase ID token on the server
    // Never trust frontend-supplied user IDs or claims.
    const verification = await verifyFirebaseIdToken(idToken);
    if (!verification.success || !verification.uid) {
      return NextResponse.json(
        { success: false, error: 'Unable to sign in with Google. Please try again.' },
        { status: 401 }
      );
    }

    const firebaseUid = verification.uid;
    const email = (verification.email || '').trim().toLowerCase();
    const displayName = verification.name || (email ? email.split('@')[0] : 'Feeder Guardian');
    const avatarUrl =
      verification.picture ||
      `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(displayName)}`;

    // 2. Synchronize user with Supabase PostgreSQL (users table)
    const supaResult = await syncUserWithSupabase({
      firebase_uid: firebaseUid,
      email,
      display_name: displayName,
      avatar_url: avatarUrl,
    });

    const supaUser = supaResult.user;
    if (!supaUser) {
      console.error('[Auth Sync] Supabase sync failed:', supaResult.error);
      return NextResponse.json(
        { success: false, error: 'Failed to synchronize user profile in database.' },
        { status: 500 }
      );
    }

    if (!supaUser.is_active) {
      return NextResponse.json(
        { success: false, error: 'Your account has been deactivated.' },
        { status: 403 }
      );
    }

    // 3. Dual-sync with local application database for backward compatibility
    let localUserId = supaUser.id;
    try {
      const db = getDb();
      let localUser = db
        .prepare('SELECT id, firebase_uid, email, username FROM users WHERE firebase_uid = ?')
        .get(firebaseUid) as any;

      if (!localUser && email) {
        localUser = db.prepare('SELECT id FROM users WHERE LOWER(email) = ?').get(email) as any;
        if (localUser) {
          db.prepare('UPDATE users SET firebase_uid = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(
            firebaseUid,
            localUser.id
          );
        }
      }

      if (!localUser) {
        db.prepare(`
          INSERT INTO users (id, firebase_uid, email, password_hash, username, full_name, avatar_url, role, status)
          VALUES (?, ?, ?, 'GOOGLE_OAUTH', ?, ?, ?, 'USER', 'ACTIVE')
        `).run(supaUser.id, firebaseUid, email, supaUser.username, displayName, avatarUrl);

        db.prepare(`
          INSERT INTO user_profiles (user_id, bio, area_name, city, feeder_level, feeding_count, sos_responses_count, community_contributions_count, badges_json)
          VALUES (?, ?, '', ?, 'Grassroots Feeder', 0, 0, 0, '["New Member"]')
        `).run(supaUser.id, supaUser.bio || 'Animal lover and community feeder on Feeder.life.', supaUser.city || '');
      }
    } catch (localErr) {
      console.warn('[Auth Sync] Local DB notice:', localErr);
    }

    // 4. Generate secure session token and cookie
    // The session token is an HMAC-SHA256 signed token embedding the Supabase user ID and Firebase UID.
    const sessionToken = createSessionToken({
      id: supaUser.id,
      firebase_uid: firebaseUid,
      email: supaUser.email,
    });

    // Also persist in local session table if available
    try {
      const db = getDb();
      const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
      db.prepare(`
        INSERT INTO user_sessions (id, user_id, token_hash, expires_at)
        VALUES (?, ?, ?, ?)
      `).run(`sess_${Date.now()}`, supaUser.id, sessionToken, expiresAt);
    } catch {
      // Ignored if local session table not present
    }

    // 5. Determine redirection based on onboarding completion status
    const isNew = supaResult.isNewUser || !supaUser.onboarding_completed;
    const redirectTo = isNew ? '/onboarding' : '/';

    const response = NextResponse.json({
      success: true,
      isNewUser: isNew,
      redirectTo,
      user: {
        id: supaUser.id,
        firebaseUid: supaUser.firebase_uid,
        email: supaUser.email,
        username: supaUser.username,
        displayName: supaUser.display_name,
        avatarUrl: supaUser.avatar_url,
        onboardingCompleted: supaUser.onboarding_completed,
      },
    });

    response.cookies.set('feeder_session', sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 30 * 24 * 60 * 60,
    });

    return response;
  } catch (err: any) {
    console.error('[Auth Sync] Server error:', err);
    return NextResponse.json(
      { success: false, error: 'Unable to sign in with Google. Please try again.' },
      { status: 500 }
    );
  }
}
