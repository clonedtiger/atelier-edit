import { getUserWhatsNew, generateAndSaveUserWhatsNew, containsAnyWord, mentionsWomenswear, isBlockedImageUrl } from '@/lib/whatsNew';
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
      create: jest.fn().mockImplementation(async ({ data }) => ({
        id: 'mock-post-id',
        ...data,
        createdAt: new Date(),
      })),
      deleteMany: jest.fn(),
    },
    user: {
      findUnique: jest.fn(),
    },
    usageActivity: {
      count: jest.fn().mockResolvedValue(0),
      create: jest.fn().mockResolvedValue({}),
    },
    inspirationImage: {
      findMany: jest.fn(),
    },
    wardrobeItem: {
      findMany: jest.fn().mockResolvedValue([]),
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
  withGeminiRetry: (call: () => Promise<unknown>) => call(),
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

jest.mock('@/lib/email', () => ({
  sendWhatsNewEmailDigest: jest.fn().mockResolvedValue({ success: true }),
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
        email: 'alexander@example.com',
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
      expect(syncArticlesAndTrends).toHaveBeenCalledWith(2, false, { deadlineMs: 12000 });

      // Verify historical posts are preserved (deleteMany is NOT called)
      expect(prisma.whatsNewPost.deleteMany).not.toHaveBeenCalled();

      // Verify outbound email digest was triggered with user details
      const { sendWhatsNewEmailDigest } = await import('@/lib/email');
      expect(sendWhatsNewEmailDigest).toHaveBeenCalledWith(
        expect.objectContaining({
          email: 'alexander@example.com',
          name: 'Alexander',
          posts: expect.any(Array),
        })
      );

      // Verify prompt includes male restrictions
      expect(mockGenerateContent).toHaveBeenCalled();
      const calledPrompt = mockGenerateContent.mock.calls[0][0].contents as string;
      expect(calledPrompt).toContain('DRESSES IN: MENSWEAR');
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

    it("grounds each post in a real article and the person's own pieces", async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValueOnce({
        id: mockUserId,
        name: 'Sarah',
        email: 'sarah@example.com',
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
      (prisma.wardrobeItem.findMany as jest.Mock)
        .mockResolvedValueOnce([
          { id: 'piece-coat', category: 'Outerwear', brand: 'Toteme', color: ['Camel'], styleNotes: 'Oversized wool coat' },
        ])
        .mockResolvedValueOnce([
          { id: 'piece-coat', imageUrl: '/uploads/coat.webp', brand: 'Toteme', styleNotes: 'Oversized wool coat', category: 'Outerwear' },
        ]);
      (prisma.trendArticle.findMany as jest.Mock).mockResolvedValueOnce([
        {
          sourceName: 'British Vogue',
          sourceUrl: 'https://www.vogue.co.uk/article/camel-coats',
          title: 'Camel coats are back',
          extractedTrends: ['camel outerwear'],
          content: 'Camel coats dominated the autumn shows.',
        },
      ]);

      const aiOutput = {
        posts: [
          {
            title: 'The Camel Coat, Again',
            summary: 'Camel is everywhere. Wear your Toteme coat over grey knitwear.',
            source: 'Made-up Magazine',
            sourceArticleIndex: 0,
            wardrobeItemIds: ['piece-coat', 'invented-id'],
            suggestedPiece: 'Grey cashmere crew-neck',
            tags: ['#Camel', 'Wool'],
          },
        ],
      };
      mockGenerateContent.mockResolvedValueOnce({ text: JSON.stringify(aiOutput) });
      (safeParseGeminiJson as jest.Mock).mockReturnValueOnce(aiOutput);

      // The article page exposes its preview image
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        headers: { get: () => 'text/html; charset=utf-8' },
        text: async () => '<html><head><meta property="og:image" content="https://media.vogue.co.uk/camel.jpg"></head></html>',
      });

      (prisma.whatsNewPost.findMany as jest.Mock).mockResolvedValueOnce([
        {
          id: 'mock-post-id',
          title: aiOutput.posts[0].title,
          summary: aiOutput.posts[0].summary,
          source: 'British Vogue',
          sourceUrl: 'https://www.vogue.co.uk/article/camel-coats',
          suggestedPiece: 'Grey cashmere crew-neck',
          wardrobeItemIds: ['piece-coat'],
          tags: ['Camel', 'Wool'],
          imageUrl: 'https://media.vogue.co.uk/camel.jpg',
          createdAt: mockDate,
        },
      ]);

      const result = await generateAndSaveUserWhatsNew(mockUserId, 'desc');

      expect(prisma.whatsNewPost.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            source: 'British Vogue', // from the article, not the model's attribution
            sourceUrl: 'https://www.vogue.co.uk/article/camel-coats',
            wardrobeItemIds: ['piece-coat'], // invented ID dropped
            suggestedPiece: 'Grey cashmere crew-neck',
            tags: ['Camel', 'Wool'],
            imageUrl: 'https://media.vogue.co.uk/camel.jpg',
          }),
        })
      );
      // Article images are linked, never downloaded and re-hosted
      expect(uploadImage).not.toHaveBeenCalled();

      expect(result.posts[0].pieces).toEqual([
        { id: 'piece-coat', imageUrl: '/uploads/coat.webp', label: 'Toteme · Oversized wool coat' },
      ]);
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
      const aiOutput = {
        posts: [
          {
            title: 'Charcoal Tailoring',
            summary: 'A vibrant take on brand heritage: charcoal suiting with dress shoes.',
            source: 'British GQ',
            tags: ['Tailoring', 'Dress Shoes'],
            imageSearchQuery: 'menswear charcoal suit',
            matchedInspirationIndex: null,
          },
        ],
      };
      (getAi as jest.Mock).mockReturnValueOnce({
        models: {
          generateContent: jest.fn().mockResolvedValue({ text: JSON.stringify(aiOutput) }),
        },
      });
      (safeParseGeminiJson as jest.Mock).mockReturnValueOnce(aiOutput);
      (prisma.whatsNewPost.findMany as jest.Mock).mockResolvedValueOnce([]);

      const req = new NextRequest('http://localhost:3000/api/feed/whats-new?sort=desc', { method: 'POST' });
      const response = await POST(req);

      expect(response.status).toBe(200);
      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: { id: mockUserId },
        select: expect.any(Object),
      });
      // The menswear filter must not drop a post for words like "vibrant", "brand" or "dress shoes"
      expect(prisma.whatsNewPost.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ title: 'Charcoal Tailoring', imageUrl: '' }) })
      );
    });

    it('POST: returns a readable 502 instead of saving canned posts when the model returns nothing', async () => {
      (getSession as jest.Mock).mockResolvedValueOnce({ userId: mockUserId });
      (prisma.user.findUnique as jest.Mock).mockResolvedValueOnce({
        id: mockUserId,
        sex: 'Female',
        gender: 'Female',
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

      const req = new NextRequest('http://localhost:3000/api/feed/whats-new?sort=desc', { method: 'POST' });
      const response = await POST(req);
      const data = await response.json();

      expect(response.status).toBe(502);
      expect(data.error).toMatch(/try again/i);
      expect(prisma.whatsNewPost.create).not.toHaveBeenCalled();
    });

    it('POST: drops posts that describe womenswear for a menswear stream', async () => {
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
      const aiOutput = {
        posts: [
          { title: 'Slip Dresses Return', summary: 'Bias-cut silk dresses lead the season.', source: 'Vogue', tags: ['Slip Dress'] },
          { title: 'Heavy Wool Overcoats', summary: 'Double-faced wool with relaxed trousers.', source: 'British GQ', tags: ['Overcoat'] },
        ],
      };
      (getAi as jest.Mock).mockReturnValueOnce({
        models: { generateContent: jest.fn().mockResolvedValue({ text: JSON.stringify(aiOutput) }) },
      });
      (safeParseGeminiJson as jest.Mock).mockReturnValueOnce(aiOutput);
      (prisma.whatsNewPost.findMany as jest.Mock).mockResolvedValueOnce([]);

      const req = new NextRequest('http://localhost:3000/api/feed/whats-new', { method: 'POST' });
      const response = await POST(req);

      expect(response.status).toBe(200);
      expect(prisma.whatsNewPost.create).toHaveBeenCalledTimes(1);
      expect(prisma.whatsNewPost.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ title: 'Heavy Wool Overcoats' }) })
      );
    });

    it('POST: returns 429 once the hourly refresh limit is reached', async () => {
      (getSession as jest.Mock).mockResolvedValueOnce({ userId: mockUserId });
      (prisma.usageActivity.count as jest.Mock).mockResolvedValueOnce(6);

      const req = new NextRequest('http://localhost:3000/api/feed/whats-new', { method: 'POST' });
      const response = await POST(req);

      expect(response.status).toBe(429);
      expect(prisma.user.findUnique).not.toHaveBeenCalled();
    });
  });

  describe('gender and image filters', () => {
    it('matches whole words only', () => {
      expect(containsAnyWord('Celebrate the brand heritage', ['bra'])).toBe(false);
      expect(containsAnyWord('A vibrant cobalt overcoat', ['bra'])).toBe(false);
      expect(containsAnyWord('For the well-dressed man', ['dress'])).toBe(false);
      expect(containsAnyWord('womenswear collections', ['men'])).toBe(false);
      expect(containsAnyWord('A silk slip dress', ['dress'])).toBe(true);
    });

    it('treats menswear phrases such as "dress shirt" as safe', () => {
      expect(mentionsWomenswear('Crisp dress shirt with dress shoes')).toBe(false);
      expect(mentionsWomenswear('Pleated midi skirt and ballet flats')).toBe(true);
    });

    it('blocks watermarked stock-photo hosts', () => {
      expect(isBlockedImageUrl('https://media.gettyimages.com/id/123/photo.jpg')).toBe(true);
      expect(isBlockedImageUrl('https://www.shutterstock.com/image.jpg')).toBe(true);
      expect(isBlockedImageUrl('https://assets.vogue.com/photos/look.jpg')).toBe(false);
      expect(isBlockedImageUrl('not a url')).toBe(true);
    });
  });
});

