import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/session';
import { getDb } from '@/lib/db';

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id: postId } = await context.params;
    const db = getDb();

    const comments = db
      .prepare(`
        SELECT c.*,
               u.full_name as author_name,
               u.username as author_username,
               u.avatar_url as author_avatar,
               u.role as author_role
        FROM post_comments c
        JOIN users u ON c.author_id = u.id
        WHERE c.post_id = ? AND c.status = 'PUBLISHED'
        ORDER BY c.created_at ASC
      `)
      .all(postId);

    return NextResponse.json({ success: true, comments });
  } catch (error: any) {
    console.error('Fetch comments error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

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
    const { body: commentText, parentId = null } = body;

    if (!commentText || !commentText.trim()) {
      return NextResponse.json({ success: false, error: 'Comment cannot be empty' }, { status: 400 });
    }

    const db = getDb();
    const commentId = `cmt_${Date.now()}`;

    const run = db.transaction(() => {
      db.prepare(`
        INSERT INTO post_comments (id, post_id, author_id, parent_id, body)
        VALUES (?, ?, ?, ?, ?)
      `).run(commentId, postId, user.id, parentId, commentText.trim());

      db.prepare('UPDATE posts SET comment_count = comment_count + 1 WHERE id = ?').run(postId);

      // Notify post author if not self
      const post = db.prepare('SELECT author_id, title FROM posts WHERE id = ?').get(postId) as any;
      if (post && post.author_id !== user.id) {
        db.prepare(`
          INSERT INTO notifications (id, recipient_id, sender_id, type, title, body, target_url)
          VALUES (?, ?, ?, 'COMMENT', ?, ?, ?)
        `).run(
          `notif_${Date.now()}`,
          post.author_id,
          user.id,
          'New comment on your post',
          `${user.fullName} commented: "${commentText.slice(0, 60)}..."`,
          `/#${postId}`
        );
      }
    });

    run();

    const newComment = db
      .prepare(`
        SELECT c.*,
               u.full_name as author_name,
               u.username as author_username,
               u.avatar_url as author_avatar,
               u.role as author_role
        FROM post_comments c
        JOIN users u ON c.author_id = u.id
        WHERE c.id = ?
      `)
      .get(commentId);

    return NextResponse.json({ success: true, comment: newComment });
  } catch (error: any) {
    console.error('Create comment error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
