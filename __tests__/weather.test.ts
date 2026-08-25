import { interpretWmoWeather, fetchLiveWeather, geocodeCity } from '../src/lib/weather';

// Mock global fetch for weather testing
const originalFetch = global.fetch;

describe('Weather Engine & Location-Aware Styling Rules', () => {
  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('correctly interprets clear sky in warm weather', () => {
    const res = interpretWmoWeather(0, 24, 0);
    expect(res.condition).toBe('Clear Sky');
    expect(res.icon).toBe('☀️');
    expect(res.directives).toContain('Warm / Summer');
  });

  it('correctly interprets cold rainy weather with wet footwear rules', () => {
    const res = interpretWmoWeather(61, 8, 2.5);
    expect(res.condition).toBe('Rain');
    expect(res.icon).toBe('🌧️');
    expect(res.directives).toContain('Cool Autumn / Spring Transition');
    expect(res.directives).toContain('Wet Weather Alert');
  });

  it('correctly interprets sub-zero snow conditions', () => {
    const res = interpretWmoWeather(71, -2, 1.0);
    expect(res.condition).toBe('Snow / Flurries');
    expect(res.icon).toBe('🌨️');
    expect(res.directives).toContain('Sub-zero / Winter Cold');
  });

  it('geocodes city names to coordinates using Open-Meteo', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        results: [
          {
            name: 'Paris',
            country: 'France',
            latitude: 48.8566,
            longitude: 2.3522,
          },
        ],
      }),
    } as unknown as Response);

    const geo = await geocodeCity('Paris');
    expect(geo).not.toBeNull();
    expect(geo?.name).toBe('Paris');
    expect(geo?.country).toBe('France');
    expect(geo?.latitude).toBeCloseTo(48.8566);
  });

  it('fetches live weather data and computes Celsius and Fahrenheit values', async () => {
    global.fetch = jest.fn().mockImplementation((url: string) => {
      if (url.includes('geocoding-api')) {
        return Promise.resolve({
          ok: true,
          json: async () => ({
            results: [{ name: 'London', country: 'United Kingdom', latitude: 51.5074, longitude: -0.1278 }],
          }),
        });
      }
      return Promise.resolve({
        ok: true,
        json: async () => ({
          current: {
            temperature_2m: 14,
            weather_code: 3,
            precipitation: 0,
            wind_speed_10m: 12,
          },
        }),
      });
    });

    const weather = await fetchLiveWeather({ city: 'London' });
    expect(weather).not.toBeNull();
    expect(weather?.city).toBe('London');
    expect(weather?.tempCelsius).toBe(14);
    expect(weather?.tempFahrenheit).toBe(57);
    expect(weather?.condition).toBe('Overcast');
    expect(weather?.stylingDirectives).toContain('Mild / Temperate');
  });
});
