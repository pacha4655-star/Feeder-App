import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/session';
import { getDb } from '@/lib/db';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import { sanitizeText, sanitizeUrl } from '@/lib/security/sanitize';
import logger from '@/lib/monitoring/logger';
import type { DbUser } from '@/types/database';

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id: userId } = await context.params;

    // Try Supabase users table
    try {
      const supabase = getSupabaseServerClient();
      const { data: supaUser, error } = await supabase
        .from('users')
        .select('id, username, display_name, avatar_url, bio, city, country_code, region, interests, created_at')
        .eq('id', userId)
        .eq('is_active', true)
        .maybeSingle();

      if (!error && supaUser) {
        return NextResponse.json({ success: true, user: supaUser });
      }
    } catch {}

    // Fallback to local DB
    const db = getDb();
    const localUser = db
      .prepare(`
        SELECT u.id, u.username, u.full_name as display_name, u.avatar_url, p.bio, p.city, p.area_name, u.created_at
        FROM users u
        LEFT JOIN user_profiles p ON u.id = p.user_id
        WHERE u.id = ? AND u.status = 'ACTIVE'
      `)
      .get(userId);

    if (!localUser) {
      return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, user: localUser });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { id: targetUserId } = await context.params;

    // Enforce identity: User A cannot edit User B's profile
    if (user.id !== targetUserId) {
      logger.security('IDOR attempt: User tried to edit another user profile', {
        userId: user.id,
        targetUserId,
      });
      return NextResponse.json(
        { success: false, error: 'Forbidden. You cannot modify another user profile.' },
        { status: 403 }
      );
    }

    const body = await request.json().catch(() => ({}));

    // Prevent privilege escalation: ignore any role or status field sent by client
    if (body.role || body.status || body.is_active || body.is_verified) {
      logger.security('Privilege escalation attempt: Client sent role/status field', {
        userId: user.id,
        attemptedRole: body.role,
      });
    }

    const displayName = body.displayName ? sanitizeText(body.displayName).slice(0, 80) : undefined;
    const bio = body.bio !== undefined ? sanitizeText(body.bio).slice(0, 500) : undefined;
    const city = body.city !== undefined ? sanitizeText(body.city).slice(0, 100) : undefined;
    const countryCode = body.countryCode !== undefined ? sanitizeText(body.countryCode).toUpperCase().slice(0, 2) : undefined;
    const avatarUrl = body.avatarUrl !== undefined ? sanitizeUrl(body.avatarUrl) : undefined;

    // Update in Supabase
    try {
      const supabase = getSupabaseServerClient();
      await supabase
        .from('users')
        .update({
          display_name: displayName,
          bio,
          city,
          country_code: countryCode,
          avatar_url: avatarUrl,
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id);
    } catch {}

    // Update in local DB
    try {
      const db = getDb();
      db.prepare(`
        UPDATE users
        SET full_name = COALESCE(?, full_name),
            avatar_url = COALESCE(?, avatar_url),
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(displayName || null, avatarUrl || null, user.id);

      db.prepare(`
        UPDATE user_profiles
        SET bio = COALESCE(?, bio),
            city = COALESCE(?, city),
            updated_at = CURRENT_TIMESTAMP
        WHERE user_id = ?
      `).run(bio !== undefined ? bio : null, city !== undefined ? city : null, user.id);
    } catch {}

    return NextResponse.json({ success: true, message: 'Profile updated successfully' });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
