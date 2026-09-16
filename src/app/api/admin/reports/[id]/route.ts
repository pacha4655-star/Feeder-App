import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/session';
import { isPlatformStaff } from '@/lib/security/rbac';
import { getDb } from '@/lib/db';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import logger from '@/lib/monitoring/logger';

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    if (!isPlatformStaff(user.role)) {
      logger.security('Non-staff user attempted to resolve moderation report', {
        userId: user.id,
        role: user.role,
      });
      return NextResponse.json(
        { success: false, error: 'Forbidden. Staff credentials required.' },
        { status: 403 }
      );
    }

    const { id: reportId } = await context.params;
    const body = await request.json().catch(() => ({}));
    const { action, resolutionNotes } = body;

    if (!action || !['ACTIONED', 'REJECTED', 'ESCALATED'].includes(action)) {
      return NextResponse.json(
        { success: false, error: 'Invalid action. Must be ACTIONED, REJECTED, or ESCALATED.' },
        { status: 400 }
      );
    }

    // 1. Update in Supabase platform_data (report)
    try {
      const supabase = getSupabaseServerClient();
      await supabase
        .from('platform_data')
        .update({
          status: action,
          data: {
            resolution_notes: resolutionNotes || '',
            resolved_by: user.id,
            resolved_at: new Date().toISOString(),
          },
          updated_at: new Date().toISOString(),
        })
        .eq('id', reportId);

      // Create audit log entry in Supabase platform_data
      await supabase.from('platform_data').insert({
        data_type: 'audit',
        user_id: user.id,
        target_id: reportId,
        status: action,
        data: {
          action: 'RESOLVE_REPORT',
          resolution: action,
          notes: resolutionNotes || '',
        },
      });
    } catch (supaErr) {
      console.warn('[Admin Report] Supabase notice:', supaErr);
    }

    // 2. Dual-update local DB if present
    try {
      const db = getDb();
      db.prepare(`
        UPDATE reports
        SET status = ?, resolution_notes = ?, moderator_id = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(action, resolutionNotes || null, user.id, reportId);

      db.prepare(`
        INSERT INTO audit_logs (id, user_id, action, entity_type, entity_id, details_json)
        VALUES (?, ?, 'REPORT_RESOLVED', 'REPORT', ?, ?)
      `).run(`audit_${Date.now()}`, user.id, reportId, JSON.stringify({ action, resolutionNotes }));
    } catch {}

    logger.info('Moderation report resolved', { reportId, moderatorId: user.id, action });

    return NextResponse.json({ success: true, reportId, status: action });
  } catch (error: any) {
    logger.error('Error resolving moderation report', error);
    return NextResponse.json({ success: false, error: 'Unable to process report action' }, { status: 500 });
  }
}
