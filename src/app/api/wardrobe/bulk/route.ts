import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getSession } from '@/lib/session';

async function getActiveUserId() {
  const session = await getSession();
  return session?.userId || null;
}

export async function PUT(req: NextRequest) {
  try {
    const userId = await getActiveUserId();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { items } = await req.json();
    if (!items || !Array.isArray(items)) {
      return NextResponse.json({ error: 'Invalid items payload' }, { status: 400 });
    }

    // Run updates in a single PostgreSQL transaction
    const updateTx = await prisma.$transaction(
      items.map((item) =>
        prisma.wardrobeItem.update({
          where: { 
            id: item.id, 
            userId // ensure ownership security
          },
          data: {
            brand: item.brand !== undefined ? item.brand : undefined,
            category: item.category !== undefined ? item.category : undefined,
            styleNotes: item.styleNotes !== undefined ? item.styleNotes : undefined,
            detectedTags: item.detectedTags !== undefined ? item.detectedTags : undefined,
          },
        })
      )
    );

    return NextResponse.json({ success: true, count: updateTx.length });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Failed to execute bulk update transaction';
    console.error('Bulk update error:', error);
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const userId = await getActiveUserId();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { ids } = await req.json();
    if (!ids || !Array.isArray(ids)) {
      return NextResponse.json({ error: 'Invalid ids payload' }, { status: 400 });
    }

    const deleteTx = await prisma.wardrobeItem.deleteMany({
      where: {
        id: { in: ids },
        userId, // ensure ownership security
      },
    });

    return NextResponse.json({ success: true, count: deleteTx.count });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Failed to execute bulk deletion';
    console.error('Bulk delete error:', error);
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}
