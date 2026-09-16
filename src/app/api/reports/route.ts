import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/session';
import { getDb } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized. Please sign in.' }, { status: 401 });
    }
    const body = await request.json();
    const { targetType, targetId, reason, details } = body;

    if (!targetType || !targetId || !reason) {
      return NextResponse.json({ success: false, error: 'Target and reason required' }, { status: 400 });
    }

    const db = getDb();
    const reportId = `rep_${Date.now()}`;

    db.prepare(`
      INSERT INTO reports (id, reporter_id, target_type, target_id, reason, details, status)
      VALUES (?, ?, ?, ?, ?, ?, 'PENDING')
    `).run(reportId, user.id, targetType, targetId, reason, details || null);

    return NextResponse.json({ success: true, reportId });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
