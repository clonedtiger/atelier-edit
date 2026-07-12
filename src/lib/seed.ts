import { prisma } from './db';

export async function seedDatabase() {
  console.log('Starting database seed...');

  // 1. Create or get default user
  const user = await prisma.user.upsert({
    where: { email: 'wife@fashionfeed.com' },
    update: {},
    create: {
      email: 'wife@fashionfeed.com',
      name: 'Wife',
    },
  });
  console.log(`Default User created/found: ${user.email}`);

  // 2. Clear existing entries to prevent duplication
  await prisma.recommendation.deleteMany({ where: { userId: user.id } });
  await prisma.wardrobeItem.deleteMany({ where: { userId: user.id } });
  await prisma.feedSource.deleteMany({});
  await prisma.trendArticle.deleteMany({});

  // 3. Seed Feed Sources from OPML
  const feedSources = [
    { name: 'Magasin (Laura Reilly)', url: 'https://magasin.substack.com/feed', type: 'rss' },
    { name: 'The Cereal Aisle (Leandra Medine Cohen)', url: 'https://thecerealaisle.substack.com/feed', type: 'rss' },
    { name: '5 Things You Should Buy (Becky Malinsky)', url: 'https://5thingsyoushouldbuy.substack.com/feed', type: 'rss' },
    { name: 'Loïc Prigent (YouTube)', url: 'https://www.youtube.com/feeds/videos.xml?channel_id=UCU5Z-qPL8Terv_te68esHOw', type: 'youtube' },
    { name: 'Who What Wear', url: 'https://www.whowhatwear.com/feeds.xml', type: 'rss' },
  ];

  for (const fs of feedSources) {
    await prisma.feedSource.create({
      data: fs
    });
  }
  console.log('Seeded 5 Feed Sources.');

  // 4. Seed Wardrobe Items
  const items = [
    {
      userId: user.id,
      imageUrl: 'https://images.unsplash.com/photo-1591047139829-d91aecb6caea?q=80&w=600&auto=format&fit=crop',
      category: 'Outerwear',
      color: ['#000000', 'Gold'],
      brand: 'Zara Studio',
      styleNotes: 'Structured double-breasted tweed blazer with ornate gold button closures. Features defined shoulders reminiscent of classic Chanel.',
      detectedTags: ['tweed', 'blazer', 'double-breasted', 'gold-buttons', 'chanel-coded', 'tailoring'],
    },
    {
      userId: user.id,
      imageUrl: 'https://images.unsplash.com/photo-1608256246200-53e635b5b65f?q=80&w=600&auto=format&fit=crop',
      category: 'Shoes',
      color: ['#111111'],
      brand: 'AllSaints',
      styleNotes: 'Chunky sole combat boots in textured matte black leather. Multiple buckle straps and high silver zipper details providing an industrial grunge vibe.',
      detectedTags: ['leather', 'boots', 'buckles', 'hardware', 'grunge', 'mcqueen-coded'],
    },
    {
      userId: user.id,
      imageUrl: 'https://images.unsplash.com/photo-1434389677669-e08b4cac3105?q=80&w=600&auto=format&fit=crop',
      category: 'Tops',
      color: ['#E5E5E5', 'Ivory'],
      brand: 'Mango Capsule',
      styleNotes: 'Fine ribbed-knit sleeveless top in soft cream ivory. Features a draped cowl neck and an asymmetrical wrap-hem silhouette.',
      detectedTags: ['knit', 'draped', 'asymmetric', 'minimalist', 'ivory'],
    },
  ];

  const seededItems = [];
  for (const item of items) {
    const created = await prisma.wardrobeItem.create({ data: item });
    seededItems.push(created);
  }
  console.log(`Seeded ${seededItems.length} wardrobe items.`);

  // 5. Seed a styled recommendation linking the seeded items
  const rec = await prisma.recommendation.create({
    data: {
      userId: user.id,
      title: 'Tweed Tailoring meets Rebel Hardware',
      narrative: 'A striking structural contrast that balances Chanel elegance with Alexander McQueen grunge. Pair the defined shoulders of your Zara Studio Tweed Blazer with the heavy hardware buckle straps of your AllSaints Combat Boots. Ground the contrast using the draped cowl neck asymmetry of the Mango Ivory Knit top. To elevate the McQueen grunge undertone, add an asymmetric buckled leather handbag as the final accent.',
    },
  });

  // Recommendation Items
  // Item 1: Tweed Blazer (Wardrobe)
  await prisma.recommendationItem.create({
    data: {
      recommendationId: rec.id,
      wardrobeItemId: seededItems[0].id,
      stylingRationale: 'Layer this over the ivory knit. The structured shoulder tailoring frames the relaxed drape underneath.',
    },
  });

  // Item 2: Cowl Neck Ivory Top (Wardrobe)
  await prisma.recommendationItem.create({
    data: {
      recommendationId: rec.id,
      wardrobeItemId: seededItems[2].id,
      stylingRationale: 'Adds a soft cowl-neck texture contrast against the stiff structure of the blazer.',
    },
  });

  // Item 3: Combat Boots (Wardrobe)
  await prisma.recommendationItem.create({
    data: {
      recommendationId: rec.id,
      wardrobeItemId: seededItems[1].id,
      stylingRationale: 'Tuck denim or trousers directly into the buckled shaft to add raw edge weight to the clean tailoring.',
    },
  });

  // Item 4: Asymmetric Belted Bag (New Purchase Suggestion)
  await prisma.recommendationItem.create({
    data: {
      recommendationId: rec.id,
      purchaseName: 'Asymmetric Leather Buckle Crossbody Bag',
      purchaseBrand: 'AllSaints',
      purchaseUrl: 'https://www.allsaints.com/search?q=asymmetric+leather+bag',
      purchaseImageUrl: 'https://images.unsplash.com/photo-1584917865442-de89df76afd3?q=80&w=600&auto=format&fit=crop',
      priceEstimate: '$248',
      stylingRationale: 'A custom hardware bag that pulls together the silver zippers on the boots and reinforces the asymmetric McQueen design rules.',
    },
  });

  console.log('Seeded default outfit recommendation.');
  console.log('Database seeding complete.');
}
