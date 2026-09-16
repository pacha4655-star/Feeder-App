import { getCurrentUser } from '@/lib/auth/session';
import AppShell from '@/components/layout/AppShell';
import AskFeederClient from '@/components/ai/AskFeederClient';

export const dynamic = 'force-dynamic';

export default async function AskFeederPage() {
  const user = await getCurrentUser();

  return (
    <AppShell user={user} activeTab="ask-feeder" showRightSidebar={false}>
      <AskFeederClient user={user} />
    </AppShell>
  );
}
