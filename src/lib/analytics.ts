import { prisma } from './db';

/**
 * Logs a specific usage action to the database for analytics tracking.
 */
export async function logUserActivity(userId: string, action: 'LOGIN' | 'UPLOAD_IMAGE' | 'GENERATE_OUTFIT') {
  try {
    await prisma.usageActivity.create({
      data: {
        userId,
        action,
      },
    });
  } catch (err) {
    console.error(`Failed to log activity ${action} for user ${userId}:`, err);
  }
}

/**
 * Creates a new active session tracking record upon user sign-in.
 */
export async function startUserSession(userId: string) {
  try {
    await prisma.userSession.create({
      data: {
        userId,
        loginTime: new Date(),
        lastActive: new Date(),
        duration: 0,
      },
    });
  } catch (err) {
    console.error(`Failed to start session tracking for user ${userId}:`, err);
  }
}

/**
 * Updates the user's current active session duration and active timestamp.
 * Calculated by comparing the last interaction time with their original loginTime.
 */
export async function updateActiveSession(userId: string) {
  try {
    const latestSession = await prisma.userSession.findFirst({
      where: { userId },
      orderBy: { loginTime: 'desc' },
    });

    const now = new Date();
    if (latestSession) {
      // If the latest session is active (within last 12 hours), update the session duration
      const diffMs = now.getTime() - latestSession.loginTime.getTime();
      const twelveHoursMs = 12 * 60 * 60 * 1000;

      if (diffMs < twelveHoursMs) {
        const durationSec = Math.floor(diffMs / 1000);
        await prisma.userSession.update({
          where: { id: latestSession.id },
          data: {
            lastActive: now,
            duration: durationSec,
          },
        });
        return;
      }
    }

    // Fallback: If no recent session is active, start a new one
    await prisma.userSession.create({
      data: {
        userId,
        loginTime: now,
        lastActive: now,
        duration: 0,
      },
    });
  } catch (err) {
    console.error(`Failed to update active session for user ${userId}:`, err);
  }
}
