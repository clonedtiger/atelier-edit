import fs from 'fs';
import path from 'path';
import Parser from 'rss-parser';
import { prisma } from './db';
import { extractTrendsFromContent } from './gemini';

const parser = new Parser();

interface ExtractedOutline {
  title: string;
  xmlUrl: string;
  htmlUrl: string;
  type: string;
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
      attrs[attrMatch[1]] = attrMatch[2];
    }

    // We only care about outline tags that have xmlUrl (which are our RSS feeds)
    if (attrs.xmlUrl) {
      outlines.push({
        title: attrs.title || attrs.text || 'Unnamed Feed',
        xmlUrl: attrs.xmlUrl,
        htmlUrl: attrs.htmlUrl || '',
        type: attrs.type || 'rss'
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
    await prisma.feedSource.upsert({
      where: { url: source.xmlUrl },
      update: { name: source.title, type: source.type },
      create: {
        name: source.title,
        url: source.xmlUrl,
        type: source.type
      }
    });
  }
}

/**
 * Fetches the latest articles from all sources, scrapes clean text using r.jina.ai,
 * and extracts trend keywords using Gemini.
 */
export async function syncArticlesAndTrends(limitPerFeed = 2, force = false) {
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

  // Purge any trend articles that failed to extract trends previously (due to API model name issues) to allow reprocessing
  await prisma.trendArticle.deleteMany({
    where: {
      extractedTrends: {
        equals: []
      }
    }
  });

  const sources = await prisma.feedSource.findMany({
    where: { isMuted: false }
  });
  console.log(`Syncing articles for ${sources.length} sources...`);

  for (const source of sources) {
    try {
      console.log(`Fetching feed: ${source.name} (${source.url})`);
      const feed = await parser.parseURL(source.url);
      
      // Get the latest N items
      const items = feed.items.slice(0, limitPerFeed);

      for (const item of items) {
        const link = item.link || '';
        const title = item.title || 'Untitled Article';
        const pubDate = item.pubDate ? new Date(item.pubDate) : new Date();

        if (!link) continue;

        // Check if we already processed this article
        const existing = await prisma.trendArticle.findUnique({
          where: { sourceUrl: link }
        });

        if (existing) {
          console.log(`Skipping existing article: ${title}`);
          continue;
        }

        console.log(`Parsing new article: ${title}`);
        
        let cleanText = item.contentSnippet || item.content || '';
        
        // If it's a web link, try to use Jina Reader for clean Markdown extraction
        if (link.startsWith('http') && !source.url.includes('youtube.com')) {
          try {
            console.log(`Fetching clean markdown from Jina Reader for: ${link}`);
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

        // Use Gemini to extract key trends from the article body
        console.log(`Running Gemini trend extraction on: ${title}`);
        const trends = await extractTrendsFromContent(title, cleanText);
        console.log(`Extracted trends for "${title}":`, trends);

        // Save to Database
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
  }
  console.log('Feed sync complete.');
}
