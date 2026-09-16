import { getDb } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth/session';
import AppShell from '@/components/layout/AppShell';
import CommunityDetailClient from '@/components/community/CommunityDetailClient';
import { notFound } from 'next/navigation';

export const dynamic = 'force-dynamic';

export default async function CommunityPage(props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params;
  const user = await getCurrentUser();
  const db = getDb();

  const community = db
    .prepare(`
      SELECT c.*,
             (SELECT COUNT(*) FROM community_members WHERE community_id = c.id) as actual_members,
             (SELECT role FROM community_members WHERE community_id = c.id AND user_id = ?) as user_role,
             EXISTS(SELECT 1 FROM community_members WHERE community_id = c.id AND user_id = ?) as is_joined
      FROM communities c
      WHERE c.id = ? OR c.slug = ?
    `)
    .get(user ? user.id : '', user ? user.id : '', id, id) as any;

  if (!community) {
    notFound();
  }

  // Get community posts
  const posts = db
    .prepare(`
      SELECT p.*,
             u.full_name as author_name,
             u.username as author_username,
             u.avatar_url as author_avatar,
             u.role as author_role,
             c.name as community_name,
             r.reaction_type as user_reaction
      FROM posts p
      JOIN users u ON p.author_id = u.id
      JOIN communities c ON p.community_id = c.id
      LEFT JOIN post_reactions r ON p.id = r.post_id AND r.user_id = ?
      WHERE p.community_id = ? AND p.status = 'PUBLISHED'
      ORDER BY p.created_at DESC
    `)
    .all(user ? user.id : '', community.id) as any[];

  const parsedPosts = posts.map((p) => ({
    ...p,
    media_urls: JSON.parse(p.media_urls_json || '[]'),
    tags: JSON.parse(p.tags_json || '[]'),
  }));

  return (
    <AppShell user={user} activeTab="communities" showRightSidebar={true}>
      <CommunityDetailClient
        community={community}
        initialPosts={parsedPosts}
        user={user}
      />
    </AppShell>
  );
}
