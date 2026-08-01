import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getSession } from '@/lib/session';

export async function POST(req: Request) {
  try {
    const session = await getSession();
    if (!session || !session.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { marketingEmail, marketingSms, marketingPartners } = body;

    const now = new Date();

    const updatedUser = await prisma.user.update({
      where: { id: session.userId },
      data: {
        marketingEmail: Boolean(marketingEmail),
        marketingSms: Boolean(marketingSms),
        marketingPartners: Boolean(marketingPartners),
        marketingConsentUpdatedAt: now,
      },
      select: {
        id: true,
        email: true,
        name: true,
        marketingEmail: true,
        marketingSms: true,
        marketingPartners: true,
        marketingConsentUpdatedAt: true,
      },
    });

    console.log(`Updated marketing consent preferences for user ${updatedUser.email} at ${now.toISOString()}`);

    return NextResponse.json({
      success: true,
      message: 'Marketing and privacy consent preferences updated successfully.',
      user: updatedUser,
    });
  } catch (error) {
    console.error('Error updating consent preferences:', error);
    return NextResponse.json({ error: 'Failed to update consent preferences' }, { status: 500 });
  }
}
