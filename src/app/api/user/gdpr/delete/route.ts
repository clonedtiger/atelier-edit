import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getSession, clearSessionCookie } from '@/lib/session';
import { deleteImage } from '@/lib/storage';

export async function DELETE(req: Request) {
  try {
    const session = await getSession();
    if (!session || !session.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.userId;
    const body = await req.json().catch(() => ({}));
    const { confirmText } = body;

    if (!confirmText || confirmText.trim().toUpperCase() !== 'DELETE') {
      return NextResponse.json(
        { error: 'Invalid confirmation. You must type "DELETE" to confirm permanent account erasure.' },
        { status: 400 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    console.log(`Starting GDPR Right to Erasure / Permanent Deletion for user: ${user.email} (${userId})`);

    // 1. Purge physical files stored in Google Cloud Storage / local storage for Wardrobe items
    const wardrobeItems = await prisma.wardrobeItem.findMany({
      where: { userId },
      select: { imageUrl: true },
    });

    for (const item of wardrobeItems) {
      if (item.imageUrl) {
        await deleteImage(item.imageUrl).catch((err) => {
          console.warn(`Failed to delete GCS image ${item.imageUrl}:`, err);
        });
      }
    }

    // 2. Purge physical files stored for Visual Inspirations
    const inspirations = await prisma.inspirationImage.findMany({
      where: { userId },
      select: { imageUrl: true },
    });

    for (const ins of inspirations) {
      if (ins.imageUrl) {
        await deleteImage(ins.imageUrl).catch((err) => {
          console.warn(`Failed to delete GCS inspiration image ${ins.imageUrl}:`, err);
        });
      }
    }

    // 3. Purge all relational database records
    await prisma.wardrobeItem.deleteMany({ where: { userId } });
    await prisma.inspirationImage.deleteMany({ where: { userId } });

    // Delete recommendations and their associated recommendation items
    const userRecs = await prisma.recommendation.findMany({
      where: { userId },
      select: { id: true },
    });
    const recIds = userRecs.map((r) => r.id);
    if (recIds.length > 0) {
      await prisma.recommendationItem.deleteMany({
        where: { recommendationId: { in: recIds } },
      });
      await prisma.recommendation.deleteMany({ where: { userId } });
    }

    await prisma.userSession.deleteMany({ where: { userId } });
    await prisma.usageActivity.deleteMany({ where: { userId } });

    // 4. Finally, delete the User account record
    await prisma.user.delete({ where: { id: userId } });

    // 5. Clear active session cookie
    await clearSessionCookie();

    console.log(`GDPR Permanent Deletion completed successfully for user ${user.email}`);

    return NextResponse.json({
      success: true,
      message: 'Your account and all associated personal data have been permanently erased under GDPR Article 17.',
    });
  } catch (error) {
    console.error('Error executing GDPR account deletion:', error);
    return NextResponse.json({ error: 'Failed to erase account data' }, { status: 500 });
  }
}
