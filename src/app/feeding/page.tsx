import { getCurrentUser } from '@/lib/auth/session';
import AppShell from '@/components/layout/AppShell';
import FeedingClient from '@/components/feeding/FeedingClient';

export const dynamic = 'force-dynamic';

export default async function FeedingPage() {
  const user = await getCurrentUser();

  return (
    <AppShell user={user} activeTab="feeding" showRightSidebar={true}>
      <FeedingClient user={user} />
    </AppShell>
  );
}
