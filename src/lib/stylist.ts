import { prisma } from './db';
import { generateOutfitRecommendations } from './gemini';
import { fetchLiveWeather } from './weather';

interface SearchResult {
  title: string;
  url: string;
}

/**
 * Searches the web for a retail shopping link matching the requested query.
 * Restricts queries to curated retailers. No product photo is returned: Tavily's image results
 * are not tied to individual result pages, so any image picked from them would not show the
 * product being linked. The UI renders a typographic card instead.
 */
export async function searchShoppingLink(query: string, brand: string | null): Promise<SearchResult | null> {
  const targetBrand = brand || 'luxury fashion';
  const fullQuery = `${query} "${targetBrand}" site:net-a-porter.com OR site:ssense.com OR site:farfetch.com OR site:nordstrom.com OR site:zara.com OR site:mango.com OR site:cos.com OR site:allsaints.com`;

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
          max_results: 5,
        }),
        signal: AbortSignal.timeout(8000),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.results && data.results.length > 0) {
          const topResult = data.results[0];
          return {
            title: topResult.title,
            url: topResult.url,
          };
        }
      }
    } catch (err) {
      console.error('Tavily search API error:', err);
    }
  }

  // Fallback: link to the retailer's own search page for the item.
  let siteUrl: string;
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

  return {
    title: `${query} at ${targetBrand}`,
    url: siteUrl,
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
export async function generateRecommendationsForUser(userId: string, vibe?: string, anchorItemId?: string, weatherCity?: string) {
  // 1. Fetch user wardrobe items
  const wardrobe = await prisma.wardrobeItem.findMany({
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

  // 1a. Fetch anchor item if specified
  let anchorItem: { id: string; category: string; brand?: string | null; color: string[]; detectedTags: string[]; styleNotes?: string | null } | undefined = undefined;
  if (anchorItemId) {
    const found = await prisma.wardrobeItem.findFirst({
      where: { id: anchorItemId, userId },
      select: {
        id: true,
        category: true,
        brand: true,
        color: true,
        detectedTags: true,
        styleNotes: true,
      },
    });
    if (found) {
      anchorItem = found;
      console.log(`Stylist consultation anchored around item: ${anchorItem.id} (${anchorItem.category} - ${anchorItem.brand || 'No brand'})`);
    }
  }

  // 1b. Fetch user sizing profile, personalized Style DNA, and location
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      sex: true,
      gender: true,
      height: true,
      weight: true,
      waistSize: true,
      braSize: true,
      shoeSize: true,
      hatSize: true,
      gloveSize: true,
      workLife: true,
      inspirationNotes: true,
      styleAesthetic: true,
      favoriteBrands: true,
      avoidedStyles: true,
      colorPalette: true,
      locationCity: true,
    },
  });

  // 1c. Resolve live weather context
  const targetCity = weatherCity || user?.locationCity || undefined;
  let weatherContext: { city: string; tempCelsius: number; condition: string; stylingDirectives: string } | undefined = undefined;
  if (targetCity) {
    try {
      const liveWeather = await fetchLiveWeather({ city: targetCity });
      if (liveWeather) {
        weatherContext = {
          city: liveWeather.city,
          tempCelsius: liveWeather.tempCelsius,
          condition: liveWeather.condition,
          stylingDirectives: liveWeather.stylingDirectives,
        };
        console.log(`Loaded weather context: ${weatherContext.city} (${weatherContext.tempCelsius}°C - ${weatherContext.condition})`);
      }
    } catch (err) {
      console.warn('Could not fetch live weather context:', err);
    }
  }

  // 2. Fetch the latest trend keywords from articles matching the user's active (unmuted) feed subscriptions
  const userSubs = await prisma.userFeedSubscription.findMany({
    where: { userId, isMuted: false },
    include: { feedSource: true },
  });

  let recentArticles: Array<{ extractedTrends: string[] }> = [];
  if (userSubs.length > 0) {
    const feedNames = userSubs.map((s) => s.feedSource.name);
    recentArticles = await prisma.trendArticle.findMany({
      where: {
        createdAt: {
          gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // last 30 days
        },
        sourceName: { in: feedNames },
      },
      select: {
        extractedTrends: true,
      },
    });
  }

  // Fallback: If user has no articles from personal subscriptions yet, pull recent global articles
  if (recentArticles.length === 0) {
    recentArticles = await prisma.trendArticle.findMany({
      where: {
        createdAt: {
          gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        },
      },
      select: {
        extractedTrends: true,
      },
    });
  }

  const trendsSet = new Set<string>();
  recentArticles.forEach((article) => {
    article.extractedTrends.forEach((trend) => trendsSet.add(trend));
  });
  const trendsList = Array.from(trendsSet);

  // 2b. Fetch visual inspirations
  const inspirations = await prisma.inspirationImage.findMany({
    where: { userId },
    select: {
      notes: true,
      tags: true,
    },
  });

  console.log(`Loaded ${wardrobe.length} wardrobe items, ${trendsList.length} trends (${userSubs.length} active feeds), and ${inspirations.length} visual inspirations.`);

  // 2c. Feedback on earlier looks and what was worn recently
  const [ratedLooks, recentlyWorn] = await Promise.all([
    prisma.recommendation.findMany({
      where: { userId, feedback: { in: ['loved', 'dismissed'] } },
      orderBy: { createdAt: 'desc' },
      take: 20,
      select: { title: true, narrative: true, feedback: true },
    }),
    prisma.wardrobeItem.findMany({
      where: { userId, lastWornAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } },
      select: { id: true },
    }),
  ]);
  const summarise = (look: { title: string; narrative: string }) => `${look.title}: ${look.narrative.slice(0, 160)}`;
  const styleHistory = {
    lovedLooks: ratedLooks.filter((l) => l.feedback === 'loved').slice(0, 6).map(summarise),
    dismissedLooks: ratedLooks.filter((l) => l.feedback === 'dismissed').slice(0, 6).map(summarise),
    recentlyWornIds: recentlyWorn.map((w) => w.id),
  };

  // 3. Ask Gemini to create outfits, passing user measurements, anchor item, and weather
  const recommendedOutfits = await generateOutfitRecommendations(
    wardrobe, 
    trendsList, 
    user || undefined,
    vibe,
    inspirations,
    anchorItem,
    weatherContext,
    styleHistory
  );
  console.log(`Generated ${recommendedOutfits.length} outfit recommendations from Gemini.`);

  const createdRecommendations = [];

  // 4. Look up shopping links for suggested purchases (in parallel), then save each outfit
  for (const outfit of recommendedOutfits) {
    const resolvedItems = await Promise.all(
      outfit.items.map(async (item) => {
        let purchaseUrl: string | null = null;
        if (!item.wardrobeItemId && item.purchaseName) {
          const searchResult = await searchShoppingLink(item.purchaseName, item.purchaseBrand || null);
          purchaseUrl = searchResult?.url || null;
        }
        return {
          wardrobeItemId: item.wardrobeItemId || null,
          purchaseName: item.purchaseName || null,
          purchaseBrand: item.purchaseBrand || null,
          purchaseUrl,
          purchaseImageUrl: null,
          priceEstimate: item.priceEstimate || null,
          stylingRationale: item.stylingRationale || '',
        };
      })
    );

    const recommendation = await prisma.recommendation.create({
      data: {
        userId,
        title: outfit.title,
        narrative: outfit.narrative,
        outfitItems: { create: resolvedItems },
      },
    });

    createdRecommendations.push(recommendation);
  }

  return createdRecommendations;
}
