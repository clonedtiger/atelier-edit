import { NextRequest, NextResponse } from 'next/server';
import { fetchLiveWeather } from '@/lib/weather';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const city = searchParams.get('city') || undefined;
    const latStr = searchParams.get('lat');
    const lonStr = searchParams.get('lon');

    const lat = latStr ? parseFloat(latStr) : undefined;
    const lon = lonStr ? parseFloat(lonStr) : undefined;

    const weather = await fetchLiveWeather({ city, lat, lon });
    return NextResponse.json(weather);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Failed to fetch weather';
    console.error('Weather API error:', error);
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
