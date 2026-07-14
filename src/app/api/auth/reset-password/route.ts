import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/db';

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

    // Query user by email OR phone number
    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { email: cleanIdentity },
          { phone: cleanIdentity },
        ],
      },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Verify recovery code exists and is matching
    if (!user.passwordResetCode || user.passwordResetCode !== cleanCode) {
      return NextResponse.json({ error: 'Invalid verification code' }, { status: 401 });
    }

    // Verify recovery code has not expired
    if (!user.passwordResetExpires || new Date() > user.passwordResetExpires) {
      return NextResponse.json({ error: 'Verification code has expired' }, { status: 401 });
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
