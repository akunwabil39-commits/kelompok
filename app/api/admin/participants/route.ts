import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import {
  getAllParticipants,
  getStats,
  updateSettings,
  autoAssignGroup,
  reassignParticipant,
  clearAllParticipants,
} from '@/lib/db';

export async function GET() {
  try {
    const isAdmin = await requireAdmin();
    if (!isAdmin) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized: Admin access required.' },
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
  } catch (error: any) {
    console.error('Admin GET error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const isAdmin = await requireAdmin();
    if (!isAdmin) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized: Admin access required.' },
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
        return NextResponse.json({ success: false, error: 'Total Groups must be between 2 and 30.' }, { status: 400 });
      }
      if (isNaN(maxPerGroup) || maxPerGroup < 1 || maxPerGroup > 200) {
        return NextResponse.json({ success: false, error: 'Max Per Group must be between 1 and 200.' }, { status: 400 });
      }

      const res = updateSettings(totalGroups, maxPerGroup);
      if (!res.success) {
        return NextResponse.json({ success: false, error: res.error }, { status: 400 });
      }

      return NextResponse.json({
        success: true,
        message: `Group Settings saved: ${totalGroups} Groups, max ${maxPerGroup} per group.`,
        stats: getStats(),
      });
    }

    // Action: Clear entire roster
    if (action === 'clear_roster') {
      clearAllParticipants();
      return NextResponse.json({ success: true, message: 'All participants cleared.' });
    }

    // Action: Manual Add Participant
    const { name, gender, groupNumber } = body;
    if (!name || typeof name !== 'string' || !name.trim()) {
      return NextResponse.json({ success: false, error: 'Participant name is required.' }, { status: 400 });
    }

    const trimmedName = name.trim();
    const validatedGender: 'MALE' | 'FEMALE' =
      gender && gender.toString().toUpperCase() === 'FEMALE' ? 'FEMALE' : 'MALE';

    const parsedGroup = groupNumber ? parseInt(groupNumber, 10) : null;

    if (parsedGroup && parsedGroup >= 1) {
      // Manual add to specific group
      const assignRes = autoAssignGroup(trimmedName, validatedGender);
      if (assignRes.success && assignRes.user) {
        reassignParticipant(assignRes.user.id, parsedGroup);
        return NextResponse.json({
          success: true,
          message: `Added "${trimmedName}" (${validatedGender}) directly to Group ${parsedGroup}!`,
        });
      } else {
        return NextResponse.json({ success: false, error: assignRes.error }, { status: 400 });
      }
    } else {
      // Auto-assign with gender balancing
      const assignRes = autoAssignGroup(trimmedName, validatedGender);
      if (!assignRes.success || !assignRes.user) {
        return NextResponse.json({ success: false, error: assignRes.error || 'Failed to auto-assign' }, { status: 400 });
      }

      return NextResponse.json({
        success: true,
        message: `Added and auto-assigned "${trimmedName}" (${validatedGender}) to Group ${assignRes.user.group_number}!`,
      });
    }
  } catch (error: any) {
    console.error('Admin POST error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
