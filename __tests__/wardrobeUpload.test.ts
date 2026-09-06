import { POST } from '@/app/api/wardrobe/upload/route';
import { prisma } from '@/lib/db';
import { getSession } from '@/lib/session';
import { uploadImage } from '@/lib/storage';
import { detectAndAnalyzeWardrobeItems, analyzeWardrobeImage } from '@/lib/gemini';
import sharp from 'sharp';
import { NextRequest } from 'next/server';

jest.mock('@/lib/db', () => ({
  prisma: {
    user: {
      findUnique: jest.fn(),
    },
    wardrobeItem: {
      create: jest.fn(),
    },
  },
}));

jest.mock('@/lib/session', () => ({
  getSession: jest.fn(),
}));

jest.mock('@/lib/storage', () => ({
  uploadImage: jest.fn(),
}));

jest.mock('@/lib/analytics', () => ({
  logUserActivity: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('@/lib/gemini', () => ({
  analyzeWardrobeImage: jest.fn(),
  detectAndAnalyzeWardrobeItems: jest.fn(),
}));

describe('POST /api/wardrobe/upload - Multi-Item Flat Lay Ingestion API', () => {
  let sampleImageBuffer: Buffer;

  beforeAll(async () => {
    // Generate valid sample image buffer for testing
    sampleImageBuffer = await sharp({
      create: {
        width: 300,
        height: 300,
        channels: 4,
        background: { r: 50, g: 100, b: 150, alpha: 1 },
      },
    })
      .webp()
      .toBuffer();
  });

  beforeEach(() => {
    jest.clearAllMocks();
    (getSession as jest.Mock).mockResolvedValue({ userId: 'test-user-id' });
    (prisma.user.findUnique as jest.Mock).mockResolvedValue({ id: 'test-user-id', suspended: false });
    (uploadImage as jest.Mock).mockImplementation((buf: Buffer, filename: string) => `/uploads/${filename}`);
  });

  it('should return 400 if no image file is provided in the request', async () => {
    const formData = new FormData();
    const req = new NextRequest('http://localhost/api/wardrobe/upload', {
      method: 'POST',
      body: formData,
    });

    const res = await POST(req);
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toContain('No image file uploaded');
  });

  it('should return 401 if user session is not present', async () => {
    (getSession as jest.Mock).mockResolvedValue(null);

    const formData = new FormData();
    const file = new File([sampleImageBuffer], 'garment.webp', { type: 'image/webp' });
    formData.append('image', file);

    const req = new NextRequest('http://localhost/api/wardrobe/upload', {
      method: 'POST',
      body: formData,
    });

    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  it('should return 403 if user account is suspended', async () => {
    (prisma.user.findUnique as jest.Mock).mockResolvedValue({ id: 'test-user-id', suspended: true });

    const formData = new FormData();
    const file = new File([sampleImageBuffer], 'garment.webp', { type: 'image/webp' });
    formData.append('image', file);

    const req = new NextRequest('http://localhost/api/wardrobe/upload', {
      method: 'POST',
      body: formData,
    });

    const res = await POST(req);
    expect(res.status).toBe(403);
  });

  it('should successfully detect, crop, and ingest MULTIPLE garments from a single photo', async () => {
    // Mock multi-item detection output (e.g. flat lay with jacket and trousers)
    const mockDetectedItems = [
      {
        category: 'Outerwear',
        color: ['Black'],
        brand: 'Alexander McQueen',
        styleNotes: 'Tailored asymmetric blazer',
        detectedTags: ['blazer', 'tailoring', 'asymmetric'],
        box2d: [50, 50, 450, 950] as [number, number, number, number],
      },
      {
        category: 'Bottoms',
        color: ['Charcoal'],
        brand: 'The Row',
        styleNotes: 'Wide leg pleated wool trousers',
        detectedTags: ['wool', 'pleated', 'wide-leg'],
        box2d: [500, 100, 950, 900] as [number, number, number, number],
      },
    ];

    (detectAndAnalyzeWardrobeItems as jest.Mock).mockResolvedValue(mockDetectedItems);

    let createdCount = 0;
    (prisma.wardrobeItem.create as jest.Mock).mockImplementation(({ data }) => {
      createdCount++;
      return {
        id: `created-item-${createdCount}`,
        ...data,
      };
    });

    const formData = new FormData();
    const file = new File([sampleImageBuffer], 'outfit-flatlay.webp', { type: 'image/webp' });
    formData.append('image', file);
    formData.append('styleNotes', 'Curated autumn look');

    const req = new NextRequest('http://localhost/api/wardrobe/upload', {
      method: 'POST',
      body: formData,
    });

    const res = await POST(req);
    expect(res.status).toBe(201);

    const responseData = await res.json();

    // Verify multiple items were detected and processed
    expect(detectAndAnalyzeWardrobeItems).toHaveBeenCalled();
    expect(uploadImage).toHaveBeenCalledTimes(2);
    expect(prisma.wardrobeItem.create).toHaveBeenCalledTimes(2);

    expect(responseData.count).toBe(2);
    expect(responseData.items).toHaveLength(2);
    expect(responseData.items[0].category).toBe('Outerwear');
    expect(responseData.items[0].brand).toBe('Alexander McQueen');
    expect(responseData.items[1].category).toBe('Bottoms');
    expect(responseData.items[1].brand).toBe('The Row');
  });

  it('should correctly process a single item photo when only 1 item is detected', async () => {
    const mockSingleItem = [
      {
        category: 'Shoes',
        color: ['Burgundy'],
        brand: 'Maison Margiela',
        styleNotes: 'Tabi ankle boots',
        detectedTags: ['tabi', 'leather', 'boots'],
        box2d: [100, 100, 900, 900] as [number, number, number, number],
      },
    ];

    (detectAndAnalyzeWardrobeItems as jest.Mock).mockResolvedValue(mockSingleItem);

    (prisma.wardrobeItem.create as jest.Mock).mockImplementation(({ data }) => ({
      id: 'single-tabi-id',
      ...data,
    }));

    const formData = new FormData();
    const file = new File([sampleImageBuffer], 'tabi-boots.webp', { type: 'image/webp' });
    formData.append('image', file);

    const req = new NextRequest('http://localhost/api/wardrobe/upload', {
      method: 'POST',
      body: formData,
    });

    const res = await POST(req);
    expect(res.status).toBe(201);

    const responseData = await res.json();
    expect(responseData.category).toBe('Shoes');
    expect(responseData.brand).toBe('Maison Margiela');
    expect(responseData.count).toBe(1);
    expect(responseData.items).toHaveLength(1);
  });

  it('should fall back gracefully to analyzeWardrobeImage if multi-item detection returns empty', async () => {
    (detectAndAnalyzeWardrobeItems as jest.Mock).mockResolvedValue([]);
    (analyzeWardrobeImage as jest.Mock).mockResolvedValue({
      category: 'Tops',
      color: ['White'],
      brand: 'Khaite',
      styleNotes: 'Ribbed cashmere knit',
      detectedTags: ['cashmere', 'knitwear'],
    });

    (prisma.wardrobeItem.create as jest.Mock).mockImplementation(({ data }) => ({
      id: 'fallback-item-id',
      ...data,
    }));

    const formData = new FormData();
    const file = new File([sampleImageBuffer], 'sweater.webp', { type: 'image/webp' });
    formData.append('image', file);

    const req = new NextRequest('http://localhost/api/wardrobe/upload', {
      method: 'POST',
      body: formData,
    });

    const res = await POST(req);
    expect(res.status).toBe(201);

    const responseData = await res.json();
    expect(analyzeWardrobeImage).toHaveBeenCalled();
    expect(responseData.category).toBe('Tops');
    expect(responseData.count).toBe(1);
  });
});
