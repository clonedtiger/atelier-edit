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
    
    // Fetch recommendations with related items
    const recommendations = await prisma.recommendation.findMany({
      where: { userId },
      include: {
        outfitItems: true,
      },
      orderBy: { createdAt: 'desc' },
    });
    
    // For each item, resolve the wardrobeItem imageUrl if there is a wardrobeItemId linked
    const enrichedRecommendations = await Promise.all(
      recommendations.map(async (rec) => {
        const enrichedItems = await Promise.all(
          rec.outfitItems.map(async (item) => {
            if (item.wardrobeItemId) {
              const wItem = await prisma.wardrobeItem.findUnique({
                where: { id: item.wardrobeItemId },
                select: { imageUrl: true, category: true, detectedTags: true },
              });
              return {
                ...item,
                wardrobeItemImage: wItem?.imageUrl || null,
                wardrobeItemCategory: wItem?.category || null,
                wardrobeItemTags: wItem?.detectedTags || [],
              };
            }
            return item;
          })
        );
        return {
          ...rec,
          outfitItems: enrichedItems,
        };
      })
    );
    
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
