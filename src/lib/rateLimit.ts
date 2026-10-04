import { NextResponse } from 'next/server';
import { prisma } from './db';

/**
 * Hourly per-user caps for endpoints that spend Gemini / Tavily credits.
 * Counts come from the UsageActivity log, so limits hold across Cloud Run instances.
 */
export const HOURLY_LIMITS = {
  GENERATE_OUTFIT: 20,
  REFRESH_WHATS_NEW: 6,
  GENERATE_CAPSULE: 10,
  ANALYZE_GAPS: 10,
  UPLOAD_IMAGE: 120,
} as const;

export type RateLimitedAction = keyof typeof HOURLY_LIMITS;

const FRIENDLY_NAMES: Record<RateLimitedAction, string> = {
  GENERATE_OUTFIT: 'stylist consultations',
  REFRESH_WHATS_NEW: "What's New refreshes",
  GENERATE_CAPSULE: 'travel capsules',
  ANALYZE_GAPS: 'wardrobe gap analyses',
  UPLOAD_IMAGE: 'photo uploads',
};

const WINDOW_MS = 60 * 60 * 1000;

/**
 * Returns a 429 response if the user has hit the hourly cap for `action`, otherwise null.
 * Fails open if the count query errors, so a database hiccup never blocks normal use.
 */
export async function enforceRateLimit(userId: string, action: RateLimitedAction): Promise<NextResponse | null> {
  try {
    const recent = await prisma.usageActivity.count({
      where: { userId, action, timestamp: { gte: new Date(Date.now() - WINDOW_MS) } },
    });
    if (recent >= HOURLY_LIMITS[action]) {
      return NextResponse.json(
        { error: `You've reached the hourly limit of ${HOURLY_LIMITS[action]} ${FRIENDLY_NAMES[action]}. Please try again later.` },
        { status: 429, headers: { 'Retry-After': '3600' } }
      );
    }
  } catch (err) {
    console.error(`Rate limit check failed for ${action}; allowing request:`, err);
  }
  return null;
}
