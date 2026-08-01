import { cleanInstagramHandle } from '@/lib/instagram';
import { prisma, pool } from '@/lib/db';

describe('Instagram Account Ingestion Unit & Integration Tests', () => {
  let createdFeedId: string | undefined;

  afterAll(async () => {
    if (createdFeedId) {
      await prisma.feedSource.delete({ where: { id: createdFeedId } }).catch(() => {});
    }
    await pool.end();
  });

  describe('Handle Sanitizer (cleanInstagramHandle)', () => {
    it('should strip @ symbol from handles', () => {
      expect(cleanInstagramHandle('@chanelofficial')).toBe('chanelofficial');
    });

    it('should extract handle from full Instagram URLs', () => {
      expect(cleanInstagramHandle('https://instagram.com/alexandermcqueen/')).toBe('alexandermcqueen');
      expect(cleanInstagramHandle('https://www.instagram.com/voguegermany?igsh=123')).toBe('voguegermany');
    });

    it('should handle plain handle strings cleanly', () => {
      expect(cleanInstagramHandle('  saintlaurent  ')).toBe('saintlaurent');
    });

    it('should return empty string for null/empty input', () => {
      expect(cleanInstagramHandle('')).toBe('');
    });
  });

  describe('Instagram FeedSource Database Creation', () => {
    it('should create an instagram feed source with normalized URL and handle name', async () => {
      const handle = cleanInstagramHandle('@balenciaga');
      const feed = await prisma.feedSource.create({
        data: {
          url: `https://instagram.com/${handle}`,
          name: `@${handle} (Instagram)`,
          type: 'instagram',
          isMuted: false,
        },
      });

      createdFeedId = feed.id;

      expect(feed.type).toBe('instagram');
      expect(feed.name).toBe('@balenciaga (Instagram)');
      expect(feed.url).toBe('https://instagram.com/balenciaga');
    });
  });
});
