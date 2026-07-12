import { PUT, DELETE } from '@/app/api/wardrobe/bulk/route';
import { prisma } from '@/lib/db';
import { getSession } from '@/lib/session';
import { NextRequest } from 'next/server';

jest.mock('@/lib/db', () => ({
  prisma: {
    $transaction: jest.fn(),
    wardrobeItem: {
      update: jest.fn(),
      deleteMany: jest.fn(),
    },
    user: {
      findFirst: jest.fn().mockResolvedValue({ id: 'showcase-id' }),
    }
  }
}));

jest.mock('@/lib/session', () => ({
  getSession: jest.fn(),
}));

describe('Bulk Wardrobe API Handlers', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('PUT /api/wardrobe/bulk (Batch updates)', () => {
    it('should return 400 if items array is missing or invalid', async () => {
      (getSession as jest.Mock).mockResolvedValue({ userId: 'user-1' });
      const req = new NextRequest('http://localhost/api/wardrobe/bulk', {
        method: 'PUT',
        body: JSON.stringify({}),
      });

      const res = await PUT(req);
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toContain('Invalid items payload');
    });

    it('should successfully run prisma.$transaction update for valid items', async () => {
      (getSession as jest.Mock).mockResolvedValue({ userId: 'user-1' });
      (prisma.$transaction as jest.Mock).mockResolvedValue([{ id: 'item-1' }, { id: 'item-2' }]);
      
      const payload = {
        items: [
          { id: 'item-1', brand: 'Chanel', category: 'Outerwear', styleNotes: 'Notes 1', detectedTags: ['tag1'] },
          { id: 'item-2', brand: 'McQueen', category: 'Tops', styleNotes: 'Notes 2', detectedTags: ['tag2'] }
        ]
      };

      const req = new NextRequest('http://localhost/api/wardrobe/bulk', {
        method: 'PUT',
        body: JSON.stringify(payload),
      });

      const res = await PUT(req);
      expect(res.status).toBe(200);
      
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.count).toBe(2);
      expect(prisma.$transaction).toHaveBeenCalled();
    });
  });

  describe('DELETE /api/wardrobe/bulk (Batch deletion)', () => {
    it('should return 400 if ids array is missing or invalid', async () => {
      (getSession as jest.Mock).mockResolvedValue({ userId: 'user-1' });
      const req = new NextRequest('http://localhost/api/wardrobe/bulk', {
        method: 'DELETE',
        body: JSON.stringify({}),
      });

      const res = await DELETE(req);
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toContain('Invalid ids payload');
    });

    it('should successfully call deleteMany for selected IDs', async () => {
      (getSession as jest.Mock).mockResolvedValue({ userId: 'user-1' });
      (prisma.wardrobeItem.deleteMany as jest.Mock).mockResolvedValue({ count: 3 });

      const payload = { ids: ['item-1', 'item-2', 'item-3'] };
      const req = new NextRequest('http://localhost/api/wardrobe/bulk', {
        method: 'DELETE',
        body: JSON.stringify(payload),
      });

      const res = await DELETE(req);
      expect(res.status).toBe(200);
      
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.count).toBe(3);
      expect(prisma.wardrobeItem.deleteMany).toHaveBeenCalledWith({
        where: {
          id: { in: ['item-1', 'item-2', 'item-3'] },
          userId: 'user-1',
        }
      });
    });
  });
});
