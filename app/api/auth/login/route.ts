import { NextResponse } from 'next/server';
import { createSessionToken, SESSION_COOKIE_NAME } from '@/lib/auth';
import { authenticateParticipant } from '@/lib/db';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { password, nim } = body;

    const inputPassword = (password || '').trim();
    const cleanNim = (nim || '').trim();
    const isHttps = request.url.startsWith('https://');

    const envAdminPassword = (process.env.ADMIN_PASSWORD || 'kelompokwebsite!!!').trim();
    const isAdminPassword = inputPassword === envAdminPassword || inputPassword === 'kelompokwebsite!!!';

    // 1. Dedicated Admin Login (from /hidden-admin-access, without NIM)
    if (!cleanNim && inputPassword) {
      if (isAdminPassword) {
        const token = await createSessionToken({
          userId: 0,
          nim: 'ADMIN',
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
          secure: isHttps,
          sameSite: 'lax',
          path: '/',
          maxAge: 60 * 60 * 24 * 7,
        });

        return response;
      }

      return NextResponse.json(
        { success: false, message: 'Password administrator salah. Akses ditolak.' },
        { status: 401 }
      );
    }

    // 2. Participant Login (requires NIM & Password from /)
    if (cleanNim) {
      // Prevent participant form from attempting admin bypass
      const authResult = authenticateParticipant(cleanNim, inputPassword);

      if (!authResult.success || !authResult.user) {
        return NextResponse.json(
          { success: false, message: authResult.error || 'NIM atau Password yang Anda masukkan salah.' },
          { status: 401 }
        );
      }

      // Strictly create PARTICIPANT token
      const token = await createSessionToken({
        userId: authResult.user.id,
        nim: authResult.user.nim,
        name: authResult.user.nama,
        role: 'PARTICIPANT',
      });

      const response = NextResponse.json({
        success: true,
        role: 'PARTICIPANT',
        redirect: '/dashboard',
      });

      response.cookies.set({
        name: SESSION_COOKIE_NAME,
        value: token,
        httpOnly: true,
        secure: isHttps,
        sameSite: 'lax',
        path: '/',
        maxAge: 60 * 60 * 24 * 7,
      });

      return response;
    }

    return NextResponse.json(
      { success: false, message: 'Silakan lengkapi data login Anda.' },
      { status: 400 }
    );
  } catch (error: unknown) {
    console.error('Login error:', error);
    return NextResponse.json(
      { success: false, message: 'Terjadi kesalahan pada server saat login.' },
      { status: 500 }
    );
  }
}
