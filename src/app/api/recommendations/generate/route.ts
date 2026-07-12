import { NextResponse } from 'next/server';
import { generateRecommendationsForUser } from '@/lib/stylist';
import { getSession } from '@/lib/session';

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

    const body = await req.json().catch(() => ({}));
    const { vibe } = body;

    console.log(`Generating styling recommendations for user id: ${userId} with vibe: ${vibe || 'none'}...`);
    const recommendations = await generateRecommendationsForUser(userId, vibe);
    
    return NextResponse.json({
      success: true,
      message: `Generated ${recommendations.length} styling recommendations`,
      recommendations,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Internal server error during recommendation generation';
    console.error('Error generating recommendations:', error);
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}
