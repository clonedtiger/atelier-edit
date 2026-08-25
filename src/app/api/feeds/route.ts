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

    // 1. Fetch all available feeds (curated catalog + user's custom feeds)
    const availableFeeds = await prisma.feedSource.findMany({
      where: {
        OR: [
          { userId: null },
          { userId: session.userId },
        ],
      },
      orderBy: { createdAt: 'desc' },
    });

    // 2. Fetch user's active subscriptions
    let subscriptions = await prisma.userFeedSubscription.findMany({
      where: { userId: session.userId },
    });

    // If user has no subscriptions yet, initialize subscriptions to all curated feeds
    if (subscriptions.length === 0 && availableFeeds.length > 0) {
      const initData = availableFeeds.map((feed) => ({
        userId: session.userId,
        feedSourceId: feed.id,
        isMuted: false,
      }));
      await prisma.userFeedSubscription.createMany({
        data: initData,
        skipDuplicates: true,
      });
      subscriptions = await prisma.userFeedSubscription.findMany({
        where: { userId: session.userId },
      });
    }

    const subMap = new Map(subscriptions.map((s) => [s.feedSourceId, s]));

    // 3. Enrich feeds with user subscription & mute status
    const enrichedFeeds = availableFeeds.map((feed) => {
      const sub = subMap.get(feed.id);
      return {
        id: feed.id,
        name: feed.name,
        url: feed.url,
        type: feed.type,
        category: feed.category || (feed.userId ? 'Custom Feeds' : 'Curated Channels'),
        isCustom: feed.userId === session.userId,
        isSubscribed: Boolean(sub),
        isMuted: sub ? sub.isMuted : false,
        createdAt: feed.createdAt,
      };
    });

    return NextResponse.json(enrichedFeeds);
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
    const { url, name, type, category } = body;

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

    // Check if feed already exists globally or for user
    let feed = await prisma.feedSource.findUnique({
      where: { url: targetUrl },
    });

    if (!feed) {
      feed = await prisma.feedSource.create({
        data: {
          url: targetUrl,
          name: resolvedName,
          type: resolvedType,
          category: category || 'Custom Feeds',
          userId: session.userId,
          isMuted: false,
        },
      });
    }

    // Subscribe user to feed
    await prisma.userFeedSubscription.upsert({
      where: {
        userId_feedSourceId: {
          userId: session.userId,
          feedSourceId: feed.id,
        },
      },
      update: {
        isMuted: false,
      },
      create: {
        userId: session.userId,
        feedSourceId: feed.id,
        isMuted: false,
      },
    });

    return NextResponse.json(
      {
        id: feed.id,
        name: feed.name,
        url: feed.url,
        type: feed.type,
        category: feed.category || 'Custom Feeds',
        isCustom: feed.userId === session.userId,
        isSubscribed: true,
        isMuted: false,
        createdAt: feed.createdAt,
      },
      { status: 201 }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Internal server error creating feed source';
    console.error('Error creating feed source:', error);
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}
