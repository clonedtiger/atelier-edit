import crypto from 'crypto';
import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/db';

const MAX_ATTEMPTS = 5;

function codesMatch(expected: string, given: string): boolean {
  const a = Buffer.from(expected);
  const b = Buffer.from(given);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

/**
 * Resets user password after validating recovery verification code.
 */
export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const { identity, code, newPassword } = body;

    if (!identity || !code || !newPassword) {
      return NextResponse.json({ error: 'All fields are required' }, { status: 400 });
    }

    if (newPassword.trim().length < 6) {
      return NextResponse.json({ error: 'Password must be at least 6 characters long' }, { status: 400 });
    }

    const cleanIdentity = identity.trim();
    const cleanCode = code.trim();

    const user = await prisma.user.findUnique({ where: { email: cleanIdentity } });
    const invalid = NextResponse.json({ error: 'That code is not valid. Check it, or request a new one.' }, { status: 401 });

    if (!user || !user.passwordResetCode || !user.passwordResetExpires) {
      return invalid;
    }

    if (new Date() > user.passwordResetExpires) {
      return NextResponse.json({ error: 'That code has expired. Please request a new one.' }, { status: 401 });
    }

    if (user.passwordResetAttempts >= MAX_ATTEMPTS) {
      return NextResponse.json({ error: 'Too many attempts. Please request a new code.' }, { status: 429 });
    }

    if (!codesMatch(user.passwordResetCode, cleanCode)) {
      const attempts = user.passwordResetAttempts + 1;
      await prisma.user.update({
        where: { id: user.id },
        // Void the code once the attempt limit is reached so it can't be brute-forced
        data: attempts >= MAX_ATTEMPTS
          ? { passwordResetAttempts: attempts, passwordResetCode: null, passwordResetExpires: null }
          : { passwordResetAttempts: attempts },
      });
      return invalid;
    }

    // Hash the new password securely
    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash(newPassword, salt);

    // Update user record and clear password reset credentials
    await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash: hash,
        passwordResetCode: null,
        passwordResetExpires: null,
        passwordResetAttempts: 0,
      },
    });

    console.log(`Password reset successfully for user: ${user.email}`);

    return NextResponse.json({
      success: true,
      message: 'Your password has been successfully reset.',
    });
  } catch (error) {
    console.error('Reset password API error:', error);
    return NextResponse.json(
      { error: 'Internal server error during password reset execution' },
      { status: 500 }
    );
  }
}
