import fs from 'fs';
import path from 'path';
import { prisma } from './db';
import { getAi, MODEL_NAME } from './gemini';
import { syncArticlesAndTrends } from './feed';

export interface WhatsNewPost {
  id: string;
  title: string;
  summary: string;
  source: string;
  tags: string[];
  imageUrl: string;
}

export interface WhatsNewData {
  generatedAt: string;
  posts: WhatsNewPost[];
}

const CACHE_FILE = path.join(process.cwd(), 'src', 'data', 'whats_new_feed.json');

async function searchInspirationImage(query: string): Promise<string> {
  const apiKey = process.env.TAVILY_API_KEY;
  if (apiKey) {
    try {
      const res = await fetch('https://api.tavily.com/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          api_key: apiKey,
          query: `${query} fashion editorial runway`,
          search_depth: 'basic',
          include_images: true,
          max_results: 1,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.images && data.images.length > 0) {
          return data.images[0];
        }
      }
    } catch (err) {
      console.warn('Failed to fetch image from Tavily:', err);
    }
  }
  // Curated premium fashion fallback images
  const placeholders = [
    'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?q=80&w=600&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1496747611176-843222e1e57c?q=80&w=600&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1469334031218-e382a71b716b?q=80&w=600&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1509631179647-0177331693ae?q=80&w=600&auto=format&fit=crop'
  ];
  return placeholders[Math.floor(Math.random() * placeholders.length)];
}

export async function getOrGenerateWhatsNew(force = false): Promise<WhatsNewData> {
  // 1. Try to read from cache file
  if (!force && fs.existsSync(CACHE_FILE)) {
    try {
      const cacheContent = fs.readFileSync(CACHE_FILE, 'utf8');
      const parsed = JSON.parse(cacheContent) as WhatsNewData;
      
      const generatedAt = new Date(parsed.generatedAt);
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
      
      // If generated within the last hour, return cached results
      if (generatedAt > oneHourAgo && parsed.posts.length > 0) {
        console.log('Returning cached Whats New feed from:', parsed.generatedAt);
        return parsed;
      }
    } catch (err) {
      console.error('Failed to read whats_new_feed cache:', err);
    }
  }

  console.log('Generating fresh Whats New summary feed...');
  
  // 2. Fetch the latest articles from the database (sync first if forced)
  if (force) {
    try {
      await syncArticlesAndTrends(1);
    } catch (syncErr) {
      console.error('Failed to sync feeds during whats-new generation:', syncErr);
    }
  }

  const articles = await prisma.trendArticle.findMany({
    orderBy: { createdAt: 'desc' },
    take: 10,
    select: {
      sourceName: true,
      title: true,
      extractedTrends: true,
      content: true
    }
  });

  if (articles.length === 0) {
    console.log('No articles found in database. Returning mock inspiration posts.');
    const mockData: WhatsNewData = {
      generatedAt: new Date().toISOString(),
      posts: [
        {
          id: 'mock-1',
          title: 'Monochromatic Tweed Tailoring',
          summary: 'Curate structured monochrome blazers and high-neck vests to marry Chanel structured elegance with raw Alexander McQueen styling rules. Exaggerated shoulder silhouettes remain a staple for autumn layering.',
          source: 'Vogue Runway',
          tags: ['tweed', 'monochrome', 'bouclé'],
          imageUrl: 'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?q=80&w=600&auto=format&fit=crop'
        },
        {
          id: 'mock-2',
          title: 'Rebellious Leather Coordinates',
          summary: 'Incorporate heavy hardware buckles and deconstructed leather crossbody bags into loose-fitting floral slip dresses. The contrast of soft drapery against metallic, hard accents creates a powerful rebel chic look.',
          source: 'AllSaints Lookbook',
          tags: ['leather', 'grunge', 'hardware'],
          imageUrl: 'https://images.unsplash.com/photo-1509631179647-0177331693ae?q=80&w=600&auto=format&fit=crop'
        }
      ]
    };

    // Ensure directory exists and write mock data
    fs.mkdirSync(path.dirname(CACHE_FILE), { recursive: true });
    fs.writeFileSync(CACHE_FILE, JSON.stringify(mockData, null, 2));
    return mockData;
  }

  // 3. Prompt Gemini to summarize the trends
  const prompt = `
    You are an expert editorial fashion stylist. Analyze these latest fashion articles and newsletters and synthesize them into exactly 3 distinct, highly curated "Inspiration Feed Posts" (like an Instagram stream).
    Each post must describe a concrete styling theme, trend, or look, explaining how to wear it and style it.
    The narrative should read like a premium editorial caption (2-3 sentences).

    Here are the source articles:
    ${articles.map(a => `Source: ${a.sourceName} | Title: ${a.title} | Trends: ${a.extractedTrends.join(', ')} | Text snippet: ${a.content.slice(0, 1200)}`).join('\n\n')}

    You must output a JSON object adhering exactly to this structure:
    {
      "posts": [
        {
          "title": "A short, catchy, luxury-editorial header",
          "summary": "The Instagram-style summary describing the trend and concrete outfit styling tips (2-3 sentences).",
          "source": "The primary source blog or outlet name (e.g. Vogue, Magasin)",
          "tags": ["tag1", "tag2", "tag3"],
          "imageSearchQuery": "A descriptive, clean query to search for a high-quality styling photo matching this trend (e.g. 'chanel structured boucle jacket runway styling')"
        }
      ]
    }
  `;

  try {
    const response = await getAi().models.generateContent({
      model: MODEL_NAME,
      contents: prompt,
      config: {
        responseMimeType: 'application/json'
      }
    });

    const text = response.text || '{}';
    const parsedJson = JSON.parse(text);
    const rawPosts = parsedJson.posts || [];

    const posts: WhatsNewPost[] = [];
    
    // 4. Resolve images using Tavily image search
    for (let i = 0; i < rawPosts.length; i++) {
      const rp = rawPosts[i];
      const imageUrl = await searchInspirationImage(rp.imageSearchQuery || rp.title);
      
      posts.push({
        id: `post-${i + 1}-${Date.now()}`,
        title: rp.title || 'Style Concept',
        summary: rp.summary || 'Styling coordinates analysis.',
        source: rp.source || 'Curated Feed',
        tags: rp.tags || [],
        imageUrl
      });
    }

    const outputData: WhatsNewData = {
      generatedAt: new Date().toISOString(),
      posts
    };

    // 5. Save to cache
    fs.mkdirSync(path.dirname(CACHE_FILE), { recursive: true });
    fs.writeFileSync(CACHE_FILE, JSON.stringify(outputData, null, 2));

    return outputData;
  } catch (err) {
    console.error('Failed to generate Whats New summary using Gemini:', err);
    throw err;
  }
}
