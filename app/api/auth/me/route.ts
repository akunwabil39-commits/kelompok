import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { getUserById } from '@/lib/db';

export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ authenticated: false, user: null }, { status: 401 });
    }

    if (session.role === 'ADMIN') {
      return NextResponse.json({
        authenticated: true,
        user: {
          id: 0,
          nim: 'ADMIN',
          nama: 'Administrator',
          name: 'Administrator',
          role: 'ADMIN',
          groupNumber: null,
        },
      });
    }

    const user = getUserById(session.userId);
    if (!user) {
      return NextResponse.json({ authenticated: false, user: null }, { status: 401 });
    }

    return NextResponse.json({
      authenticated: true,
      user: {
        id: user.id,
        nim: user.nim,
        nama: user.nama,
        name: user.nama,
        golongan: user.golongan,
        status: user.status,
        gender: user.gender,
        role: user.role,
        groupNumber: null, // strictly hidden from participant
      },
    });
  } catch (error: unknown) {
    console.error('Me endpoint error:', error);
    return NextResponse.json({ authenticated: false, error: 'Terjadi kesalahan pada server' }, { status: 500 });
  }
}
