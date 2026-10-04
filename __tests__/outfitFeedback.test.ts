import { NextRequest } from 'next/server';
import { prisma, pool } from '@/lib/db';
import { POST } from '@/app/api/recommendations/[id]/feedback/route';
import { getSession } from '@/lib/session';
import { describeStyleHistory } from '@/lib/gemini';
import { getWardrobeAnalytics } from '@/lib/wardrobeAnalytics';

jest.mock('@/lib/session', () => ({
  getSession: jest.fn(),
}));

describe('Outfit feedback loop', () => {
  let userId: string;
  let otherUserId: string;
  let itemId: string;
  let lookId: string;

  const call = (id: string, action: string) =>
    POST(
      new NextRequest(`http://localhost/api/recommendations/${id}/feedback`, {
        method: 'POST',
        body: JSON.stringify({ action }),
      }),
      { params: Promise.resolve({ id }) }
    );

  beforeAll(async () => {
    const stamp = Date.now();
    const user = await prisma.user.create({ data: { email: `feedback_${stamp}@test.com`, name: 'Feedback Tester' } });
    const other = await prisma.user.create({ data: { email: `feedback_other_${stamp}@test.com` } });
    userId = user.id;
    otherUserId = other.id;
    const item = await prisma.wardrobeItem.create({
      data: { userId, imageUrl: '/uploads/coat.webp', category: 'Outerwear', color: ['Camel'], detectedTags: [] },
    });
    itemId = item.id;
    const look = await prisma.recommendation.create({
      data: {
        userId,
        title: 'Camel Coat Monday',
        narrative: 'Camel coat over grey knit.',
        outfitItems: { create: [{ wardrobeItemId: itemId, stylingRationale: 'Anchor piece.' }, { purchaseName: 'Loafers', stylingRationale: 'Finish.' }] },
      },
    });
    lookId = look.id;
  });

  beforeEach(() => {
    (getSession as jest.Mock).mockResolvedValue({ userId });
  });

  afterAll(async () => {
    await prisma.user.deleteMany({ where: { id: { in: [userId, otherUserId] } } });
    await pool.end();
  });

  it('marks a look as worn and counts each owned piece once per day', async () => {
    expect((await call(lookId, 'wore')).status).toBe(200);
    expect((await call(lookId, 'wore')).status).toBe(200);

    const item = await prisma.wardrobeItem.findUnique({ where: { id: itemId } });
    expect(item?.wearCount).toBe(1);
    expect(item?.lastWornAt).toBeInstanceOf(Date);

    const look = await prisma.recommendation.findUnique({ where: { id: lookId } });
    expect(look?.wornAt).toBeInstanceOf(Date);
  });

  it('records love, dismiss and clear', async () => {
    await call(lookId, 'love');
    expect((await prisma.recommendation.findUnique({ where: { id: lookId } }))?.feedback).toBe('loved');
    await call(lookId, 'dismiss');
    expect((await prisma.recommendation.findUnique({ where: { id: lookId } }))?.feedback).toBe('dismissed');
    await call(lookId, 'clear');
    expect((await prisma.recommendation.findUnique({ where: { id: lookId } }))?.feedback).toBeNull();
  });

  it("rejects unknown actions and other people's looks", async () => {
    expect((await call(lookId, 'explode')).status).toBe(400);
    (getSession as jest.Mock).mockResolvedValue({ userId: otherUserId });
    expect((await call(lookId, 'love')).status).toBe(404);
  });

  it('lists pieces worn recently last in "not worn lately"', async () => {
    const fresh = await prisma.wardrobeItem.create({
      data: { userId, imageUrl: '/uploads/knit.webp', category: 'Tops', color: ['Grey'], detectedTags: [] },
    });
    const analytics = await getWardrobeAnalytics(userId);
    const ids = analytics.unwornGems.map((g) => g.id);
    expect(ids).toContain(fresh.id);
    expect(ids).not.toContain(itemId); // worn today
  });
});

describe('describeStyleHistory()', () => {
  it('summarises loved, dismissed and recently worn pieces for the prompt', () => {
    const text = describeStyleHistory({
      lovedLooks: ['Camel Coat Monday: camel over grey'],
      dismissedLooks: ['Neon Night: too loud'],
      recentlyWornIds: ['item-1'],
    });
    expect(text).toContain('loved');
    expect(text).toContain('Camel Coat Monday');
    expect(text).toContain('rejected');
    expect(text).toContain('Neon Night');
    expect(text).toContain('item-1');
  });

  it('adds nothing when there is no history', () => {
    expect(describeStyleHistory({ lovedLooks: [], dismissedLooks: [], recentlyWornIds: [] })).toBe('');
    expect(describeStyleHistory(undefined)).toBe('');
  });
});
