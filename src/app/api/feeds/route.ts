import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getSession } from '@/lib/session';

export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const feeds = await prisma.feedSource.findMany({
      orderBy: { createdAt: 'desc' },
    });
    return NextResponse.json(feeds);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Internal server error fetching feeds';
    console.error('Error fetching feeds:', error);
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { url, name, type } = body;

    if (!url) {
      return NextResponse.json({ error: 'URL is required' }, { status: 400 });
    }

    // Default values if empty
    const resolvedType = type || 'rss';
    const resolvedName = name || new URL(url).hostname || 'Custom Feed';

    const newFeed = await prisma.feedSource.create({
      data: {
        url,
        name: resolvedName,
        type: resolvedType,
        isMuted: false,
      },
    });

    return NextResponse.json(newFeed, { status: 201 });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Internal server error creating feed source';
    console.error('Error creating feed source:', error);
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}
