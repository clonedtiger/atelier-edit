import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getSession } from '@/lib/session';

export async function GET() {
  try {
    const session = await getSession();
    if (!session || !session.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.userId;

    // Fetch all personal data belonging to the user
    const userProfile = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        sex: true,
        phone: true,
        height: true,
        weight: true,
        waistSize: true,
        braSize: true,
        shoeSize: true,
        hatSize: true,
        gloveSize: true,
        clothingSize: true,
        workLife: true,
        inspirationNotes: true,
        mfaEnabled: true,
        role: true,
        suspended: true,
        marketingEmail: true,
        marketingSms: true,
        marketingPartners: true,
        marketingConsentUpdatedAt: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!userProfile) {
      return NextResponse.json({ error: 'User profile not found' }, { status: 404 });
    }

    const wardrobeItems = await prisma.wardrobeItem.findMany({
      where: { userId },
      select: {
        id: true,
        imageUrl: true,
        category: true,
        color: true,
        brand: true,
        styleNotes: true,
        detectedTags: true,
        createdAt: true,
      },
    });

    const inspirations = await prisma.inspirationImage.findMany({
      where: { userId },
      select: {
        id: true,
        imageUrl: true,
        notes: true,
        tags: true,
        createdAt: true,
      },
    });

    const recommendations = await prisma.recommendation.findMany({
      where: { userId },
      include: {
        outfitItems: true,
      },
    });

    const activities = await prisma.usageActivity.findMany({
      where: { userId },
      select: {
        id: true,
        action: true,
        timestamp: true,
      },
    });

    const sessions = await prisma.userSession.findMany({
      where: { userId },
      select: {
        id: true,
        loginTime: true,
        lastActive: true,
        duration: true,
      },
    });

    // Assemble compliance export payload
    const exportPackage = {
      exportMetadata: {
        title: 'Atelier Edit - GDPR / DPA 2018 Personal Data Export',
        exportedAt: new Date().toISOString(),
        dataSubjectEmail: userProfile.email,
        complianceNotice: 'This package contains all personal data, physical sizing measurements, uploaded media references, styling lookbooks, and consent logs stored by Atelier Edit under GDPR Article 20.',
      },
      accountProfile: userProfile,
      marketingConsentAudit: {
        marketingEmail: userProfile.marketingEmail,
        marketingSms: userProfile.marketingSms,
        marketingPartners: userProfile.marketingPartners,
        consentLastUpdated: userProfile.marketingConsentUpdatedAt,
      },
      wardrobeCatalog: {
        totalItems: wardrobeItems.length,
        items: wardrobeItems,
      },
      visualInspirationBoard: {
        totalImages: inspirations.length,
        images: inspirations,
      },
      stylistLookbooks: {
        totalOutfits: recommendations.length,
        recommendations,
      },
      activityAuditLogs: activities,
      accountSessions: sessions,
    };

    const jsonString = JSON.stringify(exportPackage, null, 2);

    return new NextResponse(jsonString, {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="atelier-edit-gdpr-export-${userId.slice(0, 8)}.json"`,
      },
    });
  } catch (error) {
    console.error('Error generating GDPR data export:', error);
    return NextResponse.json({ error: 'Failed to export personal data package' }, { status: 500 });
  }
}
