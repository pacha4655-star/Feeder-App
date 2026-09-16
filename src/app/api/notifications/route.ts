import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/session';
import { getDb } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({
        success: true,
        notifications: [],
        unreadCount: 0,
      });
    }
    const db = getDb();

    const notifications = db
      .prepare(`
        SELECT n.*,
               u.full_name as sender_name,
               u.avatar_url as sender_avatar
        FROM notifications n
        LEFT JOIN users u ON n.sender_id = u.id
        WHERE n.recipient_id = ?
        ORDER BY n.created_at DESC
        LIMIT 30
      `)
      .all(user.id);

    const unreadCount = db
      .prepare('SELECT COUNT(*) as count FROM notifications WHERE recipient_id = ? AND is_read = 0')
      .get(user.id) as { count: number };

    return NextResponse.json({
      success: true,
      notifications,
      unreadCount: unreadCount ? unreadCount.count : 0,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized. Please sign in.' }, { status: 401 });
    }
    const db = getDb();

    db.prepare('UPDATE notifications SET is_read = 1 WHERE recipient_id = ?').run(user.id);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
