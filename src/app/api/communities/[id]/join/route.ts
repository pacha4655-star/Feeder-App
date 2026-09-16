import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/session';
import { getDb } from '@/lib/db';

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id: communityId } = await context.params;
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized. Please sign in.' }, { status: 401 });
    }
    const db = getDb();

    const existing = db
      .prepare('SELECT id FROM community_members WHERE community_id = ? AND user_id = ?')
      .get(communityId, user.id) as any;

    let isJoined = false;

    const run = db.transaction(() => {
      if (existing) {
        db.prepare('DELETE FROM community_members WHERE id = ?').run(existing.id);
        db.prepare('UPDATE communities SET member_count = MAX(1, member_count - 1) WHERE id = ?').run(communityId);
        isJoined = false;
      } else {
        db.prepare(`
          INSERT INTO community_members (id, community_id, user_id, role, status)
          VALUES (?, ?, ?, 'MEMBER', 'APPROVED')
        `).run(`mem_${Date.now()}`, communityId, user.id);
        db.prepare('UPDATE communities SET member_count = member_count + 1 WHERE id = ?').run(communityId);
        isJoined = true;
      }
    });

    run();

    return NextResponse.json({ success: true, isJoined });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
