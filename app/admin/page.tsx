import { requireAdmin } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { getAllParticipants, getStats } from '@/lib/db';
import AdminDashboardClient from './AdminDashboardClient';

export const dynamic = 'force-dynamic';

export default async function AdminPage() {
  const isAdmin = await requireAdmin();
  if (!isAdmin) {
    redirect('/hidden-admin-access');
  }

  const rawParticipants = getAllParticipants();
  const rawStats = getStats();

  // Convert to plain serializable objects for React Server Components
  const participants = JSON.parse(JSON.stringify(rawParticipants));
  const stats = JSON.parse(JSON.stringify(rawStats));

  return (
    <AdminDashboardClient
      initialParticipants={participants}
      initialStats={stats}
    />
  );
}
