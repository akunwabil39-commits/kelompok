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
        name: user.name,
        role: user.role,
        groupNumber: user.role === 'PARTICIPANT' ? user.group_number : null,
      },
    });
  } catch (error: any) {
    console.error('Me endpoint error:', error);
    return NextResponse.json({ authenticated: false, error: 'Server error' }, { status: 500 });
  }
}
