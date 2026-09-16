import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/session';
import { getDb } from '@/lib/db';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import { canModifyResource, canDeleteResource } from '@/lib/security/rbac';
import { sanitizeText } from '@/lib/security/sanitize';
import logger from '@/lib/monitoring/logger';

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id: postId } = await context.params;

    // 1. Try Supabase social_posts
    try {
      const supabase = getSupabaseServerClient();
      const { data: post, error } = await supabase
        .from('social_posts')
        .select('*, users!social_posts_user_id_fkey(id, username, display_name, avatar_url)')
        .eq('id', postId)
        .eq('is_deleted', false)
        .maybeSingle();

      if (!error && post) {
        return NextResponse.json({ success: true, post });
      }
    } catch {}

    // 2. Fallback to local DB
    const db = getDb();
    const post = db
      .prepare(`
        SELECT p.*, u.full_name as author_name, u.username as author_username, u.avatar_url as author_avatar
        FROM posts p
        JOIN users u ON p.author_id = u.id
        WHERE p.id = ? AND p.status != 'REMOVED'
      `)
      .get(postId);

    if (!post) {
      return NextResponse.json({ success: false, error: 'Post not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, post });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { id: postId } = await context.params;
    const body = await request.json().catch(() => ({}));
    const { content, title, body: rawBody } = body;

    const newContent = sanitizeText(content || rawBody);
    if (!newContent) {
      return NextResponse.json({ success: false, error: 'Post content cannot be empty' }, { status: 400 });
    }

    // 1. Check ownership in Supabase
    let postAuthorId: string | null = null;
    try {
      const supabase = getSupabaseServerClient();
      const { data: post } = await supabase
        .from('social_posts')
        .select('user_id')
        .eq('id', postId)
        .maybeSingle();
      if (post) {
        postAuthorId = post.user_id;
      }
    } catch {}

    // Check in local DB if not found in Supabase
    const db = getDb();
    if (!postAuthorId) {
      const localPost = db.prepare('SELECT author_id FROM posts WHERE id = ?').get(postId) as any;
      if (localPost) {
        postAuthorId = localPost.author_id;
      }
    }

    if (!postAuthorId) {
      return NextResponse.json({ success: false, error: 'Post not found' }, { status: 404 });
    }

    // Enforce ownership: User A cannot edit User B's post
    if (!canModifyResource(user.id, user.role, postAuthorId)) {
      logger.security('IDOR attempt: User tried to edit another user post', {
        userId: user.id,
        targetPostId: postId,
        postAuthorId,
      });
      return NextResponse.json(
        { success: false, error: 'Forbidden. You cannot edit a post you did not create.' },
        { status: 403 }
      );
    }

    // Perform update in Supabase
    try {
      const supabase = getSupabaseServerClient();
      await supabase
        .from('social_posts')
        .update({
          content: newContent,
          updated_at: new Date().toISOString(),
        })
        .eq('id', postId);
    } catch {}

    // Perform update in local DB
    try {
      db.prepare('UPDATE posts SET body = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(
        newContent,
        postId
      );
    } catch {}

    return NextResponse.json({ success: true, postId, content: newContent });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { id: postId } = await context.params;

    // Check ownership in Supabase
    let postAuthorId: string | null = null;
    try {
      const supabase = getSupabaseServerClient();
      const { data: post } = await supabase
        .from('social_posts')
        .select('user_id')
        .eq('id', postId)
        .maybeSingle();
      if (post) {
        postAuthorId = post.user_id;
      }
    } catch {}

    const db = getDb();
    if (!postAuthorId) {
      const localPost = db.prepare('SELECT author_id FROM posts WHERE id = ?').get(postId) as any;
      if (localPost) {
        postAuthorId = localPost.author_id;
      }
    }

    if (!postAuthorId) {
      return NextResponse.json({ success: false, error: 'Post not found' }, { status: 404 });
    }

    // Enforce ownership: User A cannot delete User B's post unless platform staff
    if (!canDeleteResource(user.id, user.role, postAuthorId)) {
      logger.security('IDOR attempt: User tried to delete another user post', {
        userId: user.id,
        targetPostId: postId,
        postAuthorId,
      });
      return NextResponse.json(
        { success: false, error: 'Forbidden. You cannot delete a post you did not create.' },
        { status: 403 }
      );
    }

    // Delete or soft-delete in Supabase
    try {
      const supabase = getSupabaseServerClient();
      await supabase
        .from('social_posts')
        .update({ is_deleted: true, updated_at: new Date().toISOString() })
        .eq('id', postId);
    } catch {}

    // Update in local DB
    try {
      db.prepare("UPDATE posts SET status = 'REMOVED', updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(
        postId
      );
    } catch {}

    return NextResponse.json({ success: true, message: 'Post deleted successfully' });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
