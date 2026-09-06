import { NextRequest, NextResponse } from 'next/server';
import sharp from 'sharp';
import { prisma } from '@/lib/db';
import { analyzeWardrobeImage, detectAndAnalyzeWardrobeItems, DetectedWardrobeItem } from '@/lib/gemini';
import { getSession } from '@/lib/session';
import { uploadImage } from '@/lib/storage';
import { logUserActivity } from '@/lib/analytics';
import { cropAndCompressItem } from '@/lib/imageProcessor';

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
    const autoSplitParam = formData.get('autoSplit') as string | null;
    const autoSplit = autoSplitParam !== 'false'; // Defaults to true

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

    // Prepare an optimized version for Gemini Vision analysis
    const visionBuffer = await sharp(buffer)
      .rotate()
      .resize({ width: 1280, height: 1280, fit: 'inside', withoutEnlargement: true })
      .webp({ quality: 80 })
      .toBuffer();

    const base64Data = visionBuffer.toString('base64');
    const mimeType = 'image/webp';

    const cleanBaseName = file.name
      .replace(/\.[^/.]+$/, '')
      .replace(/[^a-zA-Z0-9_-]/g, '_');

    let detectedItems: DetectedWardrobeItem[] = [];

    if (autoSplit) {
      console.log('Detecting and analyzing items in image with Gemini Vision...');
      detectedItems = await detectAndAnalyzeWardrobeItems(base64Data, mimeType);
    }

    // Fallback to single image tagging if no multi-item results
    if (!detectedItems || detectedItems.length === 0) {
      console.log('Fallback: analyzing image as single wardrobe item...');
      const single = await analyzeWardrobeImage(base64Data, mimeType);
      detectedItems = [{ ...single, box2d: null }];
    }

    console.log(`Ingesting ${detectedItems.length} wardrobe item(s) from image...`);

    const createdItems = [];

    for (let i = 0; i < detectedItems.length; i++) {
      const item = detectedItems[i];
      const itemIndexSuffix = detectedItems.length > 1 ? `-${i + 1}` : '';
      const filename = `${Date.now()}${itemIndexSuffix}-${cleanBaseName}.webp`;

      // Crop the item if a bounding box exists, or compress the full image
      const processedBuffer = await cropAndCompressItem(buffer, item.box2d);

      // Upload the processed garment photo
      const imageUrl = await uploadImage(processedBuffer, filename);

      const resolvedBrand = customBrand?.trim() ? customBrand.trim() : item.brand;
      let resolvedNotes = item.styleNotes || `${item.category} garment`;
      if (customNotes?.trim()) {
        resolvedNotes = detectedItems.length > 1
          ? `${customNotes.trim()} (${item.styleNotes})`
          : customNotes.trim();
      }

      const wardrobeItem = await prisma.wardrobeItem.create({
        data: {
          userId: userId,
          imageUrl: imageUrl,
          category: item.category,
          color: item.color,
          brand: resolvedBrand,
          styleNotes: resolvedNotes,
          detectedTags: item.detectedTags,
        },
      });

      createdItems.push(wardrobeItem);
    }

    // Track user analytics activity
    await logUserActivity(userId, 'UPLOAD_IMAGE');

    // Return the primary item fields for backwards compatibility along with the full items list
    const primaryItem = createdItems[0];
    return NextResponse.json(
      {
        ...primaryItem,
        items: createdItems,
        count: createdItems.length,
      },
      { status: 201 }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Internal server error during upload';
    console.error('Error in wardrobe upload api:', error);
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}
