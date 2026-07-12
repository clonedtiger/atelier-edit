import { prisma } from './db';
import { generateOutfitRecommendations } from './gemini';

interface SearchResult {
  title: string;
  url: string;
  image?: string;
}

const CATEGORY_FALLBACK_IMAGES: Record<string, string[]> = {
  outerwear: [
    'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?q=80&w=600&auto=format&fit=crop', // leather jacket
    'https://images.unsplash.com/photo-1512436991641-6745cdb1723f?q=80&w=600&auto=format&fit=crop', // trench coat
    'https://images.unsplash.com/photo-1591047139829-d91aecb6caea?q=80&w=600&auto=format&fit=crop', // blazer
    'https://images.unsplash.com/photo-1505022610485-0249ba5b3675?q=80&w=600&auto=format&fit=crop'  // blazer style
  ],
  shoes: [
    'https://images.unsplash.com/photo-1543163521-1bf539c55dd2?q=80&w=600&auto=format&fit=crop', // blue boots
    'https://images.unsplash.com/photo-1537815749002-de6a533c64db?q=80&w=600&auto=format&fit=crop', // high heels
    'https://images.unsplash.com/photo-1532453288424-a8687f3be93b?q=80&w=600&auto=format&fit=crop'  // leather boots
  ],
  bags: [
    'https://images.unsplash.com/photo-1584917865442-de89df76afd3?q=80&w=600&auto=format&fit=crop', // designer bag
    'https://images.unsplash.com/photo-1518049360754-b3b1a8e29a43?q=80&w=600&auto=format&fit=crop'  // luxury accessory bag
  ],
  jewelry: [
    'https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?q=80&w=600&auto=format&fit=crop', // jewelry pearl
    'https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?q=80&w=600&auto=format&fit=crop', // gold rings
    'https://images.unsplash.com/photo-1617038260897-41a1f14a8ca0?q=80&w=600&auto=format&fit=crop'  // luxury earrings
  ],
  makeup: [
    'https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?q=80&w=600&auto=format&fit=crop', // makeup cosmetics
    'https://images.unsplash.com/photo-1596462502278-27bfdc403348?q=80&w=600&auto=format&fit=crop', // lipstick
    'https://images.unsplash.com/photo-1512496015851-a90fb38ba796?q=80&w=600&auto=format&fit=crop'  // beauty styling
  ],
  general: [
    'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?q=80&w=600&auto=format&fit=crop', // classic yellow set
    'https://images.unsplash.com/photo-1496747611176-843222e1e57c?q=80&w=600&auto=format&fit=crop', // floral dress
    'https://images.unsplash.com/photo-1469334031218-e382a71b716b?q=80&w=600&auto=format&fit=crop', // model walk
    'https://images.unsplash.com/photo-1509631179647-0177331693ae?q=80&w=600&auto=format&fit=crop', // pink dress
    'https://images.unsplash.com/photo-1434389677669-e08b4cac3105?q=80&w=600&auto=format&fit=crop', // white knit
    'https://images.unsplash.com/photo-1485462537746-965f33f7f6a7?q=80&w=600&auto=format&fit=crop', // street style
    'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?q=80&w=600&auto=format&fit=crop', // yellow set
    'https://images.unsplash.com/photo-1529139574466-a303027c1d8b?q=80&w=600&auto=format&fit=crop', // editorial grouping
    'https://images.unsplash.com/photo-1509319117193-57bab727e09d?q=80&w=600&auto=format&fit=crop', // floral print
    'https://images.unsplash.com/photo-1554568218-0f1715e72254?q=80&w=600&auto=format&fit=crop', // clean shirt
    'https://images.unsplash.com/photo-1576566588028-4147f3842f27?q=80&w=600&auto=format&fit=crop'  // graphic knit
  ]
};

