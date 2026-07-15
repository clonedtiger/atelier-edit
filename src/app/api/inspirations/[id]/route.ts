import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getSession } from '@/lib/session';
import { deleteImage } from '@/lib/storage';

async function getActiveUserId() {
  const session = await getSession();
  return session?.userId || null;
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await getActiveUserId();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { suspended: true },
    });

    if (!user || user.suspended) {
      return NextResponse.json({ error: 'Unauthorized or account suspended' }, { status: 403 });
    }

    const { id } = await params;

    const inspiration = await prisma.inspirationImage.findUnique({
      where: { id },
    });

    if (!inspiration) {
      return NextResponse.json({ error: 'Inspiration image not found' }, { status: 404 });
    }

    if (inspiration.userId !== userId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Delete physical file
    await deleteImage(inspiration.imageUrl);

    // Delete database record
    await prisma.inspirationImage.delete({
      where: { id },
    });

    return NextResponse.json({ success: true, message: 'Inspiration image deleted successfully' });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    console.error('Error deleting inspiration image:', error);
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
