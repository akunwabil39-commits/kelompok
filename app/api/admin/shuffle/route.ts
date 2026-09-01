import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import { shuffleAllParticipants } from '@/lib/db';

export async function POST() {
  try {
    const isAdmin = await requireAdmin();
    if (!isAdmin) {
      return NextResponse.json(
        { success: false, error: 'Akses ditolak: Diperlukan akses admin.' },
        { status: 403 }
      );
    }

    const result = shuffleAllParticipants();

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error || 'Gagal mengacak kelompok secara otomatis.' },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `Berhasil mengacak otomatis ${result.count} peserta secara adil & seimbang berdasarkan jenis kelamin!`,
      count: result.count,
      stats: result.stats,
    });
  } catch (error: unknown) {
    console.error('Admin Shuffle API error:', error);
    return NextResponse.json(
      { success: false, error: 'Terjadi kesalahan server saat mengacak kelompok' },
      { status: 500 }
    );
  }
}

