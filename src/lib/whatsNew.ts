import { prisma } from './db';
import { getAi, MODEL_NAME, safeParseGeminiJson, withGeminiRetry } from './gemini';
import { syncArticlesAndTrends } from './feed';
import { sendWhatsNewEmailDigest } from './email';
import { pieceLabel } from './pieceName';

export interface WhatsNewPost {
  id: string;
  title: string;
  summary: string;
  source: string;
  tags: string[];
  imageUrl: string;
  /** Link to the original article the post is based on. */
  sourceUrl?: string | null;
  /** One piece worth adding to complete the trend. */
  suggestedPiece?: string | null;
  /** The person's own pieces that fit the trend. */
  pieces?: Array<{ id: string; imageUrl: string; label: string }>;
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

const OG_IMAGE_PATTERNS = [
  /<meta[^>]+property=["']og:image(?::secure_url)?["'][^>]*content=["']([^"']+)["']/i,
  /<meta[^>]+content=["']([^"']+)["'][^>]*property=["']og:image(?::secure_url)?["']/i,
  /<meta[^>]+name=["']twitter:image["'][^>]*content=["']([^"']+)["']/i,
  /<meta[^>]+content=["']([^"']+)["'][^>]*name=["']twitter:image["']/i,
];

/**
 * Reads the article's own preview image (og:image / twitter:image) so a post shows the
 * picture the publisher chose for that story. The image is shown hotlinked with a link back
 * to the article, the way link previews work, rather than downloaded and re-hosted.
 */
export async function fetchArticleImage(articleUrl: string | null | undefined): Promise<string | null> {
  if (!articleUrl || !/^https?:\/\//.test(articleUrl)) return null;
  // YouTube pages don't reliably expose og:image to non-browser clients; use the video thumbnail
  const youtubeId = articleUrl.match(/(?:youtube\.com\/(?:watch\?v=|shorts\/)|youtu\.be\/)([\w-]{11})/)?.[1];
  if (youtubeId) return `https://i.ytimg.com/vi/${youtubeId}/hqdefault.jpg`;
  try {
    const res = await fetch(articleUrl, {
      signal: AbortSignal.timeout(5000),
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; AtelierEditBot/1.0; +https://atelieredit.info)', Accept: 'text/html' },
    });
    if (!res.ok || !(res.headers.get('content-type') || '').includes('html')) return null;
    // The <head> is all we need; avoid buffering large pages
    const html = (await res.text()).slice(0, 300_000);
    for (const pattern of OG_IMAGE_PATTERNS) {
      const match = html.match(pattern);
      if (match?.[1]) {
        const resolved = new URL(match[1].replace(/&amp;/g, '&'), articleUrl).toString();
        if (resolved.startsWith('https://') && !isBlockedImageUrl(resolved)) return resolved;
      }
    }
  } catch (err) {
    console.warn(`Could not read preview image for ${articleUrl}:`, err instanceof Error ? err.message : err);
  }
  return null;
}

/**
 * Retrieves the user's personalized "What's New" stream from PostgreSQL, with the
 * wardrobe pieces each post refers to resolved to photos and names.
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

  const pieceIds = Array.from(new Set(posts.flatMap((p) => p.wardrobeItemIds || [])));
  const pieces = pieceIds.length
    ? await prisma.wardrobeItem.findMany({
        where: { id: { in: pieceIds }, userId },
        select: { id: true, imageUrl: true, brand: true, styleNotes: true, category: true },
      })
    : [];
  const pieceById = new Map(pieces.map((p) => [p.id, { id: p.id, imageUrl: p.imageUrl, label: pieceLabel(p.brand, p.styleNotes, p.category) }]));

  return {
    generatedAt: new Date().toISOString(),
    posts: posts.map((p) => ({
      id: p.id,
      title: p.title,
      summary: p.summary,
      source: p.source,
      tags: p.tags,
      imageUrl: p.imageUrl,
      sourceUrl: p.sourceUrl ?? null,
      suggestedPiece: p.suggestedPiece ?? null,
      pieces: (p.wardrobeItemIds || []).map((id) => pieceById.get(id)).filter((x): x is { id: string; imageUrl: string; label: string } => Boolean(x)),
      createdAt: p.createdAt.toISOString(),
    })),
  };
}

const POSTS_SCHEMA = {
  type: 'object',
  properties: {
    posts: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          title: { type: 'string' },
          summary: { type: 'string' },
          sourceArticleIndex: { type: 'integer', description: 'Index of the article this post is based on' },
          wardrobeItemIds: { type: 'array', items: { type: 'string' }, description: "IDs of the client's own pieces that fit this trend" },
          suggestedPiece: { type: 'string', description: 'One piece worth adding, if the wardrobe lacks it' },
          tags: { type: 'array', items: { type: 'string' } },
          matchedInspirationIndex: { type: 'integer', description: 'Index of a matching inspiration photo, if any' },
        },
        required: ['title', 'summary', 'sourceArticleIndex', 'wardrobeItemIds', 'tags'],
      },
    },
  },
  required: ['posts'],
};

/**
 * Generates new What's New posts that read this season's trends against the person's
 * own wardrobe: each post is grounded in one real article (linked), names the pieces they
 * already own that fit, and suggests at most one piece to add.
 */
export async function generateAndSaveUserWhatsNew(
  userId: string,
  sort: 'desc' | 'asc' = 'desc'
): Promise<WhatsNewData> {
  console.log(`Generating What's New posts for user ${userId}...`);

  // 1. Profile, followed sources, inspirations and wardrobe
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

  const [userInspirations, wardrobe] = await Promise.all([
    prisma.inspirationImage.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 10,
      select: { id: true, imageUrl: true, notes: true, tags: true },
    }),
    prisma.wardrobeItem.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 80,
      select: { id: true, category: true, brand: true, color: true, styleNotes: true },
    }),
  ]);

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

  // 3. Latest articles, preferring the sources this person follows
  const followedNames = new Set([
    ...(user?.feedSubscriptions || []).filter((s) => !s.isMuted).map((s) => s.feedSource.name),
    ...(user?.customFeeds || []).map((f) => f.name),
  ]);
  const recentArticles = await prisma.trendArticle.findMany({
    orderBy: { createdAt: 'desc' },
    take: 30,
    select: { sourceName: true, sourceUrl: true, title: true, extractedTrends: true, content: true },
  });
  const allArticles = [
    ...recentArticles.filter((a) => followedNames.has(a.sourceName)),
    ...recentArticles.filter((a) => !followedNames.has(a.sourceName)),
  ].slice(0, 15);

  // 4. How the person dresses: gender takes precedence over sex
  const userSex = (user?.sex || '').trim().toLowerCase();
  const userGender = (user?.gender || '').trim().toLowerCase();
  const isMale = userGender === 'male' || (!userGender && userSex === 'male');
  const isFemale = userGender === 'female' || (!userGender && userSex === 'female');

  // Filter articles for menswear so Gemini is not primed with purely womenswear pieces
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

  // 5. Prompt
  let genderDirective: string;
  if (isMale) {
    genderDirective = `
DRESSES IN: MENSWEAR
- Required Fashion Category: 100% EXCLUSIVELY MENSWEAR AND MASCULINE LUXURY.
Every title, summary, piece and tag MUST be for menswear (tailoring, trousers, denim, overcoats, knitwear, loafers, boots, sneakers, masculine accessories).
You are STRICTLY FORBIDDEN from generating, mentioning, or describing ANY womenswear, female clothing, dresses, skirts, blouses, gowns, high heels, bras, or feminine silhouettes.
If an article is about womenswear, translate its broader idea (proportion, palette, fabric) into a menswear look.
`;
  } else if (isFemale) {
    genderDirective = `
DRESSES IN: WOMENSWEAR
The stream should cover womenswear: tailoring, dresses, knitwear, and feminine or androgynous silhouettes.
`;
  } else {
    genderDirective = `
DRESSES IN: BOTH / GENDER-NEUTRAL
Focus on versatile, gender-neutral pieces and silhouettes.
`;
  }

  const wardrobeList = wardrobe.length
    ? wardrobe
        .map((w) => `- ID: ${w.id} | ${w.category} | ${w.brand || 'Unbranded'} | ${w.color.join('/')} | ${(w.styleNotes || '').slice(0, 120)}`)
        .join('\n')
    : '- (No pieces added yet: describe what to look for instead, and leave wardrobeItemIds empty.)';

  const inspirationList = userInspirations.length
    ? userInspirations.map((ins, i) => `- Inspiration #${i}: "${ins.notes || 'No notes'}" [${ins.tags.join(', ')}]`).join('\n')
    : '- (none)';

  const prompt = `
    You are a personal stylist writing a short "What's new for you" briefing.
    Read this season's trends against the client's own wardrobe. The point of every post is: here is a trend, here is how YOU can wear it with pieces you already own, and (only if needed) the one piece worth adding.

    ${genderDirective}

    CLIENT
    - Style: ${user?.styleAesthetic || 'Not specified'}
    - Favourite brands: ${user?.favoriteBrands || 'Not specified'}
    - Avoids: ${user?.avoidedStyles || 'Nothing specified'}
    - Notes: ${user?.inspirationNotes || 'None'}

    CLIENT'S WARDROBE (use these exact IDs):
    ${wardrobeList}

    CLIENT'S INSPIRATION PHOTOS:
    ${inspirationList}

    ARTICLES (use the index number to say which one each post is based on):
    ${articles.map((a, i) => `[${i}] ${a.sourceName}: "${a.title}" | Trends: ${a.extractedTrends.join(', ')} | Excerpt: ${a.content.slice(0, 700)}`).join('\n\n')}

    Write 3 posts, each based on a DIFFERENT article. For each post:
    1. "title": a short, specific headline in plain editorial English (no hype words such as "elite", "ultimate", "elevated").
    2. "summary": 2-3 sentences: what the trend is, then exactly how to wear it with the named pieces from the client's wardrobe.
    3. "sourceArticleIndex": the index of the article it is based on.
    4. "wardrobeItemIds": 1-3 IDs from the client's wardrobe that fit this trend (empty only if the wardrobe is empty).
    5. "suggestedPiece": at most one specific piece worth adding if the wardrobe lacks something essential for the trend; omit otherwise.
    6. "tags": 3-5 short plain tags (garments, fabrics or colours).
    7. "matchedInspirationIndex": only if one inspiration photo clearly shows this trend.
  `;

  interface RawPost {
    title: string;
    summary: string;
    sourceArticleIndex?: number;
    wardrobeItemIds?: string[];
    suggestedPiece?: string;
    tags: string[];
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
          responseJsonSchema: POSTS_SCHEMA,
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
      (post) => !mentionsWomenswear(`${post.title} ${post.summary} ${(post.tags || []).join(' ')} ${post.suggestedPiece || ''}`)
    );
    if (rawPosts.length < before) {
      console.warn(`Dropped ${before - rawPosts.length} post(s) containing womenswear for a menswear stream.`);
    }
  }

  if (rawPosts.length === 0) {
    throw new Error('No new editorial posts could be generated this time. Please try again shortly.');
  }

  const ownedIds = new Set(wardrobe.map((w) => w.id));

  const prepared = rawPosts.map((rp) => {
    const article = typeof rp.sourceArticleIndex === 'number' ? articles[rp.sourceArticleIndex] : undefined;
    const inspiration =
      typeof rp.matchedInspirationIndex === 'number' ? userInspirations[rp.matchedInspirationIndex] : undefined;
    return {
      title: rp.title,
      summary: rp.summary,
      // The source is the real article's publication, never model-written attribution
      source: article?.sourceName || 'Atelier Edit',
      sourceUrl: article?.sourceUrl || null,
      wardrobeItemIds: (rp.wardrobeItemIds || []).filter((id) => ownedIds.has(id)).slice(0, 3),
      suggestedPiece: rp.suggestedPiece?.trim() || null,
      tags: (Array.isArray(rp.tags) ? rp.tags : [])
        .map((t) => String(t).trim().replace(/^#/, ''))
        .filter(Boolean)
        .slice(0, 5),
      inspirationImage: inspiration?.imageUrl || null,
    };
  });

  // 6. Image: the person's own matching inspiration, else the article's preview image, else none
  const images = await Promise.all(
    prepared.map(async (post) => post.inspirationImage || (await fetchArticleImage(post.sourceUrl)) || '')
  );

  const newlyCreatedPosts: WhatsNewPost[] = [];
  for (let i = 0; i < prepared.length; i++) {
    const post = prepared[i];
    const createdPost = await prisma.whatsNewPost.create({
      data: {
        userId,
        title: post.title,
        summary: post.summary,
        source: post.source,
        sourceUrl: post.sourceUrl,
        wardrobeItemIds: post.wardrobeItemIds,
        suggestedPiece: post.suggestedPiece,
        tags: post.tags,
        imageUrl: images[i],
        createdAt: new Date(),
      },
    });

    newlyCreatedPosts.push({
      id: createdPost.id,
      title: createdPost.title,
      summary: createdPost.summary,
      source: createdPost.source,
      sourceUrl: post.sourceUrl,
      suggestedPiece: post.suggestedPiece,
      tags: createdPost.tags,
      imageUrl: createdPost.imageUrl,
      createdAt: createdPost.createdAt ? createdPost.createdAt.toISOString() : new Date().toISOString(),
    });
  }

  // 7. Email digest (non-blocking)
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

  return await getUserWhatsNew(userId, sort);
}
