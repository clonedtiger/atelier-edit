import { getUserWhatsNew, generateAndSaveUserWhatsNew } from '@/lib/whatsNew';
import { GET, POST } from '@/app/api/feed/whats-new/route';
import { prisma } from '@/lib/db';
import { getAi, safeParseGeminiJson } from '@/lib/gemini';
import { syncArticlesAndTrends } from '@/lib/feed';
import { uploadImage } from '@/lib/storage';
import { getSession } from '@/lib/session';
import { NextRequest } from 'next/server';
import sharp from 'sharp';

// Mock dependencies
jest.mock('@/lib/db', () => ({
  prisma: {
    whatsNewPost: {
      findMany: jest.fn(),
      create: jest.fn(),
      deleteMany: jest.fn(),
    },
    user: {
      findUnique: jest.fn(),
    },
    inspirationImage: {
      findMany: jest.fn(),
    },
    trendArticle: {
      findMany: jest.fn(),
    },
  },
}));

jest.mock('@/lib/gemini', () => ({
  MODEL_NAME: 'gemini-2.5-flash',
  getAi: jest.fn(),
  safeParseGeminiJson: jest.fn(),
}));

jest.mock('@/lib/feed', () => ({
  syncArticlesAndTrends: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('@/lib/storage', () => ({
  uploadImage: jest.fn().mockImplementation(async (_buf: Buffer, filename: string) => `/uploads/${filename}`),
}));

jest.mock('@/lib/session', () => ({
  getSession: jest.fn(),
}));

describe('Personalized What\'s New Feed - Library and API Routes', () => {
  const mockUserId = 'user-test-123';
  const mockDate = new Date('2026-09-01T12:00:00.000Z');

  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch = jest.fn() as jest.Mock;
  });

  describe('getUserWhatsNew()', () => {
    it('returns an empty post list when userId is null or undefined (new unauthenticated user)', async () => {
      const result = await getUserWhatsNew(null);
      expect(result.posts).toEqual([]);
      expect(prisma.whatsNewPost.findMany).not.toHaveBeenCalled();
    });

    it('returns an empty post list when a new user has no generated posts', async () => {
      (prisma.whatsNewPost.findMany as jest.Mock).mockResolvedValueOnce([]);

      const result = await getUserWhatsNew(mockUserId);
      expect(result.posts).toEqual([]);
      expect(prisma.whatsNewPost.findMany).toHaveBeenCalledWith({
        where: { userId: mockUserId },
        orderBy: { createdAt: 'desc' },
      });
    });

    it('returns posts sorted in descending order by default with formatted createdAt', async () => {
      const mockDbPosts = [
        {
          id: 'post-1',
          title: 'Tailored Suiting',
          summary: 'Sharp cuts for modern tailoring.',
          source: 'Vogue Runway',
          tags: ['tailoring', 'menswear'],
          imageUrl: '/uploads/img1.webp',
          createdAt: new Date('2026-09-02T10:00:00.000Z'),
        },
        {
          id: 'post-2',
          title: 'Monochrome Wool Coat',
          summary: 'Minimalist outerwear.',
          source: 'Curated Feed',
          tags: ['wool', 'outerwear'],
          imageUrl: '/uploads/img2.webp',
          createdAt: new Date('2026-09-01T10:00:00.000Z'),
        },
      ];

      (prisma.whatsNewPost.findMany as jest.Mock).mockResolvedValueOnce(mockDbPosts);

      const result = await getUserWhatsNew(mockUserId, 'desc');
      expect(result.posts).toHaveLength(2);
      expect(result.posts[0].id).toBe('post-1');
      expect(result.posts[0].createdAt).toBe('2026-09-02T10:00:00.000Z');
      expect(prisma.whatsNewPost.findMany).toHaveBeenCalledWith({
        where: { userId: mockUserId },
        orderBy: { createdAt: 'desc' },
      });
    });

    it('supports ascending sort order (oldest at the bottom / newest at the bottom)', async () => {
      (prisma.whatsNewPost.findMany as jest.Mock).mockResolvedValueOnce([]);

      await getUserWhatsNew(mockUserId, 'asc');
      expect(prisma.whatsNewPost.findMany).toHaveBeenCalledWith({
        where: { userId: mockUserId },
        orderBy: { createdAt: 'asc' },
      });
    });
  });

  describe('generateAndSaveUserWhatsNew()', () => {
    let mockGenerateContent: jest.Mock;

    beforeEach(() => {
      mockGenerateContent = jest.fn();
      (getAi as jest.Mock).mockReturnValue({
        models: {
          generateContent: mockGenerateContent,
        },
      });
    });

    it('enforces masculine tailoring restrictions for male users and integrates inspiration feeds', async () => {
      // 1. Mock user profile with male sex and personal inspiration notes
      (prisma.user.findUnique as jest.Mock).mockResolvedValueOnce({
        id: mockUserId,
        name: 'Alexander',
        sex: 'Male',
        gender: 'Male',
        styleAesthetic: 'Architectural Minimalism',
        favoriteBrands: 'Lemaire, The Row',
        avoidedStyles: 'Loud logos',
        inspirationNotes: 'Focus on relaxed silhouettes with heavy drape',
        customFeeds: [],
        feedSubscriptions: [],
      });

      // 2. Mock inspiration images
      (prisma.inspirationImage.findMany as jest.Mock).mockResolvedValueOnce([
        {
          id: 'ins-1',
          imageUrl: '/uploads/inspiration-1.webp',
          notes: 'Relaxed wool trousers with pleats',
          tags: ['trousers', 'minimalist', 'wool'],
        },
      ]);

      // 3. Mock trend articles
      (prisma.trendArticle.findMany as jest.Mock).mockResolvedValueOnce([
        {
          sourceName: 'The Cut',
          title: 'The Great Tailoring Shift',
          extractedTrends: ['wide-leg pants', 'double-breasted jackets'],
          content: 'Runways in Milan embraced wide, sweeping hems and unstructured tailoring.',
        },
      ]);

      // 4. Mock Gemini generation response
      const mockAiOutput = {
        posts: [
          {
            title: 'Architectural Pleated Trousers & Heavy Drape',
            summary: 'Aligning with your visual inspiration, tailored wool trousers feature sweeping silhouettes.',
            source: 'Personal Inspiration Feed',
            tags: ['Tailoring', 'Wool', 'Minimalist', 'Pleated Trousers'],
            imageSearchQuery: 'men oversized wool coat runway',
            matchedInspirationIndex: 0,
          },
        ],
      };

      mockGenerateContent.mockResolvedValueOnce({
        text: JSON.stringify(mockAiOutput),
      });
      (safeParseGeminiJson as jest.Mock).mockReturnValueOnce(mockAiOutput);

      // 5. Mock created post in DB and subsequent retrieval
      (prisma.whatsNewPost.create as jest.Mock).mockResolvedValueOnce({
        id: 'new-post-1',
        userId: mockUserId,
        title: mockAiOutput.posts[0].title,
        summary: mockAiOutput.posts[0].summary,
        source: mockAiOutput.posts[0].source,
        tags: mockAiOutput.posts[0].tags,
        imageUrl: '/uploads/inspiration-1.webp',
        createdAt: mockDate,
      });

      (prisma.whatsNewPost.findMany as jest.Mock).mockResolvedValueOnce([
        {
          id: 'new-post-1',
          title: mockAiOutput.posts[0].title,
          summary: mockAiOutput.posts[0].summary,
          source: mockAiOutput.posts[0].source,
          tags: mockAiOutput.posts[0].tags,
          imageUrl: '/uploads/inspiration-1.webp',
          createdAt: mockDate,
        },
      ]);

      const result = await generateAndSaveUserWhatsNew(mockUserId, 'desc');

      // Verify syncArticlesAndTrends was triggered
      expect(syncArticlesAndTrends).toHaveBeenCalledWith(2, true);

      // Verify old posts were cleared on sync
      expect(prisma.whatsNewPost.deleteMany).toHaveBeenCalledWith({
        where: { userId: mockUserId },
      });

      // Verify prompt includes male restrictions
      expect(mockGenerateContent).toHaveBeenCalled();
      const calledPrompt = mockGenerateContent.mock.calls[0][0].contents as string;
      expect(calledPrompt).toContain('Biological Sex: Male');
      expect(calledPrompt).toContain('Gender: Male');
      expect(calledPrompt).toContain('100% EXCLUSIVELY MENSWEAR AND MASCULINE LUXURY');
      expect(calledPrompt).toContain('You are STRICTLY FORBIDDEN from generating, mentioning, or describing ANY womenswear, female clothing');
      expect(calledPrompt).toContain('Relaxed wool trousers with pleats');
      expect(calledPrompt).toContain('Focus on relaxed silhouettes with heavy drape');

      // Verify post was saved with the resolved inspiration image
      expect(prisma.whatsNewPost.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            userId: mockUserId,
            title: 'Architectural Pleated Trousers & Heavy Drape',
            imageUrl: '/uploads/inspiration-1.webp',
          }),
        })
      );

      expect(result.posts).toHaveLength(1);
      expect(result.posts[0].title).toBe('Architectural Pleated Trousers & Heavy Drape');
    });

    it('downloads and stores images permanently if an external Tavily image is fetched', async () => {
      process.env.TAVILY_API_KEY = 'test-tavily-key';

      (prisma.user.findUnique as jest.Mock).mockResolvedValueOnce({
        id: mockUserId,
        name: 'Sarah',
        sex: 'Female',
        gender: 'Female',
        styleAesthetic: 'Quiet Luxury',
        favoriteBrands: 'Toteme',
        avoidedStyles: null,
        inspirationNotes: null,
        customFeeds: [],
        feedSubscriptions: [],
      });

      (prisma.inspirationImage.findMany as jest.Mock).mockResolvedValueOnce([]);
      (prisma.trendArticle.findMany as jest.Mock).mockResolvedValueOnce([]);

      const mockAiOutput = {
        posts: [
          {
            title: 'Fluid Silk coordinates',
            summary: 'Lustrous monochrome styling.',
            source: 'Vogue',
            tags: ['silk', 'luxury'],
            imageSearchQuery: 'womenswear silk shirt street style',
            matchedInspirationIndex: null,
          },
        ],
      };

      mockGenerateContent.mockResolvedValueOnce({
        text: JSON.stringify(mockAiOutput),
      });
      (safeParseGeminiJson as jest.Mock).mockReturnValueOnce(mockAiOutput);

      // Generate a valid image buffer using sharp
      const validImageBuffer = await sharp({
        create: {
          width: 200,
          height: 200,
          channels: 4,
          background: { r: 100, g: 150, b: 200, alpha: 1 },
        },
      })
        .jpeg()
        .toBuffer();

      // Mock Tavily search returning an image URL
      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ images: ['https://example.com/editorial-runway.jpg'] }),
        })
        // Mock image download response
        .mockResolvedValueOnce({
          ok: true,
          headers: {
            get: (key: string) => (key.toLowerCase() === 'content-type' ? 'image/jpeg' : null),
          },
          arrayBuffer: async () => validImageBuffer.buffer.slice(validImageBuffer.byteOffset, validImageBuffer.byteOffset + validImageBuffer.byteLength),
        });

      (prisma.whatsNewPost.create as jest.Mock).mockResolvedValueOnce({
        id: 'new-post-2',
        userId: mockUserId,
        title: mockAiOutput.posts[0].title,
        summary: mockAiOutput.posts[0].summary,
        source: mockAiOutput.posts[0].source,
        tags: mockAiOutput.posts[0].tags,
        imageUrl: '/uploads/editorial-1-123.webp',
        createdAt: mockDate,
      });

      (prisma.whatsNewPost.findMany as jest.Mock).mockResolvedValueOnce([
        {
          id: 'new-post-2',
          title: mockAiOutput.posts[0].title,
          summary: mockAiOutput.posts[0].summary,
          source: mockAiOutput.posts[0].source,
          tags: mockAiOutput.posts[0].tags,
          imageUrl: '/uploads/editorial-1-123.webp',
          createdAt: mockDate,
        },
      ]);

      const result = await generateAndSaveUserWhatsNew(mockUserId, 'desc');

      // Check that uploadImage was called to store the image locally/GCS
      expect(uploadImage).toHaveBeenCalled();
      expect(result.posts).toHaveLength(1);
    });
  });

  describe('API Route Handlers (/api/feed/whats-new)', () => {
    it('GET: handles anonymous users by returning empty posts list', async () => {
      (getSession as jest.Mock).mockResolvedValueOnce(null);

      const req = new NextRequest('http://localhost:3000/api/feed/whats-new');
      const response = await GET(req);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.posts).toEqual([]);
    });

    it('GET: passes userId and sort query param to getUserWhatsNew', async () => {
      (getSession as jest.Mock).mockResolvedValueOnce({ userId: mockUserId });
      (prisma.whatsNewPost.findMany as jest.Mock).mockResolvedValueOnce([]);

      const req = new NextRequest('http://localhost:3000/api/feed/whats-new?sort=asc');
      const response = await GET(req);

      expect(response.status).toBe(200);
      expect(prisma.whatsNewPost.findMany).toHaveBeenCalledWith({
        where: { userId: mockUserId },
        orderBy: { createdAt: 'asc' },
      });
    });

    it('POST: returns 401 if user session is not found', async () => {
      (getSession as jest.Mock).mockResolvedValueOnce(null);

      const req = new NextRequest('http://localhost:3000/api/feed/whats-new', { method: 'POST' });
      const response = await POST(req);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });

    it('POST: force-refreshes user feed and passes sort param', async () => {
      (getSession as jest.Mock).mockResolvedValueOnce({ userId: mockUserId });
      (prisma.user.findUnique as jest.Mock).mockResolvedValueOnce({
        id: mockUserId,
        sex: 'Male',
        gender: 'Male',
        customFeeds: [],
        feedSubscriptions: [],
      });
      (prisma.inspirationImage.findMany as jest.Mock).mockResolvedValueOnce([]);
      (prisma.trendArticle.findMany as jest.Mock).mockResolvedValueOnce([]);
      (getAi as jest.Mock).mockReturnValueOnce({
        models: {
          generateContent: jest.fn().mockResolvedValue({ text: JSON.stringify({ posts: [] }) }),
        },
      });
      (safeParseGeminiJson as jest.Mock).mockReturnValueOnce({ posts: [] });
      (prisma.whatsNewPost.findMany as jest.Mock).mockResolvedValueOnce([]);

      const req = new NextRequest('http://localhost:3000/api/feed/whats-new?sort=desc', { method: 'POST' });
      const response = await POST(req);

      expect(response.status).toBe(200);
      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: { id: mockUserId },
        select: expect.any(Object),
      });
    });
  });
});
