import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { getUserById } from '@/lib/db';

export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Tidak terotentikasi' }, { status: 401 });
    }

    if (session.role !== 'PARTICIPANT') {
      return NextResponse.json({ error: 'Akses ditolak. Bukan sesi peserta.' }, { status: 403 });
    }

    const user = getUserById(session.userId);
    if (!user) {
      return NextResponse.json({ error: 'Data peserta tidak ditemukan' }, { status: 404 });
    }

    // STRICT PRIVACY GUARANTEE: Only return current user's name & group number
    return NextResponse.json({
      success: true,
      name: user.name,
      groupNumber: user.group_number,
    });
  } catch (error: unknown) {
    console.error('Participant API error:', error);
    return NextResponse.json({ error: 'Terjadi kesalahan pada server' }, { status: 500 });
  }
}

