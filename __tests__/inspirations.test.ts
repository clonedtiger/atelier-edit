import { NextRequest } from 'next/server';
import { prisma, pool } from '@/lib/db';
import { GET as getInspirations, POST as postInspirations } from '@/app/api/inspirations/route';
import { DELETE as deleteInspiration } from '@/app/api/inspirations/[id]/route';
import { getSession } from '@/lib/session';
import { generateRecommendationsForUser } from '@/lib/stylist';
import { generateOutfitRecommendations } from '@/lib/gemini';
import { deleteImage } from '@/lib/storage';

jest.mock('@/lib/session', () => ({
  getSession: jest.fn(),
}));

jest.mock('@/lib/storage', () => ({
  uploadImage: jest.fn().mockResolvedValue('/uploads/mock-inspiration.webp'),
  deleteImage: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('@/lib/gemini', () => ({
  analyzeInspirationImage: jest.fn().mockResolvedValue({
    notes: 'Monochrome minimalist layering aesthetic',
    tags: ['monochrome', 'minimalist', 'tailoring'],
  }),
  generateOutfitRecommendations: jest.fn().mockResolvedValue([
    {
      title: 'Inspirational Tweed Suit',
      narrative: 'Blended with street style board notes.',
      items: [
        {
          purchaseName: 'Tweed Jacket',
          purchaseBrand: 'Chanel',
          stylingRationale: 'Inspired by board.',
        }
      ],
    }
  ]),
}));

jest.mock('sharp', () => {
  return jest.fn().mockImplementation(() => {
    return {
      resize: jest.fn().mockReturnThis(),
      webp: jest.fn().mockReturnThis(),
      toBuffer: jest.fn().mockResolvedValue(Buffer.from('fakeWebPData')),
    };
  });
});

describe('Visual Inspiration Board & Stylist Integration Tests', () => {
  let testUser: { id: string; email: string };
  let testInspiration: { id: string; imageUrl: string };

  beforeAll(async () => {
    testUser = await prisma.user.create({
      data: {
        email: `test_inspiration_${Date.now()}@test.com`,
        name: 'Clara Oswald',
      },
    });
  });

  afterAll(async () => {
    await prisma.inspirationImage.deleteMany({ where: { userId: testUser.id } });
    await prisma.userSession.deleteMany({ where: { userId: testUser.id } });
    await prisma.usageActivity.deleteMany({ where: { userId: testUser.id } });
    await prisma.recommendation.deleteMany({ where: { userId: testUser.id } });
    await prisma.user.delete({ where: { id: testUser.id } });

    await prisma.$disconnect();
    await pool.end();
  });

  describe('CRUD Visual Inspirations Board API', () => {
    it('should return empty list initially', async () => {
      (getSession as jest.Mock).mockResolvedValue({ userId: testUser.id });
      const response = await getInspirations();
      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data).toHaveLength(0);
    });

    it('should upload a new visual inspiration photo', async () => {
      (getSession as jest.Mock).mockResolvedValue({ userId: testUser.id });

      const fakeFile = new File(['dummyImageData'], 'street-style.jpg', { type: 'image/jpeg' });
      const formData = new FormData();
      formData.append('image', fakeFile);
      formData.append('notes', 'McQueen asymmetry vibe from magazine');

      const req = new Request('http://localhost/api/inspirations', {
        method: 'POST',
        body: formData,
      });

      const response = await postInspirations(req as unknown as NextRequest);
      expect(response.status).toBe(201);

      const data = await response.json();
      expect(data.id).toBeDefined();
      expect(data.userId).toBe(testUser.id);
      expect(data.imageUrl).toBe('/uploads/mock-inspiration.webp');
      expect(data.notes).toBe('McQueen asymmetry vibe from magazine');
      expect(data.tags).toContain('monochrome');

      testInspiration = data;
    });

    it('should list visual inspirations in descending order', async () => {
      (getSession as jest.Mock).mockResolvedValue({ userId: testUser.id });
      const response = await getInspirations();
      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data).toHaveLength(1);
      expect(data[0].id).toBe(testInspiration.id);
    });

    it('should delete a visual inspiration record and trigger file unlinking', async () => {
      (getSession as jest.Mock).mockResolvedValue({ userId: testUser.id });

      const mockParams = Promise.resolve({ id: testInspiration.id });
      const response = await deleteInspiration(new Request('http://localhost/api/inspirations/123') as unknown as Request, { params: mockParams });
      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.success).toBe(true);

      expect(deleteImage).toHaveBeenCalledWith('/uploads/mock-inspiration.webp');

      const dbCheck = await prisma.inspirationImage.findUnique({
        where: { id: testInspiration.id },
      });
      expect(dbCheck).toBeNull();
    });
  });

  describe('AI Stylist Lookbook Integration', () => {
    it('should retrieve visual inspirations and pass them into generateOutfitRecommendations constructor', async () => {
      // 1. Create a dummy inspiration to be parsed by generateRecommendationsForUser
      const dummyIns = await prisma.inspirationImage.create({
        data: {
          userId: testUser.id,
          imageUrl: '/uploads/dummy.webp',
          notes: 'Draped McQueen look in black silk',
          tags: ['draped', 'silk', 'mcqueen'],
        },
      });

      (getSession as jest.Mock).mockResolvedValue({ userId: testUser.id });

      // 2. Trigger generation
      const recommendations = await generateRecommendationsForUser(testUser.id);
      expect(recommendations).toHaveLength(1);

      // Verify that generateOutfitRecommendations mock was called with visual board context
      expect(generateOutfitRecommendations).toHaveBeenCalledWith(
        expect.any(Array),
        expect.any(Array),
        expect.any(Object),
        undefined,
        expect.arrayContaining([
          expect.objectContaining({
            notes: 'Draped McQueen look in black silk',
            tags: expect.arrayContaining(['draped', 'silk', 'mcqueen']),
          }),
        ])
      );

      // Clean up the dummy inspiration
      await prisma.inspirationImage.delete({ where: { id: dummyIns.id } });
    });
  });
});
