import { prisma } from './db';
import { generateCapsuleWardrobe, CapsulePackingResult } from './gemini';
import { fetchLiveWeather } from './weather';

export interface CreateCapsuleParams {
  userId: string;
  destination: string;
  startDate: string;
  endDate: string;
  tripPurpose: string;
  luggageType: string;
  checklistNotes?: string;
}

/**
 * Generates and saves a travel packing capsule for a user.
 */
export async function createTravelCapsule(params: CreateCapsuleParams) {
  const { userId, destination, startDate, endDate, tripPurpose, luggageType, checklistNotes } = params;

  // 1. Fetch user wardrobe items
  const wardrobe = await prisma.wardrobeItem.findMany({
    where: { userId },
    select: {
      id: true,
      category: true,
      brand: true,
      color: true,
      detectedTags: true,
      styleNotes: true,
    },
  });

  if (wardrobe.length === 0) {
    throw new Error('Please upload items to your wardrobe before generating a travel packing capsule.');
  }

  // 2. Fetch user Style DNA
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      styleAesthetic: true,
      favoriteBrands: true,
      avoidedStyles: true,
      colorPalette: true,
    },
  });

  // 3. Compute duration in days
  const start = new Date(startDate);
  const end = new Date(endDate);
  const diffTime = Math.abs(end.getTime() - start.getTime());
  const daysCount = Math.max(1, Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1);

  // 4. Optionally fetch destination weather
  let weatherForecast = '';
  try {
    const weather = await fetchLiveWeather({ city: destination });
    if (weather) {
      weatherForecast = `${weather.city}: ${weather.tempCelsius}°C (${weather.condition}). ${weather.stylingDirectives}`;
    }
  } catch (err) {
    console.warn('Could not fetch travel destination weather:', err);
  }

  // 5. Call Gemini to optimize capsule
  const result: CapsulePackingResult = await generateCapsuleWardrobe(
    wardrobe,
    destination,
    daysCount,
    tripPurpose,
    luggageType,
    user || undefined,
    weatherForecast
  );

  // 6. Save CapsuleTrip in database
  const capsuleTrip = await prisma.capsuleTrip.create({
    data: {
      userId,
      destination,
      startDate: start,
      endDate: end,
      tripPurpose,
      luggageType,
      itemIds: result.selectedItemIds,
      outfitSchedule: JSON.parse(JSON.stringify(result.outfitSchedule)),
      checklistNotes: checklistNotes || result.stylistRationale,
    },
  });

  return {
    capsuleTrip,
    packingChecklist: result.packingChecklist,
    outfitSchedule: result.outfitSchedule,
    stylistRationale: result.stylistRationale,
  };
}