describe('fetchArticleImage()', () => {
  beforeEach(() => {
    global.fetch = jest.fn() as jest.Mock;
  });

  it('uses the video thumbnail for YouTube links without fetching the page', async () => {
    const { fetchArticleImage } = await import('@/lib/whatsNew');
    await expect(fetchArticleImage('https://www.youtube.com/shorts/muO3UkJnbhk')).resolves.toBe('https://i.ytimg.com/vi/muO3UkJnbhk/hqdefault.jpg');
    await expect(fetchArticleImage('https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=1')).resolves.toBe('https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg');
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('reads og:image in either attribute order and ignores stock-agency images', async () => {
    const { fetchArticleImage } = await import('@/lib/whatsNew');
    const page = (html: string) => ({ ok: true, headers: { get: () => 'text/html' }, text: async () => html });

    (global.fetch as jest.Mock).mockResolvedValueOnce(page('<meta content="/img/look.jpg" property="og:image">'));
    await expect(fetchArticleImage('https://www.anothermag.com/story')).resolves.toBe('https://www.anothermag.com/img/look.jpg');

    (global.fetch as jest.Mock).mockResolvedValueOnce(page('<meta property="og:image" content="https://media.gettyimages.com/x.jpg">'));
    await expect(fetchArticleImage('https://example.com/story')).resolves.toBeNull();
  });
});
