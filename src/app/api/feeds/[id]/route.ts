import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getSession } from '@/lib/session';

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const body = await req.json();
    const { isMuted, isSubscribed, name, url, category } = body;

    const feed = await prisma.feedSource.findUnique({
      where: { id },
    });

    if (!feed) {
      return NextResponse.json({ error: 'Feed source not found' }, { status: 404 });
    }

    // Handle custom feed metadata updates if created by this user
    if (feed.userId === session.userId && (name !== undefined || url !== undefined || category !== undefined)) {
      const updateData: { name?: string; url?: string; category?: string } = {};
      if (name !== undefined) updateData.name = name;
      if (url !== undefined) updateData.url = url;
      if (category !== undefined) updateData.category = category;

      await prisma.feedSource.update({
        where: { id },
        data: updateData,
      });
    }

    // Handle subscription unsubscribe / subscribe
    if (isSubscribed === false) {
      await prisma.userFeedSubscription.deleteMany({
        where: {
          userId: session.userId,
          feedSourceId: id,
        },
      });

      return NextResponse.json({
        id,
        isSubscribed: false,
        isMuted: false,
      });
    }

    // Handle mute / unmute or subscribe
    const subscription = await prisma.userFeedSubscription.upsert({
      where: {
        userId_feedSourceId: {
          userId: session.userId,
          feedSourceId: id,
        },
      },
      update: {
        ...(isMuted !== undefined ? { isMuted } : {}),
      },
      create: {
        userId: session.userId,
        feedSourceId: id,
        isMuted: isMuted !== undefined ? isMuted : false,
      },
    });

    return NextResponse.json({
      id: feed.id,
      name: feed.name,
      url: feed.url,
      type: feed.type,
      category: feed.category,
      isCustom: feed.userId === session.userId,
      isSubscribed: true,
      isMuted: subscription.isMuted,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Internal server error updating feed';
    console.error('Error updating feed:', error);
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    const feed = await prisma.feedSource.findUnique({
      where: { id },
    });

    if (!feed) {
      return NextResponse.json({ error: 'Feed source not found' }, { status: 404 });
    }

    if (feed.userId === session.userId) {
      // User owns this custom feed: completely remove it
      await prisma.feedSource.delete({
        where: { id },
      });
    } else {
      // Curated catalog feed: unsubscribe user from it
      await prisma.userFeedSubscription.deleteMany({
        where: {
          userId: session.userId,
          feedSourceId: id,
        },
      });
    }

    return NextResponse.json({ success: true, message: 'Feed removed from your radar' });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Internal server error deleting feed';
    console.error('Error deleting feed:', error);
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}
