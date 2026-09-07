import sharp from 'sharp';
import { prisma } from './db';
import { getAi, MODEL_NAME, safeParseGeminiJson } from './gemini';
import { syncArticlesAndTrends } from './feed';
import { uploadImage } from './storage';

export interface WhatsNewPost {
  id: string;
  title: string;
  summary: string;
  source: string;
  tags: string[];
  imageUrl: string;
  createdAt?: string;
}

export interface WhatsNewData {
  generatedAt: string;
  posts: WhatsNewPost[];
}

/**
 * Downloads an external image over HTTP, validates it through Sharp,
 * converts to WebP, and stores it permanently via uploadImage (GCS/local).
 * Returns the web-accessible URL or null if download/decode fails.
 */
async function downloadAndStoreImage(imageUrl: string, filenamePrefix: string): Promise<string | null> {
  try {
    if (!imageUrl || !imageUrl.startsWith('http')) {
      return null;
    }

    const res = await fetch(imageUrl, {
      signal: AbortSignal.timeout(6000),
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        Accept: 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
      },
    });

    if (!res.ok) {
      console.warn(`Failed to download image from ${imageUrl}: HTTP ${res.status}`);
      return null;
    }

    const contentType = res.headers.get('content-type') || '';
    if (!contentType.includes('image') && !contentType.includes('octet-stream')) {
      console.warn(`URL returned non-image content type: ${contentType}`);
      return null;
    }

    const arrayBuffer = await res.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    if (buffer.length < 500) {
      return null;
    }

    // Process & compress through sharp to ensure it's valid and optimized WebP
    const webpBuffer = await sharp(buffer)
      .resize({ width: 1080, height: 1080, fit: 'inside', withoutEnlargement: true })
      .webp({ quality: 80 })
      .toBuffer();

    const filename = `${filenamePrefix}-${Date.now()}-${Math.floor(Math.random() * 1000)}.webp`;
    const storedUrl = await uploadImage(webpBuffer, filename);
    return storedUrl;
  } catch (err) {
    console.warn(`Error downloading and saving image from ${imageUrl}:`, err);
    return null;
  }
}

/**
 * Searches for a relevant high-resolution editorial photograph using Tavily
 * and saves it permanently to storage.
 */
async function searchAndSaveEditorialImage(
  query: string,
  userSex: string,
  prefix: string
): Promise<string | null> {
  const apiKey = process.env.TAVILY_API_KEY;
  if (!apiKey) {
    return null;
  }

  try {
    const genderTerm = userSex.toLowerCase() === 'male' ? 'men menswear' : userSex.toLowerCase() === 'female' ? 'women womenswear' : '';
    const searchQuery = `${query} ${genderTerm} fashion editorial runway high resolution`.trim();

    const res = await fetch('https://api.tavily.com/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        api_key: apiKey,
        query: searchQuery,
        search_depth: 'basic',
        include_images: true,
        max_results: 3,
      }),
    });

    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data.images) && data.images.length > 0) {
        for (const candidateUrl of data.images) {
          if (typeof candidateUrl === 'string' && candidateUrl.startsWith('http')) {
            const saved = await downloadAndStoreImage(candidateUrl, prefix);
            if (saved) return saved;
          }
        }
      }
    }
  } catch (err) {
    console.warn('Tavily editorial image search failed:', err);
  }

  return null;
}

/**
 * Creates a clean, minimalist fallback WebP image and stores it locally/GCS
 * so that no post is ever left with a broken link.
 */
async function createFallbackImage(userSex: string, prefix: string): Promise<string> {
  const isMale = userSex.toLowerCase() === 'male';
  const bg = isMale ? { r: 24, g: 26, b: 30 } : { r: 35, g: 30, b: 33 };

  const buffer = await sharp({
    create: {
      width: 800,
      height: 600,
      channels: 4,
      background: { ...bg, alpha: 1 },
    },
  })
    .webp({ quality: 80 })
    .toBuffer();

  const filename = `${prefix}-fallback-${Date.now()}-${Math.floor(Math.random() * 1000)}.webp`;
  return await uploadImage(buffer, filename);
}

/**
 * Retrieves the user's personalized "What's New" stream from PostgreSQL.
 * For a new user account with no generated posts, returns an empty list.
 */
export async function getUserWhatsNew(
  userId?: string | null,
  sort: 'desc' | 'asc' = 'desc'
): Promise<WhatsNewData> {
  if (!userId) {
    return {
      generatedAt: new Date().toISOString(),
      posts: [],
    };
  }

  const posts = await prisma.whatsNewPost.findMany({
    where: { userId },
    orderBy: { createdAt: sort },
  });

  return {
    generatedAt: new Date().toISOString(),
    posts: posts.map((p) => ({
      id: p.id,
      title: p.title,
      summary: p.summary,
      source: p.source,
      tags: p.tags,
      imageUrl: p.imageUrl,
      createdAt: p.createdAt.toISOString(),
    })),
  };
}

