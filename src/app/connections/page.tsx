import { getCurrentUser } from '@/lib/auth/session';
import AppShell from '@/components/layout/AppShell';
import ConnectionsClient, { GuardianItem } from '@/components/connections/ConnectionsClient';
import { getDb } from '@/lib/db';

export const dynamic = 'force-dynamic';

export default async function ConnectionsPage() {
  const user = await getCurrentUser();
  const db = getDb();

  const currentUserId = user?.id || 'guest';

  // Get set of followed users by current user
  let followedSet = new Set<string>();
  if (user) {
    try {
      const rows = db
        .prepare(
          "SELECT target_id FROM user_relationships WHERE user_id = ? AND relationship_type = 'FOLLOW'"
        )
        .all(user.id) as { target_id: string }[];
      followedSet = new Set(rows.map((r) => r.target_id));
    } catch {}
  }

  // Helper to map DB row to GuardianItem
  const mapRowToGuardian = (row: any): GuardianItem => {
    let followerCount = 0;
    try {
      followerCount = (
        db
          .prepare(
            "SELECT COUNT(*) as count FROM user_relationships WHERE target_id = ? AND relationship_type = 'FOLLOW'"
          )
          .get(row.id) as { count: number }
      )?.count || 0;
    } catch {}

    return {
      id: row.id,
      fullName: row.full_name,
      username: row.username,
      avatarUrl: row.avatar_url,
      role: row.role,
      feederLevel: row.feeder_level,
      areaName: row.area_name,
      city: row.city,
      feedingCount: row.feeding_count || 0,
      sosCount: row.sos_count || 0,
      isFollowing: followedSet.has(row.id),
      followerCount,
    };
  };

  // 1. Following
  let following: GuardianItem[] = [];
  if (user) {
    try {
      const rows = db
        .prepare(`
          SELECT u.id, u.full_name, u.username, u.avatar_url, u.role,
                 prof.feeder_level, prof.area_name, prof.city,
                 prof.feeding_count, prof.sos_responses_count as sos_count
          FROM user_relationships r
          JOIN users u ON r.target_id = u.id
          LEFT JOIN user_profiles prof ON u.id = prof.user_id
          WHERE r.user_id = ? AND r.relationship_type = 'FOLLOW'
          ORDER BY r.created_at DESC
        `)
        .all(user.id);
      following = rows.map(mapRowToGuardian);
    } catch {}
  }

  // 2. Followers
  let followers: GuardianItem[] = [];
  if (user) {
    try {
      const rows = db
        .prepare(`
          SELECT u.id, u.full_name, u.username, u.avatar_url, u.role,
                 prof.feeder_level, prof.area_name, prof.city,
                 prof.feeding_count, prof.sos_responses_count as sos_count
          FROM user_relationships r
          JOIN users u ON r.user_id = u.id
          LEFT JOIN user_profiles prof ON u.id = prof.user_id
          WHERE r.target_id = ? AND r.relationship_type = 'FOLLOW'
          ORDER BY r.created_at DESC
        `)
        .all(user.id);
      followers = rows.map(mapRowToGuardian);
    } catch {}
  }

  // 3. Discover
  let discover: GuardianItem[] = [];
  try {
    const rows = db
      .prepare(`
        SELECT u.id, u.full_name, u.username, u.avatar_url, u.role,
               prof.feeder_level, prof.area_name, prof.city,
               prof.feeding_count, prof.sos_responses_count as sos_count
        FROM users u
        LEFT JOIN user_profiles prof ON u.id = prof.user_id
        WHERE u.id != ?
        ORDER BY u.created_at DESC
        LIMIT 40
      `)
      .all(currentUserId);
    discover = rows.map(mapRowToGuardian);
  } catch {}

  return (
    <AppShell user={user} activeTab="connections" showRightSidebar={true}>
      <ConnectionsClient
        user={user}
        following={following}
        followers={followers}
        discover={discover}
      />
    </AppShell>
  );
}
