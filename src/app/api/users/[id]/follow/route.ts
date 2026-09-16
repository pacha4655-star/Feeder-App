import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/session';
import { getDb } from '@/lib/db';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import { checkRateLimit, createRateLimitResponse } from '@/lib/security/rate-limit';

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const { id: targetId } = await context.params;
    if (!targetId || targetId === user.id) {
      return NextResponse.json({ error: 'Invalid user target' }, { status: 400 });
    }

    // Rate limiting
    const rateLimit = checkRateLimit('user_follow', user.id, { limit: 40, windowMs: 60 * 1000 });
    if (!rateLimit.allowed) {
      return createRateLimitResponse(rateLimit);
    }

    const db = getDb();

    // Verify target user exists
    const targetUser = db.prepare('SELECT id, full_name, username FROM users WHERE id = ?').get(targetId) as
      | { id: string; full_name: string; username: string }
      | undefined;

    if (!targetUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Check if blocked in either direction
    const isBlocked = db
      .prepare(`
        SELECT 1 FROM user_relationships
        WHERE ((user_id = ? AND target_id = ?) OR (user_id = ? AND target_id = ?))
          AND relationship_type = 'BLOCK'
      `)
      .get(user.id, targetId, targetId, user.id);

    if (isBlocked) {
      return NextResponse.json({ error: 'Action blocked by user privacy preferences.' }, { status: 403 });
    }

    // Check existing follow relationship
    const existing = db
      .prepare(
        "SELECT id FROM user_relationships WHERE user_id = ? AND target_id = ? AND relationship_type = 'FOLLOW'"
      )
      .get(user.id, targetId) as { id: string } | undefined;

    let isFollowing = false;

    if (existing) {
      // Unfollow
      db.prepare('DELETE FROM user_relationships WHERE id = ?').run(existing.id);
      isFollowing = false;

      // Delete from Supabase platform_data
      try {
        const supabase = getSupabaseServerClient();
        await supabase
          .from('platform_data')
          .delete()
          .eq('data_type', 'follow')
          .eq('user_id', user.id)
          .eq('target_id', targetId);
      } catch {}
    } else {
      // Follow
      const relId = `rel_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      db.prepare(`
        INSERT INTO user_relationships (id, user_id, target_id, relationship_type, status)
        VALUES (?, ?, ?, 'FOLLOW', 'ACTIVE')
      `).run(relId, user.id, targetId);
      isFollowing = true;

      // Dual write to Supabase platform_data
      try {
        const supabase = getSupabaseServerClient();
        await supabase.from('platform_data').insert({
          data_type: 'follow',
          user_id: user.id,
          target_id: targetId,
          status: 'active',
          data: {
            id: relId,
            followed_at: new Date().toISOString(),
          },
        });
      } catch {}

      // Create notification for target user
      db.prepare(`
        INSERT INTO notifications (id, recipient_id, sender_id, type, title, body, target_url)
        VALUES (?, ?, ?, 'SYSTEM', 'New Guardian Follower', ?, ?)
      `).run(
        `notif_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        targetId,
        user.id,
        `${user.fullName} started following your animal welfare activity.`,
        `/profile/${user.username}`
      );
    }

    // Get updated follower count
    const followerCount = (
      db
        .prepare(
          "SELECT COUNT(*) as count FROM user_relationships WHERE target_id = ? AND relationship_type = 'FOLLOW'"
        )
        .get(targetId) as { count: number }
    ).count;

    const followingCount = (
      db
        .prepare(
          "SELECT COUNT(*) as count FROM user_relationships WHERE user_id = ? AND relationship_type = 'FOLLOW'"
        )
        .get(targetId) as { count: number }
    )?.count || 0;

    return NextResponse.json({
      success: true,
      following: isFollowing,
      followerCount,
      followingCount,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    const { id: targetId } = await context.params;
    const db = getDb();

    const isFollowing = user
      ? !!db
          .prepare(
            "SELECT 1 FROM user_relationships WHERE user_id = ? AND target_id = ? AND relationship_type = 'FOLLOW'"
          )
          .get(user.id, targetId)
      : false;

    const followerCount = (
      db
        .prepare(
          "SELECT COUNT(*) as count FROM user_relationships WHERE target_id = ? AND relationship_type = 'FOLLOW'"
        )
        .get(targetId) as { count: number }
    )?.count || 0;

    const followingCount = (
      db
        .prepare(
          "SELECT COUNT(*) as count FROM user_relationships WHERE user_id = ? AND relationship_type = 'FOLLOW'"
        )
        .get(targetId) as { count: number }
    )?.count || 0;

    return NextResponse.json({
      following: isFollowing,
      followerCount,
      followingCount,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
