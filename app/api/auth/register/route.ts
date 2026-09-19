import { NextResponse } from 'next/server';
import { registerParticipant } from '@/lib/db';
import { createSessionToken, SESSION_COOKIE_NAME } from '@/lib/auth';

export async function POST(request: Request) {
  try {
    const contentType = request.headers.get('content-type') || '';
    const isJson = contentType.includes('application/json');

    let nim = '';
    let password = '';
    let nama = '';
    let golongan = '';
    let kelas = '';
    let gender = '';

    if (isJson) {
      const body = await request.json();
      nim = body.nim || '';
      password = body.password || '';
      nama = body.nama || '';
      golongan = body.golongan || '';
      kelas = body.kelas || '';
      gender = body.gender || '';
    } else {
      const formData = await request.formData();
      nim = String(formData.get('nim') || '');
      password = String(formData.get('password') || '');
      nama = String(formData.get('nama') || '');
      golongan = String(formData.get('golongan') || '');
      kelas = String(formData.get('kelas') || '');
      gender = String(formData.get('gender') || '');
    }

    const result = registerParticipant({
      nim: (nim || '').trim(),
      password: password || '',
      nama: (nama || '').trim(),
      golongan: (golongan || kelas || '').trim(),
      gender: gender === 'P' ? 'P' : gender === 'L' ? 'L' : ('' as 'L' | 'P'),
    });

    if (!result.success || !result.user) {
      if (!isJson) {
        return NextResponse.redirect(
          new URL(`/register?error=${encodeURIComponent(result.error || 'Gagal mendaftar.')}`, request.url)
        );
      }
      return NextResponse.json(
        { success: false, message: result.error || 'Gagal melakukan pendaftaran.' },
        { status: 400 }
      );
    }

    // Automatically create session token and log in the user (status: PENDING)
    const token = await createSessionToken({
      userId: result.user.id,
      nim: result.user.nim,
      name: result.user.nama,
      role: 'PARTICIPANT',
    });

    const isHttps = request.url.startsWith('https://');

    if (!isJson) {
      const response = NextResponse.redirect(new URL('/dashboard', request.url));
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

    const response = NextResponse.json({
      success: true,
      message: 'Pendaftaran berhasil! Mengarahkan ke dashboard...',
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
  } catch (error: unknown) {
    console.error('Register API error:', error);
    return NextResponse.json(
      { success: false, message: 'Terjadi kesalahan pada server saat pendaftaran.' },
      { status: 500 }
    );
  }
}
