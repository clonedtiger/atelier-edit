import Parser from 'rss-parser';
import { extractTrendsFromContent } from './gemini';

const parser = new Parser();

export interface InstagramArticleItem {
  title: string;
  sourceUrl: string;
  sourceName: string;
  content: string;
  publishedAt: Date;
  extractedTrends: string[];
}

/**
 * Sanitizes and extracts the raw Instagram username handle from various user inputs
 * (e.g. "@chanelofficial", "chanelofficial", "https://instagram.com/chanelofficial/").
 */
export function cleanInstagramHandle(input: string): string {
  if (!input) return '';
  let cleaned = input.trim();

  // Strip full URL prefixes if pasted
  cleaned = cleaned.replace(/^https?:\/\/(www\.)?instagram\.com\//i, '');
  // Remove query params or trailing slashes
  cleaned = cleaned.split('?')[0].split('/')[0];
  // Strip leading @
  cleaned = cleaned.replace(/^@/, '');

  return cleaned.toLowerCase();
}

/**
 * Strategy A: Fetches public Instagram posts via open RSSHub bridge endpoint.
 */
export async function fetchInstagramViaBridge(handle: string): Promise<InstagramArticleItem[]> {
  const cleanHandle = cleanInstagramHandle(handle);
  if (!cleanHandle) return [];

  const bridgeUrls = [
    `https://rsshub.app/instagram/user/${cleanHandle}`,
    `https://rss.app/feeds/instagram/${cleanHandle}.xml`
  ];

  for (const bridgeUrl of bridgeUrls) {
    try {
      console.log(`Attempting RSSHub bridge fetch for @${cleanHandle} via ${bridgeUrl}...`);
      const feed = await parser.parseURL(bridgeUrl);
      if (feed && feed.items && feed.items.length > 0) {
        const results: InstagramArticleItem[] = [];
        for (const item of feed.items.slice(0, 3)) {
          const title = item.title || `@${cleanHandle} Instagram Update`;
          const content = item.contentSnippet || item.content || `Post by @${cleanHandle}`;
          const link = item.link || `https://instagram.com/${cleanHandle}`;
          const pubDate = item.pubDate ? new Date(item.pubDate) : new Date();

          console.log(`Extracting trends for Instagram post @${cleanHandle}: "${title}"`);
          const trends = await extractTrendsFromContent(title, content);

          results.push({
            title,
            sourceUrl: link,
            sourceName: `@${cleanHandle} (Instagram)`,
            content,
            publishedAt: pubDate,
            extractedTrends: trends
          });
        }
        return results;
      }
    } catch (err) {
      console.warn(`RSS bridge fetch failed for @${cleanHandle} on ${bridgeUrl}:`, err instanceof Error ? err.message : err);
    }
  }

  return [];
}

/**
 * Strategy B (Fallback): Uses Tavily Web Search API to retrieve public fashion mentions,
 * runway coverage, and post summaries for @handle, then runs Gemini trend extraction.
 */
export async function fetchInstagramViaTavily(handle: string): Promise<InstagramArticleItem[]> {
  const cleanHandle = cleanInstagramHandle(handle);
  if (!cleanHandle) return [];

  const apiKey = process.env.TAVILY_API_KEY;
  if (!apiKey) {
    console.warn(`TAVILY_API_KEY not configured. Skipping Tavily fallback for @${cleanHandle}.`);
    return [];
  }

  try {
    const query = `"${cleanHandle}" fashion style outfit trends site:instagram.com OR site:vogue.com OR site:harpersbazaar.com OR site:graziadaily.co.uk`;
    console.log(`Executing Tavily Search fallback for Instagram handle @${cleanHandle}...`);

    const res = await fetch('https://api.tavily.com/search', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        api_key: apiKey,
        query,
        search_depth: 'basic',
        max_results: 3,
      }),
    });

    if (!res.ok) return [];

    const data = await res.json();
    if (!data.results || data.results.length === 0) return [];

    const results: InstagramArticleItem[] = [];

    for (let i = 0; i < data.results.length; i++) {
      const item = data.results[i];
      const title = `@${cleanHandle} - ${item.title || 'Instagram Fashion Style'}`;
      const content = item.content || `Fashion outfit coverage for @${cleanHandle}.`;
      const link = item.url || `https://instagram.com/${cleanHandle}#${i}`;

      const trends = await extractTrendsFromContent(title, content);

      results.push({
        title,
        sourceUrl: link,
        sourceName: `@${cleanHandle} (Instagram)`,
        content,
        publishedAt: new Date(),
        extractedTrends: trends
      });
    }

    return results;
  } catch (err) {
    console.error(`Tavily fallback search failed for @${cleanHandle}:`, err);
    return [];
  }
}

/**
 * Primary entry point: Synchronizes an Instagram account feed source using Dual Strategy (RSSHub Bridge -> Tavily Fallback).
 */
export async function syncInstagramAccount(handle: string): Promise<InstagramArticleItem[]> {
  const cleanHandle = cleanInstagramHandle(handle);
  if (!cleanHandle) return [];

  // Try Strategy A first
  const bridgeResults = await fetchInstagramViaBridge(cleanHandle);
  if (bridgeResults.length > 0) {
    console.log(`Successfully synced ${bridgeResults.length} articles for @${cleanHandle} via RSS bridge.`);
    return bridgeResults;
  }

  // Fall back to Strategy B
  console.log(`Bridge yield empty for @${cleanHandle}. Triggering Tavily + Gemini fallback extraction...`);
  const tavilyResults = await fetchInstagramViaTavily(cleanHandle);
  console.log(`Synced ${tavilyResults.length} articles for @${cleanHandle} via Tavily fallback.`);
  return tavilyResults;
}
