import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import {
  getAllParticipants,
  getStats,
  updateSettings,
  autoAssignGroup,
  reassignParticipant,
  clearAllParticipants,
  normalizeName,
  findUserByName,
  findSimilarUser,
} from '@/lib/db';

export async function GET() {
  try {
    const isAdmin = await requireAdmin();
    if (!isAdmin) {
      return NextResponse.json(
        { success: false, error: 'Akses ditolak: Diperlukan login admin.' },
        { status: 403 }
      );
    }

    const participants = getAllParticipants();
    const stats = getStats();

    return NextResponse.json({
      success: true,
      participants,
      stats,
    });
  } catch (error: unknown) {
    console.error('Admin GET error:', error);
    return NextResponse.json({ success: false, error: 'Terjadi kesalahan pada server' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const isAdmin = await requireAdmin();
    if (!isAdmin) {
      return NextResponse.json(
        { success: false, error: 'Akses ditolak: Diperlukan login admin.' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { action } = body;

    // Action: Update Group Settings (totalGroups and maxPerGroup)
    if (action === 'update_settings') {
      const totalGroups = parseInt(body.totalGroups, 10);
      const maxPerGroup = parseInt(body.maxPerGroup, 10);

      if (isNaN(totalGroups) || totalGroups < 2 || totalGroups > 30) {
        return NextResponse.json({ success: false, error: 'Jumlah Kelompok harus antara 2 dan 30.' }, { status: 400 });
      }
      if (isNaN(maxPerGroup) || maxPerGroup < 1 || maxPerGroup > 200) {
        return NextResponse.json({ success: false, error: 'Maksimal Per Kelompok harus antara 1 dan 200.' }, { status: 400 });
      }

      const res = updateSettings(totalGroups, maxPerGroup);
      if (!res.success) {
        return NextResponse.json({ success: false, error: res.error }, { status: 400 });
      }

      return NextResponse.json({
        success: true,
        message: `Pengaturan kelompok disimpan: ${totalGroups} Kelompok, maksimal ${maxPerGroup} per kelompok.`,
        stats: getStats(),
      });
    }

    // Action: Clear entire roster
    if (action === 'clear_roster') {
      clearAllParticipants();
      return NextResponse.json({ success: true, message: 'Seluruh data peserta berhasil dikosongkan.' });
    }

    // Action: Manual Add Participant
    const { name, gender, groupNumber } = body;
    const cleanName = normalizeName(name);
    if (!cleanName || cleanName.length < 2) {
      return NextResponse.json({ success: false, error: 'Nama peserta wajib diisi (minimal 2 karakter).' }, { status: 400 });
    }

    const validatedGender: 'MALE' | 'FEMALE' =
      gender && gender.toString().toUpperCase() === 'FEMALE' ? 'FEMALE' : 'MALE';

    const existing = findUserByName(cleanName);
    if (existing) {
      return NextResponse.json({
        success: false,
        error: `Peserta dengan nama "${cleanName}" sudah terdaftar di Kelompok ${existing.group_number}.`,
      }, { status: 400 });
    }

    const similar = findSimilarUser(cleanName);
    if (similar) {
      return NextResponse.json({
        success: false,
        error: `Nama "${cleanName}" terdeteksi mirip dengan peserta terdaftar ("${similar.user.name}" di Kelompok ${similar.user.group_number}). Harap periksa kembali penulisan nama.`,
      }, { status: 400 });
    }

    const parsedGroup = groupNumber ? parseInt(groupNumber, 10) : null;

    if (parsedGroup && parsedGroup >= 1) {
      // Manual add to specific group
      const assignRes = autoAssignGroup(cleanName, validatedGender);
      if (assignRes.success && assignRes.user) {
        reassignParticipant(assignRes.user.id, parsedGroup);
        return NextResponse.json({
          success: true,
          message: `Berhasil menambahkan "${cleanName}" (${validatedGender === 'FEMALE' ? 'Perempuan' : 'Laki-laki'}) langsung ke Kelompok ${parsedGroup}!`,
        });
      } else {
        return NextResponse.json({ success: false, error: assignRes.error }, { status: 400 });
      }
    } else {
      // Auto-assign with gender balancing
      const assignRes = autoAssignGroup(cleanName, validatedGender);
      if (!assignRes.success || !assignRes.user) {
        return NextResponse.json({ success: false, error: assignRes.error || 'Gagal menempatkan otomatis' }, { status: 400 });
      }

      return NextResponse.json({
        success: true,
        message: `Berhasil menambahkan dan menempatkan "${cleanName}" (${validatedGender === 'FEMALE' ? 'Perempuan' : 'Laki-laki'}) ke Kelompok ${assignRes.user.group_number}!`,
      });
    }
  } catch (error: unknown) {
    console.error('Admin POST error:', error);
    return NextResponse.json({ success: false, error: 'Terjadi kesalahan pada server' }, { status: 500 });
  }
}

