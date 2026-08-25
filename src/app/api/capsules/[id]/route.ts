import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getSession } from '@/lib/session';

async function getActiveUserId() {
  const session = await getSession();
  return session?.userId || null;
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const userId = await getActiveUserId();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const capsule = await prisma.capsuleTrip.findFirst({
      where: { id, userId },
    });

    if (!capsule) {
      return NextResponse.json({ error: 'Capsule trip not found' }, { status: 404 });
    }

    // Fetch details of selected wardrobe items
    const items = await prisma.wardrobeItem.findMany({
      where: { id: { in: capsule.itemIds }, userId },
    });

    return NextResponse.json({ capsule, items });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    console.error('Error fetching capsule:', error);
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const userId = await getActiveUserId();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const existing = await prisma.capsuleTrip.findFirst({
      where: { id, userId },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Capsule trip not found' }, { status: 404 });
    }

    await prisma.capsuleTrip.delete({
      where: { id },
    });

    return NextResponse.json({ success: true, message: 'Capsule deleted successfully' });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    console.error('Error deleting capsule:', error);
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
