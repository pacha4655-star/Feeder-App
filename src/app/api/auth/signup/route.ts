import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { hashPassword } from '@/lib/auth/password';
import { createSessionToken } from '@/lib/auth/session';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import crypto from 'crypto';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, username, fullName, password } = body;

    if (!email || !email.includes('@')) {
      return NextResponse.json({ success: false, error: 'Valid email address is required' }, { status: 400 });
    }
    if (!username || username.trim().length < 3) {
      return NextResponse.json({ success: false, error: 'Username must be at least 3 characters' }, { status: 400 });
    }
    if (!fullName || fullName.trim().length < 2) {
      return NextResponse.json({ success: false, error: 'Full name is required' }, { status: 400 });
    }
    if (!password || password.length < 8) {
      return NextResponse.json({ success: false, error: 'Password must be at least 8 characters' }, { status: 400 });
    }

    const cleanUsername = username.trim().toLowerCase().replace(/[^a-z0-9_]/g, '');
    const cleanEmail = email.trim().toLowerCase();

    const db = getDb();

    // Check unique constraints
    const existing = db
      .prepare('SELECT id, email, username FROM users WHERE email = ? OR username = ?')
      .get(cleanEmail, cleanUsername) as any;

    if (existing) {
      if (existing.email === cleanEmail) {
        return NextResponse.json({ success: false, error: 'An account with this email already exists' }, { status: 409 });
      }
      return NextResponse.json({ success: false, error: 'This username is already taken' }, { status: 409 });
    }

    const userId = crypto.randomUUID();
    const passwordHash = await hashPassword(password);
    const sessionToken = createSessionToken({ id: userId, email: cleanEmail });
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(); // 30 days

    const defaultAvatar = `https://api.dicebear.com/7.x/bottts/svg?seed=${cleanUsername}`;

    const run = db.transaction(() => {
      // 1. Insert user
      db.prepare(`
        INSERT INTO users (id, email, password_hash, username, full_name, avatar_url, role, status)
        VALUES (?, ?, ?, ?, ?, ?, 'USER', 'ACTIVE')
      `).run(userId, cleanEmail, passwordHash, cleanUsername, fullName.trim(), defaultAvatar);

      // 2. Insert default profile
      db.prepare(`
        INSERT INTO user_profiles (user_id, bio, area_name, city, feeder_level, feeding_count, sos_responses_count, community_contributions_count, badges_json)
        VALUES (?, 'New community animal guardian on Feeder.life.', '', '', 'Grassroots Feeder', 0, 0, 0, '["New Member"]')
      `).run(userId);

      // 3. Create active session
      db.prepare(`
        INSERT INTO user_sessions (id, user_id, token_hash, expires_at)
        VALUES (?, ?, ?, ?)
      `).run(`sess_${Date.now()}`, userId, sessionToken, expiresAt);

      // 4. Audit log
      db.prepare(`
        INSERT INTO audit_logs (id, user_id, action, entity_type, entity_id, details_json)
        VALUES (?, ?, 'USER_SIGNUP', 'USER', ?, ?)
      `).run(`audit_${Date.now()}`, userId, userId, JSON.stringify({ email: cleanEmail, username: cleanUsername }));
    });

    run();

    // Dual-write to Supabase PostgreSQL users table
    try {
      const supabase = getSupabaseServerClient();
      await supabase.from('users').insert({
        id: userId,
        firebase_uid: body.firebaseUid || `local_${userId}`,
        email: cleanEmail,
        username: cleanUsername,
        display_name: fullName.trim(),
        avatar_url: defaultAvatar,
        is_active: true,
        is_verified: false,
        profile_data: {
          area_name: '',
          feeder_level: 'Grassroots Feeder',
          feeding_count: 0,
          sos_count: 0,
        },
      });
    } catch (supaErr) {
      console.warn('[Signup] Supabase user insert notice:', supaErr);
    }

    const response = NextResponse.json({
      success: true,
      user: {
        id: userId,
        email: cleanEmail,
        username: cleanUsername,
        fullName: fullName.trim(),
      },
      redirectTo: '/onboarding',
    });

    response.cookies.set('feeder_session', sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 30 * 24 * 60 * 60,
    });

    return response;
  } catch (error: any) {
    console.error('Signup error:', error);
    return NextResponse.json({ success: false, error: 'Registration failed. Please try again.' }, { status: 500 });
  }
}
