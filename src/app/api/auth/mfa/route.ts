import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { verifyMfaToken } from '@/lib/totp';
import { setSessionCookie, readMfaChallenge } from '@/lib/session';
import { logUserActivity, startUserSession } from '@/lib/analytics';

const MAX_MFA_FAILURES = 5;
const MFA_LOCK_WINDOW_MS = 15 * 60 * 1000;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { mfaToken, code } = body;

    // The challenge token proves the password step passed; a bare user ID is not enough
    const userId = readMfaChallenge(mfaToken);
    if (!userId) {
      return NextResponse.json({ error: 'Your sign-in has expired. Please enter your password again.' }, { status: 401 });
    }
    if (!code) {
      return NextResponse.json({ error: 'Verification code is required' }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user || !user.mfaSecret) {
      return NextResponse.json({ error: 'Your sign-in has expired. Please enter your password again.' }, { status: 401 });
    }

    // Block suspended accounts
    if (user.suspended) {
      return NextResponse.json({ error: 'Your account has been suspended. Please contact support.' }, { status: 403 });
    }

    // Lock after repeated wrong codes so the 6-digit space can't be brute-forced
    const recentFailures = await prisma.usageActivity.count({
      where: { userId: user.id, action: 'MFA_FAILED', timestamp: { gte: new Date(Date.now() - MFA_LOCK_WINDOW_MS) } },
    });
    if (recentFailures >= MAX_MFA_FAILURES) {
      return NextResponse.json({ error: 'Too many incorrect codes. Please wait 15 minutes and try again.' }, { status: 429 });
    }

    // Verify 6-digit code
    const isTokenValid = verifyMfaToken(user.mfaSecret, String(code).trim());
    if (!isTokenValid) {
      await logUserActivity(user.id, 'MFA_FAILED');
      return NextResponse.json({ error: 'Invalid verification code. Please try again.' }, { status: 401 });
    }

    // Authenticate user session
    await setSessionCookie({ userId: user.id });

    // Track analytics session & login activity
    await logUserActivity(user.id, 'LOGIN');
    await startUserSession(user.id);

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        mfaEnabled: true,
      },
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Internal server error during verification';
    console.error('MFA Verify error:', error);
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}
