import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { getUserById, getSettings, getGroupMembers } from '@/lib/db';

export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Tidak terotentikasi' }, { status: 401 });
    }

    const settings = getSettings();
    const isPublished = Boolean(settings.isPublished);

    // If Admin is inspecting preview
    if (session.role === 'ADMIN') {
      return NextResponse.json({
        success: true,
        id: 0,
        name: session.name || 'Administrator (Mode Pratinjau)',
        nama: session.name || 'Administrator (Mode Pratinjau)',
        nim: 'ADMIN',
        golongan: 'A',
        kelas: 'A',
        gender: 'L',
        status: 'APPROVED',
        groupNumber: isPublished ? 1 : null,
        isPublished: isPublished,
        groupMembers: isPublished ? getGroupMembers(1) : [],
      });
    }

    const user = getUserById(session.userId);
    if (!user) {
      return NextResponse.json({ error: 'Data peserta tidak ditemukan' }, { status: 404 });
    }

    // When published: reveal groupNumber and groupMembers
    // When hidden: strictly conceal groupNumber and groupMembers
    const groupNumber = isPublished ? user.group_number : null;
    const groupMembers = isPublished && user.group_number ? getGroupMembers(user.group_number) : [];

    return NextResponse.json({
      success: true,
      id: user.id,
      name: user.nama,
      nama: user.nama,
      nim: user.nim,
      golongan: user.golongan,
      kelas: user.golongan, // backwards compatibility
      gender: user.gender,
      status: user.status,
      groupNumber: groupNumber,
      isPublished: isPublished,
      groupMembers: groupMembers,
    });
  } catch (error: unknown) {
    console.error('Participant API error:', error);
    return NextResponse.json({ error: 'Terjadi kesalahan pada server' }, { status: 500 });
  }
}
