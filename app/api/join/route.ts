import { NextResponse } from 'next/server';
import { getOrJoinParticipant, normalizeName } from '@/lib/db';
import { createSessionToken, SESSION_COOKIE_NAME } from '@/lib/auth';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, gender } = body;

    const normalizedName = normalizeName(name);

    if (!normalizedName || normalizedName.length < 2) {
      return NextResponse.json(
        { success: false, error: 'Silakan masukkan nama lengkap yang valid (minimal 2 karakter).' },
        { status: 400 }
      );
    }

    // Validate gender for participants
    const validatedGender: 'MALE' | 'FEMALE' =
      gender && (gender.toString().toUpperCase() === 'FEMALE' || gender.toString().toUpperCase() === 'F')
        ? 'FEMALE'
        : 'MALE';

    // Execute Gender-Balanced Auto-Assignment
    const result = getOrJoinParticipant(normalizedName, validatedGender);

    if (!result.success || !result.user) {
      return NextResponse.json(
        { success: false, error: result.error || 'Pendaftaran saat ini telah penuh.' },
        { status: 400 }
      );
    }

    const user = result.user;

    const token = await createSessionToken({
      userId: user.id,
      name: user.name,
      role: 'PARTICIPANT',
    });

    const response = NextResponse.json({
      success: true,
      name: user.name,
      gender: user.gender,
      groupNumber: user.group_number,
      isNew: result.isNew,
    });

    response.cookies.set({
      name: SESSION_COOKIE_NAME,
      value: token,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 7,
    });

    return response;
  } catch (error: unknown) {
    console.error('Join API error:', error);
    return NextResponse.json(
      { success: false, error: 'Terjadi kesalahan server yang tidak terduga.' },
      { status: 500 }
    );
  }
}

