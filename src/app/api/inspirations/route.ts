import { NextRequest, NextResponse } from 'next/server';
import sharp from 'sharp';
import { prisma } from '@/lib/db';
import { analyzeInspirationImage } from '@/lib/gemini';
import { getSession } from '@/lib/session';
import { uploadImage } from '@/lib/storage';
import { logUserActivity } from '@/lib/analytics';

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

    const inspirations = await prisma.inspirationImage.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(inspirations);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    console.error('Error fetching inspirations:', error);
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('image') as File | null;
    const customNotes = formData.get('notes') as string | null;

    if (!file) {
      return NextResponse.json({ error: 'No image file uploaded' }, { status: 400 });
    }

    if (!file.type.startsWith('image/')) {
      return NextResponse.json({ error: 'Only image files are allowed' }, { status: 400 });
    }

    const userId = await getActiveUserId();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { suspended: true },
    });

    if (!user || user.suspended) {
      return NextResponse.json({ error: 'Unauthorized or account suspended' }, { status: 403 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const filename = `inspiration-${Date.now()}-${file.name.replace(/\.[^/.]+$/, '')}.webp`;

    const compressedBuffer = await sharp(buffer)
      .resize({ width: 1080, withoutEnlargement: true })
      .webp({ quality: 80 })
      .toBuffer();

    const imageUrl = await uploadImage(compressedBuffer, filename);

    const base64Data = compressedBuffer.toString('base64');
    const mimeType = 'image/webp';

    console.log('Sending inspiration image to Gemini Vision API...');
    const analysis = await analyzeInspirationImage(base64Data, mimeType);
    console.log('Received inspiration analysis from Gemini:', analysis);

    const inspiration = await prisma.inspirationImage.create({
      data: {
        userId: userId,
        imageUrl: imageUrl,
        notes: customNotes || analysis.notes,
        tags: analysis.tags,
      },
    });

    await logUserActivity(userId, 'UPLOAD_IMAGE');

    return NextResponse.json(inspiration, { status: 201 });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Internal server error during upload';
    console.error('Error in inspirations upload API:', error);
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
