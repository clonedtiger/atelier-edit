import { GoogleGenAI } from '@google/genai';

let aiInstance: GoogleGenAI | null = null;
export function getAi(): GoogleGenAI {
  if (!aiInstance) {
    aiInstance = new GoogleGenAI({});
  }
  return aiInstance;
}

export const MODEL_NAME = 'gemini-3.1-flash-lite'; // Use 3.1-flash-lite which has available daily quota

export interface TaggedWardrobeItem {
  category: string;
  color: string[];
  brand: string | null;
  styleNotes: string;
  detectedTags: string[];
}

export interface ExtractedTrends {
  title: string;
  extractedTrends: string[];
}

export interface RecommendedOutfitItem {
  wardrobeItemId?: string; // If using existing item
  purchaseName?: string;   // If suggesting new item
  purchaseBrand?: string;  // Curated store recommendation
  purchaseUrl?: string;    // Placed later by Search API
  priceEstimate?: string;
  stylingRationale: string;
}

export interface RecommendedOutfit {
  title: string;
  narrative: string;
  items: RecommendedOutfitItem[];
}

/**
 * Safely parses JSON returned by Gemini models, stripping markdown code fences
 * and isolating outer JSON object or array bounds to handle trailing text/commentary.
 */
function safeParseGeminiJson<T>(rawText: string): T {
  let cleaned = (rawText || '').trim();

  // Strip markdown code fences if wrapped
  cleaned = cleaned.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();

  // Locate outer JSON object or array bounds
  const firstObj = cleaned.indexOf('{');
  const firstArr = cleaned.indexOf('[');

  let start = -1;
  let end = -1;

  if (firstObj !== -1 && (firstArr === -1 || firstObj < firstArr)) {
    start = firstObj;
    end = cleaned.lastIndexOf('}');
  } else if (firstArr !== -1) {
    start = firstArr;
    end = cleaned.lastIndexOf(']');
  }

  if (start !== -1 && end !== -1 && end > start) {
    cleaned = cleaned.substring(start, end + 1);
  }

  return JSON.parse(cleaned) as T;
}

/**
 * Analyzes a wardrobe garment image (base64) using Gemini 2.5 Flash Vision.
 */
export async function analyzeWardrobeImage(base64Data: string, mimeType: string): Promise<TaggedWardrobeItem> {
  const prompt = `
    Analyze this clothing item photo.
    Identify:
    1. Category: Exactly one of "Outerwear", "Tops", "Bottoms", "Dresses", "Shoes", "Bags", "Jewelry", "Accessories".
    2. Color: Primary colors present (e.g., ["Black", "Gold"]).
    3. Brand: Brand name if visible on label, hardware, or tags (e.g. "Chanel", "Alexander McQueen", "Zara", "AllSaints"). If unidentifiable, return null.
    4. Style notes: Brief 1-2 sentence description of design details, silhouette, fabric, hardware, cuts, and overall vibe.
    5. Detected tags: List of key styling attributes (e.g., ["bouclé", "tweed", "double-breasted", "gold buttons", "cropped", "leather", "hardware", "asymmetric"]).

    You must output a JSON object adhering exactly to this structure:
    {
      "category": "Outerwear",
      "color": ["Black"],
      "brand": "Chanel",
      "styleNotes": "Structured tweed cropped jacket with gold lion buttons.",
      "detectedTags": ["tweed", "cropped", "gold buttons"]
    }
  `;

  try {
    const response = await getAi().models.generateContent({
      model: MODEL_NAME,
      contents: [
        {
          inlineData: {
            data: base64Data,
            mimeType: mimeType
          }
        },
        prompt
      ],
      config: {
        responseMimeType: 'application/json',
      }
    });

    const text = response.text || '';
    return safeParseGeminiJson<TaggedWardrobeItem>(text);
  } catch (error) {
    console.error('Error analyzing wardrobe image with Gemini:', error);
    throw new Error('Gemini vision analysis failed');
  }
}

/**
 * Analyzes article/video text content and extracts key fashion trends across all styles.
 */
export async function extractTrendsFromContent(title: string, content: string): Promise<string[]> {
  const prompt = `
    You are an elite fashion editor and trend intelligence analyst. Read the content of the article, show review, or fashion newsletter below and extract the primary styling directions, silhouettes, color forecasts, textile textures, key garment cuts, footwear/accessory trends, and pairing principles.
    
    Article Title: ${title}
    Article Content:
    ${content.slice(0, 8000)} // truncate to prevent token overflow
    
    Extract 3-8 precise, actionable fashion trend descriptors (e.g. "oversized structural tailoring", "draped cowl-neck layering", "monochrome earth tones", "chunky lug-sole footwear", "minimalist knitwear", "relaxed wide-leg trousers").
    
    You must output a JSON object adhering exactly to this structure:
    {
      "extractedTrends": ["Trend Name 1", "Trend Name 2", ...]
    }
  `;

  try {
    const response = await getAi().models.generateContent({
      model: MODEL_NAME,
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
      }
    });

    const text = response.text || '';
    const parsed = safeParseGeminiJson<{ extractedTrends?: string[] }>(text);
    return parsed.extractedTrends || [];
  } catch (error) {
    console.error('Error extracting trends with Gemini:', error);
    return [];
  }
}

