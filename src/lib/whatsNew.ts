import sharp from 'sharp';
import { prisma } from './db';
import { getAi, MODEL_NAME, safeParseGeminiJson, withGeminiRetry } from './gemini';
import { syncArticlesAndTrends } from './feed';
import { uploadImage } from './storage';
import { sendWhatsNewEmailDigest } from './email';

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

/** Womenswear-specific garments that must never appear in a menswear-only stream. */
export const WOMENSWEAR_TERMS = [
  'dress', 'dresses', 'gown', 'gowns', 'skirt', 'skirts', 'blouse', 'blouses',
  'bra', 'bras', 'lingerie', 'bikini', 'swimsuit', 'high heels', 'stilettos',
  'womenswear', 'maternity',
];

const MENSWEAR_TERMS = ['men', "men's", 'menswear', 'mens', 'male'];

/** Stock-photo agencies whose images are watermarked and licensed; never re-host these. */
const BLOCKED_IMAGE_HOSTS = [
  'gettyimages', 'istockphoto', 'shutterstock', 'alamy', 'dreamstime',
  'depositphotos', 'stock.adobe', 'ftcdn.net', 'bigstockphoto', '123rf', 'agefotostock',
];

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Whole-word, case-insensitive match. Substring matching misfires badly on fashion copy:
 * "bra" matches "brand" and "vibrant", "dress" matches "well-dressed", "men" matches "women".
 */
export function containsAnyWord(text: string, words: string[]): boolean {
  return words.some((w) => new RegExp(`(^|[^a-z])${escapeRegExp(w.toLowerCase())}($|[^a-z])`).test(text.toLowerCase()));
}

/** Menswear phrases that contain an otherwise-forbidden word. */
const MENSWEAR_SAFE_PHRASES = [
  'dress shirt', 'dress shirts', 'dress shoe', 'dress shoes', 'dress boot', 'dress boots',
  'dress trousers', 'dress pants', 'dress code', 'dress watch', 'dress down', 'dress up',
  'dressing gown', 'dressing gowns',
];

/** True if the text describes womenswear garments, ignoring menswear phrases like "dress shirt". */
export function mentionsWomenswear(text: string): boolean {
  let cleaned = text.toLowerCase();
  for (const phrase of MENSWEAR_SAFE_PHRASES) {
    cleaned = cleaned.split(phrase).join(' ');
  }
  return containsAnyWord(cleaned, WOMENSWEAR_TERMS);
}

export function isBlockedImageUrl(url: string): boolean {
  try {
    const host = new URL(url).hostname.toLowerCase();
    return BLOCKED_IMAGE_HOSTS.some((blocked) => host.includes(blocked));
  } catch {
    return true;
  }
}

/**
 * Downloads an external image over HTTP, validates it through Sharp,
 * converts to WebP, and stores it permanently via uploadImage (GCS/local).
 * Returns the web-accessible URL or null if download/decode fails.
 */
