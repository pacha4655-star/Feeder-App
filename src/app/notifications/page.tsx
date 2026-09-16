import { getCurrentUser } from '@/lib/auth/session';
import AppShell from '@/components/layout/AppShell';
import NotificationsClient, { NotificationItem } from '@/components/notifications/NotificationsClient';
import { getDb } from '@/lib/db';

export const dynamic = 'force-dynamic';

export default async function NotificationsPage() {
  const user = await getCurrentUser();
  const db = getDb();

  let initialNotifications: NotificationItem[] = [];

  if (user) {
    try {
      const rows = db
        .prepare(`
          SELECT n.*,
                 u.full_name as sender_name,
                 u.avatar_url as sender_avatar
          FROM notifications n
          LEFT JOIN users u ON n.sender_id = u.id
          WHERE n.recipient_id = ?
          ORDER BY n.created_at DESC
          LIMIT 50
        `)
        .all(user.id) as NotificationItem[];

      initialNotifications = rows;
    } catch {}
  }

  return (
    <AppShell user={user} activeTab="notifications" showRightSidebar={true}>
      <NotificationsClient user={user} initialNotifications={initialNotifications} />
    </AppShell>
  );
}
