import { getCurrentUser } from '@/lib/auth/session';
import AppShell from '@/components/layout/AppShell';
import NearbyClient from '@/components/nearby/NearbyClient';

export const dynamic = 'force-dynamic';

export default async function NearbyPage() {
  const user = await getCurrentUser();

  return (
    <AppShell user={user} activeTab="nearby" showRightSidebar={true}>
      <NearbyClient user={user} />
    </AppShell>
  );
}
