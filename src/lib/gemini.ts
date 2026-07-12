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
 * Analyzes a wardrobe photo using Gemini Vision API and returns style metadata.
 */
export async function analyzeWardrobeImage(base64Data: string, mimeType: string): Promise<TaggedWardrobeItem> {
  const prompt = `
    Analyze this wardrobe item image. Provide style tagging and details.
    You must output a JSON object adhering exactly to this structure:
    {
      "category": "One of: Outerwear, Tops, Bottoms, Shoes, Accessories, Dresses, Knitwear, Makeup, Jewelry",
      "color": ["Primary Color Name", "Secondary Color Name (optional)", ...],
      "brand": "Brand name if visible, or null if unknown",
      "styleNotes": "A descriptive summary of the item including texture, silhouette, materials, and styling essence (e.g. heavy structure bouclé, cropped military jacket)",
      "detectedTags": ["tag1", "tag2", ...] // Include visual traits (e.g. tweed, leather, asymmetric, hardware, double-breasted, grunge, classic)
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
    return JSON.parse(text) as TaggedWardrobeItem;
  } catch (error) {
    console.error('Error analyzing wardrobe image with Gemini:', error);
    throw new Error('Gemini vision analysis failed');
  }
}

/**
 * Analyzes article/video text content and extracts key fashion trends.
 */
export async function extractTrendsFromContent(title: string, content: string): Promise<string[]> {
  const prompt = `
    You are a luxury fashion curator. Read the content of the article or script below and extract the primary fashion styles, silhouettes, colors, fabrics, or styling rules mentioned.
    Focus on trends that fit either the classic, structured elegance of Chanel (tweeds, tailored coordinates, bouclé, pearls) or the rebellious, edgy grunge of Alexander McQueen (asymmetrical zippers, hardware, heavy leather, structured tailoring, deconstructed pieces).
    
    Article Title: ${title}
    Article Content:
    ${content.slice(0, 8000)} // truncate to prevent token overflow
    
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
    const parsed = JSON.parse(text);
    return parsed.extractedTrends || [];
  } catch (error) {
    console.error('Error extracting trends with Gemini:', error);
    return [];
  }
}

/**
 * Synthesizes fashion feeds: Blends wardrobe items with current trends to create lookbooks.
 */
export async function generateOutfitRecommendations(
  wardrobe: Array<{ id: string; category: string; color: string[]; detectedTags: string[]; styleNotes: string | null }>,
  trends: string[],
  userProfile?: {
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
  },
  vibe?: string
): Promise<RecommendedOutfit[]> {
  const wardrobeSummary = wardrobe.map(item => (
    `ID: ${item.id} | Category: ${item.category} | Colors: ${item.color.join(', ')} | Tags: ${item.detectedTags.join(', ')} | Notes: ${item.styleNotes || 'None'}`
  )).join('\n');

  const trendsSummary = trends.slice(0, 20).join(', ');

  const profileSummary = userProfile
    ? `
    Client Profile & Physical Sizing:
    - Sex: ${userProfile.sex || 'Not specified'}
    - Height: ${userProfile.height || 'Not specified'}
    - Weight: ${userProfile.weight || 'Not specified'}
    - Waist Size: ${userProfile.waistSize || 'Not specified'}
    ${userProfile.sex === 'Female' ? `- Bra Size: ${userProfile.braSize || 'Not specified'}` : ''}
    - Shoe Size: ${userProfile.shoeSize || 'Not specified'}
    - Hat Size: ${userProfile.hatSize || 'Not specified'}
    - Glove Size: ${userProfile.gloveSize || 'Not specified'}
    - Daily Work Life: ${userProfile.workLife || 'Not specified'}
    - Inspiration Guidelines: ${userProfile.inspirationNotes || 'Not specified'}
    `
    : 'Client Profile: Standard lookbook styling.';

  const vibeInstructions = vibe
    ? `
    CUSTOM STYLING DIRECTIVE FOR THIS CONSULTATION:
    The client has requested the following custom styling prompt/mood/event: "${vibe}".
    You MUST prioritize this request and ensure all 3 generated outfits strictly align with this theme (e.g. incorporating floral vibes, dressing for a sunny day, or preparing for the specified occasion) while keeping the core Chanel x McQueen aesthetic.
    `
    : '';

  const prompt = `
    You are a personal fashion editor styling a client. Her aesthetic is a curated crossover between Chanel's structured elegance (tweeds, double-breasted, bouclé, sophisticated cuts) and Alexander McQueen's rebellious edge (leather, heavy hardware, asymmetry, corsetry, tailoring with a dark twist).

    Here is the client's current wardrobe items:
    ${wardrobeSummary || 'No items uploaded yet. Create generic outfits using wardrobe placeholders.'}

    Here are the current fashion trends from her curated feeds (blogs, newsletters, shows):
    ${trendsSummary || 'Timeless Chanel and McQueen styling'}

    ${profileSummary}
    ${vibeInstructions}

    Your task is to generate exactly 3 outfit recommendations that blend her existing wardrobe with current trends, tailored specifically to her profile.
    For each outfit, you must:
    1. Create a compelling, luxury-editorial title (e.g. "The Structural Bouclé with a Biker Twist").
    2. Provide a narrative paragraph styling guide explaining the look, how it fits her aesthetic, why it works, and how it aligns with their daily Work Life and Inspiration guidelines. Ensure you explicitly describe how the clothing is paired with shoes, jewelry/accessories, and makeup details.
    3. List the items making up the outfit. Each outfit should be a complete look including clothing, shoes, jewelry (or accessories), and makeup coordinates (from her closet or suggested as a new purchase). Each item in the list can be EITHER:
       a) An existing wardrobe item (specify its ID in 'wardrobeItemId' and describe how to wear it in 'stylingRationale').
       b) A proposed new item to purchase (do NOT set 'wardrobeItemId'. Instead, provide 'purchaseName', 'purchaseBrand' which should be a curated brand (e.g. Zara, Mango, NET-A-PORTER, AllSaints, Chanel, Alexander McQueen, Sephora, etc.), a price estimate, and the styling rationale explaining why they need this missing piece. CRITICAL: Suggest the exact size (e.g., "Size 38" for shoes, "Size 26 / S" for trousers, or "Size M" for outerwear) matching their physical measurements).

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
            },
            ...
          ]
        },
        ...
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
    const parsed = JSON.parse(text);
    return parsed.outfits || [];
  } catch (error) {
    console.error('Error generating outfits with Gemini:', error);
    throw new Error('Gemini recommendation synthesis failed');
  }
}
