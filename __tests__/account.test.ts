import { prisma, pool } from '@/lib/db';
import { POST as postForgotPassword } from '@/app/api/auth/forgot-password/route';
import { POST as postResetPassword } from '@/app/api/auth/reset-password/route';
import { GET as getDuplicates } from '@/app/api/wardrobe/duplicates/route';
import { POST as postMergeDuplicates } from '@/app/api/wardrobe/duplicates/merge/route';
import { getSession } from '@/lib/session';
import bcrypt from 'bcryptjs';

jest.mock('@/lib/session', () => ({
  getSession: jest.fn(),
}));

describe('User Account Management & Recovery Tests', () => {
  let testUser: { id: string; email: string; phone: string };

  beforeAll(async () => {
    const hash = await bcrypt.hash('originalPassword123', 10);
    testUser = await prisma.user.create({
      data: {
        email: `test_recovery_${Date.now()}@test.com`,
        phone: `+1555${Math.floor(100000 + Math.random() * 900000)}`,
        name: 'Clara Oswald',
        passwordHash: hash,
      },
    });
  });

  afterAll(async () => {
    // Delete user session logs or audit entries first, then the user
    await prisma.userSession.deleteMany({ where: { userId: testUser.id } });
    await prisma.usageActivity.deleteMany({ where: { userId: testUser.id } });
    await prisma.wardrobeItem.deleteMany({ where: { userId: testUser.id } });
    await prisma.user.delete({ where: { id: testUser.id } });

    await prisma.$disconnect();
    await pool.end();
  });

  describe('Password Recovery System', () => {
    it('should generate a 6-digit recovery code for matching email', async () => {
      const req = new Request('http://localhost/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identity: testUser.email }),
      });

      const response = await postForgotPassword(req);
      expect(response.status).toBe(200);

      const dbUser = await prisma.user.findUnique({ where: { id: testUser.id } });
      expect(dbUser?.passwordResetCode).not.toBeNull();
      expect(dbUser?.passwordResetCode).toHaveLength(6);
      expect(dbUser?.passwordResetExpires).not.toBeNull();
    });

    it('should generate a 6-digit recovery code for matching phone number', async () => {
      const req = new Request('http://localhost/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identity: testUser.phone }),
      });

      const response = await postForgotPassword(req);
      expect(response.status).toBe(200);
    });

    it('should reset password with correct code and allow sign in with new credentials', async () => {
      // First, get the code
      const setupReq = new Request('http://localhost/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identity: testUser.email }),
      });
      await postForgotPassword(setupReq);

      const dbUserBefore = await prisma.user.findUnique({ where: { id: testUser.id } });
      const activeCode = dbUserBefore!.passwordResetCode!;

      // Perform reset
      const resetReq = new Request('http://localhost/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          identity: testUser.email,
          code: activeCode,
          newPassword: 'fullyNewPassword123',
        }),
      });

      const response = await postResetPassword(resetReq);
      expect(response.status).toBe(200);

      const dbUserAfter = await prisma.user.findUnique({ where: { id: testUser.id } });
      expect(dbUserAfter?.passwordResetCode).toBeNull();
      expect(dbUserAfter?.passwordResetExpires).toBeNull();

      const verifyPass = await bcrypt.compare('fullyNewPassword123', dbUserAfter!.passwordHash!);
      expect(verifyPass).toBe(true);
    });
  });

  describe('Duplicate Clothing Image Detection & Merging', () => {
    let duplicateItemA: { id: string };
    let duplicateItemB: { id: string };

    beforeAll(async () => {
      // Create duplicate wardrobe records (using identical metadata URLs)
      duplicateItemA = await prisma.wardrobeItem.create({
        data: {
          userId: testUser.id,
          imageUrl: 'https://test-images.com/tweed-coat.jpg',
          category: 'Outerwear',
          brand: 'Chanel',
          styleNotes: 'Vintage bouclé structure jacket',
          color: ['#000000'],
          detectedTags: ['tweed', 'vintage'],
        },
      });

      duplicateItemB = await prisma.wardrobeItem.create({
        data: {
          userId: testUser.id,
          imageUrl: 'https://test-images.com/tweed-coat.jpg',
          category: 'Outerwear',
          brand: 'Chanel',
          styleNotes: 'Vintage bouclé structure jacket',
          color: ['#000000'],
          detectedTags: ['tweed', 'vintage'],
        },
      });
    });

    it('should identify identical metadata uploads as duplicate groups', async () => {
      (getSession as jest.Mock).mockResolvedValue({ userId: testUser.id });

      const response = await getDuplicates();
      expect(response.status).toBe(200);
      const data = await response.json();
      
      expect(data.success).toBe(true);
      expect(data.count).toBe(1);
      
      const firstGroup = data.groups[0];
      expect(firstGroup.items).toHaveLength(2);
      expect(firstGroup.items.some((item: { id: string }) => item.id === duplicateItemA.id)).toBe(true);
      expect(firstGroup.items.some((item: { id: string }) => item.id === duplicateItemB.id)).toBe(true);
    });

    it('should merge duplicate groups and preserve the kept item', async () => {
      (getSession as jest.Mock).mockResolvedValue({ userId: testUser.id });

      const req = new Request('http://localhost/api/wardrobe/duplicates/merge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          keepId: duplicateItemA.id,
          deleteIds: [duplicateItemB.id],
        }),
      });

      const response = await postMergeDuplicates(req);
      expect(response.status).toBe(200);

      // Verify DB record existence
      const keptCheck = await prisma.wardrobeItem.findUnique({ where: { id: duplicateItemA.id } });
      const deletedCheck = await prisma.wardrobeItem.findUnique({ where: { id: duplicateItemB.id } });

      expect(keptCheck).not.toBeNull();
      expect(deletedCheck).toBeNull();
    });
  });
});
