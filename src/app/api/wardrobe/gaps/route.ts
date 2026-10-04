import { NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { getWardrobeGaps } from '@/lib/wardrobeAnalytics';
import { enforceRateLimit } from '@/lib/rateLimit';
import { logUserActivity } from '@/lib/analytics';

async function getActiveUserId() {
  const session = await getSession();
  return session?.userId || null;
}

export async function POST() {
  try {
    const userId = await getActiveUserId();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const limited = await enforceRateLimit(userId, 'ANALYZE_GAPS');
    if (limited) return limited;
    await logUserActivity(userId, 'ANALYZE_GAPS');

    console.log(`Analyzing strategic wardrobe gaps for user: ${userId}...`);
    const gaps = await getWardrobeGaps(userId);
    return NextResponse.json({ success: true, gaps });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Internal server error during gap analysis';
    console.error('Error analyzing wardrobe gaps:', error);
    return NextResponse.json({ error: errorMessage }, { status: 502 });
  }
}
