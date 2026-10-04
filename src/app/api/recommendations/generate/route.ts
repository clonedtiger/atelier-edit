import { NextResponse } from 'next/server';
import { generateRecommendationsForUser } from '@/lib/stylist';
import { getSession } from '@/lib/session';
import { prisma } from '@/lib/db';
import { logUserActivity } from '@/lib/analytics';
import { enforceRateLimit } from '@/lib/rateLimit';

async function getActiveUserId() {
  const session = await getSession();
  return session?.userId || null;
}

export async function POST(req: Request) {
  try {
    const userId = await getActiveUserId();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { suspended: true },
    });

    if (!user || user.suspended) {
      return NextResponse.json({ error: 'Unauthorized or account suspended' }, { status: 403 });
    }

    const limited = await enforceRateLimit(userId, 'GENERATE_OUTFIT');
    if (limited) return limited;
    // Logged up front so concurrent requests count towards the limit
    await logUserActivity(userId, 'GENERATE_OUTFIT');

    const body = await req.json().catch(() => ({}));
    const { vibe, anchorItemId, weatherCity } = body;

    console.log(`Generating styling recommendations for user id: ${userId} with vibe: ${vibe || 'none'}, anchorItemId: ${anchorItemId || 'none'}, weatherCity: ${weatherCity || 'none'}...`);
    const recommendations = await generateRecommendationsForUser(userId, vibe, anchorItemId, weatherCity);


    return NextResponse.json({
      success: true,
      message: `Generated ${recommendations.length} styling recommendations`,
      recommendations,
    });
  } catch (error) {
    console.error('Error generating recommendations:', error);
    return NextResponse.json(
      { error: 'The stylist could not create outfits just now. Please try again in a minute.' },
      { status: 502 }
    );
  }
}
