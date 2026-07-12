import { NextResponse } from 'next/server';
import { syncArticlesAndTrends } from '@/lib/feed';
import { getSession } from '@/lib/session';

export async function POST() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('Triggering RSS feed sync and trend extraction...');
    // Trigger sync in the background to avoid browser/gateway timeouts
    syncArticlesAndTrends(1).catch((err) => {
      console.error('Background feed sync failed:', err);
    });
    
    return NextResponse.json({ success: true, message: 'Feed sync started in the background' });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Internal server error during feed sync';
    console.error('Error starting feed sync:', error);
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}
