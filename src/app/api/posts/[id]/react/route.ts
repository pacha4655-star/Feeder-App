import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/session';
import { getDb } from '@/lib/db';

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id: postId } = await context.params;
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized. Please sign in.' }, { status: 401 });
    }
    const body = await request.json();
    const { reactionType = 'SUPPORT' } = body;

    const db = getDb();

    // Check existing reaction
    const existing = db
      .prepare('SELECT id, reaction_type FROM post_reactions WHERE post_id = ? AND user_id = ?')
      .get(postId, user.id) as any;

    let userReaction: string | null = reactionType;

    const run = db.transaction(() => {
      if (existing) {
        if (existing.reaction_type === reactionType) {
          // Toggle off
          db.prepare('DELETE FROM post_reactions WHERE id = ?').run(existing.id);
          db.prepare('UPDATE posts SET reaction_count = MAX(0, reaction_count - 1) WHERE id = ?').run(postId);
          userReaction = null;
        } else {
          // Update reaction type
          db.prepare('UPDATE post_reactions SET reaction_type = ? WHERE id = ?').run(reactionType, existing.id);
          userReaction = reactionType;
        }
      } else {
        // Insert new reaction
        db.prepare('INSERT INTO post_reactions (id, post_id, user_id, reaction_type) VALUES (?, ?, ?, ?)').run(
          `react_${Date.now()}`,
          postId,
          user.id,
          reactionType
        );
        db.prepare('UPDATE posts SET reaction_count = reaction_count + 1 WHERE id = ?').run(postId);

        // Notify post author if not self
        const postAuthor = db.prepare('SELECT author_id FROM posts WHERE id = ?').get(postId) as { author_id: string };
        if (postAuthor && postAuthor.author_id !== user.id) {
          db.prepare(`
            INSERT INTO notifications (id, recipient_id, sender_id, type, title, body, target_url)
            VALUES (?, ?, ?, 'REACTION', ?, ?, ?)
          `).run(
            `notif_${Date.now()}`,
            postAuthor.author_id,
            user.id,
            'New reaction on your post',
            `${user.fullName} reacted with ${reactionType} to your post.`,
            `/#${postId}`
          );
        }
      }
    });

    run();

    const updated = db.prepare('SELECT reaction_count FROM posts WHERE id = ?').get(postId) as any;

    return NextResponse.json({
      success: true,
      reactionCount: updated ? updated.reaction_count : 0,
      userReaction,
    });
  } catch (error: any) {
    console.error('Reaction error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
