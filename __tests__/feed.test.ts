import fs from 'fs';
import { parseOPML } from '@/lib/feed';

// Mock the fs module
jest.mock('fs');
jest.mock('@/lib/db', () => ({
  prisma: {},
}));

describe('feed.ts - parseOPML()', () => {
  const mockOPMLContent = `
    <?xml version="1.0" encoding="UTF-8"?>
    <opml version="2.0">
      <head><title>Test Feed Curation</title></head>
      <body>
        <outline text="Fashion Feed">
          <outline type="rss" text="Magasin" title="Magasin" xmlUrl="https://magasin.substack.com/feed" htmlUrl="https://magasin.substack.com"/>
          <outline type="youtube" text="Loic" title="Loic" xmlUrl="https://www.youtube.com/feed" htmlUrl="https://www.youtube.com"/>
        </outline>
      </body>
    </opml>
  `;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should successfully parse feed elements from OPML XML content', () => {
    // Mock fs.existsSync and fs.readFileSync
    (fs.existsSync as jest.Mock).mockReturnValue(true);
    (fs.readFileSync as jest.Mock).mockReturnValue(mockOPMLContent);

    const result = parseOPML();

    expect(fs.existsSync).toHaveBeenCalled();
    expect(fs.readFileSync).toHaveBeenCalled();
    expect(result).toHaveLength(2);

    expect(result[0]).toEqual({
      title: 'Magasin',
      xmlUrl: 'https://magasin.substack.com/feed',
      htmlUrl: 'https://magasin.substack.com',
      type: 'rss',
    });

    expect(result[1]).toEqual({
      title: 'Loic',
      xmlUrl: 'https://www.youtube.com/feed',
      htmlUrl: 'https://www.youtube.com',
      type: 'youtube',
    });
  });

  it('should return an empty array if OPML file does not exist', () => {
    (fs.existsSync as jest.Mock).mockReturnValue(false);

    const result = parseOPML();

    expect(fs.existsSync).toHaveBeenCalled();
    expect(result).toEqual([]);
  });
});
