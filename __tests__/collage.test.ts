import { prisma } from '../src/lib/db';

describe('Editorial Flat-Lay Outfit Canvas API', () => {
  const testUserId = `test-user-collage-${Date.now()}`;
  let createdCollageId: string;

  beforeAll(async () => {
    await prisma.user.create({
      data: {
        id: testUserId,
        email: `collage_${Date.now()}@test.com`,
        styleAesthetic: 'Contemporary Streetwear',
      },
    });
  });

  afterAll(async () => {
    await prisma.outfitCollage.deleteMany({ where: { userId: testUserId } });
    await prisma.user.delete({ where: { id: testUserId } });
  });

  it('creates and persists an outfit flat-lay collage layout', async () => {
    const canvasData = [
      { id: 'elem-1', imageUrl: '/coat.webp', x: 50, y: 80, scale: 1.2, rotation: -5, zIndex: 1, label: 'Toteme Coat' },
      { id: 'elem-2', imageUrl: '/boots.webp', x: 220, y: 300, scale: 1.0, rotation: 10, zIndex: 2, label: 'AllSaints Boots' },
    ];

    const collage = await prisma.outfitCollage.create({
      data: {
        userId: testUserId,
        title: 'Autumn Mayfair Mood',
        canvasData: canvasData,
        thumbnailUrl: '/thumb-sample.webp',
      },
    });

    expect(collage.id).toBeDefined();
    expect(collage.title).toBe('Autumn Mayfair Mood');
    expect(Array.isArray(collage.canvasData)).toBe(true);
    createdCollageId = collage.id;

    const retrieved = await prisma.outfitCollage.findUnique({
      where: { id: createdCollageId },
    });
    expect(retrieved).not.toBeNull();
    expect(retrieved?.title).toBe('Autumn Mayfair Mood');
  });

  it('deletes an outfit collage cleanly', async () => {
    await prisma.outfitCollage.delete({
      where: { id: createdCollageId },
    });

    const check = await prisma.outfitCollage.findUnique({
      where: { id: createdCollageId },
    });
    expect(check).toBeNull();
  });
});
