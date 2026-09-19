import { getSession } from '@/lib/auth';
import { redirect } from 'next/navigation';
import HiddenAdminClient from './HiddenAdminClient';

export const dynamic = 'force-dynamic';

export default async function HiddenAdminAccessPage() {
  const session = await getSession();

  // If already logged in as admin, forward directly to admin dashboard
  if (session && session.role === 'ADMIN') {
    redirect('/admin');
  }

  return <HiddenAdminClient />;
}
