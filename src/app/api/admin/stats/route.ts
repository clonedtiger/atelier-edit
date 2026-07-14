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

    // 1. General Metrics
    const totalUsers = await prisma.user.count();
    const totalWardrobeItems = await prisma.wardrobeItem.count();
    const totalOutfitRecommendations = await prisma.recommendation.count();

    // 2. Active Users (Users active in the last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    
    const activeSessionsGroup = await prisma.userSession.groupBy({
      by: ['userId'],
      where: {
        lastActive: { gte: sevenDaysAgo },
      },
    });
    const activeUsersCount = activeSessionsGroup.length;

    // 3. Average Session Duration
    const avgDurationRecord = await prisma.userSession.aggregate({
      _avg: {
        duration: true,
      },
      where: {
        duration: { gt: 0 },
      },
    });
    const avgSessionDuration = Math.round(avgDurationRecord._avg.duration || 0);

    // 4. Activity Logs (Audit Timeline - last 50 events)
    const recentActivities = await prisma.usageActivity.findMany({
      take: 50,
      orderBy: { timestamp: 'desc' },
      include: {
        user: {
          select: {
            name: true,
            email: true,
          },
        },
      },
    });

    const activityLogs = recentActivities.map((act) => ({
      id: act.id,
      userId: act.userId,
      userName: act.user?.name || act.user?.email || 'Anonymous',
      userEmail: act.user?.email || 'unknown@email.com',
      action: act.action,
      timestamp: act.timestamp.toISOString(),
    }));

    // 5. Usage Over Time (Last 14 days chart metrics)
    const fourteenDaysAgo = new Date();
    fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);

    const periodActivities = await prisma.usageActivity.findMany({
      where: {
        timestamp: { gte: fourteenDaysAgo },
      },
      orderBy: { timestamp: 'asc' },
    });

    // In-memory bucket grouping by day (YYYY-MM-DD)
    const dailyMap: Record<string, { date: string; logins: number; uploads: number; generations: number }> = {};
    
    // Pre-populate last 14 days to ensure zero-counts are showing
    for (let i = 0; i <= 14; i++) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      dailyMap[dateStr] = { date: dateStr, logins: 0, uploads: 0, generations: 0 };
    }

    periodActivities.forEach((act) => {
      const dateStr = act.timestamp.toISOString().split('T')[0];
      if (dailyMap[dateStr]) {
        if (act.action === 'LOGIN') dailyMap[dateStr].logins++;
        else if (act.action === 'UPLOAD_IMAGE') dailyMap[dateStr].uploads++;
        else if (act.action === 'GENERATE_OUTFIT') dailyMap[dateStr].generations++;
      }
    });

    const usageOverTime = Object.values(dailyMap).sort((a, b) => a.date.localeCompare(b.date));

    return NextResponse.json({
      totalUsers,
      totalWardrobeItems,
      totalOutfitRecommendations,
      activeUsersCount,
      avgSessionDuration,
      activityLogs,
      usageOverTime,
    });
  } catch (error) {
    console.error('Error fetching admin dashboard statistics:', error);
    return NextResponse.json(
      { error: 'Internal server error fetching statistics' },
      { status: 500 }
    );
  }
}