async function downloadAndStoreImage(imageUrl: string, filenamePrefix: string): Promise<string | null> {
  try {
    if (!imageUrl || !imageUrl.startsWith('http') || isBlockedImageUrl(imageUrl)) {
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
  genderModifier: string,
  prefix: string
): Promise<string | null> {
  const apiKey = process.env.TAVILY_API_KEY;
  if (!apiKey) {
    return null;
  }

  try {
    const searchQuery = `${query} ${genderModifier} fashion editorial runway street style -site:gettyimages.com -site:shutterstock.com -site:alamy.com`.trim();

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
      signal: AbortSignal.timeout(8000),
    });

    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data.images) && data.images.length > 0) {
        for (const candidateUrl of data.images) {
          if (typeof candidateUrl === 'string' && candidateUrl.startsWith('http') && !isBlockedImageUrl(candidateUrl)) {
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
 * - Strictly respects the user's sex and gender identity (e.g. Male -> Menswear only, strictly no female clothing).
 * - Actively weaves in the user's listed inspiration feeds, style notes, and visual clippings.
 * - Extracts trends from subscribed feed articles, filtering out mismatched gender content.
 * - Downloads, converts, and saves every image permanently to storage (avoiding broken links).
 * - Stores the posts in PostgreSQL and returns the stream in the requested chronological order.
 */
export async function generateAndSaveUserWhatsNew(
  userId: string,
  sort: 'desc' | 'asc' = 'desc'
): Promise<WhatsNewData> {
  console.log(`Synthesizing fresh What's New editorial stream for user ${userId}...`);

  // 1. Fetch user profile, gender, sex, custom feeds, subscriptions, and inspirations
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      email: true,
      sex: true,
      gender: true,
      styleAesthetic: true,
      favoriteBrands: true,
      avoidedStyles: true,
      inspirationNotes: true,
      customFeeds: {
        select: {
          id: true,
          name: true,
          url: true,
          category: true,
          type: true,
        },
      },
      feedSubscriptions: {
        include: {
          feedSource: true,
        },
      },
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

  // 2. Top up recent articles. Not forced (skipped if synced in the last 15 minutes) and
  // time-boxed so the whole request stays well inside Firebase Hosting's 60-second proxy limit.
  // The deadline stops new work being started; the race below also stops this request waiting on
  // scrapes/extractions already in flight, which finish in the background and help the next refresh.
  let syncTimer: ReturnType<typeof setTimeout> | undefined;
  try {
    await Promise.race([
      syncArticlesAndTrends(2, false, { deadlineMs: 12000 }),
      new Promise<void>((resolve) => {
        syncTimer = setTimeout(resolve, 15000);
      }),
    ]);
  } catch (syncErr) {
    console.warn('Feed sync error during whats-new generation:', syncErr);
  } finally {
    clearTimeout(syncTimer);
  }

  // 3. Fetch latest trend articles from database
  const allArticles = await prisma.trendArticle.findMany({
    orderBy: { createdAt: 'desc' },
    take: 15,
    select: {
      sourceName: true,
      title: true,
      extractedTrends: true,
      content: true,
    },
  });

  // 4. Determine user styling identity based on sex and gender
  const userSex = (user?.sex || '').trim().toLowerCase();
  const userGender = (user?.gender || '').trim().toLowerCase();

  // If gender is set, prioritize gender; otherwise biological sex
  const isMale = userGender === 'male' || (!userGender && userSex === 'male');
  const isFemale = userGender === 'female' || (!userGender && userSex === 'female');

  // Filter articles for male users so Gemini is not primed with purely womenswear pieces
  let articles = allArticles;
  if (isMale) {
    const filtered = allArticles.filter((a) => {
      const text = `${a.title} ${a.extractedTrends.join(' ')}`;
      return !mentionsWomenswear(text) || containsAnyWord(text, MENSWEAR_TERMS);
    });

    if (filtered.length >= 3) {
      articles = filtered;
    }
  }

  // 5. Formulate gender and inspiration directives for Gemini
  let genderDirective = '';
  if (isMale) {
    genderDirective = `
CRITICAL GENDER & PRESENTATION RESTRICTION:
- Biological Sex: ${user?.sex || 'Male'}
- Gender: ${user?.gender || 'Male'}
- Required Fashion Category: 100% EXCLUSIVELY MENSWEAR AND MASCULINE LUXURY.
Every summary, title, actionable outfit coordinate, and styling tag MUST be specifically and exclusively for MENSWEAR (e.g. structured tailored suits, wool trousers, relaxed denim, overcoats, knitwear, masculine leather loafers/boots/sneakers, masculine accessories).

STRICT ZERO-TOLERANCE FORBIDDEN ITEMS:
You are STRICTLY FORBIDDEN from generating, mentioning, or describing ANY womenswear, female clothing, dresses, skirts, blouses, gowns, high heels, bras, or feminine silhouettes.
If an input trend article mentions womenswear, you MUST adapt the broader aesthetic concept (e.g. proportions, monochrome palettes, heavy wool drape, textured knitwear) STRICTLY into a masculine MENSWEAR look!
`;
  } else if (isFemale) {
    genderDirective = `
CRITICAL GENDER & PRESENTATION DIRECTIVE:
- Biological Sex: ${user?.sex || 'Female'}
- Gender: ${user?.gender || 'Female'}
- Required Fashion Category: CURATED LUXURY WOMENSWEAR.
The stream should feature curated luxury womenswear, tailoring, dresses, elevated silhouettes, feminine/androgynous luxury coordinates, and high-fashion womenswear aesthetic rules.
`;
  } else {
    genderDirective = `
GENDER DIRECTIVE:
- Biological Sex: ${user?.sex || 'Other'}
- Gender: ${user?.gender || 'Other'}
- Focus on contemporary unisex and gender-neutral luxury styling coordinates, versatile silhouettes, and modern androgynous tailoring.
`;
  }

  // Collect user's subscribed feeds and custom feeds
  const activeSubscribedFeeds = (user?.feedSubscriptions || [])
    .filter((sub) => !sub.isMuted)
    .map((sub) => `${sub.feedSource.name} (${sub.feedSource.category || sub.feedSource.type})`);
  const userCustomFeeds = (user?.customFeeds || []).map((f) => `${f.name} (${f.url})`);
  const allUserInspirationFeeds = [...activeSubscribedFeeds, ...userCustomFeeds];

  const inspirationDirective = `
CLIENT'S PERSONAL INSPIRATION FEEDS, NOTES & MOODBOARDS:
- Client's Personal Inspiration Guidelines & Notes: "${user?.inspirationNotes || 'None specified'}"
- Client's Subscribed Inspiration Feeds (${allUserInspirationFeeds.length} feeds):
${allUserInspirationFeeds.length > 0 ? allUserInspirationFeeds.map((feed) => `  * ${feed}`).join('\n') : '  * Standard Curated Runway Sources'}
- Uploaded Visual Inspiration Clippings (${userInspirations.length} images):
${
  userInspirations.length > 0
    ? userInspirations
        .map(
          (ins, i) =>
            `  * Inspiration Clipping #${i + 1}: Notes: "${ins.notes || 'None'}" | Aesthetic Tags: [${ins.tags.join(', ')}]`
        )
        .join('\n')
    : '  * (No visual photos uploaded yet)'
}

MANDATORY INSPIRATION REQUIREMENT:
You MUST actively weave the client's listed inspiration feeds, style notes, and visual clippings into these posts!
Show clearly how runway trends from their inspiration feeds directly validate and elevate the client's personal inspiration guidelines.
`;

  const prompt = `
    You are an elite editorial fashion stylist and trend intelligence director.
    Synthesize the latest fashion runway reports, trend articles, and the client's personal inspiration feeds into exactly 3-4 curated "Editorial Style Stream Posts".

    ${genderDirective}
    ${inspirationDirective}

    Client Aesthetic Profile:
    - Style DNA: ${user?.styleAesthetic || 'Modern Quiet Luxury with Timeless Tailoring'}
    - Favorite Brands: ${user?.favoriteBrands || 'Curated luxury & contemporary designers'}
    - Avoided Styles: ${user?.avoidedStyles || 'None'}

    Latest Trend Articles from Radar:
    ${articles.map((a) => `Source: ${a.sourceName} | Title: ${a.title} | Trends: ${a.extractedTrends.join(', ')} | Excerpt: ${a.content.slice(0, 1000)}`).join('\n\n')}

    Requirements:
    1. Provide a captivating, luxury-editorial headline for each post.
    2. Write an editorial summary (2-4 sentences) breaking down the trend, actionable outfit coordinates, and explicitly connecting to the client's inspirations and style DNA.
    3. Cite the primary source (e.g. publication name or client's specific inspiration feed name).
    4. Provide exactly 4-6 specific styling tags for the key clothing items, fabrics, or concepts (e.g. ["Double-Breasted Blazer", "Pleated Wool Trousers", "Cashmere Overcoat", "Loafers", "Minimalist Tailoring"]).
    5. Provide a specific visual search query to locate an editorial photograph for this exact look (e.g. "${isMale ? 'menswear tailored wool coat charcoal trousers street style' : 'womenswear cashmere coat street style'}").
    6. If the post directly reflects one of the client's visual clippings, specify "matchedInspirationIndex" (0-indexed integer corresponding to Inspiration Clipping #1, #2, etc.), otherwise null.

    Output strictly a JSON object with this structure:
    {
      "posts": [
        {
          "title": "Editorial Headline",
          "summary": "Editorial caption text...",
          "source": "Vogue Runway",
          "tags": ["Tailoring", "Wool Coat", "Pleated Trousers", "Loafers"],
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
    const response = await withGeminiRetry(() =>
      getAi().models.generateContent({
        model: MODEL_NAME,
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
        },
      })
    );

    const text = response.text || '{}';
    const parsed = safeParseGeminiJson<{ posts?: RawPost[] }>(text);
    rawPosts = (parsed.posts || []).filter((p) => p && p.title && p.summary);
  } catch (err) {
    console.error('Gemini editorial stream generation failed:', err);
    throw new Error('The editorial stylist is temporarily unavailable. Please try again in a minute.');
  }

  // Drop (rather than rewrite) any post that slips womenswear into a menswear-only stream
  if (isMale) {
    const before = rawPosts.length;
    rawPosts = rawPosts.filter(
      (post) => !mentionsWomenswear(`${post.title} ${post.summary} ${(post.tags || []).join(' ')}`)
    );
    if (rawPosts.length < before) {
      console.warn(`Dropped ${before - rawPosts.length} post(s) containing womenswear for a menswear stream.`);
    }
  }

  if (rawPosts.length === 0) {
    throw new Error('No new editorial posts could be generated this time. Please try again shortly.');
  }

  // Guarantee 3-6 descriptive tags for key items or concepts
  for (const post of rawPosts) {
    if (!Array.isArray(post.tags) || post.tags.length === 0) {
      post.tags = isMale
        ? ['Tailoring', 'Menswear', 'Outerwear', 'Minimalism', 'Luxury']
        : ['Tailoring', 'Womenswear', 'Luxury', 'Elevated Chic', 'Capsule'];
    }
    // Clean, remove leading hash, and cap at 6
    post.tags = post.tags
      .map((t) => t.trim().replace(/^#/, ''))
      .filter(Boolean)
      .slice(0, 6);
  }

  // 6. Resolve, download, and store every image into local/GCS storage
  const genderModifier = isMale ? 'men menswear' : isFemale ? 'women womenswear' : '';
  const newlyCreatedPosts: WhatsNewPost[] = [];

  const resolveImage = async (rp: RawPost, i: number): Promise<string> => {
    // Check if matched to a user's uploaded visual inspiration
    if (
      typeof rp.matchedInspirationIndex === 'number' &&
      userInspirations[rp.matchedInspirationIndex]?.imageUrl
    ) {
      return userInspirations[rp.matchedInspirationIndex].imageUrl;
    }
    if (userInspirations.length > 0) {
      const postTags = rp.tags.map((x) => x.toLowerCase());
      const matchedIns = userInspirations.find((ins) => ins.tags.some((t) => postTags.includes(t.toLowerCase())));
      if (matchedIns?.imageUrl) {
        return matchedIns.imageUrl;
      }
    }

    // Cap the search + download attempts per post; a slow image host must not stall the refresh
    let imageTimer: ReturnType<typeof setTimeout> | undefined;
    const searched = await Promise.race([
      searchAndSaveEditorialImage(rp.imageSearchQuery || rp.title, genderModifier, `editorial-${i + 1}`),
      new Promise<null>((resolve) => {
        imageTimer = setTimeout(() => resolve(null), 12000);
      }),
    ]).finally(() => clearTimeout(imageTimer));
    if (searched) return searched;

    if (userInspirations.length > 0) {
      return userInspirations[i % userInspirations.length].imageUrl;
    }

    // No image: the UI renders a typographic header instead of a placeholder graphic
    return '';
  };

  const resolvedImages = await Promise.all(rawPosts.map((rp, i) => resolveImage(rp, i)));

  for (let i = 0; i < rawPosts.length; i++) {
    const rp = rawPosts[i];

    // Save post to PostgreSQL (historical posts are preserved)
    const createdPost = await prisma.whatsNewPost.create({
      data: {
        userId,
        title: rp.title || 'Curated Styling',
        summary: rp.summary || 'Editorial coordinates and styling breakdown.',
        source: rp.source || 'Curated Feed',
        tags: rp.tags || [],
        imageUrl: resolvedImages[i],
        createdAt: new Date(),
      },
    });

    if (createdPost) {
      newlyCreatedPosts.push({
        id: createdPost.id,
        title: createdPost.title,
        summary: createdPost.summary,
        source: createdPost.source,
        tags: createdPost.tags,
        imageUrl: createdPost.imageUrl,
        createdAt: createdPost.createdAt ? createdPost.createdAt.toISOString() : new Date().toISOString(),
      });
    }
  }

  // 7. Dispatch new editorial digest to user's registered email address
  if (user?.email && newlyCreatedPosts.length > 0) {
    sendWhatsNewEmailDigest({
      email: user.email,
      name: user.name,
      styleAesthetic: user.styleAesthetic,
      posts: newlyCreatedPosts,
    }).catch((emailErr) => {
      console.warn('Non-blocking error dispatching What\'s New email digest:', emailErr);
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
