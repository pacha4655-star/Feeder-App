import { getDb } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth/session';
import { isPlatformStaff } from '@/lib/security/rbac';
import AppShell from '@/components/layout/AppShell';
import AdminClient from '@/components/admin/AdminClient';
import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

export default async function AdminPage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect('/login');
  }

  // Enforce staff role authorization (PLATFORM_ADMIN or PLATFORM_MODERATOR)
  if (!isPlatformStaff(user.role)) {
    redirect('/');
  }
  const db = getDb();

  // Fetch reports
  const reports = db
    .prepare(`
      SELECT r.*, u.full_name as reporter_name, u.username as reporter_username
      FROM reports r
      JOIN users u ON r.reporter_id = u.id
      ORDER BY r.created_at DESC
      LIMIT 50
    `)
    .all();

  // Fetch users
  const users = db
    .prepare(`
      SELECT u.id, u.email, u.username, u.full_name, u.role, u.status, u.created_at,
             p.feeder_level, p.feeding_count
      FROM users u
      LEFT JOIN user_profiles p ON u.id = p.user_id
      ORDER BY u.created_at DESC
      LIMIT 50
    `)
    .all();

  // Fetch communities
  const communities = db
    .prepare(`
      SELECT c.*, u.full_name as creator_name
      FROM communities c
      LEFT JOIN users u ON c.created_by = u.id
      ORDER BY c.created_at DESC
      LIMIT 50
    `)
    .all();

  // Fetch audit logs
  const auditLogs = db
    .prepare(`
      SELECT a.*, u.full_name as user_name
      FROM audit_logs a
      LEFT JOIN users u ON a.user_id = u.id
      ORDER BY a.created_at DESC
      LIMIT 50
    `)
    .all();

  return (
    <AppShell user={user} activeTab="admin" showRightSidebar={false}>
      <AdminClient
        user={user}
        initialReports={reports}
        initialUsers={users}
        initialCommunities={communities}
        initialAuditLogs={auditLogs}
      />
    </AppShell>
  );
}
