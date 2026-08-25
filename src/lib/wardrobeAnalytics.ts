import { prisma } from './db';
import { analyzeWardrobeGaps, WardrobeGapRecommendation } from './gemini';
import { searchShoppingLink } from './stylist';

export interface WardrobeCategoryStat {
  category: string;
  count: number;
  percentage: number;
}

export interface ColorFamilyStat {
  family: string;
  count: number;
  percentage: number;
  colors: string[];
}

export interface WardrobeAnalyticsResult {
  totalItems: number;
  categoryBreakdown: WardrobeCategoryStat[];
  colorBreakdown: ColorFamilyStat[];
  styleDnaAlignmentScore: number;
  unwornGems: Array<{
    id: string;
    category: string;
    brand: string | null;
    imageUrl: string;
    styleNotes: string | null;
    color: string[];
    createdAt: Date;
  }>;
}

const COLOR_FAMILY_MAP: Record<string, string[]> = {
  'Monochrome & Neutrals': ['black', 'white', 'grey', 'gray', 'charcoal', 'silver', 'ivory', 'cream', 'beige', 'off-white'],
  'Warm Earth Tones': ['camel', 'brown', 'tan', 'taupe', 'olive', 'khaki', 'rust', 'terracotta', 'caramel', 'chocolate'],
  'Jewel & Deep Tones': ['navy', 'midnight', 'burgundy', 'bordeaux', 'emerald', 'sapphire', 'plum', 'forest green'],
  'Pastels & Soft Tones': ['blush', 'baby blue', 'sage', 'lavender', 'pale yellow', 'mint', 'rose'],
  'Vibrant & Statement': ['red', 'orange', 'yellow', 'cobalt', 'fuchsia', 'electric blue', 'neon', 'magenta', 'gold'],
};

/**
 * Classifies a color string into one of the tonal families.
 */
export function classifyColor(colorName: string): string {
  const lower = colorName.toLowerCase().trim();
  for (const [family, members] of Object.entries(COLOR_FAMILY_MAP)) {
    if (members.some(m => lower.includes(m))) {
      return family;
    }
  }
  return 'Monochrome & Neutrals';
}

/**
 * Computes wardrobe statistical distributions, color spectrum, and unworn items for a user.
 */
export async function getWardrobeAnalytics(userId: string): Promise<WardrobeAnalyticsResult> {
  const items = await prisma.wardrobeItem.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
  });

  const totalItems = items.length;
  if (totalItems === 0) {
    return {
      totalItems: 0,
      categoryBreakdown: [],
      colorBreakdown: [],
      styleDnaAlignmentScore: 0,
      unwornGems: [],
    };
  }

  // 1. Category Distribution
  const catCounts: Record<string, number> = {};
  items.forEach((item) => {
    catCounts[item.category] = (catCounts[item.category] || 0) + 1;
  });

  const categoryBreakdown: WardrobeCategoryStat[] = Object.entries(catCounts).map(([cat, count]) => ({
    category: cat,
    count,
    percentage: Math.round((count / totalItems) * 100),
  })).sort((a, b) => b.count - a.count);

  // 2. Color Palette Breakdown
  const familyCounts: Record<string, { count: number; colors: Set<string> }> = {};
  items.forEach((item) => {
    (item.color || []).forEach((c) => {
      const family = classifyColor(c);
      if (!familyCounts[family]) {
        familyCounts[family] = { count: 0, colors: new Set() };
      }
      familyCounts[family].count += 1;
      familyCounts[family].colors.add(c);
    });
  });

  const totalColorsCount = Object.values(familyCounts).reduce((acc, curr) => acc + curr.count, 0) || 1;
  const colorBreakdown: ColorFamilyStat[] = Object.entries(familyCounts).map(([family, data]) => ({
    family,
    count: data.count,
    percentage: Math.round((data.count / totalColorsCount) * 100),
    colors: Array.from(data.colors),
  })).sort((a, b) => b.count - a.count);

  // 3. Style DNA Alignment Score
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { styleAesthetic: true, colorPalette: true, favoriteBrands: true },
  });

  let alignmentPoints = 50; // base score
  if (user?.favoriteBrands) {
    const brands = user.favoriteBrands.toLowerCase().split(',').map(b => b.trim());
    const matchCount = items.filter(item => item.brand && brands.some(b => item.brand?.toLowerCase().includes(b))).length;
    if (matchCount > 0) alignmentPoints += Math.min(25, matchCount * 8);
  }
  if (user?.colorPalette) {
    const pal = user.colorPalette.toLowerCase();
    const matchColors = items.filter(item => item.color.some(c => pal.includes(c.toLowerCase()))).length;
    if (matchColors > 0) alignmentPoints += Math.min(25, matchColors * 5);
  }
  const styleDnaAlignmentScore = Math.min(98, Math.max(45, alignmentPoints));

  // 4. Unworn Gems (Items that haven't been referenced in recommendation items recently)
  const styledItems = await prisma.recommendationItem.findMany({
    where: { recommendation: { userId } },
    select: { wardrobeItemId: true },
  });
  const styledIds = new Set(styledItems.map(s => s.wardrobeItemId).filter(Boolean));

  const unwornItems = items.filter(item => !styledIds.has(item.id));
  const unwornGems = (unwornItems.length > 0 ? unwornItems : items).slice(0, 6);

  return {
    totalItems,
    categoryBreakdown,
    colorBreakdown,
    styleDnaAlignmentScore,
    unwornGems,
  };
}

export interface EnrichedWardrobeGap extends WardrobeGapRecommendation {
  purchaseUrl: string | null;
}

/**
 * Runs AI gap analysis on the wardrobe inventory and enriches recommendations with live shopping matches.
 */
export async function getWardrobeGaps(userId: string): Promise<EnrichedWardrobeGap[]> {
  const items = await prisma.wardrobeItem.findMany({
    where: { userId },
    select: {
      id: true,
      category: true,
      brand: true,
      color: true,
      detectedTags: true,
      styleNotes: true,
    },
  });

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      styleAesthetic: true,
      favoriteBrands: true,
      avoidedStyles: true,
      colorPalette: true,
    },
  });

  const gaps = await analyzeWardrobeGaps(items, user || undefined);

  // Search live shopping links for the 3 missing items
  const enriched: EnrichedWardrobeGap[] = [];
  for (const gap of gaps) {
    const shoppingLink = await searchShoppingLink(gap.purchaseName, gap.purchaseBrand);
    enriched.push({
      ...gap,
      purchaseUrl: shoppingLink?.url || null,
    });
  }

  return enriched;
}
