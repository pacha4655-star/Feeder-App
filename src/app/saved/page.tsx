import { getCurrentUser } from '@/lib/auth/session';
import AppShell from '@/components/layout/AppShell';
import SavedPostsClient from '@/components/saved/SavedPostsClient';
import { getDb } from '@/lib/db';
import type { PostWithAuthor } from '@/lib/services/feed-ranking';

export const dynamic = 'force-dynamic';

export default async function SavedPage() {
  const user = await getCurrentUser();
  const db = getDb();

  let initialPosts: PostWithAuthor[] = [];

  if (user) {
    try {
      const rows = db
        .prepare(`
          SELECT p.*,
                 u.full_name as author_name,
                 u.username as author_username,
                 u.avatar_url as author_avatar,
                 u.role as author_role,
                 prof.feeder_level as author_feeder_level,
                 c.name as community_name,
                 c.slug as community_slug,
                 c.is_private as community_is_private,
                 r.reaction_type as user_reaction
          FROM saved_items s
          JOIN posts p ON s.item_id = p.id
          JOIN users u ON p.author_id = u.id
          LEFT JOIN user_profiles prof ON u.id = prof.user_id
          LEFT JOIN communities c ON p.community_id = c.id
          LEFT JOIN post_reactions r ON p.id = r.post_id AND r.user_id = ?
          WHERE s.user_id = ? AND s.item_type = 'POST' AND p.status = 'PUBLISHED'
          ORDER BY s.created_at DESC
        `)
        .all(user.id, user.id) as any[];

      initialPosts = rows.map((row) => {
        let mediaUrls: string[] = [];
        try {
          mediaUrls = JSON.parse(row.media_urls_json || '[]');
        } catch {
          mediaUrls = [];
        }

        let tags: string[] = [];
        try {
          tags = JSON.parse(row.tags_json || '[]');
        } catch {
          tags = [];
        }

        return {
          id: row.id,
          author_id: row.author_id,
          author_name: row.author_name,
          author_username: row.author_username,
          author_avatar: row.author_avatar,
          author_role: row.author_role,
          author_feeder_level: row.author_feeder_level,
          community_id: row.community_id,
          community_name: row.community_name,
          community_slug: row.community_slug,
          content_type: row.content_type,
          title: row.title,
          body: row.body,
          media_urls: mediaUrls,
          tags: tags,
          location_name: row.location_name,
          approx_lat: row.approx_lat,
          approx_lon: row.approx_lon,
          visibility: row.visibility,
          reaction_count: row.reaction_count || 0,
          comment_count: row.comment_count || 0,
          share_count: row.share_count || 0,
          user_reaction: row.user_reaction,
          is_saved: true,
          created_at: row.created_at,
        };
      });
    } catch {}
  }

  return (
    <AppShell user={user} activeTab="saved" showRightSidebar={true}>
      <SavedPostsClient user={user} initialPosts={initialPosts} />
    </AppShell>
  );
}
