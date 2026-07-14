import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { prisma } from '@/lib/db';
import { getSession } from '@/lib/session';

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

    // Fetch user's wardrobe items
    const items = await prisma.wardrobeItem.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });

    const groups: Record<string, typeof items> = {};

    for (const item of items) {
      let fileHash = '';

      // If local file, compute MD5 hash of physical WebP data
      if (item.imageUrl.startsWith('/uploads/')) {
        try {
          const filename = item.imageUrl.replace('/uploads/', '');
          const filepath = path.join(process.cwd(), 'public', 'uploads', filename);

          if (fs.existsSync(filepath)) {
            const buffer = fs.readFileSync(filepath);
            fileHash = crypto.createHash('md5').update(buffer).digest('hex');
          }
        } catch (err) {
          console.error(`Failed to calculate file hash for local image ${item.imageUrl}:`, err);
        }
      }

      // If remote URL, or if local file check failed/was missing, group by metadata + URL
      if (!fileHash) {
        const metadataString = `${item.imageUrl}-${item.category}-${item.brand || ''}-${item.styleNotes || ''}-${item.color.join(',')}`;
        fileHash = 'meta-' + crypto.createHash('md5').update(metadataString).digest('hex');
      }

      if (!groups[fileHash]) {
        groups[fileHash] = [];
      }
      groups[fileHash].push(item);
    }

    // Filter to find groups with at least 2 items (actual duplicates)
    const duplicateGroups = Object.keys(groups)
      .filter((hash) => groups[hash].length > 1)
      .map((hash) => ({
        hash,
        items: groups[hash],
      }));

    return NextResponse.json({
      success: true,
      count: duplicateGroups.length,
      groups: duplicateGroups,
    });
  } catch (error) {
    console.error('Error scanning wardrobe duplicates:', error);
    return NextResponse.json(
      { error: 'Internal server error scanning duplicates' },
      { status: 500 }
    );
  }
}
