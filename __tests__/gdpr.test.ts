import { prisma, pool } from '@/lib/db';

describe('GDPR & UK DPA 2018 Data Protection Integration Tests', () => {
  let testUserId: string;
  let testEmail: string;

  beforeAll(async () => {
    testEmail = `gdpr_test_${Date.now()}@fashion.com`;
    const user = await prisma.user.create({
      data: {
        email: testEmail,
        name: 'GDPR Test User',
        passwordHash: 'hash123',
        sex: 'Female',
        clothingSize: 'UK 10',
        marketingEmail: false,
        marketingSms: false,
        marketingPartners: false,
      },
    });
    testUserId = user.id;

    // Create associated data
    await prisma.wardrobeItem.create({
      data: {
        userId: testUserId,
        imageUrl: '/uploads/test-gdpr-coat.webp',
        category: 'Outerwear',
        brand: 'Chanel',
        color: ['Black'],
        detectedTags: ['tweed'],
      },
    });

    await prisma.inspirationImage.create({
      data: {
        userId: testUserId,
        imageUrl: '/uploads/test-inspiration.webp',
        notes: 'Minimalist street style',
        tags: ['minimalist'],
      },
    });

    await prisma.recommendation.create({
      data: {
        userId: testUserId,
        title: 'Minimalist Bouclé Suit',
        narrative: 'Tailored luxury styling.',
        outfitItems: {
          create: [
            {
              purchaseName: 'Chanel Silk Scarf',
              stylingRationale: 'Accent piece.',
            },
          ],
        },
      },
    });
  });

  afterAll(async () => {
    if (testUserId) {
      await prisma.user.deleteMany({ where: { id: testUserId } });
    }
    await pool.end();
  });

  describe('1. Marketing Consent Management', () => {
    it('should update marketing consent preferences and timestamp', async () => {
      const now = new Date();
      const updated = await prisma.user.update({
        where: { id: testUserId },
        data: {
          marketingEmail: true,
          marketingSms: false,
          marketingPartners: true,
          marketingConsentUpdatedAt: now,
        },
      });

      expect(updated.marketingEmail).toBe(true);
      expect(updated.marketingSms).toBe(false);
      expect(updated.marketingPartners).toBe(true);
      expect(updated.marketingConsentUpdatedAt).toBeDefined();
    });
  });

  describe('2. Data Subject Access Request / Data Portability (Article 20)', () => {
    it('should retrieve full user data package including wardrobe, inspirations, and lookbooks', async () => {
      const user = await prisma.user.findUnique({
        where: { id: testUserId },
        include: {
          wardrobeItems: true,
          inspirations: true,
          recommendations: {
            include: { outfitItems: true },
          },
        },
      });

      expect(user).not.toBeNull();
      expect(user?.email).toBe(testEmail);
      expect(user?.wardrobeItems).toHaveLength(1);
      expect(user?.inspirations).toHaveLength(1);
      expect(user?.recommendations).toHaveLength(1);
      expect(user?.recommendations[0].outfitItems).toHaveLength(1);
    });
  });

  describe('3. Right to Erasure / Right to be Forgotten (Article 17)', () => {
    it('should cascade delete all user records and associated database entries', async () => {
      // Execute cascading deletion manually
      await prisma.wardrobeItem.deleteMany({ where: { userId: testUserId } });
      await prisma.inspirationImage.deleteMany({ where: { userId: testUserId } });

      const recs = await prisma.recommendation.findMany({ where: { userId: testUserId } });
      const recIds = recs.map((r) => r.id);
      if (recIds.length > 0) {
        await prisma.recommendationItem.deleteMany({ where: { recommendationId: { in: recIds } } });
        await prisma.recommendation.deleteMany({ where: { userId: testUserId } });
      }

      await prisma.user.delete({ where: { id: testUserId } });

      // Verify user and data no longer exist in database
      const deletedUser = await prisma.user.findUnique({ where: { id: testUserId } });
      expect(deletedUser).toBeNull();

      const remainingWardrobe = await prisma.wardrobeItem.findMany({ where: { userId: testUserId } });
      expect(remainingWardrobe).toHaveLength(0);

      // Prevent duplicate deletion in afterAll
      testUserId = '';
    });
  });
});
