import {
  analyzeWardrobeImage,
  detectAndAnalyzeWardrobeItems,
  extractTrendsFromContent,
  generateOutfitRecommendations,
  normalizeBox2d,
  normalizeCategory,
} from '@/lib/gemini';
import { GoogleGenAI } from '@google/genai';

// Mock the Google GenAI SDK module
jest.mock('@google/genai', () => {
  const generateContentMock = jest.fn();
  return {
    GoogleGenAI: jest.fn().mockImplementation(() => {
      return {
        models: {
          generateContent: generateContentMock,
        },
      };
    }),
  };
});

describe('gemini.ts - AI styling helper methods', () => {
  let mockGenerateContent: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    // Retrieve the mock reference from the mocked constructor instance
    const aiInstance = new GoogleGenAI({});
    mockGenerateContent = aiInstance.models.generateContent as jest.Mock;
  });

  describe('normalizeBox2d() helper', () => {
    it('should normalize array coordinates [ymin, xmin, ymax, xmax]', () => {
      const box = normalizeBox2d([150, 200, 800, 900]);
      expect(box).toEqual([150, 200, 800, 900]);
    });

    it('should scale 0..1 normalized float coordinates up to 0..1000', () => {
      const box = normalizeBox2d([0.1, 0.2, 0.8, 0.9]);
      expect(box).toEqual([100, 200, 800, 900]);
    });

    it('should normalize object formats with top/left/width/height', () => {
      const box = normalizeBox2d({ top: 100, left: 150, height: 400, width: 300 });
      expect(box).toEqual([100, 150, 500, 450]);
    });

    it('should return null for null, undefined, or degenerate coordinates', () => {
      expect(normalizeBox2d(null)).toBeNull();
      expect(normalizeBox2d([100, 100, 105, 105])).toBeNull(); // area too small
      expect(normalizeBox2d('invalid')).toBeNull();
    });
  });

  describe('normalizeCategory() helper', () => {
    it('should map various synonyms to canonical categories', () => {
      expect(normalizeCategory('oversized blazer')).toBe('Outerwear');
      expect(normalizeCategory('denim jeans')).toBe('Bottoms');
      expect(normalizeCategory('leather boots')).toBe('Shoes');
      expect(normalizeCategory('tote bag')).toBe('Bags');
      expect(normalizeCategory('gold necklace')).toBe('Jewelry');
      expect(normalizeCategory('wool scarf')).toBe('Accessories');
      expect(normalizeCategory('cashmere knit')).toBe('Tops');
      expect(normalizeCategory('evening gown')).toBe('Dresses');
    });
  });

  describe('analyzeWardrobeImage()', () => {
    it('should query Gemini Vision and return structured style metadata', async () => {
      const mockVisionResponse = {
        category: 'Outerwear',
        color: ['Black', 'Gold'],
        brand: 'Chanel',
        styleNotes: 'Structured tweed look',
        detectedTags: ['tweed', 'tailoring', 'double-breasted'],
      };

      // Mock generateContent response for vision
      mockGenerateContent.mockResolvedValue({
        text: JSON.stringify(mockVisionResponse),
      });

      const result = await analyzeWardrobeImage('base64StringData', 'image/webp');

      expect(mockGenerateContent).toHaveBeenCalled();
      expect(result).toEqual(mockVisionResponse);
    });
  });

  describe('detectAndAnalyzeWardrobeItems()', () => {
    it('should detect multiple items with bounding boxes from a flat lay image', async () => {
      const mockMultiItemResponse = {
        items: [
          {
            box_2d: [50, 100, 450, 900],
            category: 'Outerwear',
            color: ['Camel'],
            brand: 'Toteme',
            styleNotes: 'Double-breasted wool trench coat',
            detectedTags: ['wool', 'tailoring'],
          },
          {
            box_2d: [500, 150, 950, 850],
            category: 'Bottoms',
            color: ['Indigo'],
            brand: 'Khaite',
            styleNotes: 'High-waisted straight leg denim',
            detectedTags: ['denim', 'straight-leg'],
          },
        ],
      };

      mockGenerateContent.mockResolvedValue({
        text: JSON.stringify(mockMultiItemResponse),
      });

      const results = await detectAndAnalyzeWardrobeItems('base64StringData', 'image/webp');

      expect(mockGenerateContent).toHaveBeenCalled();
      expect(results).toHaveLength(2);
      expect(results[0].category).toBe('Outerwear');
      expect(results[0].box2d).toEqual([50, 100, 450, 900]);
      expect(results[1].category).toBe('Bottoms');
      expect(results[1].box2d).toEqual([500, 150, 950, 850]);
    });

    it('should fall back gracefully to single item analysis if model returns single item', async () => {
      const mockSingleItem = {
        category: 'Shoes',
        color: ['Black'],
        brand: 'Prada',
        styleNotes: 'Monolith lug sole loafers',
        detectedTags: ['leather', 'chunky'],
      };

      mockGenerateContent.mockResolvedValue({
        text: JSON.stringify(mockSingleItem),
      });

      const results = await detectAndAnalyzeWardrobeItems('base64StringData', 'image/webp');

      expect(results).toHaveLength(1);
      expect(results[0].category).toBe('Shoes');
      expect(results[0].brand).toBe('Prada');
    });
  });

  describe('extractTrendsFromContent()', () => {
    it('should query Gemini Text and extract lists of trend words', async () => {
      const mockTrendResponse = {
        extractedTrends: ['boucle jackets', 'asymmetry', 'chunky leather boots'],
      };

      mockGenerateContent.mockResolvedValue({
        text: JSON.stringify(mockTrendResponse),
      });

      const result = await extractTrendsFromContent('Spring Collections', 'Lots of tweed and biker boots.');

      expect(mockGenerateContent).toHaveBeenCalled();
      expect(result).toEqual(mockTrendResponse.extractedTrends);
    });
  });

  describe('generateOutfitRecommendations()', () => {
    it('should blend closet items and trends to synthesize outfit suggestions', async () => {
      const mockOutfitResponse = {
        outfits: [
          {
            title: 'Tweed Tailoring meets Rebel Edge',
            narrative: 'Stunning visual clash.',
            items: [
              {
                wardrobeItemId: 'mock-uuid-blazer',
                stylingRationale: 'Layer blazer over cowl neck.',
              },
              {
                purchaseName: 'Combat Boots',
                purchaseBrand: 'AllSaints',
                priceEstimate: '$250',
                stylingRationale: 'Pair with slim fit denim.',
              },
            ],
          },
        ],
      };

      mockGenerateContent.mockResolvedValue({
        text: JSON.stringify(mockOutfitResponse),
      });

      const mockWardrobe = [
        {
          id: 'mock-uuid-blazer',
          category: 'Outerwear',
          color: ['Black'],
          detectedTags: ['tweed'],
          styleNotes: 'Tweed blazer',
        },
      ];

      const result = await generateOutfitRecommendations(mockWardrobe, ['biker boots', 'grunge tailoring']);

      expect(mockGenerateContent).toHaveBeenCalled();
      expect(result).toHaveLength(1);
      expect(result[0].title).toBe('Tweed Tailoring meets Rebel Edge');
      expect(result[0].items[0].wardrobeItemId).toBe('mock-uuid-blazer');
      expect(result[0].items[1].purchaseName).toBe('Combat Boots');
    });
  });
});
