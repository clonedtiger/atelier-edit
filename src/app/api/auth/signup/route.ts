import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/db';
import { generateMfaSecret } from '@/lib/totp';
import { setSessionCookie } from '@/lib/session';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, password, name, mfaEnabled } = body;

    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password are required' }, { status: 400 });
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return NextResponse.json({ error: 'A user with this email already exists' }, { status: 409 });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    // Setup MFA secret if checked
    const resolvedMfaEnabled = !!mfaEnabled;
    const mfaSecret = resolvedMfaEnabled ? generateMfaSecret() : null;

    // Create user in PostgreSQL
    const newUser = await prisma.user.create({
      data: {
        email,
        name: name || email.split('@')[0],
        passwordHash,
        mfaEnabled: resolvedMfaEnabled,
        mfaSecret,
      },
    });

    // If MFA is not enabled, log them in directly
    if (!resolvedMfaEnabled) {
      await setSessionCookie({ userId: newUser.id });
    }

    return NextResponse.json({
      success: true,
      user: {
        id: newUser.id,
        email: newUser.email,
        name: newUser.name,
        mfaEnabled: newUser.mfaEnabled,
      },
      // Provide secret back during registration for app linkage
      mfaSecret: mfaSecret, 
    }, { status: 201 });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Internal server error during registration';
    console.error('Signup error:', error);
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}
