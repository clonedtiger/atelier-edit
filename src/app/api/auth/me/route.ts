import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getSession, clearSessionCookie } from '@/lib/session';
import { updateActiveSession } from '@/lib/analytics';

export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ authenticated: false });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        suspended: true,
        sex: true,
        phone: true,
        height: true,
        weight: true,
        waistSize: true,
        braSize: true,
        shoeSize: true,
        hatSize: true,
        gloveSize: true,
        clothingSize: true,
        workLife: true,
        inspirationNotes: true,
        mfaEnabled: true,
      },
    });

    if (!user) {
      return NextResponse.json({ authenticated: false });
    }

    // Immediately kick out suspended users
    if (user.suspended) {
      console.log(`User ${user.email} is suspended. Clearing session...`);
      await clearSessionCookie();
      return NextResponse.json({ authenticated: false, error: 'Account suspended' });
    }

    // Update session duration and active time
    await updateActiveSession(user.id);

    return NextResponse.json({ authenticated: true, user });
  } catch (error) {
    console.error('Auth check error:', error);
    return NextResponse.json({ error: 'Failed to verify session' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const {
      name,
      sex,
      phone,
      height,
      weight,
      waistSize,
      braSize,
      shoeSize,
      hatSize,
      gloveSize,
      clothingSize,
      workLife,
      inspirationNotes,
      password,
    } = body;

    // Build update payload
    const updateData: {
      name?: string;
      sex?: string;
      phone?: string;
      height?: string;
      weight?: string;
      waistSize?: string;
      braSize?: string | null;
      shoeSize?: string;
      hatSize?: string;
      gloveSize?: string;
      clothingSize?: string;
      workLife?: string;
      inspirationNotes?: string;
      passwordHash?: string;
    } = {};

    if (name !== undefined) updateData.name = name;
    if (sex !== undefined) updateData.sex = sex;
    if (phone !== undefined) updateData.phone = phone;
    if (height !== undefined) updateData.height = height;
    if (weight !== undefined) updateData.weight = weight;
    if (waistSize !== undefined) updateData.waistSize = waistSize;
    
    // Bra size is only saved if sex is female (or default clear if changed)
    if (sex === 'Female') {
      if (braSize !== undefined) updateData.braSize = braSize;
    } else {
      updateData.braSize = null;
    }

    if (shoeSize !== undefined) updateData.shoeSize = shoeSize;
    if (hatSize !== undefined) updateData.hatSize = hatSize;
    if (gloveSize !== undefined) updateData.gloveSize = gloveSize;
    if (clothingSize !== undefined) updateData.clothingSize = clothingSize;
    if (workLife !== undefined) updateData.workLife = workLife;
    if (inspirationNotes !== undefined) updateData.inspirationNotes = inspirationNotes;

    // Handle profile password change
    if (password) {
      if (password.trim().length < 6) {
        return NextResponse.json({ error: 'Password must be at least 6 characters long' }, { status: 400 });
      }
      const bcrypt = await import('bcryptjs');
      updateData.passwordHash = await bcrypt.default.hash(password, 10);
    }

    const updatedUser = await prisma.user.update({
      where: { id: session.userId },
      data: updateData,
    });

    return NextResponse.json({ success: true, user: updatedUser });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Internal server error updating profile';
    console.error('Update profile error:', error);
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}
