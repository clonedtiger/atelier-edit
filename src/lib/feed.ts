import fs from 'fs';
import path from 'path';
import Parser from 'rss-parser';
import { prisma } from './db';
import { extractTrendsFromContent } from './gemini';
import { syncInstagramAccount } from './instagram';

const parser = new Parser({ timeout: 10000 });

interface ExtractedOutline {
  title: string;
  xmlUrl: string;
  htmlUrl: string;
  type: string;
  category?: string;
  /** Feeds marked retired="true" are kept in the OPML only so existing rows get muted. */
  retired?: boolean;
}

function decodeXmlEntities(value: string): string {
  return value
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&');
}

/**
 * Parses the fashion_feed_sources.opml file from the workspace.
 */
export function parseOPML(): ExtractedOutline[] {
  const opmlPath = path.join(process.cwd(), 'fashion_feed_sources.opml');
  if (!fs.existsSync(opmlPath)) {
    console.warn(`OPML file not found at ${opmlPath}`);
    return [];
  }

  const content = fs.readFileSync(opmlPath, 'utf-8');
  const outlines: ExtractedOutline[] = [];

  // Match all <outline ... /> elements
  const outlineRegex = /<outline\s+([^>]+)\/?>/g;
  let match;

  while ((match = outlineRegex.exec(content)) !== null) {
    const attrString = match[1];
    const attrs: Record<string, string> = {};
    
    // Parse individual attributes like key="value"
    const attrRegex = /(\w+)="([^"]*)"/g;
    let attrMatch;
    while ((attrMatch = attrRegex.exec(attrString)) !== null) {
      attrs[attrMatch[1]] = decodeXmlEntities(attrMatch[2]);
    }

    // We only care about outline tags that have xmlUrl (which are our RSS feeds)
    if (attrs.xmlUrl) {
      outlines.push({
        title: attrs.title || attrs.text || 'Unnamed Feed',
        xmlUrl: attrs.xmlUrl,
        htmlUrl: attrs.htmlUrl || '',
        type: attrs.type || 'rss',
        category: attrs.category || undefined,
        retired: attrs.retired === 'true' ? true : undefined,
      });
    }
  }

  return outlines;
}

/**
 * Seeds or syncs feed sources from OPML into the database.
 */
export async function syncFeedSourcesFromOPML() {
  const sources = parseOPML();
  console.log(`Parsed ${sources.length} feed sources from OPML.`);

  for (const source of sources) {
    if (source.retired) {
      // Mute curated rows for dead feeds so sync stops fetching them; user-added feeds are left alone.
      await prisma.feedSource.updateMany({
        where: { url: source.xmlUrl, userId: null },
        data: { isMuted: true },
      });
      continue;
    }

    await prisma.feedSource.upsert({
      where: { url: source.xmlUrl },
      update: { name: source.title, type: source.type, ...(source.category ? { category: source.category } : {}) },
      create: {
        name: source.title,
        url: source.xmlUrl,
        type: source.type,
        category: source.category ?? null,
      }
    });
  }
}

export interface SyncOptions {
  /** Stop starting new work once this many milliseconds have elapsed. */
  deadlineMs?: number;
  /** How many feed sources to fetch at once. */
  concurrency?: number;
}

/**
 * Runs `worker` over `items` with at most `limit` in flight at a time.
 */
async function runWithConcurrency<T>(items: T[], limit: number, worker: (item: T) => Promise<void>): Promise<void> {
  let next = 0;
  const runners = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (next < items.length) {
      const item = items[next++];
      await worker(item);
    }
  });
  await Promise.all(runners);
}

/**
 * Fetches the latest articles from all sources, scrapes clean text using r.jina.ai,
 * and extracts trend keywords using Gemini.
 *
 * Sources are fetched in parallel. When a deadline is given, no new source or article is
 * started after it passes, so request-path callers stay inside the hosting proxy timeout;
 * anything skipped is picked up by the next sync. Articles whose trend extraction fails are
 * not saved, so they are retried next time rather than stored with no trends.
 */
