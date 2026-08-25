import { prisma, pool } from '@/lib/db';
import { generateRecommendationsForUser } from '@/lib/stylist';
import { generateOutfitRecommendations } from '@/lib/gemini';

// Mock the Gemini API calls
jest.mock('@/lib/gemini', () => ({
  generateOutfitRecommendations: jest.fn().mockImplementation((wardrobe, trends, user, vibe, inspirations, anchorItem) => {
    return Promise.resolve([
      {
        title: 'Hero Anchored McQueen Leather Look',
        narrative: `Styled directly around hero piece: ${anchorItem?.category || 'Item'}.`,
        items: [
          {
            wardrobeItemId: anchorItem?.id || 'mock-id',
            stylingRationale: 'Core hero piece around which outfit is anchored.',
          },
          {
            purchaseName: 'Bouclé Tweed Waistcoat',
            purchaseBrand: 'Chanel',
            priceEstimate: '$1200',
            stylingRationale: 'Complements the hero piece with structured elegance.',
          },
        ],
      },
    ]);
  }),
}));

describe('Item-Anchored Outfit Generation Integration Tests', () => {
  let testUserId: string;
  let testAnchorItemId: string;

  beforeAll(async () => {
    // 1. Create a test user
    const user = await prisma.user.create({
      data: {
        email: `anchor_test_${Date.now()}@fashion.com`,
        name: 'Hero Stylist Tester',
        passwordHash: 'dummyhash',
        sex: 'Female',
        height: '170 cm',
        shoeSize: '38 EU',
        workLife: 'Creative Director at Fashion Magazine',
      },
    });
    testUserId = user.id;

    // 2. Create a test wardrobe garment to act as the anchor piece
    const wardrobeItem = await prisma.wardrobeItem.create({
      data: {
        userId: testUserId,
        imageUrl: '/uploads/hero-jacket.webp',
        category: 'Outerwear',
        brand: 'Alexander McQueen',
        color: ['Black', 'Silver'],
        styleNotes: 'Asymmetric biker jacket with silver hardware.',
        detectedTags: ['leather', 'biker', 'asymmetric', 'mcqueen'],
      },
    });
    testAnchorItemId = wardrobeItem.id;
  });

  afterAll(async () => {
    // Clean up test data
    if (testUserId) {
      await prisma.user.delete({ where: { id: testUserId } });
    }
    await pool.end();
  });

  it('should pass resolved anchor item to Gemini generator when anchorItemId is specified', async () => {
    const recs = await generateRecommendationsForUser(testUserId, 'Edgy concert night', testAnchorItemId);

    expect(generateOutfitRecommendations).toHaveBeenCalledWith(
      expect.any(Array),
      expect.any(Array),
      expect.objectContaining({ sex: 'Female', shoeSize: '38 EU' }),
      'Edgy concert night',
      expect.any(Array),
      expect.objectContaining({
        id: testAnchorItemId,
        category: 'Outerwear',
        brand: 'Alexander McQueen',
      }),
      undefined
    );

    expect(recs).toHaveLength(1);
    const fullRec = await prisma.recommendation.findUnique({
      where: { id: recs[0].id },
      include: { outfitItems: true },
    });
    expect(fullRec?.title).toBe('Hero Anchored McQueen Leather Look');
    expect(fullRec?.outfitItems[0].wardrobeItemId).toBe(testAnchorItemId);
  });
});
