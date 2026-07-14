import { prisma, pool } from '@/lib/db';
import { GET as getStats } from '@/app/api/admin/stats/route';
import { GET as getUsers } from '@/app/api/admin/users/route';
import { POST as postAction } from '@/app/api/admin/users/action/route';
import { getSession } from '@/lib/session';
import bcrypt from 'bcryptjs';

// Mock session helper
jest.mock('@/lib/session', () => ({
  getSession: jest.fn(),
  clearSessionCookie: jest.fn(),
}));

describe('Admin Portal Integration Tests', () => {
  let adminUser: { id: string; email: string };
  let normalUser: { id: string; email: string };

  beforeAll(async () => {
    // Hash password for dummy users
    const hash = await bcrypt.hash('password123', 10);

    // Create admin user
    adminUser = await prisma.user.create({
      data: {
        email: `admin_${Date.now()}@test.com`,
        name: 'Super Admin',
        passwordHash: hash,
        role: 'admin',
      },
    });

    // Create normal user
    normalUser = await prisma.user.create({
      data: {
        email: `user_${Date.now()}@test.com`,
        name: 'Normal User',
        passwordHash: hash,
        role: 'user',
      },
    });
  });

  afterAll(async () => {
    // Clean up database tables
    await prisma.userSession.deleteMany({
      where: { userId: { in: [adminUser.id, normalUser.id] } },
    });
    await prisma.usageActivity.deleteMany({
      where: { userId: { in: [adminUser.id, normalUser.id] } },
    });
    await prisma.user.deleteMany({
      where: { id: { in: [adminUser.id, normalUser.id] } },
    });

    await prisma.$disconnect();
    await pool.end();
  });

  describe('Authorization Constraints', () => {
    it('should block unauthenticated sessions from admin stats', async () => {
      (getSession as jest.Mock).mockResolvedValue(null);

      const response = await getStats();
      expect(response.status).toBe(403);
      const data = await response.json();
      expect(data.error).toBe('Forbidden');
    });

    it('should block normal users from admin stats', async () => {
      (getSession as jest.Mock).mockResolvedValue({ userId: normalUser.id });

      const response = await getStats();
      expect(response.status).toBe(403);
    });

    it('should allow admin users to fetch dashboard stats', async () => {
      (getSession as jest.Mock).mockResolvedValue({ userId: adminUser.id });

      const response = await getStats();
      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data).toHaveProperty('totalUsers');
      expect(data).toHaveProperty('activeUsersCount');
      expect(data).toHaveProperty('activityLogs');
    });

    it('should block normal users from listing users', async () => {
      (getSession as jest.Mock).mockResolvedValue({ userId: normalUser.id });

      const response = await getUsers();
      expect(response.status).toBe(403);
    });

    it('should allow admin users to fetch the full user list', async () => {
      (getSession as jest.Mock).mockResolvedValue({ userId: adminUser.id });

      const response = await getUsers();
      expect(response.status).toBe(200);
      const list = await response.json();
      expect(Array.isArray(list)).toBe(true);
      expect(list.some((u: { id: string }) => u.id === normalUser.id)).toBe(true);
    });
  });

  describe('Admin Actions (Suspend, Reset Password, Delete)', () => {
    it('should block normal users from executing actions', async () => {
      (getSession as jest.Mock).mockResolvedValue({ userId: normalUser.id });

      const req = new Request('http://localhost/api/admin/users/action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: normalUser.id,
          action: 'suspend',
        }),
      });

      const response = await postAction(req);
      expect(response.status).toBe(403);
    });

    it('should allow admin to suspend and unsuspend a user', async () => {
      (getSession as jest.Mock).mockResolvedValue({ userId: adminUser.id });

      // Suspend
      const reqSuspend = new Request('http://localhost/api/admin/users/action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: normalUser.id,
          action: 'suspend',
        }),
      });

      const resSuspend = await postAction(reqSuspend);
      expect(resSuspend.status).toBe(200);
      
      const dbUserSuspended = await prisma.user.findUnique({ where: { id: normalUser.id } });
      expect(dbUserSuspended?.suspended).toBe(true);

      // Unsuspend
      const reqUnsuspend = new Request('http://localhost/api/admin/users/action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: normalUser.id,
          action: 'unsuspend',
        }),
      });

      const resUnsuspend = await postAction(reqUnsuspend);
      expect(resUnsuspend.status).toBe(200);
      
      const dbUserActive = await prisma.user.findUnique({ where: { id: normalUser.id } });
      expect(dbUserActive?.suspended).toBe(false);
    });

    it('should prevent admins from suspending themselves', async () => {
      (getSession as jest.Mock).mockResolvedValue({ userId: adminUser.id });

      const req = new Request('http://localhost/api/admin/users/action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: adminUser.id,
          action: 'suspend',
        }),
      });

      const response = await postAction(req);
      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toContain('Self-administration safeguard');
    });

    it('should allow admin to reset a user password', async () => {
      (getSession as jest.Mock).mockResolvedValue({ userId: adminUser.id });

      const req = new Request('http://localhost/api/admin/users/action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: normalUser.id,
          action: 'reset-password',
          newPassword: 'resetedPassword1234',
        }),
      });

      const response = await postAction(req);
      expect(response.status).toBe(200);

      const dbUser = await prisma.user.findUnique({ where: { id: normalUser.id } });
      expect(dbUser?.passwordHash).not.toBeNull();
      
      const checkPass = await bcrypt.compare('resetedPassword1234', dbUser!.passwordHash!);
      expect(checkPass).toBe(true);
    });
  });
});