export async function syncArticlesAndTrends(limitPerFeed = 2, force = false, options: SyncOptions = {}) {
  const deadline = options.deadlineMs ? Date.now() + options.deadlineMs : Number.POSITIVE_INFINITY;
  const pastDeadline = () => Date.now() > deadline;

  // Ensure we have sources in the database
  await syncFeedSourcesFromOPML();

  // Rate limiting check: if not forced, skip if any article was synced in the last 15 minutes
  if (!force) {
    const latestArticle = await prisma.trendArticle.findFirst({
      orderBy: { createdAt: 'desc' }
    });
    if (latestArticle && (Date.now() - latestArticle.createdAt.getTime() < 15 * 60 * 1000)) {
      console.log('Feeds were synced in the last 15 minutes. Skipping background fetch to prevent API exhaustion.');
      return;
    }
  }

  const sources = await prisma.feedSource.findMany({
    where: { isMuted: false }
  });
  console.log(`Syncing articles for ${sources.length} sources...`);

  await runWithConcurrency(sources, options.concurrency ?? 6, async (source) => {
    if (pastDeadline()) return;
    try {
      console.log(`Fetching feed: ${source.name} (${source.url}) [Type: ${source.type}]`);

      if (source.type === 'instagram') {
        const instagramArticles = await syncInstagramAccount(source.url);
        for (const article of instagramArticles) {
          const existing = await prisma.trendArticle.findUnique({
            where: { sourceUrl: article.sourceUrl }
          });
          if (existing) continue;

          await prisma.trendArticle.create({
            data: {
              sourceUrl: article.sourceUrl,
              sourceName: article.sourceName,
              title: article.title,
              content: article.content.slice(0, 15000),
              publishedAt: article.publishedAt,
              extractedTrends: article.extractedTrends
            }
          });
        }
        return;
      }

      const feed = await parser.parseURL(source.url);

      // Get the latest N items
      const items = feed.items.slice(0, limitPerFeed);

      for (const item of items) {
        if (pastDeadline()) return;

        const link = item.link || '';
        const title = item.title || 'Untitled Article';
        const pubDate = item.pubDate ? new Date(item.pubDate) : new Date();

        if (!link) continue;

        // Check if we already processed this article
        const existing = await prisma.trendArticle.findUnique({
          where: { sourceUrl: link }
        });

        if (existing) continue;

        console.log(`Parsing new article: ${title}`);

        let cleanText = item.contentSnippet || item.content || '';

        // If it's a web link, try to use Jina Reader for clean Markdown extraction
        if (link.startsWith('http') && !source.url.includes('youtube.com')) {
          try {
            const jinaUrl = `https://r.jina.ai/${link}`;
            const res = await fetch(jinaUrl, {
              headers: {
                'Accept': 'text/plain',
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'
              },
              signal: AbortSignal.timeout(10000) // 10s timeout
            });
            if (res.ok) {
              const text = await res.text();
              if (text && text.trim().length > 100) {
                cleanText = text;
              }
            }
          } catch (scrapeErr) {
            console.warn(`Failed to scrape via Jina Reader:`, scrapeErr);
          }
        }

        let trends: string[];
        try {
          trends = await extractTrendsFromContent(title, cleanText);
        } catch (aiErr) {
          console.error(`Gemini trend extraction failed for "${title}"; will retry on next sync:`, aiErr);
          continue;
        }

        await prisma.trendArticle.create({
          data: {
            sourceUrl: link,
            sourceName: source.name,
            title: title,
            content: cleanText.slice(0, 15000), // Truncate to protect database sizing
            publishedAt: pubDate,
            extractedTrends: trends
          }
        });
      }
    } catch (err) {
      console.error(`Failed to sync source ${source.name}:`, err);
    }
  });

  console.log(pastDeadline() ? 'Feed sync stopped at its time budget; remaining sources will sync next time.' : 'Feed sync complete.');
}
