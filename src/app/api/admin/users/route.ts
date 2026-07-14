import { NextResponse } from 'next/server';
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

export async function GET() {
  try {
    const adminId = await verifyAdminAccess();
    if (!adminId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Fetch all users with relevant counts and session updates
    const users = await prisma.user.findMany({
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        suspended: true,
        createdAt: true,
        _count: {
          select: {
            wardrobeItems: true,
            recommendations: true,
            sessions: true,
          },
        },
        sessions: {
          orderBy: { lastActive: 'desc' },
          take: 1,
          select: {
            lastActive: true,
          },
        },
      },
    });

    const userList = users.map((u) => {
      const lastSession = u.sessions[0];
      return {
        id: u.id,
        email: u.email,
        name: u.name || 'No Name',
        role: u.role,
        suspended: u.suspended,
        createdAt: u.createdAt.toISOString(),
        wardrobeCount: u._count.wardrobeItems,
        recommendationCount: u._count.recommendations,
        loginCount: u._count.sessions,
        lastActive: lastSession ? lastSession.lastActive.toISOString() : null,
      };
    });

    return NextResponse.json(userList);
  } catch (error) {
    console.error('Error fetching admin users list:', error);
    return NextResponse.json(
      { error: 'Internal server error fetching user list' },
      { status: 500 }
    );
  }
}
