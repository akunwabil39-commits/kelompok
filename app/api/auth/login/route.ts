import { NextResponse } from 'next/server';
import { createSessionToken, SESSION_COOKIE_NAME } from '@/lib/auth';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { password } = body;

    const input = (password || '').trim();
    const configuredAdminPass = (process.env.ADMIN_PASSWORD || 'admin123').trim();

    if (input && input === configuredAdminPass) {
      const token = await createSessionToken({
        userId: 0,
        name: 'Administrator',
        role: 'ADMIN',
      });

      const response = NextResponse.json({
        success: true,
        role: 'ADMIN',
        redirect: '/admin',
      });

      response.cookies.set({
        name: SESSION_COOKIE_NAME,
        value: token,
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: 60 * 60 * 24,
      });

      return response;
    }

    return NextResponse.json(
      { success: false, message: 'Invalid admin password.' },
      { status: 401 }
    );
  } catch (error: any) {
    console.error('Admin login error:', error);
    return NextResponse.json(
      { success: false, message: 'Server error' },
      { status: 500 }
    );
  }
}
