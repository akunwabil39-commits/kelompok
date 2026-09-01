import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import { deleteParticipant, reassignParticipant } from '@/lib/db';

export async function DELETE(
  request: Request,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const isAdmin = await requireAdmin();
    if (!isAdmin) {
      return NextResponse.json({ success: false, error: 'Akses admin diperlukan.' }, { status: 403 });
    }

    const params = await props.params;
    const id = parseInt(params.id, 10);
    if (isNaN(id)) {
      return NextResponse.json({ success: false, error: 'ID peserta tidak valid.' }, { status: 400 });
    }

    const result = deleteParticipant(id);
    if (!result.success) {
      return NextResponse.json({ success: false, error: result.error }, { status: 400 });
    }

    return NextResponse.json({ success: true, message: 'Peserta berhasil dihapus.' });
  } catch (error: unknown) {
    console.error('Admin DELETE error:', error);
    return NextResponse.json({ success: false, error: 'Terjadi kesalahan pada server' }, { status: 500 });
  }
}

export async function PUT(
  request: Request,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const isAdmin = await requireAdmin();
    if (!isAdmin) {
      return NextResponse.json({ success: false, error: 'Akses admin diperlukan.' }, { status: 403 });
    }

    const params = await props.params;
    const id = parseInt(params.id, 10);
    if (isNaN(id)) {
      return NextResponse.json({ success: false, error: 'ID peserta tidak valid.' }, { status: 400 });
    }

    const body = await request.json();
    const { groupNumber } = body;

    const parsedGroup = parseInt(groupNumber, 10);
    if (isNaN(parsedGroup) || parsedGroup < 1) {
      return NextResponse.json({ success: false, error: 'Nomor kelompok yang valid wajib diisi.' }, { status: 400 });
    }

    const result = reassignParticipant(id, parsedGroup);
    if (!result.success) {
      return NextResponse.json({ success: false, error: result.error }, { status: 400 });
    }

    return NextResponse.json({ success: true, message: 'Kelompok peserta berhasil diperbarui.' });
  } catch (error: unknown) {
    console.error('Admin PUT error:', error);
    return NextResponse.json({ success: false, error: 'Terjadi kesalahan pada server' }, { status: 500 });
  }
}

