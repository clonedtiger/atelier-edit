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
    const { isMuted, name, url } = body;

    const updateData: { isMuted?: boolean; name?: string; url?: string } = {};
    if (isMuted !== undefined) updateData.isMuted = isMuted;
    if (name !== undefined) updateData.name = name;
    if (url !== undefined) updateData.url = url;

    const updatedFeed = await prisma.feedSource.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json(updatedFeed);
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

    await prisma.feedSource.delete({
      where: { id },
    });

    return NextResponse.json({ success: true, message: 'Feed source deleted successfully' });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Internal server error deleting feed';
    console.error('Error deleting feed:', error);
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}
