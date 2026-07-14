import { NextRequest, NextResponse } from 'next/server';
import sharp from 'sharp';
import { prisma } from '@/lib/db';
import { analyzeWardrobeImage } from '@/lib/gemini';
import { getSession } from '@/lib/session';
import { uploadImage } from '@/lib/storage';
import { logUserActivity } from '@/lib/analytics';

async function getActiveUserId() {
  const session = await getSession();
  return session?.userId || null;
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('image') as File | null;
    const customNotes = formData.get('styleNotes') as string | null;
    const customBrand = formData.get('brand') as string | null;

    if (!file) {
      return NextResponse.json({ error: 'No image file uploaded' }, { status: 400 });
    }

    // Validate that the file is an image
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

    // Read the file as a buffer
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // 1. Process & Compress image via Sharp to WebP
    const filename = `${Date.now()}-${file.name.replace(/\.[^/.]+$/, '')}.webp`;

    // Resize to max 1080px wide and convert to WebP with 80% quality
    const compressedBuffer = await sharp(buffer)
      .resize({ width: 1080, withoutEnlargement: true })
      .webp({ quality: 80 })
      .toBuffer();

    // Save image using storage service (handles GCS/local fallback)
    const imageUrl = await uploadImage(compressedBuffer, filename);

    // 2. Convert to base64 for Gemini Vision API analysis
    const base64Data = compressedBuffer.toString('base64');
    const mimeType = 'image/webp';

    console.log('Sending image to Gemini Vision API...');
    const tags = await analyzeWardrobeImage(base64Data, mimeType);
    console.log('Received tags from Gemini:', tags);

    // 4. Save to Database
    const wardrobeItem = await prisma.wardrobeItem.create({
      data: {
        userId: userId,
        imageUrl: imageUrl,
        category: tags.category,
        color: tags.color,
        brand: customBrand || tags.brand,
        styleNotes: customNotes || tags.styleNotes,
        detectedTags: tags.detectedTags,
      },
    });

    // Track analytics activity
    await logUserActivity(userId, 'UPLOAD_IMAGE');

    return NextResponse.json(wardrobeItem, { status: 201 });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Internal server error during upload';
    console.error('Error in wardrobe upload api:', error);
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}
