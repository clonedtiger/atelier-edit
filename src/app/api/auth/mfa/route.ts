import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { verifyMfaToken } from '@/lib/totp';
import { setSessionCookie } from '@/lib/session';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { userId, code } = body;

    if (!userId || !code) {
      return NextResponse.json({ error: 'User ID and verification code are required' }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user || !user.mfaSecret) {
      return NextResponse.json({ error: 'User or 2FA credentials not found' }, { status: 404 });
    }

    // Verify 6-digit code
    const isTokenValid = verifyMfaToken(user.mfaSecret, code);
    if (!isTokenValid) {
      return NextResponse.json({ error: 'Invalid verification code. Please try again.' }, { status: 401 });
    }

    // Authenticate user session
    await setSessionCookie({ userId: user.id });

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
