/**
 * Open-Meteo Weather & Location Engine (GDPR Compliant, No API Key Required)
 */

export interface WeatherInfo {
  city: string;
  country?: string;
  latitude: number;
  longitude: number;
  tempCelsius: number;
  tempFahrenheit: number;
  condition: string;
  weatherCode: number;
  precipitation: number; // mm
  windSpeedKmh: number;
  icon: string;
  stylingDirectives: string;
  updatedAt: string;
}

// In-memory 15-minute weather cache to reduce API calls
const weatherCache = new Map<string, { data: WeatherInfo; expiresAt: number }>();
const CACHE_TTL_MS = 15 * 60 * 1000; // 15 minutes

/**
 * Maps WMO Weather interpretation codes to conditions, icons, and styling rules.
 */
export function interpretWmoWeather(code: number, tempC: number, precipMm: number): { condition: string; icon: string; directives: string } {
  let condition = 'Clear Sky';
  let icon = '☀️';
  let rainStatus = 'Dry';

  if (code === 0) {
    condition = 'Clear Sky';
    icon = '☀️';
  } else if (code === 1 || code === 2) {
    condition = 'Partly Cloudy';
    icon = '⛅';
  } else if (code === 3) {
    condition = 'Overcast';
    icon = '☁️';
  } else if (code >= 45 && code <= 48) {
    condition = 'Foggy / Misty';
    icon = '🌫️';
  } else if (code >= 51 && code <= 55) {
    condition = 'Light Drizzle';
    icon = '🌦️';
    rainStatus = 'Wet';
  } else if (code >= 61 && code <= 65) {
    condition = 'Rain';
    icon = '🌧️';
    rainStatus = 'Wet';
  } else if (code >= 66 && code <= 67) {
    condition = 'Freezing Rain';
    icon = '🌧️❄️';
    rainStatus = 'Wet';
  } else if (code >= 71 && code <= 77) {
    condition = 'Snow / Flurries';
    icon = '🌨️';
    rainStatus = 'Snowy';
  } else if (code >= 80 && code <= 82) {
    condition = 'Rain Showers';
    icon = '🌧️';
    rainStatus = 'Wet';
  } else if (code >= 85 && code <= 86) {
    condition = 'Snow Showers';
    icon = '🌨️';
    rainStatus = 'Snowy';
  } else if (code >= 95 && code <= 99) {
    condition = 'Thunderstorm';
    icon = '⛈️';
    rainStatus = 'Wet';
  }

  // Determine thermal layering and footwear recommendations
  const rules: string[] = [];

  if (tempC < 5) {
    rules.push('Sub-zero / Winter Cold: Prioritize heavy wool/cashmere overcoats, chunky knitwear, thermal underlayers, scarves, and insulated leather boots.');
  } else if (tempC >= 5 && tempC < 14) {
    rules.push('Cool Autumn / Spring Transition: Perfect for structured trench coats, tailored wool blazers, fine merino knits, and mid-weight layering.');
  } else if (tempC >= 14 && tempC < 22) {
    rules.push('Mild / Temperate: Ideal for light leather jackets, oversized cotton poplin shirts, cardigan draping, and relaxed trousers.');
  } else {
    rules.push('Warm / Summer: Prioritize breathable natural linens, airy silk blends, lightweight tailoring, and open slingbacks/loafers.');
  }

  if (rainStatus === 'Wet' || precipMm > 0.5) {
    rules.push('Wet Weather Alert: Avoid delicate raw suede or floor-grazing trousers; choose water-treated leather, lug-sole boots, and structured water-resistant outerwear.');
  } else if (rainStatus === 'Snowy') {
    rules.push('Snow Conditions: Pair with shearling/down insulation, high-traction boots, and cashmere accessories.');
  }

  return {
    condition,
    icon,
    directives: rules.join(' '),
  };
}

/**
 * Fetches coordinates for a given city name via Open-Meteo Geocoding.
 */
export async function geocodeCity(cityName: string): Promise<{ latitude: number; longitude: number; name: string; country?: string } | null> {
  try {
    const cleanCity = encodeURIComponent(cityName.trim());
    const res = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${cleanCity}&count=1&language=en&format=json`);
    if (!res.ok) return null;
    const data = await res.json();
    if (!data.results || data.results.length === 0) return null;
    const top = data.results[0];
    return {
      latitude: top.latitude,
      longitude: top.longitude,
      name: top.name,
      country: top.country,
    };
  } catch (err) {
    console.error('Geocoding error:', err);
    return null;
  }
}

/**
 * Fetches current live weather from Open-Meteo by coordinates or city.
 */
export async function fetchLiveWeather(params: { city?: string; lat?: number; lon?: number }): Promise<WeatherInfo | null> {
  try {
    let lat = params.lat;
    let lon = params.lon;
    let resolvedCity = params.city || 'London';
    let resolvedCountry = '';

    if ((lat === undefined || lon === undefined) && params.city) {
      const geo = await geocodeCity(params.city);
      if (geo) {
        lat = geo.latitude;
        lon = geo.longitude;
        resolvedCity = geo.name;
        resolvedCountry = geo.country || '';
      } else {
        // Fallback default to London coordinates
        lat = 51.5074;
        lon = -0.1278;
        resolvedCity = params.city;
      }
    } else if (lat !== undefined && lon !== undefined) {
      lat = Number(lat);
      lon = Number(lon);
    } else {
      lat = 51.5074;
      lon = -0.1278;
      resolvedCity = 'London';
      resolvedCountry = 'United Kingdom';
    }

    const cacheKey = `${lat.toFixed(2)},${lon.toFixed(2)}`;
    const cached = weatherCache.get(cacheKey);
    if (cached && Date.now() < cached.expiresAt) {
      return cached.data;
    }

    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,precipitation,weather_code,wind_speed_10m`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Open-Meteo API returned status ${res.status}`);

    const data = await res.json();
    const current = data.current || {};
    const tempC = Math.round(current.temperature_2m ?? 15);
    const tempF = Math.round((tempC * 9) / 5 + 32);
    const code = current.weather_code ?? 0;
    const precip = current.precipitation ?? 0;
    const wind = Math.round(current.wind_speed_10m ?? 0);

    const { condition, icon, directives } = interpretWmoWeather(code, tempC, precip);

    const weatherInfo: WeatherInfo = {
      city: resolvedCity,
      country: resolvedCountry,
      latitude: lat,
      longitude: lon,
      tempCelsius: tempC,
      tempFahrenheit: tempF,
      condition,
      weatherCode: code,
      precipitation: precip,
      windSpeedKmh: wind,
      icon,
      stylingDirectives: directives,
      updatedAt: new Date().toISOString(),
    };

    weatherCache.set(cacheKey, { data: weatherInfo, expiresAt: Date.now() + CACHE_TTL_MS });

    return weatherInfo;
  } catch (error) {
    console.error('Error fetching live weather:', error);
    // Fallback safe defaults
    return {
      city: params.city || 'London',
      latitude: 51.5,
      longitude: -0.12,
      tempCelsius: 15,
      tempFahrenheit: 59,
      condition: 'Mild / Overcast',
      weatherCode: 3,
      precipitation: 0,
      windSpeedKmh: 10,
      icon: '⛅',
      stylingDirectives: 'Mild seasonal weather: comfortable for light layering and structured tailoring.',
      updatedAt: new Date().toISOString(),
    };
  }
}
