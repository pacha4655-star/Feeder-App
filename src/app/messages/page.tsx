import { getCurrentUser } from '@/lib/auth/session';
import AppShell from '@/components/layout/AppShell';
import MessagesClient from '@/components/messages/MessagesClient';
import { MessagingService, ConversationSummary } from '@/lib/services/messaging';
import { getDb } from '@/lib/db';

export const dynamic = 'force-dynamic';

export default async function MessagesPage({
  searchParams,
}: {
  searchParams: Promise<{ user?: string }>;
}) {
  const user = await getCurrentUser();
  const db = getDb();
  const { user: targetUserId } = await searchParams;

  let initialConversations: ConversationSummary[] = [];
  let availableGuardians: any[] = [];
  let initialSelectedConvId: string | null = null;

  if (user) {
    if (targetUserId && targetUserId !== user.id) {
      try {
        initialSelectedConvId = MessagingService.getOrCreateDirectConversation(user.id, targetUserId);
      } catch {}
    }

    try {
      initialConversations = MessagingService.getConversations(user.id);
      if (!initialSelectedConvId && initialConversations.length > 0) {
        initialSelectedConvId = initialConversations[0].id;
      }
    } catch {}

    try {
      const rows = db
        .prepare(`
          SELECT id, full_name, username, avatar_url, role
          FROM users
          WHERE id != ?
          ORDER BY created_at DESC
          LIMIT 40
        `)
        .all(user.id) as any[];

      availableGuardians = rows.map((r) => ({
        id: r.id,
        fullName: r.full_name,
        username: r.username,
        avatarUrl: r.avatar_url,
        role: r.role,
      }));
    } catch {}
  }

  return (
    <AppShell user={user} activeTab="messages" showRightSidebar={false}>
      <MessagesClient
        user={user}
        initialConversations={initialConversations}
        availableGuardians={availableGuardians}
        initialSelectedConvId={initialSelectedConvId}
      />
    </AppShell>
  );
}
