import { NextResponse } from 'next/server';
import { getOrJoinParticipant } from '@/lib/db';
import { createSessionToken, SESSION_COOKIE_NAME } from '@/lib/auth';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, gender } = body;

    if (!name || typeof name !== 'string' || !name.trim()) {
      return NextResponse.json(
        { success: false, error: 'Please enter your name.' },
        { status: 400 }
      );
    }

    const trimmedName = name.trim();

    // Validate gender for participants
    const validatedGender: 'MALE' | 'FEMALE' =
      gender && (gender.toString().toUpperCase() === 'FEMALE' || gender.toString().toUpperCase() === 'F')
        ? 'FEMALE'
        : 'MALE';

    // Execute Gender-Balanced Auto-Assignment
    const result = getOrJoinParticipant(trimmedName, validatedGender);

    if (!result.success || !result.user) {
      return NextResponse.json(
        { success: false, error: result.error || 'Registration is currently full.' },
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
  } catch (error: any) {
    console.error('Join API error:', error);
    return NextResponse.json(
      { success: false, error: 'An unexpected server error occurred.' },
      { status: 500 }
    );
  }
}
