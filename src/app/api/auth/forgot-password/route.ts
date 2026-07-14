import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

/**
 * Initiates the password recovery flow.
 * Generates a verification code and registers it on the user record.
 */
export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const { identity } = body;

    if (!identity) {
      return NextResponse.json({ error: 'Email or Phone Number is required' }, { status: 400 });
    }

    const cleanIdentity = identity.trim();

    // Query user by matching email OR phone number
    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { email: cleanIdentity },
          { phone: cleanIdentity },
        ],
      },
    });

    if (!user) {
      // Do not reveal user existence leaks in production, but for our requirements, 
      // return 404 to guide the user during password resets.
      return NextResponse.json({ error: 'No account matches the provided email or phone number' }, { status: 404 });
    }

    // Generate 6-digit random code
    const resetCode = Math.floor(100000 + Math.random() * 900000).toString();
    const expires = new Date();
    expires.setMinutes(expires.getMinutes() + 15); // Valid for 15 minutes

    // Save code & expiration to DB
    await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordResetCode: resetCode,
        passwordResetExpires: expires,
      },
    });

    // Mock dispatch (Log to console for test/eval access)
    console.log(`\n==================================================`);
    console.log(`[SECURITY DISPATCH] Password reset code for:`);
    console.log(`User: ${user.name || 'User'} (${user.email})`);
    console.log(`Verification Code: ${resetCode}`);
    console.log(`Expires: ${expires.toLocaleTimeString()}`);
    console.log(`==================================================\n`);

    return NextResponse.json({
      success: true,
      message: 'A security verification code has been dispatched to your email/mobile.',
    });
  } catch (error) {
    console.error('Forgot password API error:', error);
    return NextResponse.json(
      { error: 'Internal server error during password reset request' },
      { status: 500 }
    );
  }
}
