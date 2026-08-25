import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getSession } from '@/lib/session';
import { createTravelCapsule } from '@/lib/capsule';

async function getActiveUserId() {
  const session = await getSession();
  return session?.userId || null;
}

export async function GET() {
  try {
    const userId = await getActiveUserId();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const capsules = await prisma.capsuleTrip.findMany({
      where: { userId },
      orderBy: { startDate: 'desc' },
    });

    return NextResponse.json(capsules);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    console.error('Error fetching capsules:', error);
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const userId = await getActiveUserId();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { destination, startDate, endDate, tripPurpose, luggageType, checklistNotes } = body;

    if (!destination || !startDate || !endDate || !tripPurpose) {
      return NextResponse.json({ error: 'Missing required trip parameters (destination, startDate, endDate, tripPurpose)' }, { status: 400 });
    }

    const capsuleResult = await createTravelCapsule({
      userId,
      destination,
      startDate,
      endDate,
      tripPurpose,
      luggageType: luggageType || 'Carry-on Only',
      checklistNotes,
    });

    return NextResponse.json(capsuleResult, { status: 201 });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Failed to generate travel capsule';
    console.error('Error creating capsule trip:', error);
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
