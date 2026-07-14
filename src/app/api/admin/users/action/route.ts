import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/db';
import { getSession } from '@/lib/session';

/**
 * Checks if the current session belongs to an authorized admin user.
 */
async function verifyAdminAccess() {
  const session = await getSession();
  if (!session) return null;

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { id: true, role: true, suspended: true },
  });

  if (!user || user.suspended || user.role !== 'admin') {
    return null;
  }
  return user.id;
}

export async function POST(req: Request) {
  try {
    const adminId = await verifyAdminAccess();
    if (!adminId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const { userId, action, newPassword } = body;

    if (!userId || !action) {
      return NextResponse.json({ error: 'User ID and Action are required' }, { status: 400 });
    }

    // Prevent self-modification for suspension and deletion
    if (userId === adminId && (action === 'suspend' || action === 'delete')) {
      return NextResponse.json(
        { error: 'Self-administration safeguard: You cannot suspend or delete your own account.' },
        { status: 400 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    switch (action) {
      case 'suspend':
        await prisma.user.update({
          where: { id: userId },
          data: { suspended: true },
        });
        console.log(`Admin ${adminId} suspended user ${userId}`);
        return NextResponse.json({ success: true, message: `Account for ${user.email} has been suspended.` });

      case 'unsuspend':
        await prisma.user.update({
          where: { id: userId },
          data: { suspended: false },
        });
        console.log(`Admin ${adminId} unsuspended user ${userId}`);
        return NextResponse.json({ success: true, message: `Account for ${user.email} has been reactivated.` });

      case 'reset-password':
        if (!newPassword || newPassword.trim().length < 6) {
          return NextResponse.json({ error: 'Password must be at least 6 characters long' }, { status: 400 });
        }
        const hash = await bcrypt.hash(newPassword, 10);
        await prisma.user.update({
          where: { id: userId },
          data: { passwordHash: hash },
        });
        console.log(`Admin ${adminId} reset password for user ${userId}`);
        return NextResponse.json({ success: true, message: `Password for ${user.email} reset successfully.` });

      case 'delete':
        await prisma.user.delete({
          where: { id: userId },
        });
        console.log(`Admin ${adminId} deleted user ${userId}`);
        return NextResponse.json({ success: true, message: `Account for ${user.email} has been permanently deleted.` });

      default:
        return NextResponse.json({ error: `Invalid action '${action}' requested.` }, { status: 400 });
    }
  } catch (error) {
    console.error('Error executing admin action:', error);
    return NextResponse.json(
      { error: 'Internal server error executing action' },
      { status: 500 }
    );
  }
}
