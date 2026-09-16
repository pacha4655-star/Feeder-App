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
    const db = getDb();

    const existing = db
      .prepare("SELECT id FROM saved_items WHERE user_id = ? AND item_type = 'POST' AND item_id = ?")
      .get(user.id, postId);

    let isSaved = false;

    if (existing) {
      db.prepare("DELETE FROM saved_items WHERE user_id = ? AND item_type = 'POST' AND item_id = ?").run(
        user.id,
        postId
      );
      isSaved = false;
    } else {
      db.prepare(`
        INSERT INTO saved_items (id, user_id, item_type, item_id)
        VALUES (?, ?, 'POST', ?)
      `).run(`saved_${Date.now()}`, user.id, postId);
      isSaved = true;
    }

    return NextResponse.json({ success: true, isSaved });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
