import { NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { getWardrobeAnalytics } from '@/lib/wardrobeAnalytics';

async function getActiveUserId() {
  const session = await getSession();
  return session?.userId || null;
}

export async function GET() {
  try {
    const userId = await getActiveUserId();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const analytics = await getWardrobeAnalytics(userId);
    return NextResponse.json(analytics);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    console.error('Error fetching wardrobe analytics:', error);
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
