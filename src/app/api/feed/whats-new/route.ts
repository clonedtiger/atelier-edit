import { NextRequest, NextResponse } from 'next/server';
import { getUserWhatsNew, generateAndSaveUserWhatsNew } from '@/lib/whatsNew';
import { getSession } from '@/lib/session';
import { enforceRateLimit } from '@/lib/rateLimit';
import { logUserActivity } from '@/lib/analytics';

export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    const userId = session?.userId ?? null;

    const { searchParams } = new URL(request.url);
    const sort = searchParams.get('sort') === 'asc' ? 'asc' : 'desc';

    const data = await getUserWhatsNew(userId, sort);
    return NextResponse.json(data);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Failed to retrieve whats new feed';
    console.error('Whats New feed GET error:', error);
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const limited = await enforceRateLimit(session.userId, 'REFRESH_WHATS_NEW');
    if (limited) return limited;
    await logUserActivity(session.userId, 'REFRESH_WHATS_NEW');

    const { searchParams } = new URL(request.url);
    const sort = searchParams.get('sort') === 'asc' ? 'asc' : 'desc';

    console.log('Force-generating fresh Whats New feed updates...');
    const data = await generateAndSaveUserWhatsNew(session.userId, sort);
    return NextResponse.json(data);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Failed to refresh your style stream';
    console.error('Whats New feed POST error:', error);
    return NextResponse.json({ error: errorMessage }, { status: 502 });
  }
}
