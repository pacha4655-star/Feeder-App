import { getDb } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth/session';
import AppShell from '@/components/layout/AppShell';
import ProfileClient from '@/components/profile/ProfileClient';
import { notFound } from 'next/navigation';

export const dynamic = 'force-dynamic';

export default async function ProfilePage(props: { params: Promise<{ username: string }> }) {
  const { username } = await props.params;
  const currentUser = await getCurrentUser();
  const db = getDb();

  const profileUser = db
    .prepare(`
      SELECT u.*,
             p.bio, p.area_name, p.city, p.feeder_level, p.feeding_count,
             p.sos_responses_count, p.community_contributions_count, p.cover_url, p.badges_json
      FROM users u
      LEFT JOIN user_profiles p ON u.id = p.user_id
      WHERE u.username = ?
    `)
    .get(username) as any;

  if (!profileUser) {
    notFound();
  }

  // User posts
  const posts = db
    .prepare(`
      SELECT p.*,
             u.full_name as author_name,
             u.username as author_username,
             u.avatar_url as author_avatar,
             u.role as author_role,
             r.reaction_type as user_reaction
      FROM posts p
      JOIN users u ON p.author_id = u.id
      LEFT JOIN post_reactions r ON p.id = r.post_id AND r.user_id = ?
      WHERE p.author_id = ? AND p.status = 'PUBLISHED'
      ORDER BY p.created_at DESC
    `)
    .all(currentUser ? currentUser.id : '', profileUser.id) as any[];

  // User feeding logs
  const feedingLogs = db
    .prepare(`
      SELECT f.*,
             u.full_name as user_name,
             u.avatar_url as user_avatar
      FROM feeding_logs f
      JOIN users u ON f.user_id = u.id
      WHERE f.user_id = ?
      ORDER BY f.fed_at DESC
    `)
    .all(profileUser.id);

  let badges: string[] = [];
  try {
    badges = JSON.parse(profileUser.badges_json || '[]');
  } catch {
    badges = ['Welfare Advocate'];
  }

  return (
    <AppShell user={currentUser} activeTab="profile" showRightSidebar={true}>
      <ProfileClient
        profileUser={{ ...profileUser, badges }}
        posts={posts.map((p) => ({
          ...p,
          media_urls: JSON.parse(p.media_urls_json || '[]'),
          tags: JSON.parse(p.tags_json || '[]'),
        }))}
        feedingLogs={feedingLogs}
        currentUser={currentUser}
      />
    </AppShell>
  );
}