function getStringHash(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

/**
 * Searches the web for a retail shopping link matching the requested query.
 * Restricts queries to target sites (Zara, Mango, Net-A-Porter, AllSaints).
 */
async function searchShoppingLink(query: string, brand: string | null): Promise<SearchResult | null> {
  const targetBrand = brand || 'fashion';
  const fullQuery = `${query} "${targetBrand}" site:zara.com OR site:mango.com OR site:net-a-porter.com OR site:allsaints.com`;
  console.log(`Searching shopping item with query: "${fullQuery}"`);

  // Categorize query to fetch matching group of images
  const lowerQuery = query.toLowerCase();
  let categoryKey = 'general';
  
  if (lowerQuery.includes('jacket') || lowerQuery.includes('coat') || lowerQuery.includes('blazer') || lowerQuery.includes('outerwear') || lowerQuery.includes('cardigan') || lowerQuery.includes('trench')) {
    categoryKey = 'outerwear';
  } else if (lowerQuery.includes('boot') || lowerQuery.includes('shoe') || lowerQuery.includes('heels') || lowerQuery.includes('sneaker') || lowerQuery.includes('pump') || lowerQuery.includes('flats')) {
    categoryKey = 'shoes';
  } else if (lowerQuery.includes('bag') || lowerQuery.includes('purse') || lowerQuery.includes('clutch') || lowerQuery.includes('handbag') || lowerQuery.includes('tote')) {
    categoryKey = 'bags';
  } else if (lowerQuery.includes('jewelry') || lowerQuery.includes('necklace') || lowerQuery.includes('ring') || lowerQuery.includes('cuff') || lowerQuery.includes('earring') || lowerQuery.includes('bracelet') || lowerQuery.includes('pearl')) {
    categoryKey = 'jewelry';
  } else if (lowerQuery.includes('makeup') || lowerQuery.includes('lipstick') || lowerQuery.includes('eyeliner') || lowerQuery.includes('beauty') || lowerQuery.includes('gloss') || lowerQuery.includes('palette') || lowerQuery.includes('nail')) {
    categoryKey = 'makeup';
  }

  const apiKey = process.env.TAVILY_API_KEY;

  if (apiKey) {
    try {
      const res = await fetch('https://api.tavily.com/search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          api_key: apiKey,
          query: fullQuery,
          search_depth: 'basic',
          include_images: true,
          max_results: 5,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.results && data.results.length > 0) {
          const topResult = data.results[0];
          
          // Deterministically select an image from Tavily's collection based on query hash to avoid duplicates
          let imageUrl = undefined;
          if (data.images && data.images.length > 0) {
            const queryHash = getStringHash(query);
            const imageIndex = queryHash % data.images.length;
            imageUrl = data.images[imageIndex];
          }

          return {
            title: topResult.title,
            url: topResult.url,
            image: imageUrl || topResult.image,
          };
        }
      }
    } catch (err) {
      console.error('Tavily search API error:', err);
    }
  }

  // Fallback: If no API key is present or it fails, generate clean, direct links to the site's search page
  // which will work dynamically for the user.
  let siteUrl = 'https://www.net-a-porter.com';
  const cleanBrand = targetBrand.toLowerCase();
  
  if (cleanBrand.includes('zara')) {
    siteUrl = `https://www.zara.com/search?searchTerm=${encodeURIComponent(query)}`;
  } else if (cleanBrand.includes('mango')) {
    siteUrl = `https://shop.mango.com/us/search?kw=${encodeURIComponent(query)}`;
  } else if (cleanBrand.includes('allsaints')) {
    siteUrl = `https://www.allsaints.com/search?q=${encodeURIComponent(query)}`;
  } else {
    siteUrl = `https://www.net-a-porter.com/en-us/shop/search/${encodeURIComponent(query)}`;
  }

  // Deterministic fallback from the matched category list
  const categoryImages = CATEGORY_FALLBACK_IMAGES[categoryKey] || CATEGORY_FALLBACK_IMAGES.general;
  const nameHash = getStringHash(query);
  const mockImage = categoryImages[nameHash % categoryImages.length];

  return {
    title: `${query} at ${targetBrand}`,
    url: siteUrl,
    image: mockImage,
  };
}

/**
 * Orchestrates outfit recommendation generation:
 * 1. Pulls wardrobe items for a user.
 * 2. Fetches recent trends from the TrendArticle table.
 * 3. Uses Gemini to synthesize 3 outfits.
 * 4. Queries shopping links for new suggested purchases.
 * 5. Saves recommendations to the database.
 */
export async function generateRecommendationsForUser(userId: string, vibe?: string) {
  // 1. Fetch user wardrobe items
  const wardrobe = await prisma.wardrobeItem.findMany({
    where: { userId },
    select: {
      id: true,
      category: true,
      color: true,
      detectedTags: true,
      styleNotes: true,
    },
  });

  // 1b. Fetch user sizing profile
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      sex: true,
      height: true,
      weight: true,
      waistSize: true,
      braSize: true,
      shoeSize: true,
      hatSize: true,
      gloveSize: true,
      workLife: true,
      inspirationNotes: true,
    },
  });

  // 2. Fetch the latest trend keywords from articles parsed in the last 14 days
  const recentArticles = await prisma.trendArticle.findMany({
    where: {
      createdAt: {
        gte: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000), // last 14 days
      },
    },
    select: {
      extractedTrends: true,
    },
  });

  const trendsSet = new Set<string>();
  recentArticles.forEach((article) => {
    article.extractedTrends.forEach((trend) => trendsSet.add(trend));
  });
  const trendsList = Array.from(trendsSet);

  console.log(`Loaded ${wardrobe.length} wardrobe items and ${trendsList.length} unique trends.`);

  // 3. Ask Gemini to create outfits, passing user measurements
  const recommendedOutfits = await generateOutfitRecommendations(
    wardrobe, 
    trendsList, 
    user || undefined,
    vibe
  );
  console.log(`Generated ${recommendedOutfits.length} outfit recommendations from Gemini.`);

  const createdRecommendations = [];

  // 4. Save and fetch shopping matches
  for (const outfit of recommendedOutfits) {
    const recommendation = await prisma.recommendation.create({
      data: {
        userId,
        title: outfit.title,
        narrative: outfit.narrative,
      },
    });

    for (const item of outfit.items) {
      let purchaseUrl: string | undefined = undefined;
      let purchaseImageUrl: string | undefined = undefined;

      if (!item.wardrobeItemId && item.purchaseName) {
        // This is a new item recommendation. Search for shopping link.
        const searchResult = await searchShoppingLink(item.purchaseName, item.purchaseBrand || null);
        if (searchResult) {
          purchaseUrl = searchResult.url;
          purchaseImageUrl = searchResult.image;
        }
      }

      await prisma.recommendationItem.create({
        data: {
          recommendationId: recommendation.id,
          wardrobeItemId: item.wardrobeItemId || null,
          purchaseName: item.purchaseName || null,
          purchaseBrand: item.purchaseBrand || null,
          purchaseUrl: purchaseUrl || null,
          purchaseImageUrl: purchaseImageUrl || null,
          priceEstimate: item.priceEstimate || null,
          stylingRationale: item.stylingRationale,
        },
      });
    }

    createdRecommendations.push(recommendation);
  }

  return createdRecommendations;
}
