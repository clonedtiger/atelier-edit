import { NextRequest, NextResponse } from 'next/server';
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

    const collages = await prisma.outfitCollage.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(collages);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    console.error('Error fetching outfit collages:', error);
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const userId = await getActiveUserId();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { title, canvasData, thumbnailUrl } = body;

    if (!title || !canvasData) {
      return NextResponse.json({ error: 'Missing title or canvas layout data' }, { status: 400 });
    }

    const collage = await prisma.outfitCollage.create({
      data: {
        userId,
        title,
        canvasData: typeof canvasData === 'string' ? JSON.parse(canvasData) : canvasData,
        thumbnailUrl: thumbnailUrl || null,
      },
    });

    return NextResponse.json(collage, { status: 201 });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Failed to save collage';
    console.error('Error saving outfit collage:', error);
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
