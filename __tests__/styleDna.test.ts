import { prisma } from '../src/lib/db';
import { generateOutfitRecommendations } from '../src/lib/gemini';
import { generateRecommendationsForUser } from '../src/lib/stylist';

jest.mock('../src/lib/gemini', () => {
  const actual = jest.requireActual('../src/lib/gemini');
  return {
    ...actual,
    generateOutfitRecommendations: jest.fn().mockImplementation(
      async (_wardrobe, _trends, userProfile) => {
        return [
          {
            title: `${userProfile?.styleAesthetic || 'Tailored'} Editorial Look`,
            narrative: `Designed for ${userProfile?.styleAesthetic || 'Modern Luxury'} prioritizing brands like ${userProfile?.favoriteBrands || 'Curated'} while avoiding ${userProfile?.avoidedStyles || 'None'}.`,
            items: [
              {
                purchaseName: 'Oversized Double-Breasted Wool Coat',
                purchaseBrand: 'The Row',
                priceEstimate: '$2,800',
                stylingRationale: 'Fits client aesthetic with relaxed tailoring.',
              },
            ],
          },
        ];
      }
    ),
  };
});

describe('Style DNA & Personalized Feed Intelligence', () => {
  let testUserId: string;

  beforeAll(async () => {
    const testUser = await prisma.user.create({
      data: {
        email: `style_tester_${Date.now()}@atelieredit.com`,
        name: 'Sartorial Tester',
        sex: 'Female',
        styleAesthetic: 'Minimalist Quiet Luxury',
        favoriteBrands: 'The Row, Toteme, Khaite, COS',
        avoidedStyles: 'No neon, no loud logos, no synthetic polyester',
        colorPalette: 'Black, Cream, Camel, Charcoal',
        workLife: 'Creative Director',
        inspirationNotes: 'Clean architectural lines and pure wool knits',
      },
    });
    testUserId = testUser.id;
  });

  afterAll(async () => {
    await prisma.userFeedSubscription.deleteMany({ where: { userId: testUserId } });
    await prisma.recommendationItem.deleteMany({
      where: { recommendation: { userId: testUserId } },
    });
    await prisma.recommendation.deleteMany({ where: { userId: testUserId } });
    await prisma.wardrobeItem.deleteMany({ where: { userId: testUserId } });
    await prisma.feedSource.deleteMany({ where: { userId: testUserId } });
    await prisma.user.deleteMany({ where: { id: testUserId } });
  });

  it('should persist and retrieve user-configured Style DNA', async () => {
    const user = await prisma.user.findUnique({
      where: { id: testUserId },
      select: {
        styleAesthetic: true,
        favoriteBrands: true,
        avoidedStyles: true,
        colorPalette: true,
      },
    });

    expect(user).toBeDefined();
    expect(user?.styleAesthetic).toBe('Minimalist Quiet Luxury');
    expect(user?.favoriteBrands).toContain('The Row');
    expect(user?.avoidedStyles).toContain('No neon');
    expect(user?.colorPalette).toContain('Camel');
  });

  it('should allow user-scoped feed subscriptions and custom feeds', async () => {
    // 1. Create a custom feed owned by the user
    const customFeed = await prisma.feedSource.create({
      data: {
        name: 'The Row Seasonal Radar',
        url: `https://therow.com/rss/${Date.now()}`,
        type: 'rss',
        category: 'Luxury & Haute Couture',
        userId: testUserId,
        isMuted: false,
      },
    });

    // 2. Subscribe user
    const sub = await prisma.userFeedSubscription.create({
      data: {
        userId: testUserId,
        feedSourceId: customFeed.id,
        isMuted: false,
      },
    });

    expect(sub.id).toBeDefined();
    expect(sub.isMuted).toBe(false);

    // 3. Toggle mute
    const updatedSub = await prisma.userFeedSubscription.update({
      where: { id: sub.id },
      data: { isMuted: true },
    });
    expect(updatedSub.isMuted).toBe(true);
  });

  it('should generate personalized recommendations honoring active user Style DNA', async () => {
    const recs = await generateRecommendationsForUser(testUserId);
    expect(recs.length).toBeGreaterThan(0);
    expect(generateOutfitRecommendations).toHaveBeenCalled();

    // Verify recommendations were saved to database
    const savedRec = await prisma.recommendation.findFirst({
      where: { userId: testUserId },
      include: { outfitItems: true },
    });

    expect(savedRec).toBeDefined();
    expect(savedRec?.title).toContain('Minimalist Quiet Luxury');
    expect(savedRec?.narrative).toContain('The Row');
  });
});
