import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getSession } from '@/lib/session';
import { cleanInstagramHandle } from '@/lib/instagram';

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
      return NextResponse.json({ error: 'URL or handle is required' }, { status: 400 });
    }

    const resolvedType = type || 'rss';
    let targetUrl = url.trim();
    let resolvedName = name ? name.trim() : '';

    if (resolvedType === 'instagram') {
      const handle = cleanInstagramHandle(url);
      if (!handle) {
        return NextResponse.json({ error: 'Invalid Instagram handle' }, { status: 400 });
      }
      targetUrl = `https://instagram.com/${handle}`;
      resolvedName = resolvedName || `@${handle} (Instagram)`;
    } else {
      resolvedName = resolvedName || (url.startsWith('http') ? new URL(url).hostname : 'Custom Feed');
    }

    const newFeed = await prisma.feedSource.create({
      data: {
        url: targetUrl,
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
