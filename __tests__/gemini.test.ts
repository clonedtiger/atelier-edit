import { analyzeWardrobeImage, extractTrendsFromContent, generateOutfitRecommendations } from '@/lib/gemini';
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
