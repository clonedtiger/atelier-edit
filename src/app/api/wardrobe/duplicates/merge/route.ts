import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getSession } from '@/lib/session';
import { deleteImage } from '@/lib/storage';

async function getActiveUserId() {
  const session = await getSession();
  return session?.userId || null;
}

export async function POST(req: Request) {
  try {
    const userId = await getActiveUserId();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const { keepId, deleteIds } = body as { keepId: string; deleteIds: string[] };

    if (!keepId || !deleteIds || !Array.isArray(deleteIds) || deleteIds.length === 0) {
      return NextResponse.json({ error: 'keepId and deleteIds array are required' }, { status: 400 });
    }

    // Verify all items belong to the active user
    const idsToCheck = [keepId, ...deleteIds];
    const items = await prisma.wardrobeItem.findMany({
      where: {
        id: { in: idsToCheck },
        userId,
      },
    });

    if (items.length !== idsToCheck.length) {
      return NextResponse.json({ error: 'Invalid items or permissions check failed' }, { status: 403 });
    }

    const deleteItems = items.filter((item) => deleteIds.includes(item.id));

    // Execute merging steps
    for (const item of deleteItems) {
      // 1. Re-map any recommendation items pointing to the duplicate to keep the link active
      await prisma.recommendationItem.updateMany({
        where: { wardrobeItemId: item.id },
        data: { wardrobeItemId: keepId },
      });

      // 2. Delete physical file (local or GCS)
      await deleteImage(item.imageUrl);

      // 3. Delete the wardrobe item from DB
      await prisma.wardrobeItem.delete({
        where: { id: item.id },
      });
      console.log(`Deleted duplicate wardrobe item record: ${item.id}`);
    }

    return NextResponse.json({
      success: true,
      message: `Successfully merged duplicates into item ${keepId}. ${deleteItems.length} copies deleted.`,
    });
  } catch (error) {
    console.error('Error merging duplicates:', error);
    return NextResponse.json(
      { error: 'Internal server error during duplicate merging' },
      { status: 500 }
    );
  }
}
