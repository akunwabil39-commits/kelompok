import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { getUserById } from '@/lib/db';

export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (session.role !== 'PARTICIPANT') {
      return NextResponse.json({ error: 'Forbidden. Not a participant session.' }, { status: 403 });
    }

    const user = getUserById(session.userId);
    if (!user) {
      return NextResponse.json({ error: 'User record not found' }, { status: 404 });
    }

    // STRICT PRIVACY GUARANTEE: Only return current user's name & group number
    return NextResponse.json({
      success: true,
      name: user.name,
      groupNumber: user.group_number,
    });
  } catch (error: any) {
    console.error('Participant API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
