import { NextResponse } from 'next/server';
import { getOrGenerateWhatsNew } from '@/lib/whatsNew';
import { getSession } from '@/lib/session';

export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const data = await getOrGenerateWhatsNew(false);
    return NextResponse.json(data);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Failed to retrieve whats new feed';
    console.error('Whats New feed GET error:', error);
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}

export async function POST() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('Force-generating fresh Whats New feed updates...');
    const data = await getOrGenerateWhatsNew(true);
    return NextResponse.json(data);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Failed to force-sync whats new feed';
    console.error('Whats New feed POST error:', error);
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
