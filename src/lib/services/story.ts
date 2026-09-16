import { getDb } from '../db';
import { getSupabaseServerClient } from '../supabase/server';
import crypto from 'crypto';

export interface StoryView {
  id: string;
  author_id: string;
  author_name: string;
  author_username: string;
  author_avatar: string;
  media_url: string;
  media_type: 'IMAGE' | 'VIDEO';
  caption?: string;
  created_at: string;
  expires_at: string;
  has_viewed?: boolean;
  reactions?: Record<string, number>;
  user_reaction?: string | null;
  viewer_count?: number;
}

export interface StoryViewer {
  user_id: string;
  full_name: string;
  username: string;
  avatar_url: string;
  viewed_at: string;
}

export class StoryService {
  /**
   * Ensure schema supports story reactions
   */
  private static ensureReactionsSchema() {
    const db = getDb();
    try {
      db.exec(`
        CREATE TABLE IF NOT EXISTS story_reactions (
          id TEXT PRIMARY KEY,
          story_id TEXT NOT NULL REFERENCES stories(id) ON DELETE CASCADE,
          user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          reaction_type TEXT NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          UNIQUE(story_id, user_id)
        );
        CREATE INDEX IF NOT EXISTS idx_story_reactions_story ON story_reactions(story_id);
      `);
    } catch {}
  }

  /**
   * Fetch active, non-expired stories from the database within the 24-hour window.
   */
  static getActiveStories(viewerId?: string): StoryView[] {
    this.ensureReactionsSchema();
    const db = getDb();
    const rows = db
      .prepare(`
        SELECT s.*,
               u.full_name as author_name,
               u.username as author_username,
               u.avatar_url as author_avatar,
               EXISTS(SELECT 1 FROM story_views sv WHERE sv.story_id = s.id AND sv.viewer_id = ?) as has_viewed,
               (SELECT reaction_type FROM story_reactions sr WHERE sr.story_id = s.id AND sr.user_id = ?) as user_reaction,
               (SELECT COUNT(*) FROM story_views sv WHERE sv.story_id = s.id) as viewer_count
        FROM stories s
        JOIN users u ON s.author_id = u.id
        WHERE datetime(s.expires_at) > datetime('now')
        ORDER BY s.created_at DESC
        LIMIT 30
      `)
      .all(viewerId || '', viewerId || '') as any[];

    return rows.map((r) => {
      // Aggregate reactions for this story
      const reactionRows = db
        .prepare(`
          SELECT reaction_type, COUNT(*) as count
          FROM story_reactions
          WHERE story_id = ?
          GROUP BY reaction_type
        `)
        .all(r.id) as { reaction_type: string; count: number }[];

      const reactions: Record<string, number> = {};
      for (const rx of reactionRows) {
        reactions[rx.reaction_type] = rx.count;
      }

      return {
        id: r.id,
        author_id: r.author_id,
        author_name: r.author_name,
        author_username: r.author_username,
        author_avatar: r.author_avatar,
        media_url: r.media_url,
        media_type: r.media_type,
        caption: r.caption || undefined,
        created_at: r.created_at,
        expires_at: r.expires_at,
        has_viewed: !!r.has_viewed,
        user_reaction: r.user_reaction || null,
        viewer_count: r.viewer_count || 0,
        reactions,
      };
    });
  }

