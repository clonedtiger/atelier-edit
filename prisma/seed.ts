import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

const connectionString = process.env.DATABASE_URL || 'postgresql://keithmisson@localhost:5432/fashionfeed';
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

import { CURATED_WARDROBE_CATALOG } from '../src/lib/curatedCatalog';

export async function seedWardrobeForUsers(targetUserEmails?: string[]) {
  console.log('Seeding curated 31-piece wardrobe across users...');

  // Get all users if no specific email provided
  const users = await prisma.user.findMany({
    where: targetUserEmails && targetUserEmails.length > 0 ? { email: { in: targetUserEmails } } : {},
  });

  console.log(`Found ${users.length} user(s) to populate wardrobe for.`);

  for (const user of users) {
    // Clear existing wardrobe items for this user to avoid duplicates
    await prisma.wardrobeItem.deleteMany({ where: { userId: user.id } });

    // Seed all 31 items
    const createdItems = await Promise.all(
      CURATED_WARDROBE_CATALOG.map((item) =>
        prisma.wardrobeItem.create({
          data: {
            ...item,
            userId: user.id,
          },
        })
      )
    );

    console.log(`✓ Seeded ${createdItems.length} wardrobe pieces for ${user.email} (${user.name})`);
  }
}

async function main() {
  console.log('Seeding local PostgreSQL database via Prisma...');

  // 1. Create/Ensure default users exist
  const defaultUsers = [
    {
      email: 'curator@atelieredit.com',
      name: 'Atelier Curator',
      role: 'admin',
      styleAesthetic: 'Minimalist Quiet Luxury x Editorial Tailoring',
      favoriteBrands: 'The Row, Toteme, Khaite, Chanel, AllSaints',
      avoidedStyles: 'No neon colors, avoid synthetic fast-fashion polyester, no loud branding logos',
      colorPalette: 'Black, Cream, Camel, Charcoal, Forest Pine',
      workLife: 'Creative Director & Fashion Editor traveling between London and Paris',
      inspirationNotes: 'Clean architectural silhouettes, textured knitwear, structural outerwear, refined hardware accents',
    },
    {
      email: 'demo_mobile@atelier.com',
      name: 'Demo Mobile',
      role: 'user',
      styleAesthetic: 'Minimalist Quiet Luxury x Modern Parisian',
      favoriteBrands: 'Toteme, The Row, Celine, Khaite',
      colorPalette: 'Black, Camel, Ecru, Espresso, Navy',
    },
    {
      email: 'keith@sparky.com',
      name: 'Keith Misson',
      role: 'admin',
      styleAesthetic: 'Minimalist Tailoring & Quiet Luxury',
      favoriteBrands: 'The Row, Toteme, Max Mara, AllSaints',
      colorPalette: 'Black, Charcoal, Camel, Ivory',
    },
    {
      email: 'wife@fashionfeed.com',
      name: 'Wife',
      role: 'user',
      styleAesthetic: 'Contemporary Luxury & Haute Couture',
      favoriteBrands: 'Chanel, Toteme, Khaite, Bottega Veneta',
      colorPalette: 'Black, Cream, Champagne, Gold',
    }
  ];

  for (const u of defaultUsers) {
    await prisma.user.upsert({
      where: { email: u.email },
      update: {
        role: u.role,
        styleAesthetic: u.styleAesthetic,
        favoriteBrands: u.favoriteBrands,
        colorPalette: u.colorPalette,
      },
      create: u,
    });
  }

  // 2. Clear old feed subscriptions & recreations
  await prisma.userFeedSubscription.deleteMany({});
  await prisma.feedSource.deleteMany({});
  await prisma.trendArticle.deleteMany({});

  // 3. Seed Curated Starter Feed Channels
  const feedSources = [
    { name: 'Magasin (Laura Reilly)', url: 'https://magasin.substack.com/feed', type: 'rss', category: 'Editorial Substacks' },
    { name: 'The Cereal Aisle (Leandra Medine Cohen)', url: 'https://thecerealaisle.substack.com/feed', type: 'rss', category: 'Editorial Substacks' },
    { name: '5 Things You Should Buy (Becky Malinsky)', url: 'https://5thingsyoushouldbuy.substack.com/feed', type: 'rss', category: 'Editorial Substacks' },
    { name: 'Loïc Prigent (Runway & Behind The Scenes)', url: 'https://www.youtube.com/feeds/videos.xml?channel_id=UCU5Z-qPL8Terv_te68esHOw', type: 'youtube', category: 'Luxury & Haute Couture' },
    { name: 'Who What Wear (Trend Radar)', url: 'https://www.whowhatwear.com', type: 'rss', category: 'Contemporary Style' },
    { name: 'Vogue Runway Analysis', url: 'https://www.vogue.com/feed/rss', type: 'rss', category: 'Luxury & Haute Couture' },
    { name: 'Highsnobiety Editorial', url: 'https://www.highsnobiety.com/feed/', type: 'rss', category: 'Streetwear & Contemporary' },
  ];

  const allUsers = await prisma.user.findMany();

  for (const fs of feedSources) {
    const createdFeed = await prisma.feedSource.create({ data: fs });
    for (const u of allUsers) {
      await prisma.userFeedSubscription.create({
        data: {
          userId: u.id,
          feedSourceId: createdFeed.id,
          isMuted: false,
        },
      });
    }
  }

  // 4. Seed 31 Wardrobe Items for All Users
  await seedWardrobeForUsers();

  console.log('✨ All users now have 31 high-resolution wardrobe pieces across all categories.');
}

main()
  .then(async () => {
    await prisma.$disconnect();
    await pool.end();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    await pool.end();
    process.exit(1);
  });
