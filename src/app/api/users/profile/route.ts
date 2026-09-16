import { NextRequest, NextResponse } from 'next/server';
import { resolveAuthenticatedUser } from '@/lib/auth/unified-auth';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import { getDb } from '@/lib/db';
import type { DbUser } from '@/types/database';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const user = await resolveAuthenticatedUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 1. Fetch from Supabase PostgreSQL (users table)
    try {
      const supabase = getSupabaseServerClient();
      const { data: supaUser, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', user.id)
        .maybeSingle();

      if (!error && supaUser) {
        const u = supaUser as DbUser;
        const profile = {
          id: u.id,
          firebaseUid: u.firebase_uid,
          email: u.email,
          username: u.username,
          full_name: u.display_name || u.username,
          avatar_url: u.avatar_url,
          cover_url: u.profile_data?.cover_image_url || (u as any).cover_url || null,
          bio: u.bio || '',
          city: u.city || '',
          area_name: u.profile_data?.area_name || '',
          feeder_level: u.profile_data?.feeder_level || 'Grassroots Feeder',
          feeding_count: u.profile_data?.feeding_count || 0,
          sos_count: u.profile_data?.sos_count || 0,
          role: u.profile_data?.role || 'USER',
          onboarding_completed: u.onboarding_completed ?? false,
          interests: u.interests || [],
          created_at: u.created_at,
        };
        return NextResponse.json({ success: true, profile });
      }
    } catch (supaErr) {
      console.warn('[Profile GET] Supabase fetch notice:', supaErr);
    }

    // 2. Fallback to local database
    const db = getDb();
    const profile = db
      .prepare(`
        SELECT u.id, u.email, u.username, u.full_name, u.avatar_url, u.role,
               p.bio, p.area_name, p.city, p.feeder_level, p.feeding_count, p.sos_responses_count as sos_count,
               p.cover_url
        FROM users u
        LEFT JOIN user_profiles p ON u.id = p.user_id
        WHERE u.id = ?
      `)
      .get(user.id);

    return NextResponse.json({ success: true, profile });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const user = await resolveAuthenticatedUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const { fullName, bio, areaName, city, avatarUrl, coverUrl, username } = body;
    let cleanUsername: string | undefined = undefined;

    if (username !== undefined) {
      const trimmed = (username || '').trim();
      if (!trimmed) {
        return NextResponse.json({ success: false, error: 'Username is required.' }, { status: 400 });
      }
      if (trimmed.length < 3) {
        return NextResponse.json({ success: false, error: 'Username is too short.' }, { status: 400 });
      }
      if (trimmed.length > 30) {
        return NextResponse.json({ success: false, error: 'Username is too long.' }, { status: 400 });
      }
      if (!/^[a-zA-Z0-9_]+$/.test(trimmed)) {
        return NextResponse.json(
          { success: false, error: 'Username can only contain letters, numbers, and underscores.' },
          { status: 400 }
        );
      }

      cleanUsername = trimmed.toLowerCase();

      // Enforce case-insensitive uniqueness across both databases
      if (cleanUsername && cleanUsername !== user.username?.toLowerCase()) {
        try {
          const supabase = getSupabaseServerClient();
          const { data: existingUser } = await supabase
            .from('users')
            .select('id, username')
            .ilike('username', cleanUsername)
            .neq('id', user.id)
            .maybeSingle();

          if (existingUser) {
            return NextResponse.json({ success: false, error: 'This username is already taken.' }, { status: 409 });
          }
        } catch {}

        try {
          const db = getDb();
          const localExisting = db
            .prepare('SELECT id FROM users WHERE LOWER(username) = LOWER(?) AND id != ?')
            .get(cleanUsername, user.id);
          if (localExisting) {
            return NextResponse.json({ success: false, error: 'This username is already taken.' }, { status: 409 });
          }
        } catch {}
      }
    }

    // 1. Update Supabase PostgreSQL (users table)
    try {
      const supabase = getSupabaseServerClient();
      const { data: currentUserData } = await supabase
        .from('users')
        .select('profile_data')
        .eq('id', user.id)
        .maybeSingle();

      const existingProfileData = currentUserData?.profile_data || {};
      const updatedProfileData = {
        ...existingProfileData,
        area_name: areaName !== undefined ? areaName : existingProfileData.area_name,
        avatar_url: avatarUrl !== undefined ? avatarUrl : existingProfileData.avatar_url,
        cover_image_url: coverUrl !== undefined ? coverUrl : existingProfileData.cover_image_url,
      };

      await supabase
        .from('users')
        .update({
          username: cleanUsername !== undefined ? cleanUsername : undefined,
          display_name: fullName !== undefined ? fullName : undefined,
          avatar_url: avatarUrl !== undefined ? avatarUrl : undefined,
          bio: bio !== undefined ? bio : undefined,
          city: city !== undefined ? city : undefined,
          profile_data: updatedProfileData,
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id);
    } catch (supaErr) {
      console.warn('[Profile PUT] Supabase update notice:', supaErr);
    }

    // 2. Dual-update local database
    try {
      const db = getDb();
      db.transaction(() => {
        if (fullName !== undefined || avatarUrl !== undefined || cleanUsername !== undefined) {
          db.prepare(`
            UPDATE users
            SET username = COALESCE(?, username),
                full_name = COALESCE(?, full_name),
                avatar_url = CASE WHEN ? = 1 THEN ? ELSE avatar_url END
            WHERE id = ?
          `).run(
            cleanUsername || null,
            fullName || null,
            avatarUrl !== undefined ? 1 : 0,
            avatarUrl !== undefined ? avatarUrl : null,
            user.id
          );
        }

        db.prepare(`
          UPDATE user_profiles
          SET bio = COALESCE(?, bio),
              area_name = COALESCE(?, area_name),
              city = COALESCE(?, city),
              cover_url = CASE WHEN ? = 1 THEN ? ELSE cover_url END,
              updated_at = CURRENT_TIMESTAMP
          WHERE user_id = ?
        `).run(
          bio !== undefined ? bio : null,
          areaName !== undefined ? areaName : null,
          city !== undefined ? city : null,
          coverUrl !== undefined ? 1 : 0,
          coverUrl !== undefined ? coverUrl : null,
          user.id
        );
      })();
    } catch {
      // Local fallback
    }

    return NextResponse.json({
      success: true,
      profile: {
        id: user.id,
        username: cleanUsername || user.username,
        fullName: fullName !== undefined ? fullName : user.fullName,
        avatarUrl: avatarUrl !== undefined ? avatarUrl : user.avatarUrl,
        coverUrl: coverUrl !== undefined ? coverUrl : (user as any).coverUrl || null,
        bio: bio !== undefined ? bio : user.bio,
        city: city !== undefined ? city : user.city,
        areaName: areaName !== undefined ? areaName : user.areaName,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: 'Unable to update profile. Please try again.' }, { status: 500 });
  }
}
