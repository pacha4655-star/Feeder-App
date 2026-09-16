import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { verifyPassword } from '@/lib/auth/password';
import { createSessionToken } from '@/lib/auth/session';
import crypto from 'crypto';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { identifier, password } = body;

    if (!identifier || !password) {
      return NextResponse.json({ success: false, error: 'Email/username and password are required' }, { status: 400 });
    }

    const cleanId = identifier.trim().toLowerCase();
    const db = getDb();

    const user = db
      .prepare(`
        SELECT u.id, u.email, u.username, u.full_name, u.avatar_url, u.password_hash, u.status, u.role
        FROM users u
        WHERE LOWER(u.email) = ? OR LOWER(u.username) = ?
      `)
      .get(cleanId, cleanId) as any;

    if (!user) {
      return NextResponse.json({ success: false, error: 'Invalid login credentials' }, { status: 401 });
    }

    if (user.status !== 'ACTIVE') {
      return NextResponse.json({ success: false, error: 'Your account is suspended or deactivated' }, { status: 403 });
    }

    const isValid = await verifyPassword(password, user.password_hash);
    if (!isValid) {
      // Record security event
      db.prepare(`
        INSERT INTO security_events (id, user_id, event_type, severity, description)
        VALUES (?, ?, 'FAILED_LOGIN_ATTEMPT', 'WARNING', 'Failed password verification')
      `).run(`sec_${Date.now()}`, user.id);

      return NextResponse.json({ success: false, error: 'Invalid login credentials' }, { status: 401 });
    }

    // Generate secure signed session token
    const sessionToken = createSessionToken({ id: user.id, email: user.email, firebase_uid: user.firebase_uid });
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

    db.prepare(`
      INSERT INTO user_sessions (id, user_id, token_hash, expires_at)
      VALUES (?, ?, ?, ?)
    `).run(`sess_${Date.now()}`, user.id, sessionToken, expiresAt);

    // Audit log
    db.prepare(`
      INSERT INTO audit_logs (id, user_id, action, entity_type, entity_id)
      VALUES (?, ?, 'USER_LOGIN', 'USER', ?)
    `).run(`audit_${Date.now()}`, user.id, user.id);

    const response = NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        fullName: user.full_name,
        avatarUrl: user.avatar_url,
        role: user.role,
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
  } catch (error: any) {
    console.error('Login error:', error);
    return NextResponse.json({ success: false, error: 'Authentication failed' }, { status: 500 });
  }
}
