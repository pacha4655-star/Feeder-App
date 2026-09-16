import { getCurrentUser } from '@/lib/auth/session';
import AppShell from '@/components/layout/AppShell';
import SOSClient from '@/components/sos/SOSClient';

export const dynamic = 'force-dynamic';

export default async function SOSPage() {
  const user = await getCurrentUser();

  return (
    <AppShell user={user} activeTab="sos" showRightSidebar={true}>
      <SOSClient user={user} />
    </AppShell>
  );
}
