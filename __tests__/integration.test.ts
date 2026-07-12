import { prisma, pool } from '@/lib/db';
import { generateRecommendationsForUser } from '@/lib/stylist';

// Mock the Gemini API recommendations call
jest.mock('@/lib/gemini', () => ({
  generateOutfitRecommendations: jest.fn().mockResolvedValue([
    {
      title: 'Structural Tweed & Chunky Leather',
      narrative: 'A tailored look matching creative lifestyle.',
      items: [
        {
          wardrobeItemId: 'mock-wardrobe-id',
          stylingRationale: 'Layer over the drape top.',
        },
        {
          purchaseName: 'Matte Leather Biker Boot',
          purchaseBrand: 'AllSaints',
          priceEstimate: '$260',
          stylingRationale: 'Order in Size 39 matching shoe size.',
        },
      ],
    },
  ]),
}));

describe('E2E Database Integration Test', () => {
  let testUserId: string;

  beforeAll(async () => {
    // Setup test user in database
    const user = await prisma.user.create({
      data: {
        email: `test_${Date.now()}@integration.com`,
        name: 'Clara Oswald',
        passwordHash: 'dummyhash',
        sex: 'Female',
        height: '175 cm',
        weight: '62 kg',
        waistSize: '27 inches',
        braSize: '32C',
        shoeSize: '39',
        hatSize: 'M',
        gloveSize: '7',
        workLife: 'Creative design studio consultant',
        inspirationNotes: 'Tailored silhouettes, monochrome structuring',
      },
    });
    testUserId = user.id;
  });

  afterAll(async () => {
    // Clean up test data
    await prisma.recommendationItem.deleteMany({});
    await prisma.recommendation.deleteMany({ where: { userId: testUserId } });
    await prisma.wardrobeItem.deleteMany({ where: { userId: testUserId } });
    await prisma.user.delete({ where: { id: testUserId } });

    // Close Prisma and pg connection pool
    await prisma.$disconnect();
    await pool.end();
  });

  it('should successfully run the full E2E styling pipeline and persist relations in PostgreSQL', async () => {
    // 1. Verify User sizing details exist in PostgreSQL
    const user = await prisma.user.findUnique({
      where: { id: testUserId },
    });
    expect(user).toBeTruthy();
    expect(user?.sex).toBe('Female');
    expect(user?.waistSize).toBe('27 inches');
    expect(user?.shoeSize).toBe('39');

    // 2. Add closet item for user
    const item = await prisma.wardrobeItem.create({
      data: {
        userId: testUserId,
        imageUrl: '/uploads/test-blazer.webp',
        category: 'Outerwear',
        color: ['Black'],
        brand: 'Zara Studio',
        styleNotes: 'Tweed tailored blazer',
        detectedTags: ['tweed', 'chanel-coded'],
      },
    });
    expect(item.id).toBeTruthy();

    // 3. Seed temporary trend articles to crawl
    const trend = await prisma.trendArticle.upsert({
      where: { sourceUrl: 'https://test-blog.com/trend' },
      update: {},
      create: {
        sourceUrl: 'https://test-blog.com/trend',
        sourceName: 'Magasin',
        title: 'Asymmetry & Tailored Coordinates',
        content: 'Chunky leather boots are paired with classic tailored blazers.',
        publishedAt: new Date(),
        extractedTrends: ['chunky leather boots', 'tailored blazers'],
      },
    });
    expect(trend).toBeTruthy();

    // 4. Run recommendation generation engine
    const recommendations = await generateRecommendationsForUser(testUserId);
    expect(recommendations).toHaveLength(1);

    const createdRec = recommendations[0];
    expect(createdRec.title).toBe('Structural Tweed & Chunky Leather');
    expect(createdRec.userId).toBe(testUserId);

    // 5. Query persisted recommendations from DB with relations
    const recDb = await prisma.recommendation.findUnique({
      where: { id: createdRec.id },
      include: { outfitItems: true },
    });

    expect(recDb).toBeTruthy();
    expect(recDb?.outfitItems).toHaveLength(2);

    // One item points to a purchase recommendation, the other is our closet item
    const hasPurchaseItem = recDb?.outfitItems.some(i => i.purchaseName === 'Matte Leather Biker Boot' && i.purchaseBrand === 'AllSaints');
    expect(hasPurchaseItem).toBe(true);

    // Clean up crawled trend article
    await prisma.trendArticle.delete({ where: { id: trend.id } });
  });
});
