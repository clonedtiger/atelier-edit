import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getSession } from '@/lib/session';

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
    const items = await prisma.wardrobeItem.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
    return NextResponse.json(items);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Failed to fetch wardrobe';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
