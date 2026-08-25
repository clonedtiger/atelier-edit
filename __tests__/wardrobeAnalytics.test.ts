import { prisma } from '../src/lib/db';
import { classifyColor, getWardrobeAnalytics, getWardrobeGaps } from '../src/lib/wardrobeAnalytics';

// Mock gemini
jest.mock('../src/lib/gemini', () => {
  const actual = jest.requireActual('../src/lib/gemini');
  return {
    ...actual,
    analyzeWardrobeGaps: jest.fn().mockResolvedValue([
      {
        purchaseName: 'Classic Structured Wool Blazer',
        purchaseBrand: 'Toteme',
        category: 'Outerwear',
        estimatedPrice: '$850',
        stylingRationale: 'Essential tailoring cornerstone.',
        unlocksLooksCount: 6,
      },
    ]),
  };
});

describe('Wardrobe Analytics, Color Heatmap & Gap Analysis', () => {
  const testUserId = `test-user-analytics-${Date.now()}`;

  beforeAll(async () => {
    await prisma.user.create({
      data: {
        id: testUserId,
        email: `analytics_${Date.now()}@test.com`,
        styleAesthetic: 'Minimalist Quiet Luxury',
        favoriteBrands: 'The Row, Toteme, Khaite',
        colorPalette: 'Black, Cream, Camel',
      },
    });

    await prisma.wardrobeItem.createMany({
      data: [
        {
          userId: testUserId,
          imageUrl: '/coat1.webp',
          category: 'Outerwear',
          brand: 'Toteme',
          color: ['Camel'],
          detectedTags: ['wool'],
        },
        {
          userId: testUserId,
          imageUrl: '/top1.webp',
          category: 'Tops',
          brand: 'The Row',
          color: ['Black'],
          detectedTags: ['cashmere'],
        },
        {
          userId: testUserId,
          imageUrl: '/bottom1.webp',
          category: 'Bottoms',
          brand: 'COS',
          color: ['Cream'],
          detectedTags: ['pleated'],
        },
      ],
    });
  });

  afterAll(async () => {
    await prisma.wardrobeItem.deleteMany({ where: { userId: testUserId } });
    await prisma.user.delete({ where: { id: testUserId } });
  });

  it('correctly classifies color names into primary tonal families', () => {
    expect(classifyColor('Charcoal Black')).toBe('Monochrome & Neutrals');
    expect(classifyColor('Warm Camel')).toBe('Warm Earth Tones');
    expect(classifyColor('Deep Burgundy')).toBe('Jewel & Deep Tones');
    expect(classifyColor('Soft Sage')).toBe('Pastels & Soft Tones');
    expect(classifyColor('Electric Cobalt')).toBe('Vibrant & Statement');
  });

  it('calculates category breakdown, color spectrum, and Style DNA alignment score', async () => {
    const analytics = await getWardrobeAnalytics(testUserId);
    expect(analytics.totalItems).toBe(3);
    expect(analytics.categoryBreakdown.length).toBe(3);
    expect(analytics.colorBreakdown.length).toBeGreaterThanOrEqual(2);
    expect(analytics.styleDnaAlignmentScore).toBeGreaterThanOrEqual(60);
    expect(analytics.unwornGems.length).toBe(3);
  });

  it('generates strategic wardrobe gaps with luxury brand recommendations', async () => {
    const gaps = await getWardrobeGaps(testUserId);
    expect(gaps.length).toBe(1);
    expect(gaps[0].purchaseName).toBe('Classic Structured Wool Blazer');
    expect(gaps[0].purchaseBrand).toBe('Toteme');
    expect(gaps[0].unlocksLooksCount).toBe(6);
  });
});
