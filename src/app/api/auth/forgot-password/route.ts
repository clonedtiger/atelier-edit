import crypto from 'crypto';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { sendPasswordResetEmail } from '@/lib/email';

// Same reply whether or not an account exists, so the form can't be used to discover accounts
const GENERIC_REPLY = {
  success: true,
  message: "If an account exists for that email, we've sent it a reset code.",
};

/**
 * Starts password recovery: issues a 6-digit code (valid 15 minutes) and emails it.
 */
export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const email = typeof body?.identity === 'string' ? body.identity.trim() : '';

    if (!email) {
      return NextResponse.json({ error: 'Email address is required' }, { status: 400 });
    }

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return NextResponse.json(GENERIC_REPLY);
    }

    const resetCode = crypto.randomInt(100000, 1000000).toString();
    const expires = new Date(Date.now() + 15 * 60 * 1000);

    await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordResetCode: resetCode,
        passwordResetExpires: expires,
        passwordResetAttempts: 0,
      },
    });

    await sendPasswordResetEmail(user.email, resetCode);

    return NextResponse.json(GENERIC_REPLY);
  } catch (error) {
    console.error('Forgot password API error:', error);
    return NextResponse.json(
      { error: 'Internal server error during password reset request' },
      { status: 500 }
    );
  }
}
