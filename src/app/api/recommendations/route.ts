import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getSession } from '@/lib/session';
import { pieceLabel } from '@/lib/pieceName';

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
    
    // Fetch recommendations with related items
    const recommendations = await prisma.recommendation.findMany({
      where: { userId },
      include: {
        outfitItems: true,
      },
      orderBy: { createdAt: 'desc' },
    });
    
    // Resolve every referenced wardrobe piece in one query (scoped to this user)
    const wardrobeIds = Array.from(
      new Set(recommendations.flatMap((rec) => rec.outfitItems.map((item) => item.wardrobeItemId).filter((id): id is string => Boolean(id))))
    );
    const wardrobeItems = wardrobeIds.length
      ? await prisma.wardrobeItem.findMany({
          where: { id: { in: wardrobeIds }, userId },
          select: { id: true, imageUrl: true, category: true, detectedTags: true, brand: true, styleNotes: true, wearCount: true, lastWornAt: true },
        })
      : [];
    const wardrobeById = new Map(wardrobeItems.map((w) => [w.id, w]));

    const enrichedRecommendations = recommendations.map((rec) => ({
      ...rec,
      outfitItems: rec.outfitItems.map((item) => {
        const wItem = item.wardrobeItemId ? wardrobeById.get(item.wardrobeItemId) : undefined;
        if (!item.wardrobeItemId) return item;
        return {
          ...item,
          wardrobeItemImage: wItem?.imageUrl || null,
          wardrobeItemCategory: wItem?.category || null,
          wardrobeItemTags: wItem?.detectedTags || [],
          wardrobeItemLabel: wItem ? pieceLabel(wItem.brand, wItem.styleNotes, wItem.category) : null,
        };
      }),
    }));

    return NextResponse.json(enrichedRecommendations);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Failed to fetch recommendations';
    console.error('Error fetching recommendations:', error);
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const userId = await getActiveUserId();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await req.json().catch(() => ({}));
    if (!id) {
      return NextResponse.json({ error: 'Recommendation ID is required' }, { status: 400 });
    }

    await prisma.recommendation.delete({
      where: {
        id,
        userId, // ownership check
      },
    });

    return NextResponse.json({ success: true, message: 'Lookbook deleted successfully' });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Failed to delete lookbook';
    console.error('Delete lookbook error:', error);
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
