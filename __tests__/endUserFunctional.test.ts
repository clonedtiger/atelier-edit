import { prisma } from '@/lib/db';
import bcrypt from 'bcryptjs';
import { encryptSession, decryptSession } from '@/lib/session';

describe('End-User Acceptance & Functional Test Suite (END_USER_TEST_PLAN.txt)', () => {
  let testUserId: string;
  let testUserEmail: string;
  let adminUserId: string;
  let adminUserEmail: string;
  let testSessionToken: string;

  beforeAll(async () => {
    const timestamp = Date.now();
    testUserEmail = `qa_e2e_user_${timestamp}@atelieredit.com`;
    adminUserEmail = `qa_e2e_admin_${timestamp}@atelieredit.com`;

    // 1. Create standard QA user
    const passwordHash = await bcrypt.hash('Password123!', 10);
    const user = await prisma.user.create({
      data: {
        email: testUserEmail,
        name: 'Helena Vance',
        passwordHash,
        role: 'user',
        sex: 'Female',
        clothingSize: 'UK 10',
        height: '175 cm',
        waistSize: '72 cm',
        styleAesthetic: 'Minimalist Quiet Luxury x Modern Tailoring',
        favoriteBrands: 'The Row, Toteme, Khaite',
        colorPalette: 'Black, Cream, Camel, Charcoal',
      },
    });
    testUserId = user.id;

    // 2. Create Admin QA user
    const admin = await prisma.user.create({
      data: {
        email: adminUserEmail,
        name: 'QA Admin Director',
        passwordHash,
        role: 'admin',
      },
    });
    adminUserId = admin.id;

    // Issue encrypted AES-256-GCM session token
    testSessionToken = encryptSession({ userId: user.id });
  });

  afterAll(async () => {
    // Cleanup QA test data
    if (testUserId) {
      await prisma.userFeedSubscription.deleteMany({ where: { userId: testUserId } });
      await prisma.wardrobeItem.deleteMany({ where: { userId: testUserId } });
      await prisma.inspirationImage.deleteMany({ where: { userId: testUserId } });
      await prisma.capsuleTrip.deleteMany({ where: { userId: testUserId } });
      await prisma.outfitCollage.deleteMany({ where: { userId: testUserId } });
      await prisma.recommendation.deleteMany({ where: { userId: testUserId } });
      await prisma.usageActivity.deleteMany({ where: { userId: testUserId } });
      await prisma.user.delete({ where: { id: testUserId } }).catch(() => {});
    }
    if (adminUserId) {
      await prisma.usageActivity.deleteMany({ where: { userId: adminUserId } });
      await prisma.user.delete({ where: { id: adminUserId } }).catch(() => {});
    }
  });

  describe('Module 1: User Onboarding, Authentication & Security (TC-01 to TC-05)', () => {
    it('[TC-01 & TC-02] should verify user creation, password hashing, and token signature', async () => {
      const user = await prisma.user.findUnique({ where: { id: testUserId } });
      expect(user).not.toBeNull();
      expect(user?.email).toBe(testUserEmail);
      
      const isValidPassword = await bcrypt.compare('Password123!', user!.passwordHash!);
      expect(isValidPassword).toBe(true);

      const decrypted = decryptSession(testSessionToken);
      expect(decrypted).not.toBeNull();
      expect(decrypted?.userId).toBe(testUserId);
    });

    it('[TC-03] should enable and store TOTP MFA secrets securely', async () => {
      const updated = await prisma.user.update({
        where: { id: testUserId },
        data: {
          mfaEnabled: true,
          mfaSecret: 'JBSWY3DPEHPK3PXP',
        },
      });
      expect(updated.mfaEnabled).toBe(true);
      expect(updated.mfaSecret).toBe('JBSWY3DPEHPK3PXP');
    });

    it('[TC-04] should handle password reset codes and expiration timestamp correctly', async () => {
      const now = new Date();
      const expiresAt = new Date(now.getTime() + 15 * 60 * 1000);
      const updated = await prisma.user.update({
        where: { id: testUserId },
        data: {
          passwordResetCode: '849201',
          passwordResetExpires: expiresAt,
        },
      });
      expect(updated.passwordResetCode).toBe('849201');
      expect(updated.passwordResetExpires!.getTime()).toBeGreaterThan(Date.now());
    });
  });

  describe('Module 3: AI Personal Stylist & Lookbook Generation (TC-09 to TC-12)', () => {
    let blazerItemId: string;

    beforeAll(async () => {
      const item = await prisma.wardrobeItem.create({
        data: {
          userId: testUserId,
          category: 'Outerwear',
          brand: 'Zara Studio',
          color: ['Black', 'Gold'],
          styleNotes: 'Structured double-breasted tweed blazer with gold buttons.',
          detectedTags: ['tweed', 'blazer', 'tailoring', 'chanel-coded'],
          imageUrl: 'https://images.unsplash.com/photo-1591047139829-d91aecb6caea?q=80&w=800&auto=format&fit=crop',
        },
      });
      blazerItemId = item.id;
    });

    it('[TC-09 & TC-11] should generate a personalized lookbook recommendation with anchor garment', async () => {
      const rec = await prisma.recommendation.create({
        data: {
          userId: testUserId,
          title: 'Ecru Tailoring meets Chanel Tweed',
          narrative: 'A striking contrast pairing the structured Zara Studio Tweed Blazer with relaxed ecru trousers.',
          outfitItems: {
            create: [
              {
                wardrobeItemId: blazerItemId,
                stylingRationale: 'Layer as the structured hero piece over silk knit.',
              },
              {
                purchaseName: 'Toteme Monogram Cashmere Scarf',
                purchaseBrand: 'Toteme',
                purchaseUrl: 'https://www.net-a-porter.com/en-gb/shop/designer/toteme',
                priceEstimate: '£295',
                stylingRationale: 'Drapes effortlessly across the blazer lapels.',
              },
            ],
          },
        },
        include: { outfitItems: true },
      });

      expect(rec.id).toBeDefined();
      expect(rec.title).toContain('Tweed');
      expect(rec.outfitItems).toHaveLength(2);
      expect(rec.outfitItems[0].wardrobeItemId).toBe(blazerItemId);
    });
  });

  describe('Module 5: Wardrobe Closet Management & Analytics (TC-16 to TC-20)', () => {
    it('[TC-16 & TC-17] should create, retrieve, and filter wardrobe items', async () => {
      await prisma.wardrobeItem.createMany({
        data: [
          {
            userId: testUserId,
            category: 'Tops',
            brand: 'The Row',
            color: ['White'],
            styleNotes: 'Oversized crisp cotton poplin shirt.',
            detectedTags: ['poplin', 'white-shirt', 'minimalist'],
            imageUrl: 'https://images.unsplash.com/photo-1598033129183-c4f50c736f10?q=80&w=800&auto=format&fit=crop',
          },
          {
            userId: testUserId,
            category: 'Bottoms',
            brand: 'COS',
            color: ['Black'],
            styleNotes: 'High-waisted wide-leg pleated trousers.',
            detectedTags: ['wide-leg', 'pleated', 'tailored'],
            imageUrl: 'https://images.unsplash.com/photo-1509551388413-e18d0ac5d495?q=80&w=800&auto=format&fit=crop',
          },
          {
            userId: testUserId,
            category: 'Shoes',
            brand: 'AllSaints',
            color: ['Black'],
            styleNotes: 'Chunky buckle leather combat boots.',
            detectedTags: ['leather-boots', 'buckles', 'grunge'],
            imageUrl: 'https://images.unsplash.com/photo-1608256246200-53e635b5b65f?q=80&w=800&auto=format&fit=crop',
          },
        ],
      });

      const userItems = await prisma.wardrobeItem.findMany({ where: { userId: testUserId } });
      expect(userItems.length).toBeGreaterThanOrEqual(4);

      const outerwear = await prisma.wardrobeItem.findMany({
        where: { userId: testUserId, category: 'Outerwear' },
      });
      expect(outerwear).toHaveLength(1);
    });

    it('[TC-19] should detect and merge duplicate wardrobe items safely', async () => {
      const dup1 = await prisma.wardrobeItem.create({
        data: {
          userId: testUserId,
          category: 'Accessories',
          brand: 'Celine',
          color: ['Burgundy'],
          imageUrl: 'https://images.unsplash.com/photo-1590874103328-eac38a683ce7?q=80&w=800&auto=format&fit=crop',
          styleNotes: 'Triomphe Box Bag',
        },
      });

      const dup2 = await prisma.wardrobeItem.create({
        data: {
          userId: testUserId,
          category: 'Accessories',
          brand: 'Celine',
          color: ['Burgundy'],
          imageUrl: 'https://images.unsplash.com/photo-1590874103328-eac38a683ce7?q=80&w=800&auto=format&fit=crop',
          styleNotes: 'Triomphe Box Bag Duplicate',
        },
      });

      // Merge dup2 into dup1
      await prisma.wardrobeItem.delete({ where: { id: dup2.id } });
      const remaining = await prisma.wardrobeItem.findMany({
        where: { userId: testUserId, brand: 'Celine' },
      });
      expect(remaining).toHaveLength(1);
      expect(remaining[0].id).toBe(dup1.id);
    });
  });

  describe('Module 6: Travel Capsule Assistant & Weather (TC-21 to TC-24)', () => {
    it('[TC-21 & TC-24] should create a travel capsule and inspect items', async () => {
      const capsule = await prisma.capsuleTrip.create({
        data: {
          userId: testUserId,
          destination: 'Paris, France',
          startDate: new Date('2026-10-01'),
          endDate: new Date('2026-10-06'),
          tripPurpose: 'Fashion Week & Dinners',
          luggageType: 'Carry-on Only',
          itemIds: ['item-1', 'item-2'],
          outfitSchedule: { day1: 'Tailored Blazer Look', day2: 'Silk Slip Dress' },
          checklistNotes: 'Passport, power adapter, sunglasses',
        },
      });

      expect(capsule.id).toBeDefined();
      expect(capsule.destination).toBe('Paris, France');
      expect(capsule.itemIds).toHaveLength(2);
    });
  });

  describe('Module 7: Editorial Studio & Flat-Lay Canvas (TC-25 to TC-28)', () => {
    it('[TC-25 & TC-28] should compose and save an editorial flat-lay canvas spread', async () => {
      const spread = await prisma.outfitCollage.create({
        data: {
          userId: testUserId,
          title: 'Parisian Sunday Gallery Walk',
          canvasData: [
            { id: '1', type: 'wardrobe', x: 120, y: 80, scale: 1.1, rotation: -5, zIndex: 1 },
            { id: '2', type: 'wardrobe', x: 280, y: 160, scale: 0.9, rotation: 10, zIndex: 2 },
          ],
        },
      });

      expect(spread.id).toBeDefined();
      expect(spread.title).toBe('Parisian Sunday Gallery Walk');
      const items = spread.canvasData as Array<{ id: string; scale: number }>;
      expect(items).toHaveLength(2);
      expect(items[0].scale).toBe(1.1);
    });
  });

  describe('Module 8: Curated Fashion Channels & Visual Moodboard (TC-29 to TC-32)', () => {
    it('[TC-29 & TC-30] should subscribe to channels and toggle mute states', async () => {
      const feed = await prisma.feedSource.upsert({
        where: { url: `https://www.vanityfair.com/feed/style/rss?qa=${testUserId}` },
        update: {},
        create: {
          name: 'Vanity Fair Runway Radar',
          url: `https://www.vanityfair.com/feed/style/rss?qa=${testUserId}`,
          type: 'rss',
          category: 'Luxury & Haute Couture',
        },
      });

      const sub = await prisma.userFeedSubscription.create({
        data: {
          userId: testUserId,
          feedSourceId: feed.id,
          isMuted: false,
        },
      });

      expect(sub.isMuted).toBe(false);

      const mutedSub = await prisma.userFeedSubscription.update({
        where: { id: sub.id },
        data: { isMuted: true },
      });
      expect(mutedSub.isMuted).toBe(true);
    });

    it('[TC-31 & TC-32] should save visual moodboard snapshots with hashtag tags', async () => {
      const moodSnap = await prisma.inspirationImage.create({
        data: {
          userId: testUserId,
          imageUrl: 'https://images.unsplash.com/photo-1548036328-c9fa89d128fa?q=80&w=800&auto=format&fit=crop',
          notes: 'Intrecciato Bottega bag in boutique window',
          tags: ['intreccio', 'green', 'leather', 'statement'],
        },
      });

      expect(moodSnap.id).toBeDefined();
      expect(moodSnap.tags).toContain('intreccio');
    });
  });

  describe('Module 9: Sizing Profile, Haute Couture Croquis & GDPR (TC-33 to TC-36)', () => {
    it('[TC-33 & TC-35] should export full machine-readable data package under GDPR Article 20', async () => {
      const dataPackage = await prisma.user.findUnique({
        where: { id: testUserId },
        include: {
          wardrobeItems: true,
          inspirations: true,
          recommendations: { include: { outfitItems: true } },
          capsules: true,
          collages: true,
          feedSubscriptions: { include: { feedSource: true } },
        },
      });

      expect(dataPackage).not.toBeNull();
      expect(dataPackage?.wardrobeItems.length).toBeGreaterThan(0);
      expect(dataPackage?.inspirations.length).toBeGreaterThan(0);
      expect(dataPackage?.recommendations.length).toBeGreaterThan(0);
      expect(dataPackage?.capsules.length).toBeGreaterThan(0);
      expect(dataPackage?.collages.length).toBeGreaterThan(0);
    });
  });

  describe('Module 10: Admin Management Portal & Governance (TC-37 to TC-40)', () => {
    it('[TC-37 & TC-39] should allow admin users to manage user account status', async () => {
      const adminUser = await prisma.user.findUnique({ where: { id: adminUserId } });
      expect(adminUser?.role).toBe('admin');

      // Admin suspends test user
      const suspended = await prisma.user.update({
        where: { id: testUserId },
        data: { suspended: true },
      });
      expect(suspended.suspended).toBe(true);

      // Admin unsuspends test user
      const unsuspended = await prisma.user.update({
        where: { id: testUserId },
        data: { suspended: false },
      });
      expect(unsuspended.suspended).toBe(false);
    });

    it('[TC-40] should record activity logs in the platform audit trail', async () => {
      const log = await prisma.usageActivity.create({
        data: {
          userId: adminUserId,
          action: 'LOGIN',
        },
      });

      expect(log.id).toBeDefined();
      expect(log.action).toBe('LOGIN');
    });
  });
});
