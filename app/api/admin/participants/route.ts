import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import {
  getAllParticipants,
  getStats,
  updateSettings,
  registerParticipant,
  reassignParticipant,
  approveParticipant,
  approveAllParticipants,
  setPublishStatus,
  clearAllParticipants,
  setParticipantLeader,
  normalizeString,
  findUserByNim,
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

    // Action: Approve single participant
    if (action === 'approve') {
      const participantId = Number(body.id);
      if (!participantId) {
        return NextResponse.json({ success: false, error: 'ID peserta tidak valid.' }, { status: 400 });
      }

      const result = approveParticipant(participantId);
      if (!result.success) {
        return NextResponse.json({ success: false, error: result.error }, { status: 400 });
      }

      return NextResponse.json({
        success: true,
        message: 'Akun peserta berhasil disetujui (APPROVED)!',
        participants: getAllParticipants(),
        stats: getStats(),
      });
    }

    // Action: Approve all pending participants
    if (action === 'approve_all') {
      const result = approveAllParticipants();
      if (!result.success) {
        return NextResponse.json({ success: false, error: result.error }, { status: 400 });
      }

      return NextResponse.json({
        success: true,
        message: `Berhasil menyetujui ${result.count || 0} akun peserta!`,
        participants: getAllParticipants(),
        stats: getStats(),
      });
    }

    // Action: Set / Toggle Participant as Group Leader
    if (action === 'set_leader') {
      const participantId = Number(body.id);
      const isLeader = Boolean(body.isLeader);

      if (!participantId) {
        return NextResponse.json({ success: false, error: 'ID peserta tidak valid.' }, { status: 400 });
      }

      const result = setParticipantLeader(participantId, isLeader);
      if (!result.success) {
        return NextResponse.json({ success: false, error: result.error }, { status: 400 });
      }

      return NextResponse.json({
        success: true,
        message: isLeader ? 'Peserta berhasil ditetapkan sebagai Ketua Kelompok!' : 'Status Ketua Kelompok berhasil dicabut.',
        participants: getAllParticipants(),
        stats: getStats(),
      });
    }

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

    // Action: Set / Toggle Result Publication Status
    if (action === 'set_publish') {
      const isPublished = Boolean(body.isPublished);
      const res = setPublishStatus(isPublished);
      if (!res.success) {
        return NextResponse.json({ success: false, error: res.error }, { status: 400 });
      }

      return NextResponse.json({
        success: true,
        message: isPublished
          ? 'Hasil kelompok berhasil dipublikasikan! Peserta kini dapat melihat nomor kelompok dan rekan sekelompoknya.'
          : 'Hasil kelompok berhasil disembunyikan. Peserta tidak dapat melihat nomor kelompok.',
        isPublished,
        stats: getStats(),
      });
    }

    // Action: Clear entire roster
    if (action === 'clear_roster') {
      clearAllParticipants();
      return NextResponse.json({ success: true, message: 'Seluruh data peserta berhasil dikosongkan.' });
    }

    // Action: Manual Add Participant
    const { nim, nama, name, golongan, kelas, gender, password, groupNumber, status } = body;
    const cleanNim = normalizeString(nim);
    const cleanNama = normalizeString(nama || name);
    const cleanGolongan = normalizeString(golongan || kelas || 'GOL-A').toUpperCase();
    const cleanGender: 'L' | 'P' = gender === 'P' || gender === 'FEMALE' ? 'P' : 'L';
    const pass = password || 'password123';

    if (!cleanNim) {
      return NextResponse.json({ success: false, error: 'NIM wajib diisi.' }, { status: 400 });
    }
    if (!cleanNama) {
      return NextResponse.json({ success: false, error: 'Nama peserta wajib diisi.' }, { status: 400 });
    }

    const existing = findUserByNim(cleanNim);
    if (existing) {
      return NextResponse.json({
        success: false,
        error: `Peserta dengan NIM "${cleanNim}" sudah terdaftar (${existing.nama}).`,
      }, { status: 400 });
    }

    const regRes = registerParticipant({
      nim: cleanNim,
      nama: cleanNama,
      golongan: cleanGolongan,
      gender: cleanGender,
      password: pass,
    });

    if (!regRes.success || !regRes.user) {
      return NextResponse.json({ success: false, error: regRes.error || 'Gagal menambahkan peserta' }, { status: 400 });
    }

    // If manual add specifies approved, approve them
    if (status === 'APPROVED') {
      approveParticipant(regRes.user.id);
    }

    const parsedGroup = groupNumber ? parseInt(groupNumber, 10) : null;
    if (parsedGroup && parsedGroup >= 1) {
      reassignParticipant(regRes.user.id, parsedGroup);
    }

    return NextResponse.json({
      success: true,
      message: `Berhasil menambahkan peserta "${cleanNama}" (NIM: ${cleanNim}, Golongan: ${cleanGolongan}, Gender: ${cleanGender === 'L' ? 'Laki-laki' : 'Perempuan'})${parsedGroup ? ` ke Kelompok ${parsedGroup}` : ' (Belum ditentukan kelompok)'}!`,
    });
  } catch (error: unknown) {
    console.error('Admin POST error:', error);
    return NextResponse.json({ success: false, error: 'Terjadi kesalahan pada server' }, { status: 500 });
  }
}
