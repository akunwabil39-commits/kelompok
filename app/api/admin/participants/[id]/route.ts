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
      return NextResponse.json({ success: false, error: 'Admin access required.' }, { status: 403 });
    }

    const params = await props.params;
    const id = parseInt(params.id, 10);
    if (isNaN(id)) {
      return NextResponse.json({ success: false, error: 'Invalid participant ID.' }, { status: 400 });
    }

    const result = deleteParticipant(id);
    if (!result.success) {
      return NextResponse.json({ success: false, error: result.error }, { status: 400 });
    }

    return NextResponse.json({ success: true, message: 'Participant removed successfully.' });
  } catch (error: any) {
    console.error('Admin DELETE error:', error);
    return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 });
  }
}

export async function PUT(
  request: Request,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const isAdmin = await requireAdmin();
    if (!isAdmin) {
      return NextResponse.json({ success: false, error: 'Admin access required.' }, { status: 403 });
    }

    const params = await props.params;
    const id = parseInt(params.id, 10);
    if (isNaN(id)) {
      return NextResponse.json({ success: false, error: 'Invalid participant ID.' }, { status: 400 });
    }

    const body = await request.json();
    const { groupNumber } = body;

    const parsedGroup = parseInt(groupNumber, 10);
    if (isNaN(parsedGroup) || parsedGroup < 1) {
      return NextResponse.json({ success: false, error: 'Valid Group Number is required.' }, { status: 400 });
    }

    const result = reassignParticipant(id, parsedGroup);
    if (!result.success) {
      return NextResponse.json({ success: false, error: result.error }, { status: 400 });
    }

    return NextResponse.json({ success: true, message: 'Participant reassigned successfully.' });
  } catch (error: any) {
    console.error('Admin PUT error:', error);
    return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 });
  }
}
