import { prisma } from '../src/lib/db';
import { createTravelCapsule } from '../src/lib/capsule';

// Mock gemini
jest.mock('../src/lib/gemini', () => {
  const actual = jest.requireActual('../src/lib/gemini');
  return {
    ...actual,
    generateCapsuleWardrobe: jest.fn().mockImplementation(async (wardrobe) => {
      const ids = wardrobe.slice(0, 3).map((w: { id: string }) => w.id);
      return {
        selectedItemIds: ids,
        packingChecklist: wardrobe.slice(0, 3),
        outfitSchedule: [
          {
            dayNumber: 1,
            date: 'Day 1',
            dayLook: { title: 'Tailored Paris Arrival', narrative: 'Chic travel look', itemIds: [ids[0]] },
            eveningLook: { title: 'Bistro Dinner Look', narrative: 'Elevated evening', itemIds: [ids[0], ids[1]] },
          },
        ],
        stylistRationale: 'Monochrome tailored capsule designed for Paris.',
      };
    }),
  };
});

describe('Travel Packing Capsule Assistant', () => {
  const testUserId = `test-user-capsule-${Date.now()}`;
  let item1Id: string;
  let item2Id: string;

  beforeAll(async () => {
    await prisma.user.create({
      data: {
        id: testUserId,
        email: `capsule_${Date.now()}@test.com`,
        styleAesthetic: 'Minimalist Quiet Luxury',
        favoriteBrands: 'The Row, Toteme, Khaite',
      },
    });

    const item1 = await prisma.wardrobeItem.create({
      data: {
        userId: testUserId,
        imageUrl: '/test-coat.webp',
        category: 'Outerwear',
        brand: 'Toteme',
        color: ['Camel'],
        detectedTags: ['wool', 'tailored'],
      },
    });
    item1Id = item1.id;

    const item2 = await prisma.wardrobeItem.create({
      data: {
        userId: testUserId,
        imageUrl: '/test-trousers.webp',
        category: 'Bottoms',
        brand: 'The Row',
        color: ['Black'],
        detectedTags: ['pleated', 'wool'],
      },
    });
    item2Id = item2.id;
  });

  afterAll(async () => {
    await prisma.capsuleTrip.deleteMany({ where: { userId: testUserId } });
    await prisma.wardrobeItem.deleteMany({ where: { userId: testUserId } });
    await prisma.user.delete({ where: { id: testUserId } });
  });

  it('creates and persists a travel packing capsule with multi-day schedule', async () => {
    const result = await createTravelCapsule({
      userId: testUserId,
      destination: 'Paris, France',
      startDate: '2026-10-01',
      endDate: '2026-10-04',
      tripPurpose: 'Business Meetings & Gallery Dinners',
      luggageType: 'Carry-on Only',
    });

    expect(result).toBeDefined();
    expect(result.capsuleTrip.destination).toBe('Paris, France');
    expect(result.capsuleTrip.tripPurpose).toBe('Business Meetings & Gallery Dinners');
    expect(result.capsuleTrip.itemIds).toContain(item1Id);
    expect(result.capsuleTrip.itemIds).toContain(item2Id);
    expect(result.outfitSchedule.length).toBeGreaterThan(0);
    expect(result.stylistRationale).toContain('Paris');

    const saved = await prisma.capsuleTrip.findUnique({
      where: { id: result.capsuleTrip.id },
    });
    expect(saved).not.toBeNull();
    expect(saved?.luggageType).toBe('Carry-on Only');
  });
});