export interface UserStyleProfile {
  sex?: string | null;
  height?: string | null;
  weight?: string | null;
  waistSize?: string | null;
  braSize?: string | null;
  shoeSize?: string | null;
  hatSize?: string | null;
  gloveSize?: string | null;
  workLife?: string | null;
  inspirationNotes?: string | null;
  styleAesthetic?: string | null;
  favoriteBrands?: string | null;
  avoidedStyles?: string | null;
  colorPalette?: string | null;
}

/**
 * Synthesizes fashion feeds: Blends wardrobe items with current trends to create lookbooks.
 */
export async function generateOutfitRecommendations(
  wardrobe: Array<{ id: string; category: string; color: string[]; detectedTags: string[]; styleNotes: string | null }>,
  trends: string[],
  userProfile?: UserStyleProfile,
  vibe?: string,
  inspirations?: Array<{ notes: string | null; tags: string[] }>,
  anchorItem?: { id: string; category: string; brand?: string | null; color: string[]; detectedTags: string[]; styleNotes?: string | null }
): Promise<RecommendedOutfit[]> {
  const wardrobeSummary = wardrobe.map(item => (
    `ID: ${item.id} | Category: ${item.category} | Colors: ${item.color.join(', ')} | Tags: ${item.detectedTags.join(', ')} | Notes: ${item.styleNotes || 'None'}`
  )).join('\n');

  const trendsSummary = trends.slice(0, 20).join(', ');

  const styleDnaSummary = `
    CLIENT'S UNIQUE STYLE DNA & AESTHETIC DIRECTIVES:
    - Primary Style Aesthetic: ${userProfile?.styleAesthetic || 'Refined Modern Luxury with Timeless Tailoring'}
    - Favorite Brands & Designers: ${userProfile?.favoriteBrands || 'Curated high-end and contemporary designers'}
    - Avoided Styles & Rules: ${userProfile?.avoidedStyles || 'None specified'}
    - Preferred Color Palette: ${userProfile?.colorPalette || 'Harmonious tailored palette'}
    - Daily Work & Lifestyle: ${userProfile?.workLife || 'Not specified'}
    - Inspiration Guidelines: ${userProfile?.inspirationNotes || 'Not specified'}
  `;

  const sizingSummary = userProfile
    ? `
    Client Physical Sizing & Fit Parameters:
    - Sex: ${userProfile.sex || 'Not specified'}
    - Height: ${userProfile.height || 'Not specified'}
    - Weight: ${userProfile.weight || 'Not specified'}
    - Waist Size: ${userProfile.waistSize || 'Not specified'}
    ${userProfile.sex === 'Female' ? `- Bra Size: ${userProfile.braSize || 'Not specified'}` : ''}
    - Shoe Size: ${userProfile.shoeSize || 'Not specified'}
    - Hat Size: ${userProfile.hatSize || 'Not specified'}
    - Glove Size: ${userProfile.gloveSize || 'Not specified'}
    `
    : 'Client Fit: Standard lookbook tailoring.';

  const vibeInstructions = vibe
    ? `
    CUSTOM SESSION DIRECTIVE:
    The client has requested the following custom styling prompt/mood/event for this consultation: "${vibe}".
    You MUST prioritize this request and ensure all 3 generated outfits strictly align with this theme while honoring their unique Style DNA.
    `
    : '';

  const inspirationsSummary = inspirations && inspirations.length > 0
    ? `
    CLIENT'S UPLOADED VISUAL INSPIRATIONS (Aesthetic moodboards, street style snaps, textures):
    ${inspirations.map((ins, i) => `Inspiration #${i + 1}: Notes: ${ins.notes || 'None'} | Tags: ${ins.tags.join(', ')}`).join('\n')}
    
    Incorporate these visual elements, textures, silhouette cuts, or moods into the generated outfits.
    `
    : '';

  const anchorInstructions = anchorItem
    ? `
    MANDATORY HERO ANCHOR GARMENT:
    The client explicitly selected the following piece from their closet to build the outfit around:
    - ID: ${anchorItem.id}
    - Category: ${anchorItem.category}
    - Brand: ${anchorItem.brand || 'Unspecified'}
    - Colors: ${anchorItem.color.join(', ')}
    - Tags: ${anchorItem.detectedTags.join(', ')}
    - Notes: ${anchorItem.styleNotes || 'None'}

    YOU MUST INCLUDE THIS EXACT GARMENT (using wardrobeItemId: "${anchorItem.id}") AS THE CENTRAL HERO PIECE IN AT LEAST OUTFIT #1. Build the rest of the outfit around it by choosing complementary pieces from their closet and recommending new purchases.
    `
    : '';

  const prompt = `
    You are an elite haute couture personal stylist and fashion editor.
    You are styling an individual client based strictly on their personalized Style DNA, physical measurements, wardrobe collection, and curated fashion intelligence radar.

    Here is the client's current wardrobe items:
    ${wardrobeSummary || 'No items uploaded yet. Create outfits using closet placeholders.'}

    Here are the current fashion trends from their curated subscribed feeds:
    ${trendsSummary || 'Timeless luxury styling'}

    ${styleDnaSummary}
    ${sizingSummary}
    ${vibeInstructions}
    ${inspirationsSummary}
    ${anchorInstructions}

    Your task is to generate exactly 3 outfit recommendations that blend the client's existing wardrobe with current trends, tailored strictly to their Style DNA and sizing profile.
    For each outfit, you must:
    1. Create a compelling, luxury-editorial title fitting their aesthetic (e.g. "Architectural Cashmere with Tailored Edge").
    2. Provide a narrative paragraph styling guide explaining the look, how it fits their aesthetic, why it works, and how it aligns with their daily lifestyle and inspiration guidelines. Describe pairing with shoes, accessories/jewelry, and subtle beauty/makeup coordinates.
    3. List the items making up the outfit. Each outfit should be a complete look. Each item in the list can be EITHER:
       a) An existing wardrobe item (specify its ID in 'wardrobeItemId' and describe how to wear it in 'stylingRationale').
       b) A proposed new item to purchase (do NOT set 'wardrobeItemId'. Instead, provide 'purchaseName', 'purchaseBrand' which should be a brand matching their favorite brands or aesthetic, a realistic price estimate, and the styling rationale citing the exact size matching their physical measurements).

    You must output a JSON object adhering exactly to this structure:
    {
      "outfits": [
        {
          "title": "Outfit Title",
          "narrative": "Styling narrative here...",
          "items": [
            {
              "wardrobeItemId": "matching-uuid-from-above-if-applicable",
              "purchaseName": "Name of missing item to buy (if new)",
              "purchaseBrand": "Curated Brand Name (if new)",
              "priceEstimate": "Estimated price range (if new)",
              "stylingRationale": "How to style this piece in the outfit, citing the recommended size and fit for their height/build."
            }
          ]
        }
      ]
    }
  `;

  try {
    const response = await getAi().models.generateContent({
      model: MODEL_NAME,
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
      }
    });

    const text = response.text || '';
    const parsed = safeParseGeminiJson<{ outfits?: RecommendedOutfit[] }>(text);
    return parsed.outfits || [];
  } catch (error) {
    console.error('Error generating outfits with Gemini:', error);
    throw new Error('Gemini recommendation synthesis failed');
  }
}

export interface TaggedInspiration {
  notes: string;
  tags: string[];
}

/**
 * Analyzes an inspiration image (street style, magazine snap, artwork, mood board, etc.) and extracts its aesthetic vibe.
 */
export async function analyzeInspirationImage(base64Data: string, mimeType: string): Promise<TaggedInspiration> {
  const prompt = `
    You are an expert fashion director and visual trend curator.
    Analyze this visual fashion inspiration photograph. It could be:
    - A street style photograph of someone wearing an outfit
    - A garment or accessory spotted on a rack/hanger in a clothing boutique or store
    - A page from a fashion magazine or editorial lookbook
    - A detail shot of a fabric texture, pattern, jewelry piece, shoe, or silhouette concept.

    Identify:
    1. Aesthetic Vibe & Mood: Concise 1-2 sentence description of the styling vibe, cut, fabrics, color palette, and styling concept.
    2. Key Tags: Array of 3-7 specific fashion styling tags (e.g. ["street-style", "tailoring", "oversized-blazer", "camel-wool", "minimalist", "hardware"]).

    You must output a JSON object adhering exactly to this structure:
    {
      "notes": "Description of the aesthetic vibe and styling elements...",
      "tags": ["tag1", "tag2", "tag3"]
    }
  `;

  try {
    const response = await getAi().models.generateContent({
      model: MODEL_NAME,
      contents: [
        {
          inlineData: {
            data: base64Data,
            mimeType: mimeType
          }
        },
        prompt
      ],
      config: {
        responseMimeType: 'application/json',
      }
    });

    const text = response.text || '';
    const parsed = safeParseGeminiJson<{ notes?: string; tags?: string[] }>(text);
    return {
      notes: parsed.notes || 'Visual fashion inspiration',
      tags: parsed.tags || []
    };
  } catch (error) {
    console.error('Error analyzing inspiration image with Gemini:', error);
    return {
      notes: 'Visual fashion inspiration',
      tags: ['inspiration']
    };
  }
}

