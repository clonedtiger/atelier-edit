import { prisma } from './db';
import { generateOutfitRecommendations } from './gemini';

interface SearchResult {
  title: string;
  url: string;
  image?: string;
}

const CATEGORY_FALLBACK_IMAGES: Record<string, string[]> = {
  outerwear: [
    'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?q=80&w=600&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1544022613-e87ca75a784a?q=80&w=600&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1591047139829-d91aecb6caea?q=80&w=600&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1548883354-7622d03aca27?q=80&w=600&auto=format&fit=crop'
  ],
  tops: [
    'https://images.unsplash.com/photo-1503342217505-b0a15ec3261c?q=80&w=600&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1598554747436-c9293d6a588f?q=80&w=600&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1541099649105-f69ad21f3246?q=80&w=600&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1618244972963-dbee1a7edc95?q=80&w=600&auto=format&fit=crop'
  ],
  bottoms: [
    'https://images.unsplash.com/photo-1542272604-787c3835535d?q=80&w=600&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1582533561751-ef6f6ab93a2e?q=80&w=600&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1508445861827-7711f397113a?q=80&w=600&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1576995853123-5a10305d93c0?q=80&w=600&auto=format&fit=crop'
  ],
  shoes: [
    'https://images.unsplash.com/photo-1543163521-1bf539c55dd2?q=80&w=600&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1537815749002-de6a533c64db?q=80&w=600&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1608256246200-53e635b5b65f?q=80&w=600&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1512374382149-4332c6c02151?q=80&w=600&auto=format&fit=crop'
  ],
  bags: [
    'https://images.unsplash.com/photo-1584917865442-de89df76afd3?q=80&w=600&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1548036328-c9fa89d128fa?q=80&w=600&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1590874103328-eac38a683ce7?q=80&w=600&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1566150905458-1bf1fc15aae9?q=80&w=600&auto=format&fit=crop'
  ],
  accessories: [
    'https://images.unsplash.com/photo-1511499767150-a48a237f0083?q=80&w=600&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1624206112918-f14bf8015507?q=80&w=600&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?q=80&w=600&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1572307480813-ceb0e59d6871?q=80&w=600&auto=format&fit=crop'
  ],
  dresses: [
    'https://images.unsplash.com/photo-1595777457583-95e059d581b8?q=80&w=600&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1496747611176-843222e1e57c?q=80&w=600&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1485462537746-965f33f7f6a7?q=80&w=600&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1529139574466-a303027c1d8b?q=80&w=600&auto=format&fit=crop'
  ],
  knitwear: [
    'https://images.unsplash.com/photo-1614975058789-41316d0e2e9c?q=80&w=600&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1576566588028-4147f3842f27?q=80&w=600&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1434389677669-e08b4cac3105?q=80&w=600&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?q=80&w=600&auto=format&fit=crop'
  ],
  jewelry: [
    'https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?q=80&w=600&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?q=80&w=600&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1617038260897-41a1f14a8ca0?q=80&w=600&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1605100804763-247f67b3557e?q=80&w=600&auto=format&fit=crop'
  ],
  makeup: [
    'https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?q=80&w=600&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1596462502278-27bfdc403348?q=80&w=600&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1512496015851-a90fb38ba796?q=80&w=600&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?q=80&w=600&auto=format&fit=crop'
  ],
  general: [
    'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?q=80&w=600&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1496747611176-843222e1e57c?q=80&w=600&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1469334031218-e382a71b716b?q=80&w=600&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1509631179647-0177331693ae?q=80&w=600&auto=format&fit=crop'
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
  
  if (lowerQuery.includes('jacket') || lowerQuery.includes('coat') || lowerQuery.includes('blazer') || lowerQuery.includes('outerwear') || lowerQuery.includes('trench') || lowerQuery.includes('parka') || lowerQuery.includes('bomber') || lowerQuery.includes('cape')) {
    categoryKey = 'outerwear';
  } else if (lowerQuery.includes('boot') || lowerQuery.includes('shoe') || lowerQuery.includes('heels') || lowerQuery.includes('sneaker') || lowerQuery.includes('pump') || lowerQuery.includes('flats') || lowerQuery.includes('sandals') || lowerQuery.includes('loafers')) {
    categoryKey = 'shoes';
  } else if (lowerQuery.includes('bag') || lowerQuery.includes('purse') || lowerQuery.includes('clutch') || lowerQuery.includes('handbag') || lowerQuery.includes('tote')) {
    categoryKey = 'bags';
  } else if (lowerQuery.includes('jewelry') || lowerQuery.includes('necklace') || lowerQuery.includes('ring') || lowerQuery.includes('cuff') || lowerQuery.includes('earring') || lowerQuery.includes('bracelet') || lowerQuery.includes('pearl') || lowerQuery.includes('brooch') || lowerQuery.includes('diamond') || lowerQuery.includes('gold')) {
    categoryKey = 'jewelry';
  } else if (lowerQuery.includes('makeup') || lowerQuery.includes('lipstick') || lowerQuery.includes('eyeliner') || lowerQuery.includes('beauty') || lowerQuery.includes('gloss') || lowerQuery.includes('palette') || lowerQuery.includes('nail') || lowerQuery.includes('mascara') || lowerQuery.includes('lip') || lowerQuery.includes('cheek')) {
    categoryKey = 'makeup';
  } else if (lowerQuery.includes('shirt') || lowerQuery.includes('t-shirt') || lowerQuery.includes('top') || lowerQuery.includes('blouse') || lowerQuery.includes('camisole') || lowerQuery.includes('tee') || lowerQuery.includes('crop')) {
    categoryKey = 'tops';
  } else if (lowerQuery.includes('pants') || lowerQuery.includes('trousers') || lowerQuery.includes('jeans') || lowerQuery.includes('skirt') || lowerQuery.includes('shorts') || lowerQuery.includes('leggings') || lowerQuery.includes('bottoms') || lowerQuery.includes('slacks')) {
    categoryKey = 'bottoms';
  } else if (lowerQuery.includes('dress') || lowerQuery.includes('gown') || lowerQuery.includes('slip') || lowerQuery.includes('midi') || lowerQuery.includes('maxi') || lowerQuery.includes('sundress')) {
    categoryKey = 'dresses';
  } else if (lowerQuery.includes('sweater') || lowerQuery.includes('knitwear') || lowerQuery.includes('pullover') || lowerQuery.includes('turtleneck') || lowerQuery.includes('knit') || lowerQuery.includes('cardigan')) {
    categoryKey = 'knitwear';
  } else if (lowerQuery.includes('belt') || lowerQuery.includes('scarf') || lowerQuery.includes('sunglasses') || lowerQuery.includes('hat') || lowerQuery.includes('gloves') || lowerQuery.includes('accessories')) {
    categoryKey = 'accessories';
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
