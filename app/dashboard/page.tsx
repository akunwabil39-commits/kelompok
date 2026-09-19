import { requireAuth } from '@/lib/auth';
import { getSettings, getGroupMembers } from '@/lib/db';
import { redirect } from 'next/navigation';
import DashboardClient, { DashboardUser } from './DashboardClient';

export const dynamic = 'force-dynamic';

export default async function ParticipantDashboardPage() {
  const user = await requireAuth();

  if (!user) {
    redirect('/?notice=login_required');
  }

  const settings = getSettings();
  const isPublished = Boolean(settings.isPublished);

  // If ADMIN visits /dashboard, allow preview mode instead of crashing or bouncing
  if (user.role === 'ADMIN') {
    const adminSafeUser: DashboardUser = {
      id: user.id,
      nama: user.nama || 'Administrator (Mode Pratinjau)',
      nim: user.nim || 'ADMIN',
      golongan: 'A',
      gender: 'L',
      status: 'APPROVED',
      group_number: isPublished ? 1 : null,
      isPublished: isPublished,
      groupMembers: isPublished ? getGroupMembers(1) : [],
    };

    return (
      <div>
        <div className="bg-amber-50 border-b border-amber-300 px-4 py-3 text-amber-950 text-xs font-semibold flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 shadow-xs">
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded-md bg-amber-200 text-amber-900 font-extrabold uppercase text-[10px]">
              👑 Mode Pratinjau Admin
            </span>
            <span>Anda sedang melihat tampilan Dashboard sebagaimana yang dilihat oleh Peserta.</span>
          </div>
          <a
            href="/admin"
            className="px-3 py-1 rounded-lg bg-white hover:bg-amber-100 border border-amber-300 text-amber-900 font-bold transition shadow-2xs"
          >
            Kembali ke Panel Admin &rarr;
          </a>
        </div>
        <DashboardClient initialUser={adminSafeUser} />
      </div>
    );
  }

  // Normal Participant User
  const groupNumber = isPublished ? user.group_number : null;
  const groupMembers = isPublished && user.group_number ? getGroupMembers(user.group_number) : [];

  const safeUser: DashboardUser = {
    id: user.id,
    nama: user.nama,
    nim: user.nim,
    golongan: user.golongan,
    gender: user.gender,
    status: user.status,
    group_number: groupNumber,
    isPublished: isPublished,
    groupMembers: groupMembers,
  };

  return <DashboardClient initialUser={safeUser} />;
}
