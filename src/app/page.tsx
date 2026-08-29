'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Image from 'next/image';
import { WhatsNewPost } from '@/lib/whatsNew';

interface UserProfile {
  id: string;
  email: string;
  name: string;
  sex: string | null;
  phone: string | null;
  height: string | null;
  weight: string | null;
  waistSize: string | null;
  braSize: string | null;
  shoeSize: string | null;
  hatSize: string | null;
  gloveSize: string | null;
  clothingSize: string | null;
  workLife: string | null;
  inspirationNotes: string | null;
  styleAesthetic?: string | null;
  favoriteBrands?: string | null;
  avoidedStyles?: string | null;
  colorPalette?: string | null;
  locationCity?: string | null;
  mfaEnabled: boolean;
  marketingEmail?: boolean;
  marketingSms?: boolean;
  marketingPartners?: boolean;
  marketingConsentUpdatedAt?: string | null;
  role?: string;
  suspended?: boolean;
}

export interface WeatherInfo {
  city: string;
  country?: string;
  tempCelsius: number;
  tempFahrenheit: number;
  condition: string;
  weatherCode: number;
  icon: string;
  stylingDirectives: string;
}

export interface CapsuleTripItem {
  id: string;
  destination: string;
  startDate: string;
  endDate: string;
  tripPurpose: string;
  luggageType: string;
  itemIds: string[];
  outfitSchedule: Array<{
    dayNumber: number;
    date: string;
    dayLook: { title: string; narrative: string; itemIds: string[] };
    eveningLook: { title: string; narrative: string; itemIds: string[] };
  }>;
  checklistNotes?: string;
  createdAt: string;
}

export interface WardrobeAnalyticsData {
  totalItems: number;
  categoryBreakdown: Array<{ category: string; count: number; percentage: number }>;
  colorBreakdown: Array<{ family: string; count: number; percentage: number; colors: string[] }>;
  styleDnaAlignmentScore: number;
  unwornGems: WardrobeItem[];
}

export interface WardrobeGapItem {
  purchaseName: string;
  purchaseBrand: string;
  category: string;
  estimatedPrice: string;
  stylingRationale: string;
  unlocksLooksCount: number;
  purchaseUrl: string | null;
}

export interface CollageCanvasElement {
  id: string;
  imageUrl: string;
  x: number;
  y: number;
  scale: number;
  rotation: number;
  zIndex: number;
  label: string;
}

export interface OutfitCollageItem {
  id: string;
  title: string;
  canvasData: CollageCanvasElement[];
  thumbnailUrl?: string | null;
  createdAt: string;
}

interface WardrobeItem {
  id: string;
  imageUrl: string;
  category: string;
  color: string[];
  brand: string | null;
  styleNotes: string | null;
  detectedTags: string[];
  createdAt: string;
}

interface InspirationImage {
  id: string;
  imageUrl: string;
  notes: string | null;
  tags: string[];
  createdAt: string;
}

interface RecommendationItem {
  id: string;
  wardrobeItemId: string | null;
  purchaseName: string | null;
  purchaseBrand: string | null;
  purchaseUrl: string | null;
  purchaseImageUrl: string | null;
  priceEstimate: string | null;
  stylingRationale: string;
  wardrobeItemImage?: string | null;
  wardrobeItemCategory?: string | null;
  wardrobeItemTags?: string[];
}

interface Recommendation {
  id: string;
  title: string;
  narrative: string;
  createdAt: string;
  outfitItems: RecommendationItem[];
}

interface FeedSource {
  id: string;
  name: string;
  url: string;
  type: string;
  category?: string;
  isCustom?: boolean;
  isSubscribed?: boolean;
  isMuted: boolean;
  createdAt: string;
}

export const STYLE_ARCHETYPES = [
  { id: 'quiet-luxury', label: 'Minimalist Quiet Luxury', desc: 'Understated elegance, neutral palette, architectural tailoring (e.g. The Row, Toteme, Khaite, Loro Piana)' },
  { id: 'parisian-chic', label: 'Parisian Chic', desc: 'Effortless classic tailoring, bouclé jackets, breton stripes, refined denim, slingbacks' },
  { id: 'avant-garde-rebel', label: 'Structural Avant-Garde / Rebel', desc: 'Asymmetric cuts, hardware, leather, dark tailoring, structural deconstruction (e.g. McQueen, Rick Owens)' },
  { id: 'contemporary-street', label: 'Contemporary Streetwear', desc: 'Relaxed silhouettes, elevated hoodies, statement sneakers, utility trousers' },
  { id: 'old-money', label: 'Old Money / Heritage Preppy', desc: 'Cable knits, tailored blazers, loafers, crisp shirting, equestrian accents' },
  { id: 'executive-tailored', label: 'Modern Executive / Power Tailoring', desc: 'Sharp double-breasted suits, crisp poplin, sleek trench coats, leather totes' },
  { id: 'boho-artisan', label: 'Bohemian Artisan', desc: 'Rich textures, flowing silhouettes, earthy tones, artisanal jewelry, vintage suede' },
  { id: 'custom', label: 'Custom Aesthetic', desc: 'Your bespoke aesthetic blending multiple design philosophies' },
];

export interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export default function AtelierEditDashboard() {
  const [activeTab, setActiveTab] = useState<'feed' | 'closet' | 'capsule' | 'studio' | 'trends' | 'account' | 'whats-new'>('whats-new');
  const [user, setUser] = useState<UserProfile | null>(null);
  
  // Data lists
  const [wardrobe, setWardrobe] = useState<WardrobeItem[]>([]);
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [feeds, setFeeds] = useState<FeedSource[]>([]);
  const [whatsNewPosts, setWhatsNewPosts] = useState<WhatsNewPost[]>([]);
  
  // Loading states
  const [loadingMe, setLoadingMe] = useState(false);
  const [loadingWardrobe, setLoadingWardrobe] = useState(false);
  const [loadingRecommendations, setLoadingRecommendations] = useState(false);
  const [loadingFeeds, setLoadingFeeds] = useState(false);
  const [loadingWhatsNew, setLoadingWhatsNew] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [styleVibePrompt, setStyleVibePrompt] = useState('');
  const [isSavingProfile, setIsSavingProfile] = useState(false);

  // Batch Ingestion States
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);
  const [uploadBrand, setUploadBrand] = useState('');
  const [uploadNotes, setUploadNotes] = useState('');
  const [compressionStatus, setCompressionStatus] = useState<string | null>(null);
  const [bulkUploadProgress, setBulkUploadProgress] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const inspirationFileInputRef = useRef<HTMLInputElement>(null);
  const inspirationCameraInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [showCameraModal, setShowCameraModal] = useState(false);
  const [cameraFacingMode, setCameraFacingMode] = useState<'environment' | 'user'>('environment');
  const [cameraTarget, setCameraTarget] = useState<'wardrobe' | 'inspiration'>('wardrobe');

  // Spreadsheet Bulk Edit States
  const [isSpreadsheetMode, setIsSpreadsheetMode] = useState(false);
  const [selectedItemIds, setSelectedItemIds] = useState<string[]>([]);
  const [editBuffer, setEditBuffer] = useState<Record<string, { brand: string; category: string; styleNotes: string; tags: string }>>({});
  const [bulkBrandValue, setBulkBrandValue] = useState('');

  // Item-Anchored Outfit Generation State
  const [anchorGarment, setAnchorGarment] = useState<WardrobeItem | null>(null);

  // Marketing & GDPR Consent States
  const [marketingEmail, setMarketingEmail] = useState(false);
  const [marketingSms, setMarketingSms] = useState(false);
  const [marketingPartners, setMarketingPartners] = useState(false);
  const [marketingConsentUpdatedAt, setMarketingConsentUpdatedAt] = useState<string | null>(null);
  const [isSavingConsent, setIsSavingConsent] = useState(false);

  // GDPR Account Deletion Modal States
  const [showGdprDeleteModal, setShowGdprDeleteModal] = useState(false);
  const [gdprConfirmInput, setGdprConfirmInput] = useState('');
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);
  const [isExportingData, setIsExportingData] = useState(false);

  // Search & Filtering States
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');

  // Add Feed fields
  const [newFeedUrl, setNewFeedUrl] = useState('');
  const [newFeedName, setNewFeedName] = useState('');
  const [newFeedType, setNewFeedType] = useState('rss');

  // Auth Inputs
  const [authMode, setAuthMode] = useState<'login' | 'signup' | 'mfa' | 'forgot'>('login');
  const [recoveryIdentity, setRecoveryIdentity] = useState('');
  const [recoveryStep, setRecoveryStep] = useState<'request' | 'verify'>('request');
  const [recoveryCode, setRecoveryCode] = useState('');
  const [recoveryPassword, setRecoveryPassword] = useState('');
  const [isSendingRecovery, setIsSendingRecovery] = useState(false);
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authName, setAuthName] = useState('');
  const [authMfaEnabled, setAuthMfaEnabled] = useState(false);
  const [authMfaCode, setAuthMfaCode] = useState('');
  const [signupSecret2FA, setSignupSecret2FA] = useState<string | null>(null);
  const [tempMfaUserId, setTempMfaUserId] = useState<string | null>(null);

  // Profile Edit fields
  const [profName, setProfName] = useState('');
  const [profSex, setProfSex] = useState('Female');
  const [profPhone, setProfPhone] = useState('');
  const [profBra, setProfBra] = useState('');
  const [profWorkLife, setProfWorkLife] = useState('');
  const [profInspirations, setProfInspirations] = useState('');
  const [profStyleAesthetic, setProfStyleAesthetic] = useState('Minimalist Quiet Luxury');
  const [profFavoriteBrands, setProfFavoriteBrands] = useState('');
  const [profAvoidedStyles, setProfAvoidedStyles] = useState('');
  const [profColorPalette, setProfColorPalette] = useState('');
  const [profLocationCity, setProfLocationCity] = useState('');
  const [profPassword, setProfPassword] = useState('');

  // Live Weather & Climate State
  const [liveWeather, setLiveWeather] = useState<WeatherInfo | null>(null);
  const [showWeatherModal, setShowWeatherModal] = useState(false);
  const [weatherCityInput, setWeatherCityInput] = useState('');
  const [isLoadingWeather, setIsLoadingWeather] = useState(false);

  // PWA & Install Prompt state
  const [pwaPromptEvent, setPwaPromptEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [showPwaBanner, setShowPwaBanner] = useState(false);

  // Capsule Wardrobe & Travel Itinerary Planner State
  const [capsules, setCapsules] = useState<CapsuleTripItem[]>([]);
  const [loadingCapsules, setLoadingCapsules] = useState(false);
  const [isGeneratingCapsule, setIsGeneratingCapsule] = useState(false);
  const [selectedCapsule, setSelectedCapsule] = useState<CapsuleTripItem | null>(null);
  const [tripDestination, setTripDestination] = useState('');
  const [tripStartDate, setTripStartDate] = useState('');
  const [tripEndDate, setTripEndDate] = useState('');
  const [tripPurpose, setTripPurpose] = useState('Business Meetings & Evening Dinners');
  const [tripLuggageType, setTripLuggageType] = useState('Carry-on Only');
  const [tripChecklistNotes, setTripChecklistNotes] = useState('');
  const [showNewCapsuleModal, setShowNewCapsuleModal] = useState(false);

  // Wardrobe Analytics & Gap Heatmaps State
  const [wardrobeViewMode, setWardrobeViewMode] = useState<'grid' | 'analytics'>('grid');
  const [analyticsData, setAnalyticsData] = useState<WardrobeAnalyticsData | null>(null);
  const [loadingAnalytics, setLoadingAnalytics] = useState(false);
  const [wardrobeGaps, setWardrobeGaps] = useState<WardrobeGapItem[]>([]);
  const [loadingGaps, setLoadingGaps] = useState(false);

  // Flat-Lay Studio Canvas State
  const [collages, setCollages] = useState<OutfitCollageItem[]>([]);
  const [loadingCollages, setLoadingCollages] = useState(false);
  const [canvasItems, setCanvasItems] = useState<CollageCanvasElement[]>([]);
  const [selectedCanvasItemId, setSelectedCanvasItemId] = useState<string | null>(null);
  const [collageTitle, setCollageTitle] = useState('Autumn Look Mood');
  const [isSavingCollage, setIsSavingCollage] = useState(false);

  // Discover & Custom Feeds state
  const [newFeedCategory, setNewFeedCategory] = useState('Luxury & Haute Couture');
  const [feedCategoryFilter, setFeedCategoryFilter] = useState('All');

  // Wardrobe duplicates & inline edit states
  const [duplicateGroups, setDuplicateGroups] = useState<Array<{ hash: string; items: WardrobeItem[] }>>([]);
  const [isScanningDuplicates, setIsScanningDuplicates] = useState(false);
  const [showDuplicatesScan, setShowDuplicatesScan] = useState(false);
  const [editingGarment, setEditingGarment] = useState<WardrobeItem | null>(null);
  const [editGarmentBrand, setEditGarmentBrand] = useState('');
  const [editGarmentCategory, setEditGarmentCategory] = useState('');
  const [editGarmentNotes, setEditGarmentNotes] = useState('');
  const [editGarmentTags, setEditGarmentTags] = useState('');
  const [isSavingGarmentEdit, setIsSavingGarmentEdit] = useState(false);

  // Inspirations board state
  const [inspirations, setInspirations] = useState<InspirationImage[]>([]);
  const [loadingInspirations, setLoadingInspirations] = useState(false);
  const [isUploadingInspiration, setIsUploadingInspiration] = useState(false);
  const [insCustomNotes, setInsCustomNotes] = useState('');
  const [inspirationFiles, setInspirationFiles] = useState<File[]>([]);
  const [inspirationPreviewUrls, setInspirationPreviewUrls] = useState<string[]>([]);
  const [selectedInspirationLightbox, setSelectedInspirationLightbox] = useState<InspirationImage | null>(null);
  const [inspirationTagFilter, setInspirationTagFilter] = useState('All');

  // Sizing sub-states for international measurements
  const [heightUnit, setHeightUnit] = useState<'cm' | 'ftin'>('cm');
  const [heightCm, setHeightCm] = useState('');
  const [heightFt, setHeightFt] = useState('');
  const [heightIn, setHeightIn] = useState('');

  const [weightUnit, setWeightUnit] = useState<'kg' | 'lbs' | 'st'>('kg');
  const [weightKg, setWeightKg] = useState('');
  const [weightLbs, setWeightLbs] = useState('');
  const [weightStValue, setWeightStValue] = useState('');
  const [weightStLbs, setWeightStLbs] = useState('');

  const [waistUnit, setWaistUnit] = useState<'in' | 'cm'>('in');
  const [waistVal, setWaistVal] = useState('');

  const [shoeSystem, setShoeSystem] = useState<'EU' | 'UK' | 'USW' | 'USM'>('EU');
  const [shoeVal, setShoeVal] = useState('');

  const [clothingSystem, setClothingSystem] = useState<'EU' | 'UK' | 'US' | 'Letter'>('UK');
  const [clothingVal, setClothingVal] = useState('');

  const [hatSystem, setHatSystem] = useState<'cm' | 'US' | 'Letter'>('cm');
  const [hatVal, setHatVal] = useState('');

  const [gloveSystem, setGloveSystem] = useState<'EU' | 'Letter'>('EU');
  const [gloveVal, setGloveVal] = useState('');

  // Filter wardrobe based on search and category filter state
  const getFilteredWardrobe = () => {
    return wardrobe.filter(item => {
      // 1. Category Filter
      if (categoryFilter !== 'All' && item.category !== categoryFilter) {
        return false;
      }
      
      // 2. Search Query Filter
      const query = searchQuery.trim().toLowerCase();
      if (!query) return true;

      const brandMatch = item.brand?.toLowerCase().includes(query) || false;
      const notesMatch = item.styleNotes?.toLowerCase().includes(query) || false;
      const categoryMatch = item.category.toLowerCase().includes(query);
      const tagsMatch = item.detectedTags.some(t => t.toLowerCase().includes(query));
      const colorMatch = item.color.some(c => c.toLowerCase().includes(query));

      return brandMatch || notesMatch || categoryMatch || tagsMatch || colorMatch;
    });
  };

  // Toast notifications
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  const showToast = useCallback((message: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToast({ message, type });
  }, []);

  // Clear toast automatically after 4 seconds
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  const populateProfileFields = useCallback((u: UserProfile) => {
    setProfName(u.name || '');
    setProfSex(u.sex || 'Female');
    setProfPhone(u.phone || '');

    // Height Parser
    const h = u.height || '';
    if (h.includes('ft') || h.includes('in') || h.includes('\'')) {
      setHeightUnit('ftin');
      const ftMatch = h.match(/(\d+)\s*(?:ft|')/);
      const inMatch = h.match(/(\d+)\s*(?:in|")/);
      setHeightFt(ftMatch ? ftMatch[1] : '');
      setHeightIn(inMatch ? inMatch[1] : '');
    } else {
      setHeightUnit('cm');
      const cmMatch = h.match(/(\d+)/);
      setHeightCm(cmMatch ? cmMatch[1] : '');
    }

    // Weight Parser
    const w = u.weight || '';
    if (w.includes('st')) {
      setWeightUnit('st');
      const stMatch = w.match(/(\d+)\s*(?:st)/);
      const lbsMatch = w.match(/(\d+)\s*(?:lbs|lb)/);
      setWeightStValue(stMatch ? stMatch[1] : '');
      setWeightStLbs(lbsMatch ? lbsMatch[1] : '');
    } else if (w.includes('lbs') || w.includes('lb')) {
      setWeightUnit('lbs');
      const lbsMatch = w.match(/(\d+)/);
      setWeightLbs(lbsMatch ? lbsMatch[1] : '');
    } else {
      setWeightUnit('kg');
      const kgMatch = w.match(/(\d+)/);
      setWeightKg(kgMatch ? kgMatch[1] : '');
    }

    // Waist Parser
    const waist = u.waistSize || '';
    if (waist.includes('cm')) {
      setWaistUnit('cm');
      const cmMatch = waist.match(/(\d+)/);
      setWaistVal(cmMatch ? cmMatch[1] : '');
    } else {
      setWaistUnit('in');
      const inMatch = waist.match(/(\d+)/);
      setWaistVal(inMatch ? inMatch[1] : '');
    }

    // Shoe Parser
    const shoe = u.shoeSize || '';
    if (shoe.startsWith('UK')) {
      setShoeSystem('UK');
      setShoeVal(shoe.replace('UK', '').trim());
    } else if (shoe.startsWith('USW') || shoe.startsWith('US W')) {
      setShoeSystem('USW');
      setShoeVal(shoe.replace(/US\s*W/, '').trim());
    } else if (shoe.startsWith('USM') || shoe.startsWith('US M')) {
      setShoeSystem('USM');
      setShoeVal(shoe.replace(/US\s*M/, '').trim());
    } else {
      setShoeSystem('EU');
      setShoeVal(shoe.replace('EU', '').trim());
    }

    // Clothing Parser
    const clothing = u.clothingSize || '';
    if (clothing.startsWith('EU')) {
      setClothingSystem('EU');
      setClothingVal(clothing.replace('EU', '').trim());
    } else if (clothing.startsWith('US')) {
      setClothingSystem('US');
      setClothingVal(clothing.replace('US', '').trim());
    } else if (clothing.startsWith('XS') || clothing.startsWith('S') || clothing.startsWith('M') || clothing.startsWith('L') || clothing.startsWith('XL') || clothing.startsWith('XXS') || clothing.startsWith('XXL')) {
      setClothingSystem('Letter');
      setClothingVal(clothing.trim());
    } else {
      setClothingSystem('UK');
      setClothingVal(clothing.replace('UK', '').trim());
    }

    // Hat Parser
    const hat = u.hatSize || '';
    if (hat.startsWith('US')) {
      setHatSystem('US');
      setHatVal(hat.replace('US', '').trim());
    } else if (hat.startsWith('S') || hat.startsWith('M') || hat.startsWith('L') || hat.startsWith('XL')) {
      setHatSystem('Letter');
      setHatVal(hat.trim());
    } else {
      setHatSystem('cm');
      setHatVal(hat.replace('cm', '').trim());
    }

    // Glove Parser
    const glove = u.gloveSize || '';
    if (glove.startsWith('XS') || glove.startsWith('S') || glove.startsWith('M') || glove.startsWith('L') || glove.startsWith('XL')) {
      setGloveSystem('Letter');
      setGloveVal(glove.trim());
    } else {
      setGloveSystem('EU');
      setGloveVal(glove.replace('EU', '').trim());
    }

    setProfBra(u.braSize || '');
    setProfWorkLife(u.workLife || '');
    setProfInspirations(u.inspirationNotes || '');
    setProfStyleAesthetic(u.styleAesthetic || 'Minimalist Quiet Luxury');
    setProfFavoriteBrands(u.favoriteBrands || '');
    setProfAvoidedStyles(u.avoidedStyles || '');
    setProfColorPalette(u.colorPalette || '');
    setProfLocationCity(u.locationCity || 'London');
    setMarketingEmail(Boolean(u.marketingEmail));
    setMarketingSms(Boolean(u.marketingSms));
    setMarketingPartners(Boolean(u.marketingPartners));
    setMarketingConsentUpdatedAt(u.marketingConsentUpdatedAt || null);
  }, []);

  const fetchLiveWeatherForApp = useCallback(async (cityOverride?: string) => {
    setIsLoadingWeather(true);
    try {
      const city = cityOverride || user?.locationCity || 'London';
      const res = await fetch(`/api/weather?city=${encodeURIComponent(city)}`);
      if (res.ok) {
        const data: WeatherInfo = await res.json();
        setLiveWeather(data);
      }
    } catch (err) {
      console.warn('Weather fetch error:', err);
    } finally {
      setIsLoadingWeather(false);
    }
  }, [user]);

  const fetchWardrobe = useCallback(async () => {
    setLoadingWardrobe(true);
    try {
      const res = await fetch('/api/wardrobe');
      if (res.ok) {
        const data = await res.json();
        setWardrobe(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingWardrobe(false);
    }
  }, []);

  const fetchRecommendations = useCallback(async () => {
    setLoadingRecommendations(true);
    try {
      const res = await fetch('/api/recommendations');
      if (res.ok) {
        const data = await res.json();
        setRecommendations(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingRecommendations(false);
    }
  }, []);

  const fetchFeeds = useCallback(async () => {
    setLoadingFeeds(true);
    try {
      const res = await fetch('/api/feeds');
      if (res.ok) {
        const data = await res.json();
        setFeeds(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingFeeds(false);
    }
  }, []);

  const fetchInspirations = useCallback(async () => {
    setLoadingInspirations(true);
    try {
      const res = await fetch('/api/inspirations');
      if (res.ok) {
        const data = await res.json();
        setInspirations(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingInspirations(false);
    }
  }, []);

  const fetchCapsules = useCallback(async () => {
    setLoadingCapsules(true);
    try {
      const res = await fetch('/api/capsules');
      if (res.ok) {
        const data = await res.json();
        setCapsules(data);
      }
    } catch (err) {
      console.error('Error fetching capsules:', err);
    } finally {
      setLoadingCapsules(false);
    }
  }, []);

  const fetchAnalytics = useCallback(async () => {
    setLoadingAnalytics(true);
    try {
      const res = await fetch('/api/wardrobe/analytics');
      if (res.ok) {
        const data = await res.json();
        setAnalyticsData(data);
      }
    } catch (err) {
      console.error('Error fetching analytics:', err);
    } finally {
      setLoadingAnalytics(false);
    }
  }, []);

  const fetchCollages = useCallback(async () => {
    setLoadingCollages(true);
    try {
      const res = await fetch('/api/collages');
      if (res.ok) {
        const data = await res.json();
        setCollages(data);
      }
    } catch (err) {
      console.error('Error fetching collages:', err);
    } finally {
      setLoadingCollages(false);
    }
  }, []);

  const fetchWhatsNew = useCallback(async (force = false) => {
    setLoadingWhatsNew(true);
    try {
      const res = await fetch('/api/feed/whats-new', {
        method: force ? 'POST' : 'GET',
        headers: { 'Content-Type': 'application/json' },
      });
      if (res.ok) {
        const data = await res.json();
        setWhatsNewPosts(data.posts || []);
      } else if (res.status !== 401) {
        showToast('Failed to load style stream.', 'error');
      }
    } catch (err) {
      console.error(err);
      showToast('Error loading style stream.', 'error');
    } finally {
      setLoadingWhatsNew(false);
    }
  }, [showToast]);

  const triggerSilentFeedSync = useCallback(async () => {
    console.log('Automated background sync bypassed to preserve Gemini API quota.');
    fetchRecommendations();
  }, [fetchRecommendations]);

  const checkSession = useCallback(async () => {
    // 1. Instantly restore from localStorage if available
    try {
      if (typeof window !== 'undefined') {
        const cached = localStorage.getItem('atelier_user');
        if (cached) {
          const parsed = JSON.parse(cached);
          if (parsed && parsed.id) {
            setUser(parsed);
            populateProfileFields(parsed);
          }
        }
      }
    } catch {
      // ignore parsing error
    }

    try {
      const res = await fetch('/api/auth/me');
      if (res.ok) {
        const data = await res.json();
        if (data.authenticated && data.user) {
          setUser(data.user);
          if (typeof window !== 'undefined') {
            localStorage.setItem('atelier_user', JSON.stringify(data.user));
          }
          populateProfileFields(data.user);
          triggerSilentFeedSync();
        } else {
          // If server explicitly returns authenticated: false and no local cookie, clear
          if (typeof window !== 'undefined' && !document.cookie.includes('session=') && !document.cookie.includes('__session=')) {
            setUser(null);
            localStorage.removeItem('atelier_user');
          }
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingMe(false);
    }
  }, [populateProfileFields, triggerSilentFeedSync]);

  // Load initial data & register PWA Service Worker
  useEffect(() => {
    const timer = setTimeout(() => {
      checkSession();
      fetchWardrobe();
      fetchRecommendations();
      fetchFeeds();
      fetchWhatsNew();
      fetchInspirations();
      fetchLiveWeatherForApp();
      fetchCapsules();
      fetchCollages();
    }, 0);

    // Register Service Worker for PWA
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch((err) => {
        console.warn('PWA ServiceWorker registration failed:', err);
      });
    }

    // Capture PWA install prompt
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setPwaPromptEvent(e as BeforeInstallPromptEvent);
      setShowPwaBanner(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);

    return () => {
      clearTimeout(timer);
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Client-side image compressor (converts to WebP canvas blob)
  const compressImage = (file: File): Promise<Blob> => {
    return new Promise((resolve) => {
      setCompressionStatus(`Compressing ${file.name}...`);
      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new window.Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const maxDim = 1080;
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > maxDim) {
              height = Math.round((height * maxDim) / width);
              width = maxDim;
            }
          } else {
            if (height > maxDim) {
              width = Math.round((width * maxDim) / height);
              height = maxDim;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx?.drawImage(img, 0, 0, width, height);

          canvas.toBlob((blob) => {
            if (blob) {
              resolve(blob);
            } else {
              resolve(file);
            }
          }, 'image/webp', 0.8);
        };
        img.src = event.target?.result as string;
      };
      reader.readAsDataURL(file);
    });
  };

  const stopCameraStream = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setShowCameraModal(false);
  }, []);

  const startCameraStream = useCallback(async (facing: 'environment' | 'user' = cameraFacingMode) => {
    try {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: facing },
          width: { ideal: 1920 },
          height: { ideal: 1440 },
        },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play().catch(() => {});
      }
    } catch (err) {
      console.warn('getUserMedia failed, falling back to native file capture:', err);
      stopCameraStream();
      if (cameraTarget === 'wardrobe') {
        cameraInputRef.current?.click();
      } else {
        inspirationCameraInputRef.current?.click();
      }
    }
  }, [cameraFacingMode, cameraTarget, stopCameraStream]);

  const openCameraViewfinder = (target: 'wardrobe' | 'inspiration' = 'wardrobe') => {
    setCameraTarget(target);
    if (typeof navigator === 'undefined' || !navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      if (target === 'wardrobe') {
        cameraInputRef.current?.click();
      } else {
        inspirationCameraInputRef.current?.click();
      }
      return;
    }
    setShowCameraModal(true);
    setTimeout(() => {
      startCameraStream('environment');
    }, 100);
  };

  const toggleCameraFacing = () => {
    const nextMode = cameraFacingMode === 'environment' ? 'user' : 'environment';
    setCameraFacingMode(nextMode);
    startCameraStream(nextMode);
  };

  const capturePhotoFromStream = () => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 960;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    canvas.toBlob(
      (blob) => {
        if (!blob) return;
        const filename = `garment-photo-${Date.now()}.jpg`;
        const file = new File([blob], filename, { type: 'image/jpeg' });
        const previewUrl = URL.createObjectURL(file);

        if (cameraTarget === 'wardrobe') {
          setSelectedFiles((prev) => [...prev, file]);
          setPreviewUrls((prev) => [...prev, previewUrl]);
          showToast('Captured photograph added to catalog queue.', 'success');
        } else {
          setInspirationFiles((prev) => [...prev, file]);
          setInspirationPreviewUrls((prev) => [...prev, previewUrl]);
          showToast('Captured inspiration photograph added.', 'success');
        }
        stopCameraStream();
      },
      'image/jpeg',
      0.92
    );
  };

  const handleCameraNativeCapture = (e: React.ChangeEvent<HTMLInputElement>, target: 'wardrobe' | 'inspiration' = 'wardrobe') => {
    const files = e.target.files;
    if (files && files.length > 0) {
      const fileArr = Array.from(files);
      const urls = fileArr.map((f) => URL.createObjectURL(f));
      if (target === 'wardrobe') {
        setSelectedFiles((prev) => [...prev, ...fileArr]);
        setPreviewUrls((prev) => [...prev, ...urls]);
        showToast(`Captured ${fileArr.length} photo(s) from camera.`, 'success');
      } else {
        setInspirationFiles((prev) => [...prev, ...fileArr]);
        setInspirationPreviewUrls((prev) => [...prev, ...urls]);
        showToast(`Captured ${fileArr.length} inspiration photo(s).`, 'success');
      }
    }
  };

  const handleRemovePreviewFile = (index: number) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
    setPreviewUrls((prev) => prev.filter((_, i) => i !== index));
  };

  const handleRemoveInspirationPreviewFile = (index: number) => {
    setInspirationFiles((prev) => prev.filter((_, i) => i !== index));
    setInspirationPreviewUrls((prev) => prev.filter((_, i) => i !== index));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      const fileArr = Array.from(files);
      setSelectedFiles((prev) => [...prev, ...fileArr]);
      setPreviewUrls((prev) => [...prev, ...fileArr.map((f) => URL.createObjectURL(f))]);
      setCompressionStatus(null);
      setBulkUploadProgress(null);
    }
  };

  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedFiles.length === 0) return;

    setIsUploading(true);
    setBulkUploadProgress(`Preparing uploads...`);

    try {
      let successCount = 0;
      for (let i = 0; i < selectedFiles.length; i++) {
        const file = selectedFiles[i];
        setBulkUploadProgress(`Uploading ${i + 1}/${selectedFiles.length}: "${file.name}"...`);
        
        const compressedBlob = await compressImage(file);
        const formData = new FormData();
        formData.append('image', compressedBlob, `garment-${Date.now()}-${i}.webp`);
        if (uploadBrand) formData.append('brand', uploadBrand);
        if (uploadNotes) formData.append('styleNotes', uploadNotes);

        const res = await fetch('/api/wardrobe/upload', {
          method: 'POST',
          body: formData,
        });

        if (res.ok) {
          successCount++;
        } else {
          const errData = await res.json();
          console.error(`Upload error for ${file.name}:`, errData.error);
        }
      }

      setBulkUploadProgress(`Completed! Ingested ${successCount} garments.`);
      setSelectedFiles([]);
      setPreviewUrls([]);
      setUploadBrand('');
      setUploadNotes('');
      setCompressionStatus(null);
      
      setTimeout(() => setBulkUploadProgress(null), 3000);
      fetchWardrobe();
    } catch (err) {
      console.error(err);
      const errMsg = err instanceof Error ? err.message : 'Unknown error';
      showToast(`Error during batch ingestion: ${errMsg}`, 'error');
    } finally {
      setIsUploading(false);
    }
  };

  const handleInspirationFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const filesArr = Array.from(e.target.files);
      setInspirationFiles(filesArr);
      const urls = filesArr.map((f) => URL.createObjectURL(f));
      setInspirationPreviewUrls(urls);
    }
  };

  const handleUploadInspirationSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (inspirationFiles.length === 0) return;

    setIsUploadingInspiration(true);

    try {
      let successCount = 0;
      for (let i = 0; i < inspirationFiles.length; i++) {
        const file = inspirationFiles[i];
        
        const compressedBlob = await compressImage(file);
        const formData = new FormData();
        formData.append('image', compressedBlob, `inspiration-${Date.now()}-${i}.webp`);
        if (insCustomNotes) formData.append('notes', insCustomNotes);

        const res = await fetch('/api/inspirations', {
          method: 'POST',
          body: formData,
        });

        if (res.ok) {
          successCount++;
        } else {
          const errData = await res.json();
          console.error(`Upload error for inspiration ${file.name}:`, errData.error);
        }
      }

      showToast(`Ingested ${successCount} inspiration photos.`);
      setInspirationFiles([]);
      setInspirationPreviewUrls([]);
      setInsCustomNotes('');
      setCompressionStatus(null);
      fetchInspirations();
    } catch (err) {
      console.error(err);
      const errMsg = err instanceof Error ? err.message : 'Unknown error';
      showToast(`Error during inspiration ingestion: ${errMsg}`, 'error');
    } finally {
      setIsUploadingInspiration(false);
    }
  };

  const handleDeleteInspiration = async (id: string) => {
    if (!confirm('Are you sure you want to remove this inspiration from your visual board?')) return;
    try {
      const res = await fetch(`/api/inspirations/${id}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        showToast('Inspiration deleted successfully.');
        setInspirations((prev) => prev.filter((ins) => ins.id !== id));
      } else {
        showToast('Failed to delete inspiration.', 'error');
      }
    } catch (err) {
      console.error('Delete error:', err);
      showToast('Error deleting inspiration.', 'error');
    }
  };

  // Spreadsheet Cell modification buffer
  const handleCellChange = (id: string, field: 'brand' | 'category' | 'styleNotes' | 'tags', value: string) => {
    setEditBuffer(prev => {
      const original = wardrobe.find(item => item.id === id);
      const existing = prev[id] || {
        brand: original?.brand || '',
        category: original?.category || 'Tops',
        styleNotes: original?.styleNotes || '',
        tags: (original?.detectedTags || []).join(', '),
      };

      return {
        ...prev,
        [id]: {
          ...existing,
          [field]: value
        }
      };
    });
  };

  const handleRowSelect = (id: string, checked: boolean) => {
    setSelectedItemIds(prev => 
      checked ? [...prev, id] : prev.filter(item => item !== id)
    );
  };

  const handleSelectAll = (checked: boolean) => {
    setSelectedItemIds(checked ? getFilteredWardrobe().map(i => i.id) : []);
  };

  // Save changes to database
  const handleSaveBulkEdits = async () => {
    const changedIds = Object.keys(editBuffer);
    if (changedIds.length === 0) {
      showToast('No changes to save.', 'error');
      return;
    }

    setIsSavingProfile(true);
    try {
      const itemsToUpdate = changedIds.map(id => {
        const buff = editBuffer[id];
        const tagArr = buff.tags
          .split(',')
          .map(t => t.trim())
          .filter(t => t.length > 0);

        return {
          id,
          brand: buff.brand,
          category: buff.category,
          styleNotes: buff.styleNotes,
          detectedTags: tagArr,
        };
      });

      const res = await fetch('/api/wardrobe/bulk', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: itemsToUpdate }),
      });

      if (res.ok) {
        showToast('Batch modifications saved successfully!');
        setEditBuffer({});
        fetchWardrobe();
      } else {
        const errData = await res.json();
        showToast(`Failed to save batch: ${errData.error}`, 'error');
      }
    } catch (err) {
      console.error(err);
      showToast('Error updating batch items.', 'error');
    } finally {
      setIsSavingProfile(false);
    }
  };

  // Bulk Deletion
  const handleDeleteBulkSelected = async () => {
    if (selectedItemIds.length === 0) return;
    if (!confirm(`Are you sure you want to delete the ${selectedItemIds.length} selected items?`)) return;

    try {
      const res = await fetch('/api/wardrobe/bulk', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: selectedItemIds }),
      });

      if (res.ok) {
        setSelectedItemIds([]);
        fetchWardrobe();
      } else {
        const errData = await res.json();
        showToast(`Deletion failed: ${errData.error}`, 'error');
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Bulk set brand helper
  const handleApplyBulkBrand = () => {
    if (selectedItemIds.length === 0 || !bulkBrandValue) {
      showToast('Select items and type a brand name to apply.', 'error');
      return;
    }
    selectedItemIds.forEach(id => {
      handleCellChange(id, 'brand', bulkBrandValue);
    });
    setBulkBrandValue('');
  };



  const handleCreateOutfitAroundItem = (item: WardrobeItem) => {
    setAnchorGarment(item);
    setActiveTab('feed');
    showToast(`Anchored outfit styling around: ${item.category} (${item.brand || 'No brand'})`, 'info');
  };

  const triggerRecommendations = async (vibe?: string | React.MouseEvent) => {
    const vibePrompt = typeof vibe === 'string' ? vibe : undefined;
    setIsGenerating(true);
    try {
      const res = await fetch('/api/recommendations/generate', { 
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vibe: vibePrompt,
          anchorItemId: anchorGarment?.id,
          weatherCity: liveWeather?.city,
        })
      });
      if (res.ok) {
        fetchRecommendations();
        setActiveTab('feed');
        setStyleVibePrompt('');
      } else {
        showToast('Stylist generator failed.', 'error');
      }
    } catch (err) {
      console.error(err);
      showToast('Error during generation', 'error');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDeleteRecommendation = async (id: string) => {
    try {
      const res = await fetch('/api/recommendations', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      if (res.ok) {
        showToast('Lookbook deleted successfully.');
        fetchRecommendations();
      } else {
        showToast('Failed to delete lookbook.', 'error');
      }
    } catch (err) {
      console.error(err);
      showToast('Error deleting lookbook.', 'error');
    }
  };

  // Auth submits
  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: authEmail,
          password: authPassword,
          name: authName,
          mfaEnabled: authMfaEnabled,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        if (data.mfaSecret) {
          setSignupSecret2FA(data.mfaSecret);
          setTempMfaUserId(data.user.id);
          setAuthMode('mfa');
        } else {
          setUser(data.user);
          if (typeof window !== 'undefined') {
            localStorage.setItem('atelier_user', JSON.stringify(data.user));
          }
          populateProfileFields(data.user);
          setActiveTab('account');
          showToast('Sign up successful!');
          fetchWardrobe();
          fetchRecommendations();
          triggerSilentFeedSync();
        }
      } else {
        showToast(data.error || 'Signup failed', 'error');
      }
    } catch (err) {
      console.error(err);
      showToast('Network error during signup', 'error');
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: authEmail,
          password: authPassword,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        if (data.mfaRequired) {
          setTempMfaUserId(data.userId);
          setAuthMode('mfa');
        } else {
          setUser(data.user);
          if (typeof window !== 'undefined') {
            localStorage.setItem('atelier_user', JSON.stringify(data.user));
          }
          populateProfileFields(data.user);
          showToast('Logged in successfully!');
          setActiveTab('feed');
          fetchWardrobe();
          fetchRecommendations();
          triggerSilentFeedSync();
        }
      } else {
        showToast(data.error || 'Login failed', 'error');
      }
    } catch (err) {
      console.error(err);
      showToast('Network error during login', 'error');
    }
  };

  const handleMfaVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/auth/mfa', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: tempMfaUserId,
          code: authMfaCode,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setAuthMfaCode('');
        setSignupSecret2FA(null);
        setTempMfaUserId(null);
        setUser(data.user);
        if (typeof window !== 'undefined') {
          localStorage.setItem('atelier_user', JSON.stringify(data.user));
        }
        populateProfileFields(data.user);
        showToast('MFA Verification Successful!');
        setActiveTab('feed');
        fetchWardrobe();
        fetchRecommendations();
        triggerSilentFeedSync();
      } else {
        showToast(data.error || 'Verification failed', 'error');
      }
    } catch (err) {
      console.error(err);
      showToast('MFA verify error', 'error');
    }
  };

  const handleForgotPasswordRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSendingRecovery(true);
    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identity: recoveryIdentity }),
      });
      const data = await res.json();
      if (res.ok) {
        showToast(data.message);
        setRecoveryStep('verify');
      } else {
        showToast(data.error || 'Request failed', 'error');
      }
    } catch (err) {
      console.error(err);
      showToast('Network error during reset request', 'error');
    } finally {
      setIsSendingRecovery(false);
    }
  };

  const handleResetPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (recoveryPassword.trim().length < 6) {
      showToast('Password must be at least 6 characters long', 'error');
      return;
    }
    setIsSendingRecovery(true);
    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          identity: recoveryIdentity,
          code: recoveryCode,
          newPassword: recoveryPassword,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        showToast(data.message);
        setAuthMode('login');
        setRecoveryIdentity('');
        setRecoveryCode('');
        setRecoveryPassword('');
        setRecoveryStep('request');
      } else {
        showToast(data.error || 'Reset failed', 'error');
      }
    } catch (err) {
      console.error(err);
      showToast('Network error during password reset', 'error');
    } finally {
      setIsSendingRecovery(false);
    }
  };

  const handleScanDuplicates = async () => {
    setIsScanningDuplicates(true);
    try {
      const res = await fetch('/api/wardrobe/duplicates');
      const data = await res.json();
      if (res.ok && data.success) {
        setDuplicateGroups(data.groups);
        setShowDuplicatesScan(true);
        if (data.count === 0) {
          showToast('No duplicate clothing items detected!');
        } else {
          showToast(`Found ${data.count} duplicate groups!`);
        }
      } else {
        showToast(data.error || 'Duplicate scan failed', 'error');
      }
    } catch (err) {
      console.error(err);
      showToast('Error scanning duplicates', 'error');
    } finally {
      setIsScanningDuplicates(false);
    }
  };

  const handleMergeDuplicates = async (keepId: string, deleteIds: string[]) => {
    try {
      const res = await fetch('/api/wardrobe/duplicates/merge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ keepId, deleteIds }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        showToast(data.message);
        handleScanDuplicates();
        fetchWardrobe();
        fetchRecommendations();
      } else {
        showToast(data.error || 'Merge duplicates failed', 'error');
      }
    } catch (err) {
      console.error(err);
      showToast('Error merging duplicates', 'error');
    }
  };

  const handleEditGarmentClick = (item: WardrobeItem) => {
    setEditingGarment(item);
    setEditGarmentBrand(item.brand || '');
    setEditGarmentCategory(item.category);
    setEditGarmentNotes(item.styleNotes || '');
    setEditGarmentTags(item.detectedTags.join(', '));
  };

  const handleSaveInlineGarmentEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingGarment) return;

    setIsSavingGarmentEdit(true);
    try {
      const tagArr = editGarmentTags
        .split(',')
        .map(t => t.trim())
        .filter(t => t.length > 0);

      const itemsToUpdate = [{
        id: editingGarment.id,
        brand: editGarmentBrand,
        category: editGarmentCategory,
        styleNotes: editGarmentNotes,
        detectedTags: tagArr,
      }];

      const res = await fetch('/api/wardrobe/bulk', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: itemsToUpdate }),
      });

      if (res.ok) {
        showToast('Garment details saved successfully!');
        setEditingGarment(null);
        fetchWardrobe();
      } else {
        const errData = await res.json();
        showToast(`Failed to save: ${errData.error}`, 'error');
      }
    } catch (err) {
      console.error(err);
      showToast('Error saving modifications', 'error');
    } finally {
      setIsSavingGarmentEdit(false);
    }
  };

  const handleLogout = async () => {
    try {
      const res = await fetch('/api/auth/logout', { method: 'POST' });
      if (res.ok) {
        setUser(null);
        if (typeof window !== 'undefined') {
          localStorage.removeItem('atelier_user');
        }
        setSignupSecret2FA(null);
        setActiveTab('feed');
        showToast('Logged out successfully.');
        fetchWardrobe();
        fetchRecommendations();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Profile Save
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingProfile(true);

    let serializedHeight = '';
    if (heightUnit === 'cm') {
      serializedHeight = heightCm ? `${heightCm} cm` : '';
    } else {
      serializedHeight = heightFt || heightIn ? `${heightFt || 0} ft ${heightIn || 0} in` : '';
    }

    let serializedWeight = '';
    if (weightUnit === 'kg') {
      serializedWeight = weightKg ? `${weightKg} kg` : '';
    } else if (weightUnit === 'lbs') {
      serializedWeight = weightLbs ? `${weightLbs} lbs` : '';
    } else {
      serializedWeight = weightStValue || weightStLbs ? `${weightStValue || 0} st ${weightStLbs || 0} lbs` : '';
    }

    let serializedWaist = '';
    if (waistVal) {
      serializedWaist = `${waistVal} ${waistUnit}`;
    }

    const serializedShoe = shoeVal ? `${shoeSystem} ${shoeVal}` : '';
    const serializedClothing = clothingVal ? `${clothingSystem} ${clothingVal}` : '';
    const serializedHat = hatVal ? (hatSystem === 'cm' ? `${hatVal} cm` : `${hatSystem} ${hatVal}`) : '';
    const serializedGlove = gloveVal ? (gloveSystem === 'EU' ? `EU ${gloveVal}` : gloveVal) : '';

    try {
      const res = await fetch('/api/auth/me', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: profName,
          sex: profSex,
          phone: profPhone,
          height: serializedHeight,
          weight: serializedWeight,
          waistSize: serializedWaist,
          braSize: profBra,
          shoeSize: serializedShoe,
          hatSize: serializedHat,
          gloveSize: serializedGlove,
          clothingSize: serializedClothing,
          workLife: profWorkLife,
          inspirationNotes: profInspirations,
          styleAesthetic: profStyleAesthetic,
          favoriteBrands: profFavoriteBrands,
          avoidedStyles: profAvoidedStyles,
          colorPalette: profColorPalette,
          locationCity: profLocationCity,
          password: profPassword || undefined,
        }),
      });

      if (res.ok) {
        showToast('Style DNA, Location & Sizing Profile saved successfully!');
        setProfPassword('');
        checkSession();
        if (profLocationCity) fetchLiveWeatherForApp(profLocationCity);
      } else {
        const data = await res.json();
        showToast(`Failed to save: ${data.error}`, 'error');
      }
    } catch (err) {
      console.error(err);
      showToast('Error saving profile', 'error');
    } finally {
      setIsSavingProfile(false);
    }
  };

  // PWA Install Action
  const handleInstallPwa = async () => {
    if (!pwaPromptEvent) return;
    pwaPromptEvent.prompt();
    const { outcome } = await pwaPromptEvent.userChoice;
    if (outcome === 'accepted') {
      showToast('Atelier Edit added to Home Screen!', 'success');
    }
    setPwaPromptEvent(null);
    setShowPwaBanner(false);
  };

  // Weather Location Switcher
  const handleSwitchWeather = (cityName: string) => {
    if (!cityName.trim()) return;
    fetchLiveWeatherForApp(cityName.trim());
    setShowWeatherModal(false);
    showToast(`Updated styling climate to ${cityName.trim()}`, 'info');
  };

  // Capsule Trip Actions
  const handleCreateCapsuleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tripDestination || !tripStartDate || !tripEndDate) {
      showToast('Please enter destination, start date, and end date.', 'error');
      return;
    }
    setIsGeneratingCapsule(true);
    try {
      const res = await fetch('/api/capsules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          destination: tripDestination,
          startDate: tripStartDate,
          endDate: tripEndDate,
          tripPurpose,
          luggageType: tripLuggageType,
          checklistNotes: tripChecklistNotes,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        showToast('Travel packing capsule & lookbook synthesized!', 'success');
        setShowNewCapsuleModal(false);
        fetchCapsules();
        setSelectedCapsule(data.capsuleTrip);
      } else {
        showToast(data.error || 'Failed to generate capsule', 'error');
      }
    } catch (err) {
      console.error(err);
      showToast('Error generating travel capsule', 'error');
    } finally {
      setIsGeneratingCapsule(false);
    }
  };

  const handleDeleteCapsule = async (id: string) => {
    if (!confirm('Are you sure you want to delete this travel capsule?')) return;
    try {
      const res = await fetch(`/api/capsules/${id}`, { method: 'DELETE' });
      if (res.ok) {
        showToast('Travel capsule removed.');
        setCapsules((prev) => prev.filter((c) => c.id !== id));
        if (selectedCapsule?.id === id) setSelectedCapsule(null);
      }
    } catch (err) {
      console.error(err);
      showToast('Failed to delete capsule', 'error');
    }
  };

  // Wardrobe Gaps Generator
  const handleFetchGaps = async () => {
    setLoadingGaps(true);
    try {
      const res = await fetch('/api/wardrobe/gaps', { method: 'POST' });
      const data = await res.json();
      if (res.ok && data.gaps) {
        setWardrobeGaps(data.gaps);
        showToast('Strategic wardrobe gaps analyzed!');
      } else {
        showToast(data.error || 'Gap analysis failed', 'error');
      }
    } catch (err) {
      console.error(err);
      showToast('Error analyzing gaps', 'error');
    } finally {
      setLoadingGaps(false);
    }
  };

  // Flat-Lay Studio Canvas Actions
  const handleAddItemToCanvas = (item: WardrobeItem | InspirationImage) => {
    const count = canvasItems.length + 1;
    const newItem: CollageCanvasElement = {
      id: `canvas-elem-${item.id}-${count}`,
      imageUrl: item.imageUrl,
      x: 60 + ((count - 1) % 5) * 40,
      y: 60 + ((count - 1) % 5) * 35,
      scale: 1,
      rotation: ((count * 7) % 17) - 8,
      zIndex: count,
      label: ('category' in item ? `${item.brand || 'Closet'} ${item.category}` : item.notes || 'Inspiration Snap'),
    };
    setCanvasItems((prev) => [...prev, newItem]);
    setSelectedCanvasItemId(newItem.id);
    showToast('Item placed on flat-lay canvas.');
  };

  const handleUpdateCanvasItemTransform = (scale: number, rotation: number) => {
    if (!selectedCanvasItemId) return;
    setCanvasItems((prev) =>
      prev.map((item) => (item.id === selectedCanvasItemId ? { ...item, scale, rotation } : item))
    );
  };

  const handleRemoveCanvasItem = (id: string) => {
    setCanvasItems((prev) => prev.filter((item) => item.id !== id));
    if (selectedCanvasItemId === id) setSelectedCanvasItemId(null);
  };

  const handleBringCanvasItemForward = (id: string) => {
    setCanvasItems((prev) => {
      const maxZ = Math.max(...prev.map((i) => i.zIndex), 0);
      return prev.map((item) => (item.id === id ? { ...item, zIndex: maxZ + 1 } : item));
    });
  };

  const handleSaveCollageSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (canvasItems.length === 0) {
      showToast('Please add items to the flat-lay canvas first.', 'error');
      return;
    }
    setIsSavingCollage(true);
    try {
      const res = await fetch('/api/collages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: collageTitle || 'Editorial Flat-Lay Mood',
          canvasData: canvasItems,
          thumbnailUrl: canvasItems[0]?.imageUrl || null,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        showToast('Editorial Flat-Lay saved to your Studio lookbook!', 'success');
        fetchCollages();
      } else {
        showToast(data.error || 'Failed to save collage', 'error');
      }
    } catch (err) {
      console.error(err);
      showToast('Error saving collage', 'error');
    } finally {
      setIsSavingCollage(false);
    }
  };

  const handleDeleteCollage = async (id: string) => {
    if (!confirm('Are you sure you want to delete this flat-lay collage?')) return;
    try {
      const res = await fetch(`/api/collages/${id}`, { method: 'DELETE' });
      if (res.ok) {
        showToast('Flat-lay collage deleted.');
        setCollages((prev) => prev.filter((c) => c.id !== id));
      }
    } catch (err) {
      console.error(err);
      showToast('Failed to delete collage', 'error');
    }
  };

  const handleSaveMarketingConsent = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingConsent(true);
    try {
      const res = await fetch('/api/user/consent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ marketingEmail, marketingSms, marketingPartners }),
      });
      if (res.ok) {
        const data = await res.json();
        setMarketingConsentUpdatedAt(data.user.marketingConsentUpdatedAt);
        showToast('Marketing & privacy consent preferences updated successfully!');
      } else {
        const errData = await res.json();
        showToast(errData.error || 'Failed to update consent preferences', 'error');
      }
    } catch (err) {
      console.error(err);
      showToast('Error updating consent preferences', 'error');
    } finally {
      setIsSavingConsent(false);
    }
  };

  const handleExportGdprData = async () => {
    setIsExportingData(true);
    try {
      const res = await fetch('/api/user/gdpr/export');
      if (res.ok) {
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `atelier-edit-gdpr-export-${Date.now()}.json`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        window.URL.revokeObjectURL(url);
        showToast('Personal data package downloaded successfully!');
      } else {
        showToast('Failed to export data package', 'error');
      }
    } catch (err) {
      console.error(err);
      showToast('Error exporting data package', 'error');
    } finally {
      setIsExportingData(false);
    }
  };

  const handleDeleteGdprAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (gdprConfirmInput.trim().toUpperCase() !== 'DELETE') {
      showToast('You must type "DELETE" to confirm permanent account erasure.', 'error');
      return;
    }
    setIsDeletingAccount(true);
    try {
      const res = await fetch('/api/user/gdpr/delete', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ confirmText: gdprConfirmInput }),
      });
      if (res.ok) {
        showToast('Your account and all associated data have been permanently erased.', 'info');
        setUser(null);
        setActiveTab('whats-new');
        setShowGdprDeleteModal(false);
        setGdprConfirmInput('');
      } else {
        const errData = await res.json();
        showToast(errData.error || 'Failed to delete account', 'error');
      }
    } catch (err) {
      console.error(err);
      showToast('Error deleting account', 'error');
    } finally {
      setIsDeletingAccount(false);
    }
  };

  // Feed manager CRUD
  const handleAddFeed = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFeedUrl) return;

    try {
      const res = await fetch('/api/feeds', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: newFeedUrl,
          name: newFeedName,
          type: newFeedType,
          category: newFeedCategory,
        }),
      });

      if (res.ok) {
        setNewFeedUrl('');
        setNewFeedName('');
        setNewFeedType('rss');
        fetchFeeds();
        triggerSilentFeedSync();
        showToast('Custom feed added to your radar!');
      } else {
        const errData = await res.json();
        showToast(`Failed to add feed: ${errData.error}`, 'error');
      }
    } catch (err) {
      console.error(err);
      showToast('Error adding feed source.', 'error');
    }
  };

  const handleToggleSubscribe = async (feedId: string, currentSubscribed: boolean) => {
    try {
      const res = await fetch(`/api/feeds/${feedId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isSubscribed: !currentSubscribed }),
      });

      if (res.ok) {
        fetchFeeds();
        triggerSilentFeedSync();
        showToast(!currentSubscribed ? 'Channel added to your radar!' : 'Channel removed from your radar.');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleToggleMute = async (feedId: string, currentMute: boolean) => {
    try {
      const res = await fetch(`/api/feeds/${feedId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isMuted: !currentMute }),
      });

      if (res.ok) {
        fetchFeeds();
        triggerSilentFeedSync();
        showToast(!currentMute ? 'Feed muted' : 'Feed unmuted');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteFeed = async (feedId: string) => {
    if (!confirm('Are you sure you want to delete this feed source?')) return;

    try {
      const res = await fetch(`/api/feeds/${feedId}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        fetchFeeds();
        triggerSilentFeedSync();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const getCroquisPath = () => {
    // Standardize user height
    let hCm = 170;
    if (heightUnit === 'cm') {
      hCm = Number(heightCm) || 170;
    } else {
      hCm = (Number(heightFt) * 30.48) + (Number(heightIn) * 2.54) || 170;
    }

    // Standardize user weight
    let wKg = 65;
    if (weightUnit === 'kg') {
      wKg = Number(weightKg) || 65;
    } else if (weightUnit === 'lbs') {
      wKg = Number(weightLbs) * 0.453592 || 65;
    } else {
      wKg = (Number(weightStValue) * 6.35029) + (Number(weightStLbs) * 0.453592) || 65;
    }

    // Standardize user waist
    let waistInches = 28;
    if (waistUnit === 'in') {
      waistInches = Number(waistVal) || 28;
    } else {
      waistInches = Number(waistVal) / 2.54 || 28;
    }

    const computeSilhouette = (centerX: number, sex: string, heightValCm: number, weightValKg: number, waistValIn: number) => {
      const isMale = sex === 'Male';

      const heightScale = Math.min(Math.max(heightValCm / 170, 0.75), 1.3);
      const weightScale = Math.min(Math.max(weightValKg / 65, 0.65), 1.55);
      const waistScale = Math.min(Math.max(waistValIn / 28, 0.7), 1.45);

      const headW = 14 * weightScale;
      const headH = 20 * heightScale;
      const footY = 410; // Shared baseline for both feet!
      const totalBodyHeight = 360 * heightScale;
      const headY = footY - totalBodyHeight + (headH / 2);

      const shoulderHalf = (isMale ? 40 : 28) * weightScale;
      const bustHalf = (isMale ? 36 : 26) * weightScale;
      const waistHalf = (isMale ? 28 : 17) * weightScale * waistScale;
      const hipHalf = (isMale ? 30 : 34) * weightScale;
      const kneeHalf = 11 * weightScale;
      const footHalf = 8 * weightScale;

      const neckY = headY + (headH / 2) + 8;
      const shoulderY = neckY + (20 * heightScale);
      const bustY = shoulderY + (32 * heightScale);
      const waistY = bustY + (42 * heightScale);
      const hipY = waistY + (42 * heightScale);
      const kneeY = hipY + (90 * heightScale);
      const ankleY = footY - 20;

      const leftSide = [
        `M ${centerX},${neckY}`,
        `C ${centerX - shoulderHalf * 0.4},${neckY + 5} ${centerX - shoulderHalf * 0.8},${shoulderY - 5} ${centerX - shoulderHalf},${shoulderY}`,
        `C ${centerX - shoulderHalf * 1.05},${shoulderY + 10} ${centerX - bustHalf * 1.05},${bustY - 10} ${centerX - bustHalf},${bustY}`,
        `C ${centerX - bustHalf * 0.95},${bustY + 15} ${centerX - waistHalf * 1.1},${waistY - 15} ${centerX - waistHalf},${waistY}`,
        `C ${centerX - waistHalf * 0.95},${waistY + 15} ${centerX - hipHalf * 1.05},${hipY - 15} ${centerX - hipHalf},${hipY}`,
        `C ${centerX - hipHalf},${hipY + 25} ${centerX - kneeHalf * 1.2},${kneeY - 25} ${centerX - kneeHalf},${kneeY}`,
        `C ${centerX - kneeHalf * 0.8},${kneeY + 25} ${centerX - footHalf * 1.1},${ankleY - 10} ${centerX - footHalf},${ankleY}`,
        `L ${centerX - footHalf * 0.8},${footY}`
      ].join(' ');

      const rightSide = [
        `L ${centerX + footHalf * 0.8},${footY}`,
        `L ${centerX + footHalf},${ankleY}`,
        `C ${centerX + footHalf * 1.1},${ankleY - 10} ${centerX + kneeHalf * 0.8},${kneeY + 25} ${centerX + kneeHalf},${kneeY}`,
        `C ${centerX + kneeHalf * 1.2},${kneeY - 25} ${centerX + hipHalf},${hipY + 25} ${centerX + hipHalf},${hipY}`,
        `C ${centerX + hipHalf * 1.05},${hipY - 15} ${centerX + waistHalf * 0.95},${waistY + 15} ${centerX + waistHalf},${waistY}`,
        `C ${centerX + waistHalf * 1.1},${waistY - 15} ${centerX + bustHalf * 0.95},${bustY + 15} ${centerX + bustHalf},${bustY}`,
        `C ${centerX + bustHalf * 1.05},${bustY - 10} ${centerX + shoulderHalf * 1.05},${shoulderY + 10} ${centerX + shoulderHalf},${shoulderY}`,
        `C ${centerX + shoulderHalf * 0.8},${shoulderY - 5} ${centerX + shoulderHalf * 0.4},${neckY + 5} ${centerX},${neckY}`
      ].join(' ');

      const outlinePath = `${leftSide} ${rightSide} Z`;
      const headPath = `M ${centerX},${headY - headH / 2} A ${headW / 2},${headH / 2} 0 1,1 ${centerX},${headY + headH / 2} A ${headW / 2},${headH / 2} 0 1,1 ${centerX},${headY - headH / 2}`;
      const leftCollarbone = `M ${centerX - shoulderHalf * 0.8},${shoulderY + 5} Q ${centerX - shoulderHalf * 0.4},${shoulderY + 8} ${centerX},${shoulderY + 12}`;
      const rightCollarbone = `M ${centerX + shoulderHalf * 0.8},${shoulderY + 5} Q ${centerX + shoulderHalf * 0.4},${shoulderY + 8} ${centerX},${shoulderY + 12}`;
      const centerLine = `M ${centerX},${shoulderY + 15} L ${centerX},${waistY}`;

      return { outlinePath, headPath, leftCollarbone, rightCollarbone, centerLine, footY };
    };

    const userCroquis = computeSilhouette(150, profSex, hCm, wKg, waistInches);
    const avgCroquis = computeSilhouette(150, profSex, 168, 68, 30);

    return { userCroquis, avgCroquis };
  };

  return (
    <div>
      
      {/* Brand & Centered Logo Header */}
      <header className="editorial-header">
        <h1 className="brand-logo">ATELIER EDIT</h1>
        <p className="brand-subtitle">The Personal Style Journal</p>

        {/* Buttons in a single line underneath the logo */}
        {user && (
          <nav className="nav-menu">
            <button
              onClick={() => setActiveTab('feed')}
              className={`nav-link ${activeTab === 'feed' ? 'active' : ''}`}
            >
              Stylist
            </button>
            
            <button
              onClick={() => {
                setActiveTab('whats-new');
                fetchWhatsNew(false); // auto-fetch on tab click
              }}
              className={`nav-link ${activeTab === 'whats-new' ? 'active' : ''}`}
            >
              What&apos;s New
            </button>

            <button
              onClick={() => setActiveTab('closet')}
              className={`nav-link ${activeTab === 'closet' ? 'active' : ''}`}
            >
              Wardrobe
            </button>

            <button
              onClick={() => {
                setActiveTab('capsule');
                fetchCapsules();
              }}
              className={`nav-link ${activeTab === 'capsule' ? 'active' : ''}`}
            >
              Capsules
            </button>

            <button
              onClick={() => {
                setActiveTab('studio');
                fetchCollages();
              }}
              className={`nav-link ${activeTab === 'studio' ? 'active' : ''}`}
            >
              Studio
            </button>
            
            <button
              onClick={() => setActiveTab('trends')}
              className={`nav-link ${activeTab === 'trends' ? 'active' : ''}`}
            >
              Inspirations
            </button>

            <span className="nav-divider">|</span>
            
            <button
              onClick={() => setActiveTab('account')}
              className={`nav-link ${activeTab === 'account' ? 'active' : ''}`}
            >
              My Profile
            </button>

            <button
              type="button"
              onClick={() => openCameraViewfinder('inspiration')}
              className="header-snap-btn"
              title="Snap street style, boutique racks, or magazine inspiration on the fly"
            >
              📸 Snap Inspiration
            </button>

            {user && user.role === 'admin' && (
              <>
                <span className="nav-divider">|</span>
                <a
                  href="/admin"
                  className="nav-link"
                  style={{ color: 'var(--accent-gold)' }}
                >
                  Admin
                </a>
              </>
            )}
          </nav>
        )}
      </header>

      {/* Main Content View */}
      <main className="main-container">
        {!user ? (
          /* Unauthenticated view: Render the login/registration form directly */
          <div className="auth-panel-wrapper">
            <div className="lookbook-panel">
              <div className="auth-tabs-row">
                <button
                  onClick={() => { setAuthMode('login'); setSignupSecret2FA(null); }}
                  className={`auth-tab-btn ${authMode === 'login' ? 'active' : ''}`}
                >
                  Login
                </button>
                <button
                  onClick={() => { setAuthMode('signup'); setSignupSecret2FA(null); }}
                  className={`auth-tab-btn ${authMode === 'signup' ? 'active' : ''}`}
                >
                  Register
                </button>
              </div>

              {authMode === 'login' && (
                <form onSubmit={handleLogin} className="form-group-stack">
                  <h3 className="auth-form-title">Atelier Edit Sign In</h3>
                  
                  <div className="form-field">
                    <label>Email Address</label>
                    <input
                      type="email"
                      required
                      value={authEmail}
                      onChange={(e) => setAuthEmail(e.target.value)}
                      placeholder="e.g. example@fashion.com"
                    />
                  </div>

                  <div className="form-field">
                    <label>Password</label>
                    <input
                      type="password"
                      required
                      value={authPassword}
                      onChange={(e) => setAuthPassword(e.target.value)}
                      placeholder="••••••••"
                    />
                  </div>

                  <button type="submit" className="accent-button">
                    LOG IN
                  </button>

                  <div style={{ textAlign: 'center', marginTop: '1rem' }}>
                    <button
                      type="button"
                      onClick={() => { setAuthMode('forgot'); setRecoveryStep('request'); }}
                      className="nav-action"
                      style={{ fontSize: '0.8rem', color: 'var(--accent-gold)', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}
                    >
                      Forgot Password?
                    </button>
                  </div>
                </form>
              )}

              {authMode === 'signup' && (
                <form onSubmit={handleSignup} className="form-group-stack">
                  <h3 className="auth-form-title">Register Account</h3>
                  
                  <div className="form-field">
                    <label>Full Name</label>
                    <input
                      type="text"
                      required
                      value={authName}
                      onChange={(e) => setAuthName(e.target.value)}
                      placeholder="e.g. Clara Oswald"
                    />
                  </div>

                  <div className="form-field">
                    <label>Email Address</label>
                    <input
                      type="email"
                      required
                      value={authEmail}
                      onChange={(e) => setAuthEmail(e.target.value)}
                      placeholder="clara@fashion.com"
                    />
                  </div>

                  <div className="form-field">
                    <label>Password</label>
                    <input
                      type="password"
                      required
                      value={authPassword}
                      onChange={(e) => setAuthPassword(e.target.value)}
                      placeholder="Minimum 6 characters"
                    />
                  </div>

                  <div className="form-field" style={{ flexDirection: 'row', alignItems: 'center', gap: '0.5rem', paddingTop: '0.5rem' }}>
                    <input
                      type="checkbox"
                      id="mfaEnable"
                      checked={authMfaEnabled}
                      onChange={(e) => setAuthMfaEnabled(e.target.checked)}
                    />
                    <label htmlFor="mfaEnable" style={{ cursor: 'pointer' }}>
                      Enable Multi-Factor Security (2FA)
                    </label>
                  </div>

                  <button type="submit" className="accent-button">
                    REGISTER ACCOUNT
                  </button>
                </form>
              )}

              {authMode === 'mfa' && (
                <form onSubmit={handleMfaVerify} className="form-group-stack">
                  <h3 className="auth-form-title">Security Key Required</h3>

                  {signupSecret2FA && (
                    <div className="mfa-secret-box">
                      <span className="mfa-secret-title">2FA Configuration Key</span>
                      <span className="mfa-secret-key">{signupSecret2FA}</span>
                      <p className="mfa-secret-caption">
                        Add this key manually to Google Authenticator or scan it to generate 6-digit access tokens.
                      </p>
                    </div>
                  )}

                  <div className="form-field">
                    <label>6-Digit Authenticator Token</label>
                    <input
                      type="text"
                      required
                      maxLength={6}
                      value={authMfaCode}
                      onChange={(e) => setAuthMfaCode(e.target.value)}
                      placeholder="e.g. 123456"
                      className="otp-input"
                    />
                  </div>

                  <button type="submit" className="accent-button">
                    VERIFY & LOG IN
                  </button>
                </form>
              )}

              {authMode === 'forgot' && (
                <div className="form-group-stack">
                  <h3 className="auth-form-title">Recover Password</h3>
                  
                  {recoveryStep === 'request' ? (
                    <form onSubmit={handleForgotPasswordRequest} className="form-group-stack">
                      <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
                        Enter your registered email or phone number to receive a security verification code.
                      </p>
                      
                      <div className="form-field">
                        <label>Email or Phone Number</label>
                        <input
                          type="text"
                          required
                          value={recoveryIdentity}
                          onChange={(e) => setRecoveryIdentity(e.target.value)}
                          placeholder="e.g. clara@fashion.com or +123456789"
                        />
                      </div>

                      <button type="submit" className="accent-button" disabled={isSendingRecovery}>
                        {isSendingRecovery ? 'SENDING CODE...' : 'SEND RECOVERY CODE'}
                      </button>
                    </form>
                  ) : (
                    <form onSubmit={handleResetPasswordSubmit} className="form-group-stack">
                      <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
                        A verification code was dispatched to your contact identity. Enter it below along with your new password.
                      </p>

                      <div className="form-field">
                        <label>Identity (Email or Phone)</label>
                        <input
                          type="text"
                          readOnly
                          value={recoveryIdentity}
                          style={{ opacity: 0.7 }}
                        />
                      </div>

                      <div className="form-field">
                        <label>6-Digit Verification Code</label>
                        <input
                          type="text"
                          required
                          value={recoveryCode}
                          onChange={(e) => setRecoveryCode(e.target.value)}
                          placeholder="e.g. 123456"
                        />
                      </div>

                      <div className="form-field">
                        <label>New Password</label>
                        <input
                          type="password"
                          required
                          value={recoveryPassword}
                          onChange={(e) => setRecoveryPassword(e.target.value)}
                          placeholder="Minimum 6 characters"
                        />
                      </div>

                      <button type="submit" className="accent-button" disabled={isSendingRecovery}>
                        {isSendingRecovery ? 'SAVING...' : 'RESET PASSWORD'}
                      </button>
                    </form>
                  )}

                  <div style={{ textAlign: 'center', marginTop: '1.5rem', borderTop: '1px solid var(--border-color)', paddingTop: '1rem' }}>
                    <button
                      type="button"
                      onClick={() => setAuthMode('login')}
                      className="nav-action"
                      style={{ fontSize: '0.8rem', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}
                    >
                      Return to Sign In
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : (
          /* Authenticated Dashboard View */
          <>
            {/* PWA Install Banner */}
            {showPwaBanner && pwaPromptEvent && (
              <div className="pwa-install-banner">
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <span style={{ fontSize: '1.4rem' }}>📱</span>
                  <div>
                    <strong style={{ display: 'block', fontSize: '0.85rem', color: '#FAF8F4' }}>Install Atelier Edit on your device</strong>
                    <span style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.7)' }}>Access your wardrobe, packing capsules, and flat-lay studio instantly offline.</span>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                  <button type="button" onClick={handleInstallPwa} className="pwa-install-btn">
                    Add to Home Screen
                  </button>
                  <button type="button" onClick={() => setShowPwaBanner(false)} className="pwa-dismiss-btn">
                    ✕
                  </button>
                </div>
              </div>
            )}

            {/* Style Feed tab */}
            {activeTab === 'feed' && (
          <div className="outfit-stream">
            {/* Live Weather Status Bar */}
            {liveWeather && (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem', background: '#ffffff', padding: '0.75rem 1.25rem', borderRadius: '6px', border: '1px solid var(--border-color)', boxShadow: 'var(--shadow-sm)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                  <span style={{ fontSize: '1.3rem' }}>{liveWeather.icon}</span>
                  <div>
                    <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                      {liveWeather.city}: {liveWeather.tempCelsius}°C / {liveWeather.tempFahrenheit}°F • {liveWeather.condition}
                    </span>
                    <span style={{ display: 'block', fontSize: '0.7rem', color: 'var(--text-secondary)' }}>
                      🌤️ Thermal Styling Rule: {liveWeather.stylingDirectives}
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setWeatherCityInput(liveWeather.city);
                    setShowWeatherModal(true);
                  }}
                  className="weather-pill-btn"
                >
                  📍 Change Climate
                </button>
              </div>
            )}

            {/* Weather Location Switcher Modal */}
            {showWeatherModal && (
              <div className="modal-overlay" style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
                <div className="lookbook-panel" style={{ maxWidth: '420px', width: '100%', padding: '1.5rem', background: '#ffffff' }}>
                  <h3 style={{ fontSize: '1.1rem', marginBottom: '0.75rem' }}>Select Styling Location & Climate</h3>
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
                    Enter any destination city worldwide to adapt AI styling recommendations and layering logic to live forecasts.
                  </p>
                  <form onSubmit={(e) => { e.preventDefault(); handleSwitchWeather(weatherCityInput); }}>
                    <div className="form-field" style={{ marginBottom: '1rem' }}>
                      <label>City Name</label>
                      <input
                        type="text"
                        required
                        value={weatherCityInput}
                        onChange={(e) => setWeatherCityInput(e.target.value)}
                        placeholder="e.g. Paris, New York, Tokyo, Milan"
                      />
                    </div>
                    <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
                      <button type="button" onClick={() => setShowWeatherModal(false)} className="nav-action" style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                        Cancel
                      </button>
                      <button type="submit" className="accent-button" style={{ padding: '0.5rem 1rem' }} disabled={isLoadingWeather}>
                        {isLoadingWeather ? 'Fetching Forecast...' : 'Apply Climate'}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}

            {anchorGarment && (
              <div className="lookbook-panel" style={{ width: '100%', padding: '1rem 1.5rem', border: '1px solid var(--accent-gold)', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', backgroundColor: 'rgba(212, 175, 55, 0.08)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <div style={{ position: 'relative', width: '48px', height: '48px', borderRadius: '4px', overflow: 'hidden', border: '1px solid var(--accent-gold)' }}>
                    <Image src={anchorGarment.imageUrl} alt="Anchor Item" fill style={{ objectFit: 'cover' }} unoptimized />
                  </div>
                  <div>
                    <span style={{ fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--accent-gold)', fontWeight: 800, display: 'block' }}>
                      ★ Hero Anchor Garment Active
                    </span>
                    <span style={{ fontSize: '0.9rem', fontWeight: 'bold' }}>
                      {anchorGarment.brand ? `${anchorGarment.brand} - ` : ''}{anchorGarment.category}
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setAnchorGarment(null)}
                  className="nav-action"
                  style={{ fontSize: '0.75rem', textDecoration: 'underline', color: 'var(--accent-gold)' }}
                >
                  ✕ Clear Anchor
                </button>
              </div>
            )}

            {/* Custom Vibe Input Card */}
            <div className="lookbook-panel" style={{ padding: '1.5rem', marginBottom: '2rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem', marginBottom: '0.75rem' }}>
                <h3 style={{ fontSize: '1.25rem' }}>
                  Personal Stylist Consultation
                </h3>
                <div className="stylist-dna-badge" style={{ marginBottom: 0 }}>
                  <span>✦ Aesthetic: <strong>{user?.styleAesthetic || 'Personalized Tailoring'}</strong></span>
                  <span style={{ opacity: 0.5 }}>|</span>
                  <span>{feeds.filter(f => f.isSubscribed && !f.isMuted).length} Active Feeds</span>
                </div>
              </div>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '1.25rem' }}>
                Recommendations synthesize your <strong>{user?.styleAesthetic || 'Personalized'}</strong> aesthetic, closet collection, and active fashion channels. You can also specify an occasion, destination, or mood below:
              </p>
              <div className="consultation-input-row">
                <input
                  type="text"
                  value={styleVibePrompt}
                  onChange={(e) => setStyleVibePrompt(e.target.value)}
                  placeholder="e.g. Sunny day floral vibes"
                  style={{
                    flex: 1,
                    padding: '0.75rem',
                    borderRadius: '4px',
                    border: '1px solid var(--border-color)',
                    background: 'rgba(255,255,255,0.05)',
                    color: 'var(--text)',
                    fontSize: '16px',
                  }}
                />
                <button
                  onClick={() => triggerRecommendations(styleVibePrompt)}
                  disabled={isGenerating || wardrobe.length === 0}
                  className="accent-button"
                  style={{ width: 'auto', padding: '0.75rem 1.5rem', marginTop: 0, minHeight: '44px' }}
                  title={wardrobe.length === 0 ? "Upload garments to your Wardrobe to enable styling consultations" : "Request styling recommendations"}
                >
                  {isGenerating ? 'Styling...' : 'Advise Me'}
                </button>
              </div>
              {wardrobe.length === 0 && (
                <p style={{ fontSize: '0.72rem', color: 'var(--accent-gold)', marginTop: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                  <span>ℹ️</span>
                  <span>Add at least 1 clothing item to your <button type="button" onClick={() => setActiveTab('closet')} style={{ background: 'none', border: 'none', color: 'var(--accent-gold)', textDecoration: 'underline', cursor: 'pointer', padding: 0, font: 'inherit', fontWeight: 'bold' }}>Wardrobe</button> to unlock personal styling consultations.</span>
                </p>
              )}
            </div>

            {loadingRecommendations ? (
              <div className="outfit-narrative" style={{ textAlign: 'center', border: 'none' }}>
                Compiling style recommendations...
              </div>
            ) : recommendations.length === 0 ? (
              <div className="lookbook-panel" style={{ textAlign: 'center' }}>
                <h3 style={{ fontSize: '1.75rem', marginBottom: '1rem' }}>Your lookbook is currently empty.</h3>
                <p style={{ fontSize: '0.85rem' }}>
                  Upload garments in the <strong>Wardrobe</strong> and use the consultation box above to request styling advice.
                </p>
              </div>
            ) : (
              recommendations.map((rec) => (
                <article key={rec.id} className="lookbook-panel">
                  
                  <div className="outfit-header">
                    <h3 className="outfit-title">{rec.title}</h3>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
                      <span className="outfit-date">
                        {new Date(rec.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                      </span>
                      <button
                        onClick={() => handleDeleteRecommendation(rec.id)}
                        className="delete-action-btn"
                        style={{
                          background: 'none',
                          border: 'none',
                          color: 'var(--text-muted)',
                          cursor: 'pointer',
                          fontSize: '0.75rem',
                          padding: '0 4px',
                          display: 'flex',
                          alignItems: 'center',
                          textDecoration: 'underline'
                        }}
                      >
                        Delete
                      </button>
                    </div>
                  </div>

                  <p className="outfit-narrative">
                    &ldquo;{rec.narrative}&rdquo;
                  </p>

                  <div className="lookbook-spread-grid">
                    {rec.outfitItems.map((item) => (
                      <div key={item.id} className="spread-item">
                        
                        <div className="image-canvas">
                          {item.wardrobeItemId ? (
                            item.wardrobeItemImage ? (
                              <Image
                                src={item.wardrobeItemImage}
                                alt="Closet Garment"
                                fill
                                sizes="(max-width: 768px) 100vw, 33vw"
                                style={{ objectFit: 'cover' }}
                              />
                            ) : (
                              <div style={{ display: 'flex', alignItems: 'center', justifyItems: 'center', height: '100%', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                Closet Piece
                              </div>
                            )
                          ) : (
                            item.purchaseImageUrl && (
                              <div style={{ position: 'relative', width: '100%', height: '100%' }}>
                                <Image
                                  src={item.purchaseImageUrl}
                                  alt={item.purchaseName || 'Acquisition target'}
                                  fill
                                  sizes="(max-width: 768px) 100vw, 33vw"
                                  style={{ objectFit: 'cover' }}
                                />
                                {item.purchaseImageUrl.includes('unsplash.com') && (
                                  <div style={{
                                    position: 'absolute',
                                    bottom: '6px',
                                    left: '6px',
                                    background: 'rgba(0, 0, 0, 0.65)',
                                    color: '#fff',
                                    fontSize: '0.55rem',
                                    padding: '0.15rem 0.35rem',
                                    borderRadius: '2px',
                                    letterSpacing: '0.05em',
                                    textTransform: 'uppercase',
                                    pointerEvents: 'none',
                                    fontWeight: 'bold',
                                    zIndex: 10
                                  }}>
                                    For illustration only
                                  </div>
                                )}
                              </div>
                            )
                          )}
                          
                          <div className="canvas-tag">
                            {item.wardrobeItemId ? 'CLOSET ELEMENT' : 'ACQUISITION TARGET'}
                          </div>
                        </div>

                        <div className="item-details">
                          <h4>
                            {item.wardrobeItemId ? `Your ${item.wardrobeItemCategory || 'Item'}` : item.purchaseName}
                          </h4>
                          {item.purchaseBrand && (
                            <span className="item-brand">{item.purchaseBrand}</span>
                          )}
                          <p className="item-rationale">{item.stylingRationale}</p>
                        </div>

                        {!item.wardrobeItemId && item.purchaseUrl && (
                          <div className="purchase-bar">
                            <span className="purchase-price">{item.priceEstimate || 'Price Variable'}</span>
                            <a
                              href={item.purchaseUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="purchase-link"
                            >
                              View Item →
                            </a>
                          </div>
                        )}

                      </div>
                    ))}
                  </div>

                </article>
              ))
            )}
          </div>
        )}

        {/* What's New Tab */}
        {activeTab === 'whats-new' && (
          <div className="outfit-stream" style={{ maxWidth: '600px', margin: '0 auto' }}>
            <div className="lookbook-panel" style={{ padding: '1.5rem', marginBottom: '2rem', textAlign: 'center' }}>
              <h3 style={{ fontSize: '1.25rem', marginBottom: '0.5rem' }}>Editorial Style Stream</h3>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '1.25rem' }}>
                The latest styling trends curated from runway shows, designer lookbooks, and fashion newsletters.
              </p>
              <button
                onClick={() => fetchWhatsNew(true)}
                disabled={loadingWhatsNew}
                className="accent-button"
                style={{ width: 'auto', padding: '0.6rem 1.5rem', marginTop: 0 }}
              >
                {loadingWhatsNew ? 'Refreshing Stream...' : 'Sync & Refresh Feed'}
              </button>
            </div>

            {loadingWhatsNew ? (
              <div className="outfit-narrative" style={{ textAlign: 'center', border: 'none' }}>
                Scraping style updates and generating editorial captions...
              </div>
            ) : whatsNewPosts.length === 0 ? (
              <div className="lookbook-panel" style={{ textAlign: 'center' }}>
                <p style={{ fontSize: '0.85rem' }}>Style stream is empty. Click Sync & Refresh Feed above to build it.</p>
              </div>
            ) : (
              whatsNewPosts.map((post) => (
                <article key={post.id} className="lookbook-panel" style={{ padding: 0, overflow: 'hidden', marginBottom: '2rem' }}>
                  {post.imageUrl && (
                    <div style={{ position: 'relative', width: '100%', height: '350px' }}>
                      <Image
                        src={post.imageUrl}
                        alt={post.title}
                        fill
                        sizes="(max-width: 768px) 100vw, 600px"
                        style={{ objectFit: 'cover' }}
                      />
                      <div style={{
                        position: 'absolute',
                        bottom: 0,
                        left: 0,
                        right: 0,
                        padding: '1.5rem 1rem 1rem 1rem',
                        background: 'linear-gradient(to top, rgba(0,0,0,0.8) 0%, rgba(0,0,0,0) 100%)',
                        color: '#fff'
                      }}>
                        <span style={{ fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.1em', background: 'rgba(255,255,255,0.2)', padding: '0.2rem 0.5rem', borderRadius: '3px' }}>
                          {post.source}
                        </span>
                        <h3 style={{ fontSize: '1.5rem', marginTop: '0.5rem', fontWeight: '800', textShadow: '0 2px 4px rgba(0,0,0,0.5)' }}>
                          {post.title}
                        </h3>
                      </div>
                    </div>
                  )}
                  
                  <div style={{ padding: '1.5rem' }}>
                    <p className="outfit-narrative" style={{ margin: 0, border: 'none', padding: 0, fontSize: '0.95rem', lineHeight: '1.6' }}>
                      {post.summary}
                    </p>
                    
                    {post.tags && post.tags.length > 0 && (
                      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginTop: '1rem' }}>
                        {post.tags.map((tag) => (
                          <span key={tag} style={{ color: 'var(--accent-color)', fontSize: '0.8rem', fontWeight: 'bold' }}>
                            #{tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </article>
              ))
            )}
          </div>
        )}

        {/* Closet tab */}
        {activeTab === 'closet' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            {/* Sub-Tab Navigation Bar */}
            <div style={{ display: 'flex', gap: '1rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>
              <button
                type="button"
                onClick={() => setWardrobeViewMode('grid')}
                className="nav-link"
                style={{
                  borderBottom: wardrobeViewMode === 'grid' ? '2px solid var(--accent)' : 'none',
                  color: wardrobeViewMode === 'grid' ? 'var(--text-primary)' : 'var(--text-secondary)',
                  fontWeight: wardrobeViewMode === 'grid' ? 700 : 500,
                  padding: '0.4rem 0.8rem',
                }}
              >
                📁 Wardrobe Inventory ({wardrobe.length})
              </button>
              <button
                type="button"
                onClick={() => {
                  setWardrobeViewMode('analytics');
                  fetchAnalytics();
                }}
                className="nav-link"
                style={{
                  borderBottom: wardrobeViewMode === 'analytics' ? '2px solid var(--accent)' : 'none',
                  color: wardrobeViewMode === 'analytics' ? 'var(--text-primary)' : 'var(--text-secondary)',
                  fontWeight: wardrobeViewMode === 'analytics' ? 700 : 500,
                  padding: '0.4rem 0.8rem',
                }}
              >
                📊 Wardrobe Intelligence & Gaps
              </button>
            </div>

            {/* Wardrobe Intelligence & Gap Analysis View */}
            {wardrobeViewMode === 'analytics' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                {loadingAnalytics ? (
                  <div className="lookbook-panel" style={{ padding: '3rem', textAlign: 'center' }}>
                    Computing wardrobe statistical distributions & color spectrum...
                  </div>
                ) : analyticsData ? (
                  <>
                    {/* Top Summary Row */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                      <div className="analytics-card" style={{ padding: '1rem' }}>
                        <span style={{ fontSize: '0.7rem', textTransform: 'uppercase', color: 'var(--text-secondary)' }}>Total Garments</span>
                        <h3 style={{ fontSize: '1.8rem', margin: '0.2rem 0' }}>{analyticsData.totalItems}</h3>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Indexed across 9 categories</span>
                      </div>
                      <div className="analytics-card" style={{ padding: '1rem' }}>
                        <span style={{ fontSize: '0.7rem', textTransform: 'uppercase', color: 'var(--text-secondary)' }}>Style DNA Harmony</span>
                        <h3 style={{ fontSize: '1.8rem', margin: '0.2rem 0', color: 'var(--accent-gold)' }}>
                          {analyticsData.styleDnaAlignmentScore}%
                        </h3>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                          Aligned with {user?.styleAesthetic || 'Personalized'}
                        </span>
                      </div>
                      <div className="analytics-card" style={{ padding: '1rem' }}>
                        <span style={{ fontSize: '0.7rem', textTransform: 'uppercase', color: 'var(--text-secondary)' }}>Unworn Gems</span>
                        <h3 style={{ fontSize: '1.8rem', margin: '0.2rem 0' }}>{analyticsData.unwornGems.length}</h3>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Ready for fresh styling</span>
                      </div>
                    </div>

                    {/* Breakdown Grid */}
                    <div className="analytics-grid">
                      {/* Category Breakdown */}
                      <div className="analytics-card">
                        <h4 style={{ fontSize: '0.9rem', marginBottom: '1rem', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                          Category Distribution
                        </h4>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                          {analyticsData.categoryBreakdown.map((cat) => (
                            <div key={cat.category} className="color-bar-row">
                              <span style={{ width: '90px', fontSize: '0.75rem', fontWeight: 600 }}>{cat.category}</span>
                              <div className="color-bar-track">
                                <div className="color-bar-fill" style={{ width: `${cat.percentage}%` }} />
                              </div>
                              <span style={{ width: '45px', fontSize: '0.7rem', textAlign: 'right', color: 'var(--text-secondary)' }}>
                                {cat.count} ({cat.percentage}%)
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Color Palette Breakdown */}
                      <div className="analytics-card">
                        <h4 style={{ fontSize: '0.9rem', marginBottom: '1rem', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                          Color Palette Spectrum
                        </h4>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                          {analyticsData.colorBreakdown.map((fam) => (
                            <div key={fam.family} className="color-bar-row">
                              <span style={{ width: '130px', fontSize: '0.75rem', fontWeight: 600 }}>{fam.family}</span>
                              <div className="color-bar-track">
                                <div className="color-bar-fill" style={{ width: `${fam.percentage}%`, backgroundColor: fam.family.includes('Warm') ? '#C89D7C' : fam.family.includes('Jewel') ? '#4B5563' : 'var(--accent)' }} />
                              </div>
                              <span style={{ width: '45px', fontSize: '0.7rem', textAlign: 'right', color: 'var(--text-secondary)' }}>
                                {fam.percentage}%
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Unworn Gems Carousel */}
                    {analyticsData.unwornGems.length > 0 && (
                      <div className="analytics-card">
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                          <div>
                            <h4 style={{ fontSize: '0.9rem', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                              💎 Unworn Gems
                            </h4>
                            <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                              Underutilized items in your closet ready to be reinvented into new looks.
                            </p>
                          </div>
                        </div>
                        <div className="unworn-gems-rack">
                          {analyticsData.unwornGems.map((item) => (
                            <div
                              key={item.id}
                              style={{
                                width: '160px',
                                flexShrink: 0,
                                border: '1px solid var(--border-color)',
                                borderRadius: '4px',
                                padding: '0.65rem',
                                background: '#fafafa',
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '0.4rem',
                              }}
                            >
                              <div style={{ position: 'relative', width: '100%', height: '140px', borderRadius: '3px', overflow: 'hidden' }}>
                                <Image src={item.imageUrl} alt={item.category} fill style={{ objectFit: 'cover' }} unoptimized />
                              </div>
                              <span style={{ fontSize: '0.75rem', fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                {item.brand ? `${item.brand} ` : ''}{item.category}
                              </span>
                              <button
                                type="button"
                                onClick={() => handleCreateOutfitAroundItem(item)}
                                className="accent-button"
                                style={{ padding: '0.35rem 0.5rem', fontSize: '0.65rem' }}
                              >
                                ★ Style Around This
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* AI Strategic Wardrobe Gap Analysis */}
                    <div className="analytics-card" style={{ border: '1px solid var(--accent-gold)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '1rem' }}>
                        <div>
                          <h4 style={{ fontSize: '0.95rem', color: 'var(--accent-gold)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                            🔍 Strategic Wardrobe Gap Recommendations
                          </h4>
                          <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                            AI analysis of 3 missing foundation pieces that maximize outfit combinations and versatility for your Style DNA.
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={handleFetchGaps}
                          disabled={loadingGaps}
                          className="accent-button"
                          style={{ padding: '0.5rem 1rem' }}
                        >
                          {loadingGaps ? 'Synthesizing Gaps & Sourcing...' : '✦ Analyze Closet Gaps'}
                        </button>
                      </div>

                      {wardrobeGaps.length > 0 && (
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem', marginTop: '1rem' }}>
                          {wardrobeGaps.map((gap, idx) => (
                            <div key={idx} className="gap-card">
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                <span style={{ fontSize: '0.65rem', textTransform: 'uppercase', fontWeight: 800, color: 'var(--accent)' }}>
                                  {gap.category}
                                </span>
                                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--accent-gold)' }}>
                                  {gap.estimatedPrice}
                                </span>
                              </div>
                              <h5 style={{ fontSize: '0.9rem', margin: '0.2rem 0' }}>{gap.purchaseName}</h5>
                              <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontStyle: 'italic' }}>
                                Recommended brand: {gap.purchaseBrand}
                              </span>
                              <p style={{ fontSize: '0.75rem', color: 'var(--text-primary)', margin: '0.4rem 0' }}>
                                {gap.stylingRationale}
                              </p>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'auto', paddingTop: '0.5rem' }}>
                                <span style={{ fontSize: '0.7rem', color: '#16a34a', fontWeight: 700 }}>
                                  ✦ Unlocks ~{gap.unlocksLooksCount} new looks
                                </span>
                                {gap.purchaseUrl && (
                                  <a
                                    href={gap.purchaseUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="nav-action"
                                    style={{ fontSize: '0.7rem', textDecoration: 'underline', color: 'var(--accent)', fontWeight: 700 }}
                                  >
                                    Shop Retail →
                                  </a>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </>
                ) : (
                  <div className="lookbook-panel" style={{ padding: '2rem', textAlign: 'center' }}>
                    Upload wardrobe items to view intelligence analytics and color breakdowns.
                  </div>
                )}
              </div>
            )}

            {/* Normal Wardrobe Inventory Grid / Spreadsheet View */}
            {wardrobeViewMode === 'grid' && (
              <>
                {/* Search and Category Filter Row */}
                <div className="search-filter-row">
                  <div className="search-input-wrapper">
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search wardrobe items by brand, tag, color, or style notes..."
                    />
                  </div>

                  <select
                    value={categoryFilter}
                    onChange={(e) => setCategoryFilter(e.target.value)}
                    className="filter-select"
                  >
                    <option value="All">All Categories</option>
                    <option value="Outerwear">Outerwear</option>
                    <option value="Tops">Tops</option>
                    <option value="Bottoms">Bottoms</option>
                    <option value="Shoes">Shoes</option>
                    <option value="Accessories">Accessories</option>
                    <option value="Dresses">Dresses</option>
                    <option value="Knitwear">Knitwear</option>
                    <option value="Makeup">Makeup</option>
                    <option value="Jewelry">Jewelry</option>
                  </select>
                </div>
            
            {/* Spreadsheet vs Grid View toggles and bulk tools */}
            <div className="batch-editor-toggle-row">
              <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'center' }}>
                <button 
                  onClick={() => setIsSpreadsheetMode(!isSpreadsheetMode)}
                  className="nav-action"
                  style={{ textDecoration: 'underline', fontWeight: 800 }}
                >
                  {isSpreadsheetMode ? '← Switch to Grid Lookbook View' : 'Spreadsheet View (Bulk Editor)'}
                </button>

                <button
                  type="button"
                  onClick={handleScanDuplicates}
                  disabled={isScanningDuplicates}
                  className="nav-action"
                  style={{ textDecoration: 'underline', color: 'var(--accent-gold)', fontWeight: 800 }}
                >
                  {isScanningDuplicates ? 'Scanning wardrobe...' : '🔍 Scan for Duplicates'}
                </button>
              </div>

              {/* Duplicates scan panel */}
              {showDuplicatesScan && (
                <div className="lookbook-panel" style={{ width: '100%', padding: '1.5rem', border: '1px solid var(--accent-gold)', marginTop: '1rem', gridColumn: '1 / -1' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                    <div>
                      <h3 style={{ fontSize: '1.25rem', color: 'var(--accent-gold)' }}>Duplicate Garments Scanner</h3>
                      <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>We detected identical uploads in your wardrobe. Review groups below and merge them to keep only one copy.</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowDuplicatesScan(false)}
                      className="nav-action"
                      style={{ fontSize: '0.8rem', textDecoration: 'underline' }}
                    >
                      Close scanner
                    </button>
                  </div>

                  {duplicateGroups.length === 0 ? (
                    <p style={{ fontSize: '0.85rem', color: '#22c55e', fontWeight: 600, textAlign: 'center', padding: '1.5rem' }}>
                      ✓ Perfect! No duplicate clothing images found.
                    </p>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                      {duplicateGroups.map((group, gIdx) => (
                        <div key={gIdx} style={{ background: 'rgba(255,255,255,0.02)', padding: '1rem', borderRadius: '4px', border: '1px solid var(--border-color)' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                              Duplicate Group #{gIdx + 1}
                            </span>
                            <span style={{ fontSize: '0.75rem', color: 'var(--accent-gold)' }}>
                              {group.items.length} copies found
                            </span>
                          </div>

                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '1rem' }}>
                            {group.items.map((item: WardrobeItem) => (
                              <div key={item.id} style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', padding: '0.5rem', background: 'rgba(0,0,0,0.1)', border: '1px solid rgba(255,255,255,0.03)', borderRadius: '3px' }}>
                                <div style={{ position: 'relative', width: '100%', height: '120px' }}>
                                  <Image
                                    src={item.imageUrl}
                                    alt="Duplicate piece"
                                    fill
                                    style={{ objectFit: 'cover', borderRadius: '2px' }}
                                    unoptimized
                                  />
                                </div>
                                <div style={{ fontSize: '0.75rem', fontWeight: 'bold' }}>
                                  {item.brand || 'No Brand'} - {item.category}
                                </div>
                                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                                  {item.styleNotes || 'No notes.'}
                                </div>
                                <button
                                  type="button"
                                  onClick={() => {
                                    const deleteIds = group.items.filter((i: WardrobeItem) => i.id !== item.id).map((i: WardrobeItem) => i.id);
                                    handleMergeDuplicates(item.id, deleteIds);
                                  }}
                                  className="accent-button"
                                  style={{ fontSize: '0.7rem', padding: '0.35rem 0.5rem', width: '100%', marginTop: 'auto' }}
                                >
                                  Keep this, delete others
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {isSpreadsheetMode && selectedItemIds.length > 0 && (
                <div className="bulk-actions-toolbar" style={{ marginBottom: 0, padding: '0.5rem 1rem' }}>
                  <span className="bulk-action-caption">
                    {selectedItemIds.length} Selected
                  </span>
                  
                  <input
                    type="text"
                    value={bulkBrandValue}
                    onChange={(e) => setBulkBrandValue(e.target.value)}
                    placeholder="Apply brand..."
                    style={{ width: '120px', padding: '0.2rem 0.5rem', fontSize: '0.7rem' }}
                  />
                  
                  <button 
                    onClick={handleApplyBulkBrand}
                    className="nav-action"
                    style={{ border: '1px solid var(--border-color)', padding: '0.2rem 0.5rem', borderRadius: '3px' }}
                  >
                    Apply Brand
                  </button>

                  <button 
                    onClick={handleDeleteBulkSelected}
                    className="delete-action-btn"
                    style={{ marginLeft: '1rem' }}
                  >
                    Delete Selected
                  </button>
                </div>
              )}
            </div>

            {/* Ingestion & Layout screens */}
            {!isSpreadsheetMode ? (
              /* GRID VIEW */
              <div className="closet-layout-grid">
                
                {/* Sidebar form */}
                <div className="closet-form-sidebar">
                  <div className="lookbook-panel" style={{ padding: '1.5rem' }}>
                    <h3 style={{ fontSize: '1.35rem', marginBottom: '1.25rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>
                      Catalog Ingestion
                    </h3>
                    
                    <form onSubmit={handleUploadSubmit} className="form-group-stack">
                      {/* Dual Action Buttons: Camera vs Library */}
                      <div className="camera-actions-grid">
                        <button
                          type="button"
                          onClick={() => openCameraViewfinder('wardrobe')}
                          className="camera-action-btn primary"
                        >
                          <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                          </svg>
                          <span>Take Photo</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          className="camera-action-btn"
                        >
                          <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                          <span>Photo Library</span>
                        </button>
                      </div>

                      {/* Upload & Staging Zone */}
                      <div
                        onClick={() => {
                          if (previewUrls.length === 0) {
                            fileInputRef.current?.click();
                          }
                        }}
                        className="image-upload-picker"
                        style={{ cursor: previewUrls.length > 0 ? 'default' : 'pointer' }}
                      >
                        {previewUrls.length > 0 ? (
                          <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                            <div style={{ position: 'relative', width: '100%', flex: 1, minHeight: '180px', borderRadius: '4px', overflow: 'hidden' }}>
                              <Image
                                src={previewUrls[0]}
                                alt="Upload Preview"
                                fill
                                style={{ objectFit: 'cover' }}
                                unoptimized
                              />
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleRemovePreviewFile(0);
                                }}
                                style={{ position: 'absolute', top: 6, right: 6, background: 'rgba(24,24,26,0.75)', color: '#fff', border: 'none', borderRadius: '50%', width: 22, height: 22, cursor: 'pointer', fontSize: '11px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                title="Remove photo"
                              >
                                ✕
                              </button>
                            </div>

                            {/* Additional staged photos */}
                            {previewUrls.length > 1 && (
                              <div style={{ display: 'flex', gap: '4px', overflowX: 'auto', paddingBottom: '2px' }}>
                                {previewUrls.slice(1).map((url, idx) => (
                                  <div key={idx + 1} style={{ position: 'relative', width: '48px', height: '48px', flexShrink: 0, borderRadius: '2px', overflow: 'hidden', border: '1px solid var(--border-color)' }}>
                                    <Image src={url} alt="Preview" fill style={{ objectFit: 'cover' }} unoptimized />
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleRemovePreviewFile(idx + 1);
                                      }}
                                      style={{ position: 'absolute', top: 2, right: 2, background: 'rgba(24,24,26,0.75)', color: '#fff', border: 'none', borderRadius: '50%', width: 16, height: 16, cursor: 'pointer', fontSize: '9px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                    >
                                      ✕
                                    </button>
                                  </div>
                                ))}
                              </div>
                            )}

                            <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center', marginTop: '0.25rem' }}>
                              <button
                                type="button"
                                onClick={() => openCameraViewfinder('wardrobe')}
                                style={{ background: 'none', border: '1px dashed var(--border-color)', borderRadius: '3px', fontSize: '0.6rem', padding: '0.25rem 0.5rem', color: 'var(--text-secondary)', cursor: 'pointer' }}
                              >
                                + Snap Another
                              </button>
                              <button
                                type="button"
                                onClick={() => fileInputRef.current?.click()}
                                style={{ background: 'none', border: '1px dashed var(--border-color)', borderRadius: '3px', fontSize: '0.6rem', padding: '0.25rem 0.5rem', color: 'var(--text-secondary)', cursor: 'pointer' }}
                              >
                                + Add From Files
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="picker-prompt">
                            <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                            <span className="picker-text-main">Take Photo or Upload</span>
                            <span className="picker-text-sub">Mobile camera & multi-file ingest</span>
                          </div>
                        )}
                      </div>

                      {/* Hidden Native File & Camera Inputs */}
                      <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleFileChange}
                        accept="image/*"
                        multiple
                        style={{ display: 'none' }}
                      />
                      <input
                        type="file"
                        ref={cameraInputRef}
                        onChange={(e) => handleCameraNativeCapture(e, 'wardrobe')}
                        accept="image/*"
                        capture="environment"
                        style={{ display: 'none' }}
                      />

                      {bulkUploadProgress && (
                        <div style={{ backgroundColor: 'var(--accent-light)', border: '1px solid var(--border-color)', padding: '0.5rem', borderRadius: '4px', textAlign: 'center' }}>
                          <p style={{ fontSize: '0.65rem', color: 'var(--accent)', fontWeight: 'bold' }}>
                            {bulkUploadProgress}
                          </p>
                        </div>
                      )}

                      {compressionStatus && (
                        <p style={{ fontSize: '0.6rem', color: 'var(--text-muted)', textAlign: 'center', fontStyle: 'italic' }}>
                          {compressionStatus}
                        </p>
                      )}

                      <div className="form-field">
                        <label>Brand / Designer (Optional)</label>
                        <input
                          type="text"
                          value={uploadBrand}
                          onChange={(e) => setUploadBrand(e.target.value)}
                          placeholder="e.g. Chanel, McQueen"
                        />
                      </div>

                      <div className="form-field">
                        <label>Style Notes (Optional)</label>
                        <textarea
                          value={uploadNotes}
                          onChange={(e) => setUploadNotes(e.target.value)}
                          placeholder="Describe cut, textures, bouclé elements..."
                          rows={3}
                        />
                      </div>

                      <button
                        type="submit"
                        disabled={selectedFiles.length === 0 || isUploading}
                        className="accent-button"
                      >
                        {isUploading ? 'Ingesting Batch...' : 'INGEST WARDROBE'}
                      </button>
                    </form>
                  </div>
                </div>

                {/* Closet Items Grid */}
                <div className="closet-items-area">
                  {loadingWardrobe ? (
                    <div className="outfit-narrative" style={{ textAlign: 'center', border: 'none', gridColumn: '1 / -1' }}>
                      Loading wardrobe...
                    </div>
                  ) : wardrobe.length === 0 ? (
                    <div className="lookbook-panel" style={{ textAlign: 'center', gridColumn: '1 / -1' }}>
                      <h3 style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>No Garments Cataloged</h3>
                      <p style={{ fontSize: '0.8rem' }}>Upload wardrobe photos to start lookbook styling.</p>
                    </div>
                  ) : getFilteredWardrobe().length === 0 ? (
                    <div className="lookbook-panel" style={{ textAlign: 'center', gridColumn: '1 / -1' }}>
                      <h3 style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>No Matching Garments</h3>
                      <p style={{ fontSize: '0.8rem' }}>Try adjusting your search keywords or category filters.</p>
                    </div>
                  ) : (
                    getFilteredWardrobe().map((item) => (
                      <div key={item.id} className="closet-item-card">
                        
                        <div className="image-canvas">
                          <Image
                            src={item.imageUrl}
                            alt="Closet Piece"
                            fill
                            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                            style={{ objectFit: 'cover' }}
                          />
                          <div className="canvas-tag" style={{ backgroundColor: 'var(--accent)', color: '#ffffff' }}>
                            {item.category}
                          </div>
                        </div>

                        <div className="card-details-box">
                          {item.brand && (
                            <span className="item-brand">{item.brand}</span>
                          )}
                          <p className="item-rationale" style={{ lineClamp: '2', display: '-webkit-box', WebkitLineClamp: '2', WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                            {item.styleNotes || 'No styling notes.'}
                          </p>

                          <div className="card-tags">
                            {item.detectedTags.slice(0, 3).map((tag, idx) => (
                              <span key={idx} className="tag-badge">#{tag}</span>
                            ))}
                          </div>

                          {item.color.length > 0 && (
                            <div className="card-palette" style={{ marginBottom: '0.75rem' }}>
                              <span>Palette:</span>
                              <div className="color-swatch-wrapper">
                                {item.color.map((colorName, idx) => (
                                  <span
                                    key={idx}
                                    title={colorName}
                                    className="color-swatch"
                                    style={{
                                      backgroundColor: colorName.startsWith('#') ? colorName : undefined
                                    }}
                                  />
                                ))}
                              </div>
                            </div>
                          )}

                          <button
                            type="button"
                            onClick={() => handleCreateOutfitAroundItem(item)}
                            className="accent-button"
                            style={{
                              fontSize: '0.7rem',
                              padding: '0.45rem 0.5rem',
                              width: '100%',
                              marginTop: '0.5rem',
                              backgroundColor: anchorGarment?.id === item.id ? 'var(--accent-gold)' : undefined,
                              color: anchorGarment?.id === item.id ? '#000000' : undefined,
                              fontWeight: 'bold',
                            }}
                          >
                            {anchorGarment?.id === item.id ? '★ HERO ANCHOR ACTIVE' : '✨ CREATE OUTFIT AROUND ITEM'}
                          </button>

                          <div style={{ display: 'flex', justifyContent: 'flex-end', borderTop: '1px solid var(--border-color)', paddingTop: '0.5rem', marginTop: '0.5rem' }}>
                            <button
                              type="button"
                              onClick={() => handleEditGarmentClick(item)}
                              className="nav-action"
                              style={{ fontSize: '0.7rem', padding: '0.2rem 0.5rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}
                            >
                              Edit details
                            </button>
                          </div>
                        </div>

                      </div>
                    ))
                  )}
                </div>

              </div>
            ) : (
              
              /* BATCH SPREADSHEET EDITOR VIEW */
              <div className="lookbook-panel" style={{ padding: '1.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>
                  <h3 style={{ fontSize: '1.5rem' }}>Spreadsheet Bulk Editor</h3>
                  <button 
                    onClick={handleSaveBulkEdits}
                    className="accent-button"
                    style={{ width: 'auto', padding: '0.5rem 1.5rem' }}
                  >
                    Save All Changes
                  </button>
                </div>

                <div className="batch-editor-table-wrapper">
                  <table className="batch-editor-table">
                    <thead>
                      <tr>
                        <th style={{ width: '40px', textAlign: 'center' }}>
                          <input 
                            type="checkbox"
                            checked={selectedItemIds.length === getFilteredWardrobe().length && getFilteredWardrobe().length > 0}
                            onChange={(e) => handleSelectAll(e.target.checked)}
                          />
                        </th>
                        <th style={{ width: '80px' }}>Garment</th>
                        <th style={{ width: '150px' }}>Brand / Designer</th>
                        <th style={{ width: '130px' }}>Category</th>
                        <th>Style &amp; Fit Notes</th>
                        <th style={{ width: '220px' }}>Keywords / Tags</th>
                      </tr>
                    </thead>
                    <tbody>
                      {getFilteredWardrobe().map((item) => {
                        const bufferRow = editBuffer[item.id] || {
                          brand: item.brand || '',
                          category: item.category,
                          styleNotes: item.styleNotes || '',
                          tags: item.detectedTags.join(', '),
                        };

                        return (
                          <tr key={item.id}>
                            <td style={{ textAlign: 'center' }}>
                              <input 
                                type="checkbox"
                                checked={selectedItemIds.includes(item.id)}
                                onChange={(e) => handleRowSelect(item.id, e.target.checked)}
                              />
                            </td>
                            <td>
                              <Image 
                                src={item.imageUrl} 
                                alt="Garment" 
                                width={48}
                                height={60}
                                style={{ objectFit: 'cover', borderRadius: '3px' }}
                              />
                            </td>
                            <td>
                              <input
                                type="text"
                                value={bufferRow.brand}
                                onChange={(e) => handleCellChange(item.id, 'brand', e.target.value)}
                                placeholder="Add brand..."
                              />
                            </td>
                            <td>
                              <select
                                value={bufferRow.category}
                                onChange={(e) => handleCellChange(item.id, 'category', e.target.value)}
                              >
                                <option value="Outerwear">Outerwear</option>
                                <option value="Tops">Tops</option>
                                <option value="Bottoms">Bottoms</option>
                                <option value="Shoes">Shoes</option>
                                <option value="Accessories">Accessories</option>
                                <option value="Dresses">Dresses</option>
                                <option value="Knitwear">Knitwear</option>
                                <option value="Makeup">Makeup</option>
                                <option value="Jewelry">Jewelry</option>
                              </select>
                            </td>
                            <td>
                              <textarea
                                value={bufferRow.styleNotes}
                                onChange={(e) => handleCellChange(item.id, 'styleNotes', e.target.value)}
                                placeholder="Describe fit, material..."
                                rows={2}
                              />
                            </td>
                            <td>
                              <input
                                type="text"
                                value={bufferRow.tags}
                                onChange={(e) => handleCellChange(item.id, 'tags', e.target.value)}
                                placeholder="Tags (comma-separated)..."
                              />
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
              </>
            )}

          </div>
        )}

        {/* ==========================================================================
            Capsule Wardrobe & Travel Packing Assistant Tab
            ========================================================================== */}
        {activeTab === 'capsule' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
            {/* Header & Trip Launcher */}
            <div className="lookbook-panel" style={{ padding: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
              <div>
                <h3 style={{ fontSize: '1.25rem', color: 'var(--accent-gold)' }}>✈️ Travel Packing Capsule Assistant</h3>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  Synthesize an interchange capsule wardrobe (6–12 pieces) with day-by-day outfits for your upcoming trips.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowNewCapsuleModal(true)}
                className="accent-button"
                style={{ padding: '0.65rem 1.25rem' }}
              >
                ✦ New Travel Capsule
              </button>
            </div>

            {/* New Capsule Generator Modal */}
            {showNewCapsuleModal && (
              <div className="modal-overlay" style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1.5rem' }}>
                <div className="lookbook-panel" style={{ maxWidth: '540px', width: '100%', padding: '2rem', background: '#ffffff' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                    <h3 style={{ fontSize: '1.2rem', color: 'var(--accent-gold)' }}>Generate Travel Packing Capsule</h3>
                    <button type="button" onClick={() => setShowNewCapsuleModal(false)} className="nav-action" style={{ border: 'none', background: 'none', cursor: 'pointer', fontSize: '1.2rem' }}>✕</button>
                  </div>
                  <form onSubmit={handleCreateCapsuleSubmit} className="form-group-stack">
                    <div className="form-field">
                      <label>Destination City</label>
                      <input
                        type="text"
                        required
                        value={tripDestination}
                        onChange={(e) => setTripDestination(e.target.value)}
                        placeholder="e.g. Paris, France or Tokyo, Japan"
                      />
                    </div>
                    <div className="form-row-grid cols-2">
                      <div className="form-field">
                        <label>Start Date</label>
                        <input
                          type="date"
                          required
                          value={tripStartDate}
                          onChange={(e) => setTripStartDate(e.target.value)}
                        />
                      </div>
                      <div className="form-field">
                        <label>End Date</label>
                        <input
                          type="date"
                          required
                          value={tripEndDate}
                          onChange={(e) => setTripEndDate(e.target.value)}
                        />
                      </div>
                    </div>
                    <div className="form-field">
                      <label>Trip Purpose & Itinerary Vibes</label>
                      <input
                        type="text"
                        required
                        value={tripPurpose}
                        onChange={(e) => setTripPurpose(e.target.value)}
                        placeholder="e.g. Business meetings by day, Michelin dinners by night"
                      />
                    </div>
                    <div className="form-field">
                      <label>Luggage Limitation</label>
                      <select
                        value={tripLuggageType}
                        onChange={(e) => setTripLuggageType(e.target.value)}
                        className="filter-select"
                      >
                        <option value="Carry-on Only">Carry-on Only (Max 8-10 versatile garments)</option>
                        <option value="Checked Bag">Checked Luggage (12-16 garments with outerwear options)</option>
                        <option value="Weekend Duffle">Weekend Duffle (Compact 5-6 essentials)</option>
                      </select>
                    </div>
                    <div className="form-field">
                      <label>Custom Packing Notes (Optional)</label>
                      <input
                        type="text"
                        value={tripChecklistNotes}
                        onChange={(e) => setTripChecklistNotes(e.target.value)}
                        placeholder="e.g. Need walking shoes for cobblestones"
                      />
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '1rem' }}>
                      <button type="button" onClick={() => setShowNewCapsuleModal(false)} className="nav-action" style={{ background: 'none', border: 'none', cursor: 'pointer' }}>Cancel</button>
                      <button type="submit" className="accent-button" disabled={isGeneratingCapsule}>
                        {isGeneratingCapsule ? 'Synthesizing Interchange Matrix...' : '✦ Generate Capsule'}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}

            {/* Travel Capsules List & Selected Detail */}
            {loadingCapsules ? (
              <div className="lookbook-panel" style={{ padding: '3rem', textAlign: 'center' }}>Loading your travel capsules...</div>
            ) : capsules.length === 0 ? (
              <div className="lookbook-panel" style={{ padding: '3rem', textAlign: 'center' }}>
                <p style={{ color: 'var(--text-secondary)', marginBottom: '1rem' }}>No travel capsules generated yet.</p>
                <button type="button" onClick={() => setShowNewCapsuleModal(true)} className="accent-button">
                  ✦ Plan Your First Trip
                </button>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                {/* Trip Cards Selector */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '1rem' }}>
                  {capsules.map((cap) => {
                    const isSelected = selectedCapsule?.id === cap.id || (!selectedCapsule && capsules[0].id === cap.id);
                    if (isSelected && !selectedCapsule) setSelectedCapsule(cap);

                    return (
                      <div
                        key={cap.id}
                        onClick={() => setSelectedCapsule(cap)}
                        className="lookbook-panel"
                        style={{
                          padding: '1.25rem',
                          cursor: 'pointer',
                          border: isSelected ? '2px solid var(--accent-gold)' : '1px solid var(--border-color)',
                          backgroundColor: isSelected ? 'rgba(212, 175, 55, 0.04)' : '#ffffff',
                          transition: 'var(--transition-smooth)',
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                          <span style={{ fontSize: '0.65rem', textTransform: 'uppercase', color: 'var(--accent)', fontWeight: 800 }}>
                            {cap.luggageType}
                          </span>
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); handleDeleteCapsule(cap.id); }}
                            className="nav-action"
                            style={{ color: '#ef4444', border: 'none', background: 'none', cursor: 'pointer', fontSize: '0.75rem' }}
                          >
                            ✕
                          </button>
                        </div>
                        <h4 style={{ fontSize: '1.1rem', margin: '0.35rem 0' }}>{cap.destination}</h4>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'block' }}>
                          {new Date(cap.startDate).toLocaleDateString()} – {new Date(cap.endDate).toLocaleDateString()}
                        </span>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginTop: '0.25rem' }}>
                          {cap.itemIds.length} packed items • {cap.outfitSchedule?.length || 0} days
                        </span>
                      </div>
                    );
                  })}
                </div>

                {/* Selected Capsule Detailed View */}
                {selectedCapsule && (
                  <div className="lookbook-panel" style={{ padding: '2rem', display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '1rem' }}>
                      <div>
                        <span style={{ fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--accent-gold)', fontWeight: 800 }}>
                          ✦ Capsule Itinerary & Packing Matrix
                        </span>
                        <h3 style={{ fontSize: '1.5rem', margin: '0.25rem 0' }}>{selectedCapsule.destination}</h3>
                        <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                          <strong>Purpose:</strong> {selectedCapsule.tripPurpose} | <strong>Luggage:</strong> {selectedCapsule.luggageType}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => window.print()}
                        className="weather-pill-btn"
                        style={{ padding: '0.5rem 1rem' }}
                      >
                        🖨️ Print Packing List
                      </button>
                    </div>

                    {/* Stylist Rationale */}
                    {selectedCapsule.checklistNotes && (
                      <div style={{ background: 'var(--bg-surface)', padding: '1rem 1.25rem', borderRadius: '6px', borderLeft: '4px solid var(--accent-gold)' }}>
                        <strong style={{ display: 'block', fontSize: '0.8rem', marginBottom: '0.25rem', color: 'var(--text-primary)' }}>
                          Editorial Packing Strategy
                        </strong>
                        <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', margin: 0 }}>
                          {selectedCapsule.checklistNotes}
                        </p>
                      </div>
                    )}

                    {/* Packed Items Rack */}
                    <div>
                      <h4 style={{ fontSize: '1rem', marginBottom: '1rem', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                        🧳 Packing Rack ({selectedCapsule.itemIds.length} Core Pieces)
                      </h4>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: '0.75rem' }}>
                        {wardrobe.filter(w => selectedCapsule.itemIds.includes(w.id)).map(item => (
                          <div key={item.id} style={{ border: '1px solid var(--border-color)', borderRadius: '4px', padding: '0.5rem', background: '#fafafa' }}>
                            <div style={{ position: 'relative', width: '100%', height: '110px', borderRadius: '3px', overflow: 'hidden', marginBottom: '0.35rem' }}>
                              <Image src={item.imageUrl} alt={item.category} fill style={{ objectFit: 'cover' }} unoptimized />
                            </div>
                            <span style={{ fontSize: '0.7rem', fontWeight: 700, display: 'block', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              {item.brand ? `${item.brand} ` : ''}{item.category}
                            </span>
                            <span style={{ fontSize: '0.65rem', color: 'var(--text-secondary)' }}>{item.color?.join(', ')}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Day-by-Day Outfit Timeline */}
                    {selectedCapsule.outfitSchedule && selectedCapsule.outfitSchedule.length > 0 && (
                      <div>
                        <h4 style={{ fontSize: '1rem', marginBottom: '1rem', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                          📅 Daily Lookbook Schedule
                        </h4>
                        <div className="capsule-timeline">
                          {selectedCapsule.outfitSchedule.map((schedule, idx) => (
                            <div key={idx} className="capsule-day-card">
                              <div style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>
                                <span style={{ fontSize: '0.7rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--accent-gold)' }}>
                                  Day {schedule.dayNumber}
                                </span>
                                <strong style={{ display: 'block', fontSize: '0.85rem' }}>{schedule.date}</strong>
                              </div>

                              {/* Day Look */}
                              {schedule.dayLook && (
                                <div className="capsule-look-box">
                                  <span style={{ fontSize: '0.65rem', textTransform: 'uppercase', color: 'var(--accent)', fontWeight: 800, display: 'block' }}>
                                    ☀️ Morning / Daytime
                                  </span>
                                  <strong style={{ fontSize: '0.8rem', display: 'block', margin: '0.2rem 0' }}>{schedule.dayLook.title}</strong>
                                  <p style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', margin: 0 }}>{schedule.dayLook.narrative}</p>
                                </div>
                              )}

                              {/* Evening Look */}
                              {schedule.eveningLook && (
                                <div className="capsule-look-box">
                                  <span style={{ fontSize: '0.65rem', textTransform: 'uppercase', color: 'var(--accent-gold)', fontWeight: 800, display: 'block' }}>
                                    🌙 Evening / Dinner
                                  </span>
                                  <strong style={{ fontSize: '0.8rem', display: 'block', margin: '0.2rem 0' }}>{schedule.eveningLook.title}</strong>
                                  <p style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', margin: 0 }}>{schedule.eveningLook.narrative}</p>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ==========================================================================
            Editorial Flat-Lay Canvas Studio Tab
            ========================================================================== */}
        {activeTab === 'studio' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            {/* Studio Header */}
            <div className="lookbook-panel" style={{ padding: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
              <div>
                <h3 style={{ fontSize: '1.25rem', color: 'var(--accent-gold)' }}>🎨 Editorial Flat-Lay Canvas Studio</h3>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  Drag, layer, scale, and rotate garments from your wardrobe and inspiration moodboards to compose editorial magazine spreads.
                </p>
              </div>
              <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                <input
                  type="text"
                  value={collageTitle}
                  onChange={(e) => setCollageTitle(e.target.value)}
                  placeholder="Lookbook Spread Title"
                  style={{ padding: '0.5rem 0.75rem', fontSize: '0.8rem', borderRadius: '4px', border: '1px solid var(--border-color)', width: '220px' }}
                />
                <button
                  type="button"
                  onClick={handleSaveCollageSubmit}
                  disabled={isSavingCollage || canvasItems.length === 0}
                  className="accent-button"
                  style={{ padding: '0.5rem 1rem' }}
                >
                  {isSavingCollage ? 'Saving...' : '💾 Save Spread'}
                </button>
              </div>
            </div>

            {/* Studio Workspace */}
            <div className="flatlay-studio-container">
              {/* Sidebar Closet & Inspiration Selector */}
              <div className="flatlay-sidebar">
                <h4 style={{ fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.75rem', color: 'var(--text-primary)' }}>
                  Add to Canvas
                </h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                  {wardrobe.map((item) => (
                    <div
                      key={item.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        padding: '0.4rem',
                        border: '1px solid var(--border-color)',
                        borderRadius: '4px',
                        background: '#fafafa',
                      }}
                    >
                      <div style={{ position: 'relative', width: '38px', height: '38px', borderRadius: '3px', overflow: 'hidden', flexShrink: 0 }}>
                        <Image src={item.imageUrl} alt={item.category} fill style={{ objectFit: 'cover' }} unoptimized />
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <span style={{ fontSize: '0.7rem', fontWeight: 700, display: 'block', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {item.brand ? `${item.brand} ` : ''}{item.category}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleAddItemToCanvas(item)}
                        className="weather-pill-btn"
                        style={{ padding: '0.2rem 0.5rem', fontSize: '0.65rem' }}
                      >
                        + Add
                      </button>
                    </div>
                  ))}
                  {inspirations.map((ins) => (
                    <div
                      key={ins.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        padding: '0.4rem',
                        border: '1px solid var(--border-color)',
                        borderRadius: '4px',
                        background: '#fafafa',
                      }}
                    >
                      <div style={{ position: 'relative', width: '38px', height: '38px', borderRadius: '3px', overflow: 'hidden', flexShrink: 0 }}>
                        <Image src={ins.imageUrl} alt="Inspiration" fill style={{ objectFit: 'cover' }} unoptimized />
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <span style={{ fontSize: '0.7rem', fontWeight: 700, display: 'block', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          Inspiration Snap
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleAddItemToCanvas(ins)}
                        className="weather-pill-btn"
                        style={{ padding: '0.2rem 0.5rem', fontSize: '0.65rem' }}
                      >
                        + Add
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Main Interactive Flat-Lay Canvas */}
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {/* Canvas Controls Toolbar */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem', background: '#fafafa', padding: '0.5rem 0.75rem', borderRadius: '4px', border: '1px solid var(--border-color)' }}>
                  <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.7rem', fontWeight: 700 }}>Transform:</span>
                    <button
                      type="button"
                      disabled={!selectedCanvasItemId}
                      onClick={() => {
                        const item = canvasItems.find(i => i.id === selectedCanvasItemId);
                        if (item) handleUpdateCanvasItemTransform(Math.min(item.scale + 0.15, 2.5), item.rotation);
                      }}
                      className="weather-pill-btn"
                    >
                      Scale +
                    </button>
                    <button
                      type="button"
                      disabled={!selectedCanvasItemId}
                      onClick={() => {
                        const item = canvasItems.find(i => i.id === selectedCanvasItemId);
                        if (item) handleUpdateCanvasItemTransform(Math.max(item.scale - 0.15, 0.4), item.rotation);
                      }}
                      className="weather-pill-btn"
                    >
                      Scale -
                    </button>
                    <button
                      type="button"
                      disabled={!selectedCanvasItemId}
                      onClick={() => {
                        const item = canvasItems.find(i => i.id === selectedCanvasItemId);
                        if (item) handleUpdateCanvasItemTransform(item.scale, item.rotation - 15);
                      }}
                      className="weather-pill-btn"
                    >
                      ↺ Rotate
                    </button>
                    <button
                      type="button"
                      disabled={!selectedCanvasItemId}
                      onClick={() => {
                        const item = canvasItems.find(i => i.id === selectedCanvasItemId);
                        if (item) handleUpdateCanvasItemTransform(item.scale, item.rotation + 15);
                      }}
                      className="weather-pill-btn"
                    >
                      ↻ Rotate
                    </button>
                    <button
                      type="button"
                      disabled={!selectedCanvasItemId}
                      onClick={() => selectedCanvasItemId && handleBringCanvasItemForward(selectedCanvasItemId)}
                      className="weather-pill-btn"
                    >
                      Bring to Front
                    </button>
                  </div>
                  <div style={{ display: 'flex', gap: '0.4rem' }}>
                    <button
                      type="button"
                      disabled={!selectedCanvasItemId}
                      onClick={() => selectedCanvasItemId && handleRemoveCanvasItem(selectedCanvasItemId)}
                      className="nav-action"
                      style={{ color: '#ef4444', fontSize: '0.7rem', background: 'none', border: 'none', cursor: 'pointer' }}
                    >
                      Remove Item
                    </button>
                    <button
                      type="button"
                      onClick={() => setCanvasItems([])}
                      className="nav-action"
                      style={{ fontSize: '0.7rem', background: 'none', border: 'none', cursor: 'pointer' }}
                    >
                      Clear Canvas
                    </button>
                  </div>
                </div>

                {/* Canvas Surface */}
                <div
                  className="flatlay-canvas-stage"
                  onClick={() => setSelectedCanvasItemId(null)}
                >
                  {canvasItems.length === 0 ? (
                    <div style={{ display: 'flex', height: '100%', alignItems: 'center', justifyContent: 'center', color: 'rgba(255,255,255,0.4)', fontSize: '0.85rem' }}>
                      Click &quot;+ Add&quot; on items from your closet to position them on the canvas.
                    </div>
                  ) : (
                    canvasItems.map((elem) => {
                      const isSelected = selectedCanvasItemId === elem.id;

                      return (
                        <div
                          key={elem.id}
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedCanvasItemId(elem.id);
                          }}
                          className={`flatlay-element ${isSelected ? 'selected' : ''}`}
                          style={{
                            left: `${elem.x}px`,
                            top: `${elem.y}px`,
                            transform: `scale(${elem.scale}) rotate(${elem.rotation}deg)`,
                            zIndex: elem.zIndex,
                            width: '130px',
                            height: '130px',
                          }}
                          draggable
                          onDragEnd={(e) => {
                            const rect = e.currentTarget.parentElement?.getBoundingClientRect();
                            if (rect) {
                              const newX = Math.max(10, Math.min(rect.width - 140, e.clientX - rect.left - 65));
                              const newY = Math.max(10, Math.min(rect.height - 140, e.clientY - rect.top - 65));
                              setCanvasItems((prev) =>
                                prev.map((item) => (item.id === elem.id ? { ...item, x: newX, y: newY } : item))
                              );
                            }
                          }}
                        >
                          <div style={{ position: 'relative', width: '100%', height: '100%', borderRadius: '4px', overflow: 'hidden', boxShadow: '0 8px 20px rgba(0,0,0,0.4)' }}>
                            <Image src={elem.imageUrl} alt={elem.label} fill style={{ objectFit: 'cover' }} unoptimized />
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>

            {/* Saved Lookbook Spreads Gallery */}
            {loadingCollages ? (
              <div className="lookbook-panel" style={{ padding: '1.5rem', textAlign: 'center' }}>Loading saved spreads...</div>
            ) : collages.length > 0 && (
              <div className="lookbook-panel" style={{ padding: '1.5rem' }}>
                <h4 style={{ fontSize: '1rem', marginBottom: '1rem', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                  📖 Saved Lookbook Spreads
                </h4>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '1rem' }}>
                  {collages.map((c) => (
                    <div key={c.id} style={{ border: '1px solid var(--border-color)', borderRadius: '6px', padding: '0.75rem', background: '#fafafa' }}>
                      <h5 style={{ fontSize: '0.85rem', margin: '0 0 0.5rem 0' }}>{c.title}</h5>
                      <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.5rem' }}>
                        {c.canvasData?.length || 0} styled elements
                      </span>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <button
                          type="button"
                          onClick={() => {
                            setCanvasItems(c.canvasData);
                            setCollageTitle(c.title);
                            showToast(`Loaded spread: ${c.title}`);
                          }}
                          className="weather-pill-btn"
                          style={{ fontSize: '0.65rem' }}
                        >
                          Load to Stage
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteCollage(c.id)}
                          className="nav-action"
                          style={{ color: '#ef4444', fontSize: '0.7rem', background: 'none', border: 'none', cursor: 'pointer' }}
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Ingest channels tab */}
        {activeTab === 'trends' && (
          <div className="ingest-layout-grid">
            
            {/* Left Column: RSS/Trend feeds configuration */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem', minWidth: 0, width: '100%', boxSizing: 'border-box' }}>
              
              {/* Add Feed Source */}
              <div className="lookbook-panel" style={{ padding: '1.5rem' }}>
                <h3 style={{ fontSize: '1.35rem', marginBottom: '1.25rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>
                  Add Feed Source
                </h3>
                
                <form onSubmit={handleAddFeed} className="form-group-stack">
                  <div className="form-field">
                    <label>Feed Name</label>
                    <input
                      type="text"
                      required
                      value={newFeedName}
                      onChange={(e) => setNewFeedName(e.target.value)}
                      placeholder="e.g. Magasin Substack"
                    />
                  </div>

                  <div className="form-field">
                    <label>{newFeedType === 'instagram' ? 'Instagram Handle / Account' : 'RSS Feed URL'}</label>
                    <input
                      type={newFeedType === 'instagram' ? 'text' : 'url'}
                      required
                      value={newFeedUrl}
                      onChange={(e) => setNewFeedUrl(e.target.value)}
                      placeholder={newFeedType === 'instagram' ? 'e.g. @chanelofficial or alexandermcqueen' : 'https://...'}
                    />
                  </div>

                  <div className="form-row-grid cols-2">
                    <div className="form-field">
                      <label>Feed Classification</label>
                      <select
                        value={newFeedType}
                        onChange={(e) => setNewFeedType(e.target.value)}
                      >
                        <option value="rss">RSS / Newsletter feed</option>
                        <option value="instagram">Instagram Account</option>
                        <option value="youtube">YouTube Video source</option>
                        <option value="substack">Substack feed</option>
                      </select>
                    </div>

                    <div className="form-field">
                      <label>Category</label>
                      <select
                        value={newFeedCategory}
                        onChange={(e) => setNewFeedCategory(e.target.value)}
                      >
                        <option value="Editorial Substacks">Editorial Substacks</option>
                        <option value="Luxury &amp; Haute Couture">Luxury &amp; Haute Couture</option>
                        <option value="Contemporary Style">Contemporary Style</option>
                        <option value="Streetwear &amp; Contemporary">Streetwear &amp; Contemporary</option>
                        <option value="Minimalism &amp; Sustainable">Minimalism &amp; Sustainable</option>
                        <option value="Custom Feeds">Custom Feeds</option>
                      </select>
                    </div>
                  </div>

                  <button type="submit" className="accent-button" style={{ width: '100%', minHeight: '44px' }}>
                    ADD INSPIRATION CHANNEL
                  </button>
                </form>
              </div>

              {/* List channels */}
              <div className="lookbook-panel" style={{ padding: '1.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                  <h3 style={{ fontSize: '1.35rem' }}>
                    Curated Fashion Channels
                  </h3>
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                    {feeds.filter(f => f.isSubscribed && !f.isMuted).length} active on your radar
                  </span>
                </div>

                {/* Feed Category Filter Pills */}
                <div className="category-filter-bar">
                  {['All', 'Editorial Substacks', 'Luxury & Haute Couture', 'Contemporary Style', 'Streetwear & Contemporary', 'Custom Feeds'].map((cat) => (
                    <button
                      key={cat}
                      type="button"
                      className={`filter-tab-btn ${feedCategoryFilter === cat ? 'active' : ''}`}
                      onClick={() => setFeedCategoryFilter(cat)}
                      style={{ fontSize: '0.65rem', padding: '0.3rem 0.6rem', whiteSpace: 'nowrap' }}
                    >
                      {cat}
                    </button>
                  ))}
                </div>

                {loadingFeeds ? (
                  <div style={{ textAlign: 'center', fontSize: '0.8rem', color: 'var(--text-muted)', padding: '2rem 0' }}>
                    Loading active sources...
                  </div>
                ) : feeds.length === 0 ? (
                  <p style={{ textAlign: 'center', fontStyle: 'italic', padding: '2rem 0', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                    No inspiration sources configured.
                  </p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    {feeds
                      .filter(feed => feedCategoryFilter === 'All' || feed.category === feedCategoryFilter)
                      .map((feed) => (
                      <div key={feed.id} className="ingest-item-row" style={{ opacity: feed.isSubscribed ? (feed.isMuted ? 0.6 : 1) : 0.45 }}>
                        <div className="ingest-item-meta">
                          <div className="ingest-item-header">
                            <span className={`ingest-item-title ${feed.isMuted ? 'muted' : ''}`}>
                              {feed.name}
                            </span>
                            <span className="feed-category-pill">{feed.category || 'General'}</span>
                            <span className="ingest-type-badge">{feed.type === 'instagram' ? '📸 Instagram' : feed.type}</span>
                            {feed.isCustom && (
                              <span style={{ fontSize: '0.55rem', color: 'var(--accent)', fontWeight: 700, textTransform: 'uppercase' }}>• Custom</span>
                            )}
                          </div>
                          <span className="ingest-item-url">{feed.url}</span>
                        </div>

                        <div className="ingest-actions">
                          {feed.isSubscribed ? (
                            <>
                              <label className="mute-toggle">
                                <input
                                  type="checkbox"
                                  checked={feed.isMuted}
                                  onChange={() => handleToggleMute(feed.id, feed.isMuted)}
                                  style={{ marginRight: '4px' }}
                                />
                                Mute
                              </label>
                              <button
                                type="button"
                                onClick={() => handleToggleSubscribe(feed.id, true)}
                                className="nav-action"
                                style={{ fontSize: '0.7rem', padding: '0.25rem 0.5rem', border: '1px solid var(--border-color)', borderRadius: '3px' }}
                                title="Unsubscribe from this feed"
                              >
                                Unsubscribe
                              </button>
                            </>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleToggleSubscribe(feed.id, false)}
                              className="accent-button"
                              style={{ width: 'auto', fontSize: '0.65rem', padding: '0.25rem 0.6rem' }}
                            >
                              ➕ Subscribe
                            </button>
                          )}

                          {feed.isCustom && (
                            <button
                              type="button"
                              onClick={() => handleDeleteFeed(feed.id)}
                              className="delete-action-btn"
                              style={{ fontSize: '0.7rem', padding: '0.25rem 0.5rem' }}
                            >
                              Delete
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

            </div>

            {/* Right Column: Visual Inspiration Board Uploads & Grid Gallery */}
            <div style={{ minWidth: 0, width: '100%', boxSizing: 'border-box' }}>
              <div className="lookbook-panel" style={{ padding: '1.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                  <div>
                    <h3 style={{ fontSize: '1.35rem' }}>
                      Visual Inspiration Moodboard ({inspirations.length})
                    </h3>
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                      Snap photos of garments on shop racks, street outfits, or magazine lookbooks. Gemini Vision auto-analyzes cuts, fabrics, and aesthetics to steer your AI Stylist.
                    </p>
                  </div>
                </div>

                {/* Upload Zone */}
                <form onSubmit={handleUploadInspirationSubmit} style={{ border: '1px dashed var(--border-color)', padding: '1.25rem', borderRadius: '4px', background: 'rgba(255,255,255,0.01)', marginBottom: '1.5rem', width: '100%', boxSizing: 'border-box' }}>
                  <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
                    <button
                      type="button"
                      onClick={() => openCameraViewfinder('inspiration')}
                      className="camera-action-btn primary"
                      style={{ padding: '0.5rem 0.85rem' }}
                    >
                      <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      <span>📸 Snap Photo (Camera)</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => inspirationFileInputRef.current?.click()}
                      className="camera-action-btn"
                      style={{ padding: '0.5rem 0.85rem' }}
                    >
                      <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      <span>🖼️ Photo Library</span>
                    </button>

                    <input
                      type="file"
                      ref={inspirationFileInputRef}
                      id="inspiration-file-input"
                      accept="image/*"
                      multiple
                      onChange={handleInspirationFileSelect}
                      style={{ display: 'none' }}
                    />
                    <input
                      type="file"
                      ref={inspirationCameraInputRef}
                      accept="image/*"
                      capture="environment"
                      onChange={(e) => handleCameraNativeCapture(e, 'inspiration')}
                      style={{ display: 'none' }}
                    />
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem', width: '100%', boxSizing: 'border-box' }}>
                    <div className="form-field">
                      <label>Notes / Context (Optional)</label>
                      <input
                        type="text"
                        value={insCustomNotes}
                        onChange={(e) => setInsCustomNotes(e.target.value)}
                        placeholder="e.g. Vintage leather biker jacket in boutique, love the oversized collar"
                        style={{ width: '100%', boxSizing: 'border-box' }}
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={isUploadingInspiration || inspirationFiles.length === 0}
                      className="accent-button"
                      style={{ width: '100%', minHeight: '44px', marginTop: 0 }}
                    >
                      {isUploadingInspiration ? 'INGESTING...' : `ADD TO MOODBOARD (${inspirationFiles.length})`}
                    </button>
                  </div>

                  {inspirationPreviewUrls.length > 0 && (
                    <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginTop: '1rem', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '0.75rem' }}>
                      {inspirationPreviewUrls.map((url, idx) => (
                        <div key={idx} style={{ position: 'relative', width: '60px', height: '60px', border: '1px solid var(--border-color)', borderRadius: '3px', overflow: 'hidden' }}>
                          <Image src={url} alt="preview" fill style={{ objectFit: 'cover' }} unoptimized />
                          <button
                            type="button"
                            onClick={() => handleRemoveInspirationPreviewFile(idx)}
                            style={{ position: 'absolute', top: 2, right: 2, background: 'rgba(24,24,26,0.75)', color: '#fff', border: 'none', borderRadius: '50%', width: 16, height: 16, cursor: 'pointer', fontSize: '9px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                            title="Remove preview"
                          >
                            ✕
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </form>

                {/* Moodboard Tag Filter Bar */}
                {inspirations.length > 0 && (() => {
                  const uniqueTags = Array.from(new Set(inspirations.flatMap((ins) => ins.tags || []))).filter(Boolean);
                  if (uniqueTags.length === 0) return null;
                  return (
                    <div className="moodboard-filter-bar">
                      <button
                        type="button"
                        className={`moodboard-chip ${inspirationTagFilter === 'All' ? 'active' : ''}`}
                        onClick={() => setInspirationTagFilter('All')}
                      >
                        All Snaps ({inspirations.length})
                      </button>
                      {uniqueTags.map((tag) => (
                        <button
                          key={tag}
                          type="button"
                          className={`moodboard-chip ${inspirationTagFilter === tag ? 'active' : ''}`}
                          onClick={() => setInspirationTagFilter(tag)}
                        >
                          #{tag}
                        </button>
                      ))}
                    </div>
                  );
                })()}

                {/* Gallery List */}
                {loadingInspirations ? (
                  <div style={{ textAlign: 'center', padding: '3rem 0', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                    Loading visual board...
                  </div>
                ) : inspirations.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '4rem 2rem', border: '1px dashed rgba(255,255,255,0.05)', background: 'rgba(0,0,0,0.1)', borderRadius: '4px', color: 'var(--text-muted)' }}>
                    <p style={{ fontSize: '0.85rem', fontWeight: 'bold' }}>Visual Moodboard Empty</p>
                    <p style={{ fontSize: '0.75rem', marginTop: '4px' }}>Use your phone camera or the snap button above to capture garments on shop racks, magazine pages, or street styles.</p>
                  </div>
                ) : (
                  <div className="moodboard-gallery-grid">
                    {inspirations
                      .filter((ins) => inspirationTagFilter === 'All' || (ins.tags && ins.tags.includes(inspirationTagFilter)))
                      .map((ins) => (
                      <div key={ins.id} className="garment-card" style={{ display: 'flex', flexDirection: 'column', height: 'auto', padding: '0.5rem', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-color)', cursor: 'pointer' }}>
                        <div
                          style={{ position: 'relative', width: '100%', height: '140px', borderRadius: '3px', overflow: 'hidden' }}
                          onClick={() => setSelectedInspirationLightbox(ins)}
                          title="Click to expand full inspiration details"
                        >
                          <Image
                            src={ins.imageUrl}
                            alt="Visual Inspiration"
                            fill
                            style={{ objectFit: 'cover' }}
                            unoptimized
                          />
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteInspiration(ins.id);
                            }}
                            style={{
                              position: 'absolute',
                              top: '5px',
                              right: '5px',
                              background: 'rgba(220, 38, 38, 0.85)',
                              color: '#fff',
                              border: 'none',
                              borderRadius: '3px',
                              width: '24px',
                              height: '24px',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: '0.75rem',
                              fontWeight: 'bold',
                              zIndex: 5
                            }}
                            title="Delete inspiration"
                          >
                            ✕
                          </button>
                        </div>
                        <div
                          style={{ padding: '0.4rem 0.25rem 0.25rem 0.25rem', flex: '1', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}
                          onClick={() => setSelectedInspirationLightbox(ins)}
                        >
                          <p style={{ fontSize: '0.75rem', lineHeight: '1.25', margin: 0, color: 'var(--text-muted)' }}>
                            {ins.notes || 'Visual Vibe'}
                          </p>
                          {ins.tags.length > 0 && (
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '3px', marginTop: 'auto', paddingTop: '0.4rem' }}>
                              {ins.tags.map((t, tIdx) => (
                                <span key={tIdx} style={{ fontSize: '0.55rem', padding: '1px 4px', background: 'rgba(212, 175, 55, 0.1)', color: 'var(--accent-gold)', borderRadius: '2px', textTransform: 'uppercase', letterSpacing: '0.02em' }}>
                                  #{t}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

          </div>
        )}

        {/* Account / Sizing Profile tab */}
        {activeTab === 'account' && user && (() => {
          const { userCroquis, avgCroquis } = getCroquisPath();
          return (
            <div className="auth-panel-wrapper" style={{ maxWidth: '1200px', margin: '0 auto' }}>
              <div className="account-profile-grid">
                
                {/* Left Column: Interactive Stacked Form */}
                <div className="lookbook-panel" style={{ padding: '2rem' }}>
                  
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '1rem', marginBottom: '2rem' }}>
                    <div>
                      <h3 style={{ fontSize: '1.75rem' }}>Sizing &amp; Style Profile</h3>
                      <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        Configure your measurements to customize Gemini outfit personalization.
                      </p>
                    </div>
                    <button onClick={handleLogout} className="delete-action-btn" style={{ border: '1px solid rgba(225, 29, 72, 0.2)', padding: '0.4rem 0.8rem', borderRadius: '4px' }}>
                      Sign Out
                    </button>
                  </div>

                  <form onSubmit={handleSaveProfile} className="form-group-stack">
                    
                    {/* Part 1 */}
                    <div className="form-group-stack" style={{ gap: '1rem' }}>
                      <h4 style={{ fontSize: '1.15rem', color: 'var(--accent)', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.25rem' }}>
                        1. Contact Details
                      </h4>
                      <div className="form-group-stack" style={{ gap: '1rem', maxWidth: '400px' }}>
                        <div className="form-field">
                          <label>Full Name</label>
                          <input
                            type="text"
                            required
                            value={profName}
                            onChange={(e) => setProfName(e.target.value)}
                          />
                        </div>
                        <div className="form-field">
                          <label>Email Address</label>
                          <input
                            type="email"
                            disabled
                            value={user.email}
                            style={{ opacity: 0.6, cursor: 'not-allowed' }}
                          />
                        </div>
                        <div className="form-field">
                          <label>Phone / Mobile Number</label>
                          <input
                            type="text"
                            value={profPhone}
                            onChange={(e) => setProfPhone(e.target.value)}
                            placeholder="e.g. +1 555-0199"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Part 2 */}
                    <div className="form-group-stack" style={{ gap: '1.25rem', marginTop: '1.5rem' }}>
                      <h4 style={{ fontSize: '1.15rem', color: 'var(--accent)', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.25rem' }}>
                        2. Sizing &amp; Measurements
                      </h4>

                      <div className="form-group-stack" style={{ gap: '1.25rem', maxWidth: '400px' }}>
                        
                        <div className="form-field">
                          <label>Biological Sex</label>
                          <select
                            value={profSex}
                            onChange={(e) => setProfSex(e.target.value)}
                          >
                            <option value="Female">Female</option>
                            <option value="Male">Male</option>
                            <option value="Other">Other</option>
                          </select>
                        </div>

                        {/* Height Unit */}
                        <div className="form-field">
                          <label>Height Unit</label>
                          <select value={heightUnit} onChange={(e) => setHeightUnit(e.target.value as 'cm' | 'ftin')}>
                            <option value="cm">Metric (cm)</option>
                            <option value="ftin">Imperial (ft/in)</option>
                          </select>
                        </div>

                        {/* Height Value */}
                        {heightUnit === 'cm' ? (
                          <div className="form-field">
                            <label>Height (cm)</label>
                            <input
                              type="number"
                              value={heightCm}
                              onChange={(e) => setHeightCm(e.target.value)}
                              placeholder="e.g. 175"
                              min="50"
                              max="250"
                            />
                          </div>
                        ) : (
                          <div className="form-field">
                            <label>Height (Feet / Inches)</label>
                            <div style={{ display: 'flex', gap: '0.5rem' }}>
                              <input
                                type="number"
                                value={heightFt}
                                onChange={(e) => setHeightFt(e.target.value)}
                                placeholder="ft"
                                style={{ width: '50%' }}
                                min="2"
                                max="8"
                              />
                              <input
                                type="number"
                                value={heightIn}
                                onChange={(e) => setHeightIn(e.target.value)}
                                placeholder="in"
                                style={{ width: '50%' }}
                                min="0"
                                max="11"
                              />
                            </div>
                          </div>
                        )}

                        {/* Weight Unit */}
                        <div className="form-field">
                          <label>Weight Unit</label>
                          <select value={weightUnit} onChange={(e) => setWeightUnit(e.target.value as 'kg' | 'lbs' | 'st')}>
                            <option value="kg">Metric (kg)</option>
                            <option value="lbs">Imperial (lbs)</option>
                            <option value="st">UK Imperial (stones)</option>
                          </select>
                        </div>

                        {/* Weight Value */}
                        {weightUnit === 'kg' && (
                          <div className="form-field">
                            <label>Weight (kg)</label>
                            <input
                              type="number"
                              value={weightKg}
                              onChange={(e) => setWeightKg(e.target.value)}
                              placeholder="e.g. 62"
                              min="20"
                              max="300"
                        />
                          </div>
                        )}
                        {weightUnit === 'lbs' && (
                          <div className="form-field">
                            <label>Weight (lbs)</label>
                            <input
                              type="number"
                              value={weightLbs}
                              onChange={(e) => setWeightLbs(e.target.value)}
                              placeholder="e.g. 135"
                              min="40"
                              max="600"
                            />
                          </div>
                        )}
                        {weightUnit === 'st' && (
                          <div className="form-field">
                            <label>Weight (Stones &amp; lbs)</label>
                            <div style={{ display: 'flex', gap: '0.5rem' }}>
                              <input
                                type="number"
                                value={weightStValue}
                                onChange={(e) => setWeightStValue(e.target.value)}
                                placeholder="st"
                                style={{ width: '50%' }}
                                min="1"
                                max="50"
                              />
                              <input
                                type="number"
                                value={weightStLbs}
                                onChange={(e) => setWeightStLbs(e.target.value)}
                                placeholder="lbs"
                                style={{ width: '50%' }}
                                min="0"
                                max="13"
                              />
                            </div>
                          </div>
                        )}

                        {/* Waist Unit */}
                        <div className="form-field">
                          <label>Waist Unit</label>
                          <select value={waistUnit} onChange={(e) => setWaistUnit(e.target.value as 'in' | 'cm')}>
                            <option value="in">Inches (in)</option>
                            <option value="cm">Centimeters (cm)</option>
                          </select>
                        </div>

                        {/* Waist Size */}
                        <div className="form-field">
                          <label>Waist Size ({waistUnit})</label>
                          <input
                            type="number"
                            value={waistVal}
                            onChange={(e) => setWaistVal(e.target.value)}
                            placeholder={waistUnit === 'in' ? 'e.g. 28' : 'e.g. 71'}
                            min="10"
                            max="200"
                          />
                        </div>

                        {/* Bra Size (Female only) */}
                        {profSex === 'Female' && (
                          <div className="form-field">
                            <label>Bra Size</label>
                            <input
                              type="text"
                              value={profBra}
                              onChange={(e) => setProfBra(e.target.value)}
                              placeholder="e.g. 32C"
                            />
                          </div>
                        )}

                        {/* Shoe Sizing System */}
                        <div className="form-field">
                          <label>Shoe Sizing System</label>
                          <select value={shoeSystem} onChange={(e) => setShoeSystem(e.target.value as 'EU' | 'UK' | 'USW' | 'USM')}>
                            <option value="EU">European (EU)</option>
                            <option value="UK">United Kingdom (UK)</option>
                            <option value="USW">US Women (US W)</option>
                            <option value="USM">US Men (US M)</option>
                          </select>
                        </div>

                        {/* Shoe Size */}
                        <div className="form-field">
                          <label>Shoe Size ({shoeSystem})</label>
                          <select value={shoeVal} onChange={(e) => setShoeVal(e.target.value)}>
                            <option value="">Select size...</option>
                            {shoeSystem === 'EU' && [35, 36, 37, 37.5, 38, 38.5, 39, 40, 41, 42, 43, 44, 45, 46, 47, 48].map(s => (
                              <option key={s} value={s}>{s}</option>
                            ))}
                            {shoeSystem === 'UK' && [2, 3, 4, 4.5, 5, 5.5, 6, 6.5, 7, 7.5, 8, 8.5, 9, 10, 11, 12, 13].map(s => (
                              <option key={s} value={s}>{s}</option>
                            ))}
                            {shoeSystem === 'USW' && [4, 5, 6, 6.5, 7, 7.5, 8, 8.5, 9, 9.5, 10, 10.5, 11, 12, 13].map(s => (
                              <option key={s} value={s}>{s}</option>
                            ))}
                            {shoeSystem === 'USM' && [6, 7, 8, 8.5, 9, 9.5, 10, 10.5, 11, 11.5, 12, 13, 14, 15].map(s => (
                              <option key={s} value={s}>{s}</option>
                            ))}
                          </select>
                        </div>

                        {/* Clothing System */}
                        <div className="form-field">
                          <label>Clothing / Dress System</label>
                          <select value={clothingSystem} onChange={(e) => setClothingSystem(e.target.value as 'EU' | 'UK' | 'US' | 'Letter')}>
                            <option value="UK">United Kingdom (UK)</option>
                            <option value="EU">European (EU)</option>
                            <option value="US">United States (US)</option>
                            <option value="Letter">Generic (XS/S/M/L)</option>
                          </select>
                        </div>

                        {/* Clothing Size */}
                        <div className="form-field">
                          <label>Clothing Size ({clothingSystem})</label>
                          <select value={clothingVal} onChange={(e) => setClothingVal(e.target.value)}>
                            <option value="">Select size...</option>
                            {clothingSystem === 'UK' && [4, 6, 8, 10, 12, 14, 16, 18, 20].map(s => (
                              <option key={s} value={s}>{s}</option>
                            ))}
                            {clothingSystem === 'EU' && [32, 34, 36, 38, 40, 42, 44, 46, 48].map(s => (
                              <option key={s} value={s}>{s}</option>
                            ))}
                            {clothingSystem === 'US' && [0, 2, 4, 6, 8, 10, 12, 14, 16].map(s => (
                              <option key={s} value={s}>{s}</option>
                            ))}
                            {clothingSystem === 'Letter' && ['XXS', 'XS', 'S', 'M', 'L', 'XL', 'XXL'].map(s => (
                              <option key={s} value={s}>{s}</option>
                            ))}
                          </select>
                        </div>

                        {/* Hat System */}
                        <div className="form-field">
                          <label>Hat Sizing System</label>
                          <select value={hatSystem} onChange={(e) => setHatSystem(e.target.value as 'cm' | 'US' | 'Letter')}>
                            <option value="cm">Metric (cm)</option>
                            <option value="US">Imperial (US Inches)</option>
                            <option value="Letter">Generic (XS/S/M/L)</option>
                          </select>
                        </div>

                        {/* Hat Size */}
                        <div className="form-field">
                          <label>Hat Size ({hatSystem})</label>
                          {hatSystem === 'Letter' ? (
                            <select value={hatVal} onChange={(e) => setHatVal(e.target.value)}>
                              <option value="">Select size...</option>
                              {['S', 'M', 'L', 'XL'].map(s => (
                                <option key={s} value={s}>{s}</option>
                              ))}
                            </select>
                          ) : hatSystem === 'US' ? (
                            <select value={hatVal} onChange={(e) => setHatVal(e.target.value)}>
                              <option value="">Select size...</option>
                              {['6 1/2', '6 5/8', '6 3/4', '6 7/8', '7', '7 1/8', '7 1/4', '7 3/8', '7 1/2', '7 5/8', '7 3/4'].map(s => (
                                <option key={s} value={s}>{s}</option>
                              ))}
                            </select>
                          ) : (
                            <input
                              type="number"
                              value={hatVal}
                              onChange={(e) => setHatVal(e.target.value)}
                              placeholder="e.g. 57"
                              min="40"
                              max="70"
                            />
                          )}
                        </div>

                        {/* Glove System */}
                        <div className="form-field">
                          <label>Glove Sizing System</label>
                          <select value={gloveSystem} onChange={(e) => setGloveSystem(e.target.value as 'EU' | 'Letter')}>
                            <option value="EU">European (Half Inches)</option>
                            <option value="Letter">Generic (XS/S/M/L)</option>
                          </select>
                        </div>

                        {/* Glove Size */}
                        <div className="form-field">
                          <label>Glove Size ({gloveSystem})</label>
                          {gloveSystem === 'Letter' ? (
                            <select value={gloveVal} onChange={(e) => setGloveVal(e.target.value)}>
                              <option value="">Select size...</option>
                              {['S', 'M', 'L', 'XL'].map(s => (
                                <option key={s} value={s}>{s}</option>
                              ))}
                            </select>
                          ) : (
                            <select value={gloveVal} onChange={(e) => setGloveVal(e.target.value)}>
                              <option value="">Select size...</option>
                              {['6', '6.5', '7', '7.5', '8', '8.5', '9', '9.5', '10'].map(s => (
                                <option key={s} value={s}>{s}</option>
                              ))}
                            </select>
                          )}
                        </div>

                      </div>
                    </div>

                    {/* Part 3: Style DNA & Aesthetic Archetype */}
                    <div className="form-group-stack" style={{ gap: '1.25rem', marginTop: '1.5rem' }}>
                      <div style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>
                        <h4 style={{ fontSize: '1.15rem', color: 'var(--accent)', marginBottom: '0.25rem' }}>
                          3. Style DNA &amp; Aesthetic Archetype
                        </h4>
                        <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                          Define your unique styling philosophy, design rules, and brand universe so Gemini recommendations match your personal taste.
                        </p>
                      </div>

                      <div className="form-field" style={{ maxWidth: '600px' }}>
                        <label>Select Aesthetic Archetype</label>
                        <div className="style-archetype-chips">
                          {STYLE_ARCHETYPES.map((arch) => (
                            <button
                              type="button"
                              key={arch.id}
                              className={`style-chip ${profStyleAesthetic === arch.label ? 'active' : ''}`}
                              onClick={() => setProfStyleAesthetic(arch.label)}
                              title={arch.desc}
                            >
                              {arch.label}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="form-field" style={{ maxWidth: '600px' }}>
                        <label>Custom Style Aesthetic / Narrative</label>
                        <input
                          type="text"
                          value={profStyleAesthetic}
                          onChange={(e) => setProfStyleAesthetic(e.target.value)}
                          placeholder="e.g. Minimalist Quiet Luxury with Architectural Silhouettes"
                        />
                      </div>

                      <div className="form-field" style={{ maxWidth: '600px' }}>
                        <label>Favorite Brands &amp; Designers</label>
                        <input
                          type="text"
                          value={profFavoriteBrands}
                          onChange={(e) => setProfFavoriteBrands(e.target.value)}
                          placeholder="e.g. The Row, Toteme, Khaite, COS, Celine, Loro Piana, Zara"
                        />
                      </div>

                      <div className="form-field" style={{ maxWidth: '600px' }}>
                        <label>Style Rules &amp; Avoided Aesthetics</label>
                        <input
                          type="text"
                          value={profAvoidedStyles}
                          onChange={(e) => setProfAvoidedStyles(e.target.value)}
                          placeholder="e.g. Avoid neon colors, no loud logos, avoid synthetic polyester"
                        />
                      </div>

                      <div className="form-field" style={{ maxWidth: '600px' }}>
                        <label>Signature Color Palette</label>
                        <input
                          type="text"
                          value={profColorPalette}
                          onChange={(e) => setProfColorPalette(e.target.value)}
                          placeholder="e.g. Black, Cream, Camel, Charcoal, Forest Pine"
                        />
                      </div>

                      <div className="form-field" style={{ maxWidth: '600px' }}>
                        <label>Primary Styling Location & Climate (City)</label>
                        <input
                          type="text"
                          value={profLocationCity}
                          onChange={(e) => setProfLocationCity(e.target.value)}
                          placeholder="e.g. London, Paris, New York, Tokyo"
                        />
                      </div>
                    </div>

                    {/* Part 4: Lifestyle & Context */}
                    <div className="form-group-stack" style={{ gap: '1rem', marginTop: '1.5rem' }}>
                      <h4 style={{ fontSize: '1.15rem', color: 'var(--accent)', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.25rem' }}>
                        4. Lifestyle &amp; Visual Inspirations
                      </h4>
                      
                      <div className="form-field" style={{ maxWidth: '600px' }}>
                        <label>Type of Work / Daily Lifestyle</label>
                        <input
                          type="text"
                          value={profWorkLife}
                          onChange={(e) => setProfWorkLife(e.target.value)}
                          placeholder="e.g. Creative director, travels frequently between London and Paris, corporate boardrooms..."
                        />
                      </div>

                      <div className="form-field" style={{ maxWidth: '600px' }}>
                        <label>Styling Notes &amp; Moodboard Guidelines</label>
                        <textarea
                          value={profInspirations}
                          onChange={(e) => setProfInspirations(e.target.value)}
                          placeholder="Detail specific texture preferences, silhouettes, layering rules, or visual concepts..."
                          rows={3}
                        />
                      </div>

                      {/* Secure Password Update inside profile */}
                      <div className="form-field" style={{ maxWidth: '400px', marginTop: '1.5rem', borderTop: '1px solid var(--border-color)', paddingTop: '1.5rem' }}>
                        <label>Change Password (Leave blank to keep current)</label>
                        <input
                          type="password"
                          value={profPassword}
                          onChange={(e) => setProfPassword(e.target.value)}
                          placeholder="Enter new password (min 6 characters)"
                        />
                      </div>
                    </div>

                    {/* Save profile */}
                    <div className="action-row" style={{ marginTop: '1.5rem' }}>
                      <span className="security-indicator">
                        {user.mfaEnabled ? 'MFA Security Active' : 'Basic Login'}
                      </span>
                      <button type="submit" className="accent-button" style={{ width: 'auto' }}>
                        {isSavingProfile ? 'Saving Style Profile...' : 'SAVE STYLE DNA & PROFILE'}
                      </button>
                    </div>

                  </form>

                </div>

                {/* Marketing & Communication Preferences Panel */}
                <div className="lookbook-panel" style={{ padding: '2rem', marginTop: '2rem' }}>
                  <h3 style={{ fontSize: '1.25rem', marginBottom: '0.5rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>
                    Marketing &amp; Communication Preferences
                  </h3>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
                    Choose how you would like to receive personal styling updates, trend digests, and partner offers from Atelier Edit under UK DPA 2018.
                  </p>

                  <form onSubmit={handleSaveMarketingConsent} className="form-group-stack">
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', background: 'rgba(255,255,255,0.02)', padding: '1.25rem', borderRadius: '4px', border: '1px solid var(--border-color)' }}>
                      
                      <label style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer', fontSize: '0.85rem' }}>
                        <input
                          type="checkbox"
                          checked={marketingEmail}
                          onChange={(e) => setMarketingEmail(e.target.checked)}
                          style={{ width: '18px', height: '18px', accentColor: 'var(--accent-gold)' }}
                        />
                        <div>
                          <strong>📧 Email Newsletters &amp; Editorial Digests</strong>
                          <span style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                            Receive weekly style stream trends, seasonal capsule lookbooks, and haute couture runway breakdowns.
                          </span>
                        </div>
                      </label>

                      <label style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer', fontSize: '0.85rem' }}>
                        <input
                          type="checkbox"
                          checked={marketingSms}
                          onChange={(e) => setMarketingSms(e.target.checked)}
                          style={{ width: '18px', height: '18px', accentColor: 'var(--accent-gold)' }}
                        />
                        <div>
                          <strong>📱 Mobile &amp; SMS Notifications</strong>
                          <span style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                            Receive urgent mobile notifications for luxury item drops and instant stylist consultation updates.
                          </span>
                        </div>
                      </label>

                      <label style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer', fontSize: '0.85rem' }}>
                        <input
                          type="checkbox"
                          checked={marketingPartners}
                          onChange={(e) => setMarketingPartners(e.target.checked)}
                          style={{ width: '18px', height: '18px', accentColor: 'var(--accent-gold)' }}
                        />
                        <div>
                          <strong>🤝 Carefully Selected Partners &amp; Collaborations</strong>
                          <span style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                            Allow Atelier Edit to share non-sensitive aesthetic recommendations with carefully vetted luxury fashion houses.
                          </span>
                        </div>
                      </label>

                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1rem' }}>
                      <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                        {marketingConsentUpdatedAt
                          ? `Preferences last updated: ${new Date(marketingConsentUpdatedAt).toLocaleString()}`
                          : 'Consent preferences not yet configured.'}
                      </span>

                      <button type="submit" className="accent-button" disabled={isSavingConsent} style={{ width: 'auto', padding: '0.55rem 1.25rem' }}>
                        {isSavingConsent ? 'SAVING...' : 'SAVE PREFERENCES'}
                      </button>
                    </div>
                  </form>
                </div>

                {/* GDPR & Data Privacy Rights Panel (UK DPA 2018) */}
                <div className="lookbook-panel" style={{ padding: '2rem', marginTop: '2rem' }}>
                  <h3 style={{ fontSize: '1.25rem', marginBottom: '0.5rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem', color: 'var(--accent-gold)' }}>
                    Data Privacy &amp; GDPR Rights (UK DPA 2018)
                  </h3>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
                    Under General Data Protection Regulation (GDPR) and UK Data Protection Act 2018, you retain total ownership of your data.
                  </p>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem' }}>
                    
                    {/* Data Access Request Export */}
                    <div style={{ background: 'rgba(255,255,255,0.02)', padding: '1.25rem', borderRadius: '4px', border: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column' }}>
                      <h4 style={{ fontSize: '0.95rem', marginBottom: '0.5rem' }}>📦 Data Portability &amp; Export (Article 20)</h4>
                      <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', flex: 1, marginBottom: '1rem' }}>
                        Download a machine-readable JSON data package containing your profile, physical measurements, wardrobe items, visual inspiration boards, generated lookbooks, and consent logs.
                      </p>
                      <button
                        type="button"
                        onClick={handleExportGdprData}
                        disabled={isExportingData}
                        className="accent-button"
                        style={{ fontSize: '0.75rem', padding: '0.5rem 1rem' }}
                      >
                        {isExportingData ? 'EXPORTING PACKAGE...' : '📥 DOWNLOAD MY DATA PACKAGE'}
                      </button>
                    </div>

                    {/* Right to be Forgotten */}
                    <div style={{ background: 'rgba(239, 68, 68, 0.05)', padding: '1.25rem', borderRadius: '4px', border: '1px solid rgba(239, 68, 68, 0.3)', display: 'flex', flexDirection: 'column' }}>
                      <h4 style={{ fontSize: '0.95rem', marginBottom: '0.5rem', color: '#ef4444' }}>🗑️ Right to be Forgotten (Article 17)</h4>
                      <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', flex: 1, marginBottom: '1rem' }}>
                        Permanently purge your account, uploaded clothing photos from Google Cloud Storage, lookbooks, and session history from Atelier Edit databases. This action is immediate and non-reversible.
                      </p>
                      <button
                        type="button"
                        onClick={() => setShowGdprDeleteModal(true)}
                        className="delete-action-btn"
                        style={{ fontSize: '0.75rem', padding: '0.5rem 1rem', width: '100%', textTransform: 'uppercase', letterSpacing: '0.05em' }}
                      >
                        PERMANENTLY DELETE ACCOUNT &amp; ERASE DATA
                      </button>
                    </div>

                  </div>
                </div>

                {/* Right Column: Haute Couture Designer Sketch Card */}
                <div className="croquis-responsive-card">
                  <h4 style={{ fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.2em', marginBottom: '1.5rem', color: 'var(--accent)', borderBottom: '1px solid var(--border-color)', width: '100%', paddingBottom: '0.75rem' }}>
                    Haute Couture Croquis
                  </h4>
                  
                  <div className="croquis-canvas-wrapper">
                    <svg viewBox="0 0 300 450" style={{ filter: 'drop-shadow(0px 8px 16px rgba(0, 0, 0, 0.03))' }}>
                      {/* Grid overlay for designer's draft sketch journal effect */}
                      <line x1="150" y1="10" x2="150" y2="440" stroke="#E6E3DB" strokeWidth="0.5" strokeDasharray="3 6" />
                      <line x1="20" y1="225" x2="280" y2="225" stroke="#E6E3DB" strokeWidth="0.5" strokeDasharray="3 6" />

                      {/* Chic gesture draft curve */}
                      <path d="M 153,20 Q 146,225 151,430" stroke="rgba(122, 122, 122, 0.15)" strokeWidth="0.8" fill="none" strokeDasharray="1 3" />
                      
                      {/* 1. AVERAGE PERSON BENCHMARK SILHOUETTE (BACKGROUND - LIGHTER COLOUR) */}
                      <g opacity="0.65">
                        <path d={avgCroquis.headPath} stroke="#B5AFA6" strokeWidth="1.2" fill="rgba(230, 225, 215, 0.3)" strokeDasharray="3 3" />
                        <path d={avgCroquis.outlinePath} stroke="#B5AFA6" strokeWidth="1.5" fill="rgba(230, 225, 215, 0.3)" strokeDasharray="4 3" strokeLinecap="round" strokeLinejoin="round" />
                        <path d={avgCroquis.leftCollarbone} stroke="#C5BFB6" strokeWidth="0.8" fill="none" opacity="0.6" />
                        <path d={avgCroquis.rightCollarbone} stroke="#C5BFB6" strokeWidth="0.8" fill="none" opacity="0.6" />
                      </g>

                      {/* 2. USER PERSONAL SILHOUETTE (FOREGROUND - CRISP DARKER HAUTE COUTURE) */}
                      <g>
                        <path d={userCroquis.headPath} stroke="#1A1A1A" strokeWidth="1.6" fill="none" />
                        <path d={userCroquis.outlinePath} stroke="#1A1A1A" strokeWidth="2.0" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                        <path d={userCroquis.leftCollarbone} stroke="#7A7A7A" strokeWidth="1.0" fill="none" opacity="0.8" />
                        <path d={userCroquis.rightCollarbone} stroke="#7A7A7A" strokeWidth="1.0" fill="none" opacity="0.8" />
                        <path d={userCroquis.centerLine} stroke="#7A7A7A" strokeWidth="0.8" fill="none" opacity="0.5" strokeDasharray="2 2" />
                      </g>

                      {/* Shared Ground Reference Line for Feet Level (Both Feet Aligned at Y = 410) */}
                      <line x1="20" y1="410" x2="280" y2="410" stroke="#9E988D" strokeWidth="1.2" strokeDasharray="4 2" />
                      <text x="150" y="425" textAnchor="middle" fontSize="9" fill="#888075" letterSpacing="0.05em" fontFamily="sans-serif">
                        SHARED FOOT BASELINE LEVEL
                      </text>
                    </svg>
                  </div>
                  
                  <div style={{ marginTop: '1.25rem', width: '100%', borderTop: '1px solid var(--border-color)', paddingTop: '0.75rem' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.08em', alignItems: 'center' }}>
                      <span style={{ color: '#1A1A1A', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span style={{ display: 'inline-block', width: '16px', height: '3px', backgroundColor: '#1A1A1A' }}></span>
                        Your Personal Silhouette ({profSex === 'Male' ? 'Homme' : 'Femme'})
                      </span>
                      <span style={{ color: '#8E877D', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span style={{ display: 'inline-block', width: '16px', height: '3px', backgroundColor: '#B5AFA6' }}></span>
                        Average Benchmark Silhouette (Aligned)
                      </span>
                    </div>
                  </div>
                </div>

              </div>
            </div>
          );
        })()}
          </>
        )}

      </main>

      {/* Editorial Footer */}
      <footer className="editorial-footer">
        <p>© misson 2026 | Atelier Edit. All styling rights reserved.</p>
      </footer>

      {/* Inline Garment Edit Modal */}
      {editingGarment && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.85)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 99999
        }}>
          <div className="lookbook-panel" style={{
            padding: '2rem',
            width: '100%',
            maxWidth: '500px',
            maxHeight: '90vh',
            overflowY: 'auto'
          }}>
            <h3 style={{ fontSize: '1.25rem', marginBottom: '1rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem', color: 'var(--accent-gold)' }}>
              Edit Garment Details
            </h3>

            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1.5rem' }}>
              <div style={{ position: 'relative', width: '120px', height: '150px', border: '1px solid var(--border-color)', borderRadius: '4px', overflow: 'hidden' }}>
                <Image
                  src={editingGarment.imageUrl}
                  alt="Garment Preview"
                  fill
                  style={{ objectFit: 'cover' }}
                />
              </div>
            </div>

            <form onSubmit={handleSaveInlineGarmentEdit} className="form-group-stack">
              <div className="form-field">
                <label>Category</label>
                <select
                  value={editGarmentCategory}
                  onChange={(e) => setEditGarmentCategory(e.target.value)}
                >
                  <option value="Outerwear">Outerwear</option>
                  <option value="Tops">Tops</option>
                  <option value="Bottoms">Bottoms</option>
                  <option value="Shoes">Shoes</option>
                  <option value="Accessories">Accessories</option>
                  <option value="Dresses">Dresses</option>
                  <option value="Knitwear">Knitwear</option>
                  <option value="Makeup">Makeup</option>
                  <option value="Jewelry">Jewelry</option>
                </select>
              </div>

              <div className="form-field">
                <label>Brand / Designer</label>
                <input
                  type="text"
                  value={editGarmentBrand}
                  onChange={(e) => setEditGarmentBrand(e.target.value)}
                  placeholder="e.g. McQueen, Balenciaga"
                />
              </div>

              <div className="form-field">
                <label>Style & Fit Notes</label>
                <textarea
                  value={editGarmentNotes}
                  onChange={(e) => setEditGarmentNotes(e.target.value)}
                  placeholder="Describe fabric weight, fit details, drape style..."
                  rows={3}
                />
              </div>

              <div className="form-field">
                <label>Keywords / Tags (Comma-separated)</label>
                <input
                  type="text"
                  value={editGarmentTags}
                  onChange={(e) => setEditGarmentTags(e.target.value)}
                  placeholder="e.g. silk, oversized, vintage"
                />
              </div>

              <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end', marginTop: '1.5rem', borderTop: '1px solid var(--border-color)', paddingTop: '1rem' }}>
                <button
                  type="button"
                  onClick={() => setEditingGarment(null)}
                  className="btn-secondary"
                  style={{ padding: '0.5rem 1rem' }}
                  disabled={isSavingGarmentEdit}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="accent-button"
                  style={{ width: 'auto', padding: '0.5rem 1.5rem' }}
                  disabled={isSavingGarmentEdit}
                >
                  {isSavingGarmentEdit ? 'Saving...' : 'Save details'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* GDPR Right to Erasure Modal */}
      {showGdprDeleteModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.85)',
          zIndex: 9999,
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          padding: '1rem'
        }}>
          <div className="lookbook-panel" style={{ maxWidth: '500px', width: '100%', padding: '2rem', border: '1px solid #ef4444', backgroundColor: '#121212' }}>
            <h3 style={{ fontSize: '1.35rem', color: '#ef4444', marginBottom: '0.75rem' }}>
              ⚠️ Confirm Permanent Account Erasure
            </h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text)', marginBottom: '1rem', lineHeight: '1.5' }}>
              You are requesting permanent erasure under <strong>GDPR Article 17 (Right to be Forgotten)</strong>.
            </p>
            <ul style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '1.25rem', paddingLeft: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
              <li>All uploaded wardrobe photos in Cloud Storage will be erased.</li>
              <li>Your sizing profiles, lookbooks, and feeds will be purged.</li>
              <li>Your active session will be invalidated immediately.</li>
            </ul>

            <form onSubmit={handleDeleteGdprAccount} className="form-group-stack">
              <div className="form-field">
                <label style={{ color: '#ef4444' }}>Type &ldquo;DELETE&rdquo; to confirm:</label>
                <input
                  type="text"
                  required
                  value={gdprConfirmInput}
                  onChange={(e) => setGdprConfirmInput(e.target.value)}
                  placeholder="DELETE"
                  style={{ border: '1px solid #ef4444', backgroundColor: 'rgba(239, 68, 68, 0.1)' }}
                />
              </div>

              <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem' }}>
                <button
                  type="button"
                  onClick={() => { setShowGdprDeleteModal(false); setGdprConfirmInput(''); }}
                  className="nav-action"
                  style={{ flex: 1, padding: '0.65rem' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isDeletingAccount || gdprConfirmInput.trim().toUpperCase() !== 'DELETE'}
                  className="delete-action-btn"
                  style={{ flex: 1, padding: '0.65rem', textTransform: 'uppercase' }}
                >
                  {isDeletingAccount ? 'ERASING DATA...' : 'CONFIRM PERMANENT ERASURE'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Live Camera Viewfinder Modal */}
      {showCameraModal && (
        <div className="camera-modal-overlay" onClick={stopCameraStream}>
          <div className="camera-viewfinder-container" onClick={(e) => e.stopPropagation()}>
            <div className="camera-header-bar">
              <span className="camera-title">
                {cameraTarget === 'wardrobe' ? 'Wardrobe Camera' : 'Inspiration Camera'}
              </span>
              <button
                type="button"
                onClick={stopCameraStream}
                className="camera-aux-btn"
                style={{ border: 'none', fontSize: '1rem', padding: '0.2rem 0.5rem' }}
                aria-label="Close Camera"
              >
                ✕
              </button>
            </div>

            <div className="camera-video-frame">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="camera-video-stream"
              />
              <div className="camera-guidelines" />
            </div>

            <div className="camera-controls-bar">
              <button
                type="button"
                onClick={toggleCameraFacing}
                className="camera-aux-btn"
                title="Switch Camera (Front/Back)"
              >
                🔄 Flip
              </button>

              <button
                type="button"
                onClick={capturePhotoFromStream}
                className="shutter-button"
                aria-label="Take Photo"
              >
                <div className="shutter-inner" />
              </button>

              <button
                type="button"
                onClick={stopCameraStream}
                className="camera-aux-btn"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Visual Inspiration Lightbox Modal */}
      {selectedInspirationLightbox && (
        <div className="inspiration-lightbox-overlay" onClick={() => setSelectedInspirationLightbox(null)}>
          <div className="inspiration-lightbox-modal" onClick={(e) => e.stopPropagation()}>
            <div style={{ position: 'relative', width: '100%', height: '360px', backgroundColor: '#0c0c0d' }}>
              <Image
                src={selectedInspirationLightbox.imageUrl}
                alt="Inspiration Detail"
                fill
                style={{ objectFit: 'contain' }}
                unoptimized
              />
              <button
                type="button"
                onClick={() => setSelectedInspirationLightbox(null)}
                style={{
                  position: 'absolute',
                  top: '12px',
                  right: '12px',
                  background: 'rgba(0, 0, 0, 0.75)',
                  color: '#FAF8F4',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  borderRadius: '50%',
                  width: '32px',
                  height: '32px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
                aria-label="Close Lightbox"
              >
                ✕
              </button>
            </div>
            <div style={{ padding: '1.25rem 1.5rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
                <span style={{ fontSize: '0.7rem', color: 'var(--accent-gold)', textTransform: 'uppercase', letterSpacing: '0.12em', fontWeight: 700 }}>
                  ✦ Visual Moodboard Inspiration
                </span>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                  {new Date(selectedInspirationLightbox.createdAt).toLocaleDateString()}
                </span>
              </div>
              <p style={{ fontSize: '0.85rem', color: '#FAF8F4', lineHeight: '1.5', margin: 0 }}>
                {selectedInspirationLightbox.notes || 'Street style & aesthetic mood inspiration.'}
              </p>
              {selectedInspirationLightbox.tags.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', marginTop: '0.25rem' }}>
                  {selectedInspirationLightbox.tags.map((tag, idx) => (
                    <span key={idx} style={{ fontSize: '0.65rem', padding: '0.25rem 0.6rem', background: 'rgba(212, 175, 55, 0.15)', color: 'var(--accent-gold)', borderRadius: '4px', fontWeight: 600 }}>
                      #{tag}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Floating Mobile Snap FAB */}
      {user && (
        <button
          type="button"
          onClick={() => openCameraViewfinder('inspiration')}
          className="mobile-fab-snap"
          aria-label="Snap Street/Shop Inspiration"
        >
          📸 Snap Inspiration
        </button>
      )}

      {toast && (
        <div className={`toast-notification ${toast.type}`}>
          <span className="toast-icon">{toast.type === 'success' ? '✓' : toast.type === 'info' ? 'ℹ' : '✕'}</span>
          <span className="toast-message">{toast.message}</span>
        </div>
      )}

    </div>
  );
}
