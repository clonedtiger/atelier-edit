import { GUIDE_CATEGORIES, GUIDES_ARTICLES } from '../src/data/guides_data';

describe('Guides & Help Center Content & Structure Verification', () => {
  it('should have all 9 required categories defined', () => {
    const categoryIds = GUIDE_CATEGORIES.map((c) => c.id);
    expect(categoryIds).toContain('all');
    expect(categoryIds).toContain('quickstart');
    expect(categoryIds).toContain('stylist');
    expect(categoryIds).toContain('wardrobe');
    expect(categoryIds).toContain('capsule');
    expect(categoryIds).toContain('studio');
    expect(categoryIds).toContain('inspirations');
    expect(categoryIds).toContain('profile');
    expect(categoryIds).toContain('gdpr');
    expect(GUIDE_CATEGORIES.length).toBe(9);
  });

  it('should contain comprehensive articles covering all core features', () => {
    expect(GUIDES_ARTICLES.length).toBeGreaterThanOrEqual(8);

    const articleCategories = GUIDES_ARTICLES.map((a) => a.category);
    expect(articleCategories).toContain('quickstart');
    expect(articleCategories).toContain('stylist');
    expect(articleCategories).toContain('wardrobe');
    expect(articleCategories).toContain('capsule');
    expect(articleCategories).toContain('studio');
    expect(articleCategories).toContain('inspirations');
    expect(articleCategories).toContain('profile');
    expect(articleCategories).toContain('gdpr');
  });

  it('should contain detailed password change and reset instructions in profile guide', () => {
    const profileGuide = GUIDES_ARTICLES.find((a) => a.category === 'profile');
    expect(profileGuide).toBeDefined();
    if (!profileGuide) return;

    const sectionsText = profileGuide.sections
      .map((s) => s.heading + ' ' + s.content.join(' ') + ' ' + (s.steps?.join(' ') || ''))
      .join(' ');

    expect(sectionsText.toLowerCase()).toContain('password');
    expect(sectionsText.toLowerCase()).toContain('verification code');
    expect(sectionsText.toLowerCase()).toContain('sizing');
    expect(sectionsText.toLowerCase()).toContain('archetype');
  });

  it('should contain detailed Studio flat-lay canvas guidelines', () => {
    const studioGuide = GUIDES_ARTICLES.find((a) => a.category === 'studio');
    expect(studioGuide).toBeDefined();
    if (!studioGuide) return;

    const sectionsText = studioGuide.sections
      .map((s) => s.heading + ' ' + s.content.join(' ') + ' ' + (s.steps?.join(' ') || ''))
      .join(' ');

    expect(sectionsText.toLowerCase()).toContain('drag');
    expect(sectionsText.toLowerCase()).toContain('rotate');
    expect(sectionsText.toLowerCase()).toContain('layer');
    expect(sectionsText.toLowerCase()).toContain('canvas');
  });

  it('should contain detailed Capsule travel packing matrices instructions', () => {
    const capsuleGuide = GUIDES_ARTICLES.find((a) => a.category === 'capsule');
    expect(capsuleGuide).toBeDefined();
    if (!capsuleGuide) return;

    const sectionsText = capsuleGuide.sections
      .map((s) => s.heading + ' ' + s.content.join(' ') + ' ' + (s.steps?.join(' ') || ''))
      .join(' ');

    expect(sectionsText.toLowerCase()).toContain('10x10');
    expect(sectionsText.toLowerCase()).toContain('5x4');
    expect(sectionsText.toLowerCase()).toContain('packing');
    expect(sectionsText.toLowerCase()).toContain('destination');
  });

  it('should contain GDPR rights and Article 20 data package export instructions', () => {
    const gdprGuide = GUIDES_ARTICLES.find((a) => a.category === 'gdpr');
    expect(gdprGuide).toBeDefined();
    if (!gdprGuide) return;

    const sectionsText = gdprGuide.sections
      .map((s) => s.heading + ' ' + s.content.join(' ') + ' ' + (s.steps?.join(' ') || ''))
      .join(' ');

    expect(sectionsText.toLowerCase()).toContain('article 20');
    expect(sectionsText.toLowerCase()).toContain('article 17');
    expect(sectionsText.toLowerCase()).toContain('forgotten');
    expect(sectionsText.toLowerCase()).toContain('data package');
  });
});