/**
 * Synthesizes a new personalized editorial stream for the user:
 * - Strictly respects the user's sex (e.g. Male -> Menswear only, absolutely no female clothing).
 * - Incorporates the user's uploaded visual inspiration clippings and notes.
 * - Extracts trends from subscribed feed articles.
 * - Downloads, converts, and saves every image permanently to storage (avoiding broken links).
 * - Stores the posts in PostgreSQL and returns the stream in the requested chronological order.
 */
export async function generateAndSaveUserWhatsNew(
  userId: string,
  sort: 'desc' | 'asc' = 'desc'
): Promise<WhatsNewData> {
  console.log(`Synthesizing fresh What's New editorial stream for user ${userId}...`);

  // 1. Fetch user profile, gender, and inspirations
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      sex: true,
      styleAesthetic: true,
      favoriteBrands: true,
      avoidedStyles: true,
      inspirationNotes: true,
    },
  });

  const userInspirations = await prisma.inspirationImage.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    take: 10,
    select: {
      id: true,
      imageUrl: true,
      notes: true,
      tags: true,
    },
  });

  // 2. Sync feed sources to ensure recent articles exist in database
  try {
    await syncArticlesAndTrends(2, true);
  } catch (syncErr) {
    console.warn('Feed sync error during whats-new generation:', syncErr);
  }

  // 3. Fetch latest trend articles from database
  const articles = await prisma.trendArticle.findMany({
    orderBy: { createdAt: 'desc' },
    take: 12,
    select: {
      sourceName: true,
      title: true,
      extractedTrends: true,
      content: true,
    },
  });

  // 4. Formulate gender and inspiration directives for Gemini
  const userSex = (user?.sex || '').trim().toLowerCase();
  let genderDirective = '';

  if (userSex === 'male') {
    genderDirective = `
CRITICAL GENDER RESTRICTION:
The client is MALE. Every summary and styling concept MUST be exclusively for MENSWEAR and masculine/unisex luxury fashion (e.g., tailored suits, structured overcoats, wool trousers, relaxed denim, fine gauge knits, leather boots, loafers, minimalist sneakers, masculine hardware and leather goods).
STRICTLY FORBIDDEN: Do NOT include, mention, or describe any womenswear, female clothing, dresses, skirts, high heels, blouses, gowns, feminine silhouettes, or bra/lingerie tailoring.
`;
  } else if (userSex === 'female') {
    genderDirective = `
CRITICAL GENDER DIRECTIVE:
The client is FEMALE. The stream should feature curated luxury womenswear, tailoring, dresses, elevated silhouettes, feminine/androgynous luxury coordinates, and high-fashion womenswear aesthetic rules.
`;
  } else {
    genderDirective = `
GENDER DIRECTIVE:
Focus on contemporary unisex and gender-neutral luxury styling coordinates.
`;
  }

  let inspirationDirective = '';
  if (userInspirations.length > 0 || user?.inspirationNotes) {
    inspirationDirective = `
CLIENT'S PERSONAL INSPIRATION FEEDS & MOODBOARDS:
- Client's Personal Inspiration Notes: "${user?.inspirationNotes || 'Not specified'}"
- Uploaded Visual Inspiration Clippings (${userInspirations.length} images):
${userInspirations.map((ins, i) => `  * Inspiration #${i + 1}: Notes: "${ins.notes || 'None'}" | Tags: [${ins.tags.join(', ')}]`).join('\n')}

MANDATORY INSPIRATION REQUIREMENT:
You MUST actively incorporate the client's uploaded visual inspiration themes, textures, cuts, and moodboards into these trend summaries! Show how the current runway trends align with and enhance their personal inspiration feeds.
`;
  }

  const prompt = `
    You are an elite editorial fashion stylist and trend intelligence director.
    Synthesize the latest fashion runway reports, articles, and the client's personal inspiration feeds into exactly 3-4 curated "Editorial Style Stream Posts".

    ${genderDirective}
    ${inspirationDirective}

    Client Aesthetic Profile:
    - Style DNA: ${user?.styleAesthetic || 'Modern Quiet Luxury with Timeless Tailoring'}
    - Favorite Brands: ${user?.favoriteBrands || 'Curated luxury & contemporary designers'}
    - Avoided Styles: ${user?.avoidedStyles || 'None'}

    Latest Trend Articles from Subscribed Radar:
    ${articles.map((a) => `Source: ${a.sourceName} | Title: ${a.title} | Trends: ${a.extractedTrends.join(', ')} | Excerpt: ${a.content.slice(0, 1000)}`).join('\n\n')}

    Requirements:
    1. Provide a captivating, luxury-editorial headline for each post.
    2. Write an editorial summary (2-4 sentences) breaking down the trend, actionable outfit coordinates, and explicitly connecting to the client's inspirations.
    3. Cite the primary source (e.g. source publication name, or "Personal Inspiration Feed").
    4. List 3-5 relevant styling tags.
    5. Provide a specific visual search query to locate an editorial photograph for this exact look (e.g. "menswear oversized camel wool coat minimalist trousers street style").
    6. If the post directly reflects one of the client's visual inspirations, specify "matchedInspirationIndex" (0-indexed integer corresponding to Inspiration #1, #2, etc.), otherwise null.

    Output strictly a JSON object with this structure:
    {
      "posts": [
        {
          "title": "Editorial Headline",
          "summary": "Editorial caption text...",
          "source": "Vogue Runway",
          "tags": ["tailoring", "wool", "camel"],
          "imageSearchQuery": "menswear oversized camel coat street style fashion editorial",
          "matchedInspirationIndex": 0
        }
      ]
    }
  `;

  interface RawPost {
    title: string;
    summary: string;
    source: string;
    tags: string[];
    imageSearchQuery?: string;
    matchedInspirationIndex?: number | null;
  }

  let rawPosts: RawPost[] = [];

  try {
    const response = await getAi().models.generateContent({
      model: MODEL_NAME,
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
      },
    });

    const text = response.text || '{}';
    const parsed = safeParseGeminiJson<{ posts?: RawPost[] }>(text);
    rawPosts = parsed.posts || [];
  } catch (err) {
    console.error('Gemini editorial stream generation failed:', err);
  }

  // Fallback if model output was empty
  if (rawPosts.length === 0) {
    const isMale = userSex === 'male';
    rawPosts = [
      {
        title: isMale ? 'Structural Tailoring & Heavyweight Wool' : 'Architectural Cashmere & Fluid Silhouettes',
        summary: isMale
          ? 'Emphasize architectural shoulder lines with relaxed, pleated wide-leg trousers. Anchor neutral charcoal tones with clean minimalist leather footwear for a balanced luxury uniform.'
          : 'Pair sculptural knitwear with tailored high-waisted trousers and sleek leather accents, echoing timeless European tailoring rules.',
        source: userInspirations.length > 0 ? 'Personal Inspiration Feed' : 'Curated Editorial',
        tags: isMale ? ['tailoring', 'menswear', 'wool'] : ['cashmere', 'luxury', 'tailoring'],
        imageSearchQuery: isMale ? 'men tailored charcoal wool coat minimalist street style' : 'women luxury tailoring cashmere coat street style',
      },
    ];
  }

  // 5. Resolve, download, and store every image into local/GCS storage
  for (let i = 0; i < rawPosts.length; i++) {
    const rp = rawPosts[i];
    let resolvedImageUrl: string | null = null;

    // Check if matched to a user's uploaded visual inspiration
    if (
      typeof rp.matchedInspirationIndex === 'number' &&
      userInspirations[rp.matchedInspirationIndex]?.imageUrl
    ) {
      resolvedImageUrl = userInspirations[rp.matchedInspirationIndex].imageUrl;
    } else if (userInspirations.length > 0) {
      // Check if tags match any inspiration
      const matchedIns = userInspirations.find((ins) =>
        ins.tags.some((t) => rp.tags.map((x) => x.toLowerCase()).includes(t.toLowerCase()))
      );
      if (matchedIns?.imageUrl) {
        resolvedImageUrl = matchedIns.imageUrl;
      }
    }

    // If not matched or needs search, query Tavily and download image
    if (!resolvedImageUrl) {
      resolvedImageUrl = await searchAndSaveEditorialImage(
        rp.imageSearchQuery || rp.title,
        userSex,
        `editorial-${i + 1}`
      );
    }

    // If still unresolved, use any available user inspiration image
    if (!resolvedImageUrl && userInspirations.length > 0) {
      resolvedImageUrl = userInspirations[i % userInspirations.length].imageUrl;
    }

    // Final fallback: generate a sleek local WebP asset
    if (!resolvedImageUrl) {
      resolvedImageUrl = await createFallbackImage(userSex, `editorial-${i + 1}`);
    }

    // Save post to PostgreSQL
    await prisma.whatsNewPost.create({
      data: {
        userId,
        title: rp.title || 'Curated Styling',
        summary: rp.summary || 'Editorial coordinates and styling breakdown.',
        source: rp.source || 'Curated Feed',
        tags: rp.tags || [],
        imageUrl: resolvedImageUrl,
        createdAt: new Date(),
      },
    });
  }

  // Return the user's stream in the requested sort order
  return await getUserWhatsNew(userId, sort);
}

/**
 * Universal wrapper for backwards compatibility with any existing callers.
 */
export async function getOrGenerateWhatsNew(
  userIdOrForce?: string | boolean,
  force = false,
  sort: 'desc' | 'asc' = 'desc'
): Promise<WhatsNewData> {
  if (typeof userIdOrForce === 'string') {
    if (force) {
      return await generateAndSaveUserWhatsNew(userIdOrForce, sort);
    }
    return await getUserWhatsNew(userIdOrForce, sort);
  }

  const shouldForce = typeof userIdOrForce === 'boolean' ? userIdOrForce : force;
  if (!shouldForce) {
    return {
      generatedAt: new Date().toISOString(),
      posts: [],
    };
  }

  return {
    generatedAt: new Date().toISOString(),
    posts: [],
  };
}
