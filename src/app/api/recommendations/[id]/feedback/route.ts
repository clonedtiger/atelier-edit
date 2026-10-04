import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getSession } from '@/lib/session';

type FeedbackAction = 'love' | 'dismiss' | 'clear' | 'wore';

const ACTIONS: FeedbackAction[] = ['love', 'dismiss', 'clear', 'wore'];

/**
 * Records how the person responded to an outfit. Loved/dismissed looks steer future
 * suggestions; "wore" stamps the look and bumps wear counts on the owned pieces in it.
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const body = await req.json().catch(() => ({}));
    const action = body?.action as FeedbackAction;
    if (!ACTIONS.includes(action)) {
      return NextResponse.json({ error: 'Unknown feedback action' }, { status: 400 });
    }

    const recommendation = await prisma.recommendation.findFirst({
      where: { id, userId: session.userId },
      include: { outfitItems: { select: { wardrobeItemId: true } } },
    });
    if (!recommendation) {
      return NextResponse.json({ error: 'Look not found' }, { status: 404 });
    }

    if (action === 'wore') {
      const now = new Date();
      // Count a look once per day, so repeat taps don't inflate wear counts
      const alreadyToday = recommendation.wornAt && recommendation.wornAt.toDateString() === now.toDateString();
      const ownedIds = recommendation.outfitItems
        .map((item) => item.wardrobeItemId)
        .filter((itemId): itemId is string => Boolean(itemId));

      const updated = await prisma.$transaction(async (tx) => {
        if (!alreadyToday && ownedIds.length > 0) {
          await tx.wardrobeItem.updateMany({
            where: { id: { in: ownedIds }, userId: session.userId },
            data: { wearCount: { increment: 1 }, lastWornAt: now },
          });
        }
        return tx.recommendation.update({
          where: { id },
          data: { wornAt: now, feedback: recommendation.feedback === 'dismissed' ? null : recommendation.feedback },
          select: { id: true, feedback: true, wornAt: true },
        });
      });
      return NextResponse.json({ success: true, recommendation: updated });
    }

    const feedback = action === 'love' ? 'loved' : action === 'dismiss' ? 'dismissed' : null;
    const updated = await prisma.recommendation.update({
      where: { id },
      data: { feedback },
      select: { id: true, feedback: true, wornAt: true },
    });
    return NextResponse.json({ success: true, recommendation: updated });
  } catch (error) {
    console.error('Outfit feedback error:', error);
    return NextResponse.json({ error: 'Could not save your feedback' }, { status: 500 });
  }
}
