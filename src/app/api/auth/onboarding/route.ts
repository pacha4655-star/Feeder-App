import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/session';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import { getDb } from '@/lib/db';
import type { DbUser } from '@/types/database';

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const { bio, areaName, city, avatarUrl, feederRole } = body;

    // 1. Update user record in Supabase PostgreSQL (users table)
    try {
      const supabase = getSupabaseServerClient();
      
      // Fetch current profile_data to merge cleanly
      const { data: currentUserData } = await supabase
        .from('users')
        .select('profile_data')
        .eq('id', user.id)
        .maybeSingle();

      const existingProfileData = currentUserData?.profile_data || {};

      const { data: updatedSupabaseUser, error: supaErr } = await supabase
        .from('users')
        .update({
          bio: bio !== undefined ? bio : undefined,
          city: city !== undefined ? city : undefined,
          avatar_url: avatarUrl || undefined,
          onboarding_completed: true,
          profile_data: {
            ...existingProfileData,
            area_name: areaName || existingProfileData.area_name || null,
            feeder_role: feederRole || existingProfileData.feeder_role || 'Daily Stray Feeder',
            feeder_level: existingProfileData.feeder_level || 'Grassroots Feeder',
          },
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id)
        .select()
        .single();

      if (supaErr) {
        console.warn('[Onboarding] Supabase update warning:', supaErr.message);
      }
    } catch (supaErr: any) {
      console.warn('[Onboarding] Supabase update exception:', supaErr.message);
    }

    // 2. Dual-update local SQLite database if user exists there
    try {
      const db = getDb();
      if (avatarUrl) {
        db.prepare('UPDATE users SET avatar_url = ? WHERE id = ?').run(avatarUrl, user.id);
      }

      db.prepare(`
        UPDATE user_profiles
        SET bio = COALESCE(?, bio),
            area_name = COALESCE(?, area_name),
            city = COALESCE(?, city),
            feeder_level = COALESCE(?, feeder_level),
            updated_at = CURRENT_TIMESTAMP
        WHERE user_id = ?
      `).run(bio || null, areaName || null, city || null, feederRole || null, user.id);
    } catch {
      // Local fallback
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Onboarding update error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
