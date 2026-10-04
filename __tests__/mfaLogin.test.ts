import bcrypt from 'bcryptjs';
import { NextRequest } from 'next/server';
import { prisma, pool } from '@/lib/db';
import { POST as login } from '@/app/api/auth/login/route';
import { POST as verifyMfa } from '@/app/api/auth/mfa/route';
import { decryptSession, issueMfaChallenge, readMfaChallenge } from '@/lib/session';
import { generateBase32MfaSecret, generateTOTP } from '@/lib/totp';

jest.mock('next/headers', () => ({
  cookies: async () => ({ set: jest.fn(), get: jest.fn(), delete: jest.fn() }),
}));

const post = (body: object) =>
  new NextRequest('http://localhost/api/auth', { method: 'POST', body: JSON.stringify(body) });

describe('Two-factor sign-in', () => {
  const password = 'correct-horse-battery';
  const secret = generateBase32MfaSecret();
  let email: string;
  let userId: string;

  beforeAll(async () => {
    email = `mfa_${Date.now()}@test.com`;
    const user = await prisma.user.create({
      data: { email, passwordHash: await bcrypt.hash(password, 4), mfaEnabled: true, mfaSecret: secret },
    });
    userId = user.id;
  });

  afterAll(async () => {
    await prisma.user.deleteMany({ where: { id: userId } });
    await pool.end();
  });

  it('returns a challenge token, not the user ID, after the password step', async () => {
    const data = await (await login(post({ email, password }))).json();
    expect(data.mfaRequired).toBe(true);
    expect(data.userId).toBeUndefined();
    expect(readMfaChallenge(data.mfaToken)).toBe(userId);
  });

  it('rejects the 2FA step with only a user ID (the password step cannot be skipped)', async () => {
    const res = await verifyMfa(post({ userId, code: generateTOTP(secret, Math.floor(Date.now() / 30000)) }));
    expect(res.status).toBe(401);
  });

  it('never accepts a challenge token as a session cookie', () => {
    expect(decryptSession(issueMfaChallenge(userId))).toBeNull();
  });

  it('expires challenge tokens after 10 minutes', () => {
    const token = issueMfaChallenge(userId);
    const realNow = Date.now;
    Date.now = () => realNow() + 11 * 60 * 1000;
    try {
      expect(readMfaChallenge(token)).toBeNull();
    } finally {
      Date.now = realNow;
    }
  });

  it('signs in with the right code, and locks after five wrong ones', async () => {
    const token = issueMfaChallenge(userId);
    const good = generateTOTP(secret, Math.floor(Date.now() / 30000));
    expect((await verifyMfa(post({ mfaToken: token, code: good }))).status).toBe(200);

    const wrong = good === '000000' ? '111111' : '000000';
    for (let i = 0; i < 5; i++) {
      expect((await verifyMfa(post({ mfaToken: token, code: wrong }))).status).toBe(401);
    }
    expect((await verifyMfa(post({ mfaToken: token, code: good }))).status).toBe(429);
  });
});