  /**
   * Create a 24-hour temporary story with dual-persistence in Supabase social_posts
   */
  static async createStory(params: {
    authorId: string;
    mediaUrl: string;
    mediaType?: 'IMAGE' | 'VIDEO';
    caption?: string;
  }): Promise<string> {
    this.ensureReactionsSchema();
    const db = getDb();
    const storyId = crypto.randomUUID();
    const now = new Date();
    const createdAt = now.toISOString();
    const expiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString();

    // 1. Write to local database
    db.prepare(`
      INSERT INTO stories (id, author_id, media_url, media_type, caption, created_at, expires_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      storyId,
      params.authorId,
      params.mediaUrl,
      params.mediaType || 'IMAGE',
      params.caption || null,
      createdAt,
      expiresAt
    );

    // 2. Dual-write to Supabase social_posts table
    try {
      const supabase = getSupabaseServerClient();
      await supabase.from('social_posts').insert({
        id: storyId,
        record_type: 'story',
        user_id: params.authorId,
        content: params.caption || '',
        data: {
          story_id: storyId,
          media_type: params.mediaType || 'IMAGE',
          expires_at: expiresAt,
        },
        media: [
          {
            url: params.mediaUrl,
            type: (params.mediaType || 'IMAGE').toLowerCase(),
          },
        ],
        reactions: {},
        comments: {},
        hashtags: [],
        mentions: [],
        visibility: 'public',
        is_active: true,
        is_deleted: false,
        stats: { views_count: 0 },
      });
    } catch (supaErr) {
      console.warn('[StoryService] Supabase social_posts story sync notice:', supaErr);
    }

    return storyId;
  }

  /**
   * Record a view on a story, tracking in both local DB and Supabase platform_data
   */
  static async markViewed(storyId: string, viewerId: string) {
    const db = getDb();
    try {
      db.prepare(`
        INSERT OR IGNORE INTO story_views (id, story_id, viewer_id)
        VALUES (?, ?, ?)
      `).run(`view_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`, storyId, viewerId);
    } catch {}

    // Record in Supabase platform_data without creating extra tables
    try {
      const supabase = getSupabaseServerClient();
      const { data: existing } = await supabase
        .from('platform_data')
        .select('id')
        .eq('data_type', 'audit')
        .eq('user_id', viewerId)
        .eq('target_id', storyId)
        .maybeSingle();

      if (!existing) {
        await supabase.from('platform_data').insert({
          data_type: 'audit',
          user_id: viewerId,
          target_id: storyId,
          data: { action: 'story_view', viewed_at: new Date().toISOString() },
          status: 'active',
        });
      }
    } catch (supaErr) {
      console.warn('[StoryService] Supabase platform_data view tracking notice:', supaErr);
    }
  }

  /**
   * Get list of users who viewed this story (for story author)
   */
  static getStoryViewers(storyId: string, requestingUserId: string): StoryViewer[] {
    const db = getDb();
    // Author check
    const story = db.prepare('SELECT author_id FROM stories WHERE id = ?').get(storyId) as { author_id: string } | undefined;
    if (!story) return [];
    if (story.author_id !== requestingUserId) {
      throw new Error('FORBIDDEN');
    }

    const viewers = db
      .prepare(`
        SELECT sv.viewer_id as user_id, sv.viewed_at,
               u.full_name, u.username, u.avatar_url
        FROM story_views sv
        JOIN users u ON sv.viewer_id = u.id
        WHERE sv.story_id = ?
        ORDER BY sv.viewed_at DESC
      `)
      .all(storyId) as any[];

    return viewers.map((v) => ({
      user_id: v.user_id,
      full_name: v.full_name,
      username: v.username,
      avatar_url: v.avatar_url,
      viewed_at: v.viewed_at,
    }));
  }

  /**
   * Add or toggle reaction on a story
   */
  static reactToStory(params: {
    storyId: string;
    userId: string;
    reactionType: string;
  }): { reaction: string | null; count: number } {
    this.ensureReactionsSchema();
    const db = getDb();

    // Check existing
    const existing = db
      .prepare('SELECT id, reaction_type FROM story_reactions WHERE story_id = ? AND user_id = ?')
      .get(params.storyId, params.userId) as { id: string; reaction_type: string } | undefined;

    let newReaction: string | null = params.reactionType;

    if (existing) {
      if (existing.reaction_type === params.reactionType) {
        // Untoggle
        db.prepare('DELETE FROM story_reactions WHERE id = ?').run(existing.id);
        newReaction = null;
      } else {
        // Change reaction
        db.prepare('UPDATE story_reactions SET reaction_type = ? WHERE id = ?').run(params.reactionType, existing.id);
      }
    } else {
      // Insert reaction
      const rxId = `srx_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
      db.prepare(`
        INSERT INTO story_reactions (id, story_id, user_id, reaction_type)
        VALUES (?, ?, ?, ?)
      `).run(rxId, params.storyId, params.userId, params.reactionType);

      // Notify author if reactor is not the author
      try {
        const story = db.prepare('SELECT author_id FROM stories WHERE id = ?').get(params.storyId) as { author_id: string } | undefined;
        const sender = db.prepare('SELECT full_name FROM users WHERE id = ?').get(params.userId) as { full_name: string } | undefined;
        if (story && story.author_id !== params.userId && sender) {
          db.prepare(`
            INSERT INTO notifications (id, recipient_id, sender_id, type, title, body, target_url)
            VALUES (?, ?, ?, 'REACTION', 'Story Reaction', ?, ?)
          `).run(
            `notif_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
            story.author_id,
            params.userId,
            `${sender.full_name} reacted ${params.reactionType} to your welfare story.`,
            '/'
          );
        }
      } catch {}
    }

    const count = (
      db.prepare('SELECT COUNT(*) as c FROM story_reactions WHERE story_id = ? AND reaction_type = ?').get(params.storyId, params.reactionType) as { c: number }
    )?.c || 0;

    return { reaction: newReaction, count };
  }

  /**
   * Delete a story (author or staff)
   */
  static async deleteStory(storyId: string, userId: string, userRole: string): Promise<boolean> {
    const db = getDb();
    const story = db.prepare('SELECT author_id FROM stories WHERE id = ?').get(storyId) as { author_id: string } | undefined;
    if (!story) {
      throw new Error('NOT_FOUND');
    }

    const isAuthor = story.author_id === userId;
    const isStaff = ['PLATFORM_ADMIN', 'PLATFORM_MODERATOR', 'MODERATOR'].includes(userRole);

    if (!isAuthor && !isStaff) {
      throw new Error('FORBIDDEN');
    }

    // Delete in local DB
    db.prepare('DELETE FROM stories WHERE id = ?').run(storyId);

    // Delete in Supabase social_posts
    try {
      const supabase = getSupabaseServerClient();
      await supabase
        .from('social_posts')
        .delete()
        .eq('record_type', 'story')
        .filter('data->>story_id', 'eq', storyId);
    } catch {}

    return true;
  }
}
