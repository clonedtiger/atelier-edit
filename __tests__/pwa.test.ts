import manifest from '../src/app/manifest';
import * as fs from 'fs';
import * as path from 'path';

describe('Progressive Web App (PWA) Configuration', () => {
  it('generates valid Web App Manifest with standalone display and theme color', () => {
    const config = manifest();
    expect(config.name).toBe('Atelier Edit — The Personal Style Journal');
    expect(config.short_name).toBe('Atelier Edit');
    expect(config.display).toBe('standalone');
    expect(config.start_url).toBe('/');
    expect(config.theme_color).toBe('#121214');
    expect(config.background_color).toBe('#121214');
    expect(config.icons?.length).toBeGreaterThanOrEqual(2);
  });

  it('verifies public service worker file exists and contains caching listeners', () => {
    const swPath = path.join(process.cwd(), 'public', 'sw.js');
    expect(fs.existsSync(swPath)).toBe(true);
    const swContent = fs.readFileSync(swPath, 'utf8');
    expect(swContent).toContain('CACHE_NAME');
    expect(swContent).toContain("addEventListener('install'");
    expect(swContent).toContain("addEventListener('fetch'");
  });
});
