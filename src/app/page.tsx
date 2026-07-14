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
  mfaEnabled: boolean;
  role?: string;
  suspended?: boolean;
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
  isMuted: boolean;
  createdAt: string;
}

export default function AtelierEditDashboard() {
  const [activeTab, setActiveTab] = useState<'feed' | 'closet' | 'trends' | 'account' | 'whats-new'>('whats-new');
  const [user, setUser] = useState<UserProfile | null>(null);
  
  // Data lists
  const [wardrobe, setWardrobe] = useState<WardrobeItem[]>([]);
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [feeds, setFeeds] = useState<FeedSource[]>([]);
  const [whatsNewPosts, setWhatsNewPosts] = useState<WhatsNewPost[]>([]);
  
  // Loading states
  const [loadingMe, setLoadingMe] = useState(true);
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

  // Spreadsheet Bulk Edit States
  const [isSpreadsheetMode, setIsSpreadsheetMode] = useState(false);
  const [selectedItemIds, setSelectedItemIds] = useState<string[]>([]);
  const [editBuffer, setEditBuffer] = useState<Record<string, { brand: string; category: string; styleNotes: string; tags: string }>>({});
  const [bulkBrandValue, setBulkBrandValue] = useState('');

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
  const [profPassword, setProfPassword] = useState('');

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
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const showToast = useCallback((message: string, type: 'success' | 'error' = 'success') => {
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
  }, []);

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
      } else {
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
    // Disabled automatic silent background sync to preserve Gemini API quota limits (15 RPM)
    console.log('Automated background sync bypassed to preserve Gemini API quota.');
    fetchRecommendations();
  }, [fetchRecommendations]);

  const checkSession = useCallback(async () => {
    setLoadingMe(true);
    try {
      const res = await fetch('/api/auth/me');
      if (res.ok) {
        const data = await res.json();
        if (data.authenticated && data.user) {
          setUser(data.user);
          populateProfileFields(data.user);
          triggerSilentFeedSync(); // Automatically sync feeds on session load/login
        } else {
          setUser(null);
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingMe(false);
    }
  }, [populateProfileFields, triggerSilentFeedSync]);

  // Load initial data
  useEffect(() => {
    const timer = setTimeout(() => {
      checkSession();
      fetchWardrobe();
      fetchRecommendations();
      fetchFeeds();
      fetchWhatsNew();
    }, 0);
    return () => clearTimeout(timer);
  }, [checkSession, fetchWardrobe, fetchRecommendations, fetchFeeds, fetchWhatsNew]);

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

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      const fileArr = Array.from(files);
      setSelectedFiles(fileArr);
      setPreviewUrls(fileArr.map(f => URL.createObjectURL(f)));
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



  const triggerRecommendations = async (vibe?: string | React.MouseEvent) => {
    const vibePrompt = typeof vibe === 'string' ? vibe : undefined;
    setIsGenerating(true);
    try {
      const res = await fetch('/api/recommendations/generate', { 
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ vibe: vibePrompt })
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
          checkSession(); 
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
        checkSession();
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
          password: profPassword || undefined,
        }),
      });

      if (res.ok) {
        showToast('Style and Sizing Profile saved successfully!');
        setProfPassword('');
        checkSession(); 
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
        }),
      });

      if (res.ok) {
        setNewFeedUrl('');
        setNewFeedName('');
        setNewFeedType('rss');
        fetchFeeds();
        triggerSilentFeedSync();
      } else {
        const errData = await res.json();
        showToast(`Failed to add feed: ${errData.error}`, 'error');
      }
    } catch (err) {
      console.error(err);
      showToast('Error adding feed source.', 'error');
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
    // Standardize height
    let hCm = 175;
    if (heightUnit === 'cm') {
      hCm = Number(heightCm) || 170;
    } else {
      hCm = (Number(heightFt) * 30.48) + (Number(heightIn) * 2.54) || 170;
    }

    // Standardize weight
    let wKg = 60;
    if (weightUnit === 'kg') {
      wKg = Number(weightKg) || 60;
    } else if (weightUnit === 'lbs') {
      wKg = Number(weightLbs) * 0.453592 || 60;
    } else {
      wKg = (Number(weightStValue) * 6.35029) + (Number(weightStLbs) * 0.453592) || 60;
    }

    // Standardize waist
    let waistInches = 28;
    if (waistUnit === 'in') {
      waistInches = Number(waistVal) || 28;
    } else {
      waistInches = Number(waistVal) / 2.54 || 28;
    }

    // Proportions limits for safety (prevent deformed sketch coordinates)
    const heightScale = Math.min(Math.max(hCm / 175, 0.8), 1.25);
    const weightScale = Math.min(Math.max(wKg / 65, 0.65), 1.55);
    const waistScale = Math.min(Math.max(waistInches / 28, 0.7), 1.45);

    const isMale = profSex === 'Male';

    // Proportions
    const headW = 11 * weightScale;
    const headH = 17 * heightScale;
    const headY = 40;

    const shoulderHalf = (isMale ? 28 : 19) * weightScale;
    const bustHalf = (isMale ? 26 : 18) * weightScale;
    const waistHalf = (isMale ? 21 : 12) * weightScale * waistScale;
    const hipHalf = (isMale ? 22 : 24) * weightScale;
    const kneeHalf = 8 * weightScale;
    const footHalf = 6 * weightScale;

    // Y coordinates scaled
    const neckY = 75;
    const shoulderY = 95 * heightScale;
    const bustY = 125 * heightScale;
    const waistY = 165 * heightScale;
    const hipY = 205 * heightScale;
    const kneeY = 295 * heightScale;
    const ankleY = 390 * heightScale;
    const footY = 410 * heightScale;

    // Left side
    const leftSide = [
      `M 100,${neckY}`,
      `C ${100 - shoulderHalf * 0.4},${neckY + 5} ${100 - shoulderHalf * 0.8},${shoulderY - 5} ${100 - shoulderHalf},${shoulderY}`,
      `C ${100 - shoulderHalf * 1.05},${shoulderY + 10} ${100 - bustHalf * 1.05},${bustY - 10} ${100 - bustHalf},${bustY}`,
      `C ${100 - bustHalf * 0.95},${bustY + 15} ${100 - waistHalf * 1.1},${waistY - 15} ${100 - waistHalf},${waistY}`,
      `C ${100 - waistHalf * 0.95},${waistY + 15} ${100 - hipHalf * 1.05},${hipY - 15} ${100 - hipHalf},${hipY}`,
      `C ${100 - hipHalf},${hipY + 25} ${100 - kneeHalf * 1.2},${kneeY - 25} ${100 - kneeHalf},${kneeY}`,
      `C ${100 - kneeHalf * 0.8},${kneeY + 25} ${100 - footHalf * 1.1},${ankleY - 15} ${100 - footHalf},${ankleY}`,
      `L ${100 - footHalf * 0.8},${footY}`
    ].join(' ');

    // Right side
    const rightSide = [
      `L ${100 + footHalf * 0.8},${footY}`,
      `L ${100 + footHalf},${ankleY}`,
      `C ${100 + footHalf * 1.1},${ankleY - 15} ${100 + kneeHalf * 0.8},${kneeY + 25} ${100 + kneeHalf},${kneeY}`,
      `C ${100 + kneeHalf * 1.2},${kneeY - 25} ${100 + hipHalf},${hipY + 25} ${100 + hipHalf},${hipY}`,
      `C ${100 + hipHalf * 1.05},${hipY - 15} ${100 + waistHalf * 0.95},${waistY + 15} ${100 + waistHalf},${waistY}`,
      `C ${100 + waistHalf * 1.1},${waistY - 15} ${100 + bustHalf * 0.95},${bustY + 15} ${100 + bustHalf},${bustY}`,
      `C ${100 + bustHalf * 1.05},${bustY - 10} ${100 + shoulderHalf * 1.05},${shoulderY + 10} ${100 + shoulderHalf},${shoulderY}`,
      `C ${100 + shoulderHalf * 0.8},${shoulderY - 5} ${100 + shoulderHalf * 0.4},${neckY + 5} 100,${neckY}`
    ].join(' ');

    const outlinePath = `${leftSide} ${rightSide} Z`;
    const headPath = `M 100,${headY - headH / 2} A ${headW / 2},${headH / 2} 0 1,1 100,${headY + headH / 2} A ${headW / 2},${headH / 2} 0 1,1 100,${headY - headH / 2}`;
    const leftCollarbone = `M ${100 - shoulderHalf * 0.8},${shoulderY + 5} Q ${100 - shoulderHalf * 0.4},${shoulderY + 8} 100,${shoulderY + 12}`;
    const rightCollarbone = `M ${100 + shoulderHalf * 0.8},${shoulderY + 5} Q ${100 + shoulderHalf * 0.4},${shoulderY + 8} 100,${shoulderY + 12}`;
    const centerLine = `M 100,${shoulderY + 15} L 100,${waistY}`;

    return { outlinePath, headPath, leftCollarbone, rightCollarbone, centerLine };
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
              Wardrobe ({wardrobe.length})
            </button>
            
            <button
              onClick={() => setActiveTab('trends')}
              className={`nav-link ${activeTab === 'trends' ? 'active' : ''}`}
            >
              Inspirations ({feeds.length})
            </button>

            <span className="nav-divider">|</span>
            
            <button
              onClick={() => setActiveTab('account')}
              className={`nav-link ${activeTab === 'account' ? 'active' : ''}`}
            >
              My Profile
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
        
        {loadingMe ? (
          <div className="outfit-narrative" style={{ textAlign: 'center', border: 'none', padding: '4rem 0' }}>
            Verifying session parameters...
          </div>
        ) : !user ? (
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
                  <h3 className="auth-form-title">Atelier Sign In</h3>
                  
                  <div className="form-field">
                    <label>Email Address</label>
                    <input
                      type="email"
                      required
                      value={authEmail}
                      onChange={(e) => setAuthEmail(e.target.value)}
                      placeholder="e.g. wife@fashion.com"
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
            {/* Style Feed tab */}
            {activeTab === 'feed' && (
          <div className="outfit-stream">
            {/* Custom Vibe Input Card */}
            <div className="lookbook-panel" style={{ padding: '1.5rem', marginBottom: '2rem' }}>
              <h3 style={{ fontSize: '1.25rem', marginBottom: '0.5rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>
                Personal Stylist Consultation
              </h3>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '1.25rem' }}>
                Request a specific outfit vibe, occasion, or style theme (e.g., &ldquo;sunny day floral look&rdquo; or &ldquo;edgy concert layering&rdquo;).
              </p>
              <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
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
                  }}
                />
                <button
                  onClick={() => triggerRecommendations(styleVibePrompt)}
                  disabled={isGenerating || wardrobe.length === 0}
                  className="accent-button"
                  style={{ width: 'auto', padding: '0.75rem 1.5rem', marginTop: 0 }}
                >
                  {isGenerating ? 'Styling...' : 'Advise Me'}
                </button>
              </div>
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
                              <Image
                                src={item.purchaseImageUrl}
                                alt={item.purchaseName || 'Acquisition target'}
                                fill
                                sizes="(max-width: 768px) 100vw, 33vw"
                                style={{ objectFit: 'cover' }}
                              />
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
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
            
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
                      <div
                        onClick={() => fileInputRef.current?.click()}
                        className="image-upload-picker"
                      >
                        {previewUrls.length > 0 ? (
                          <div style={{ position: 'relative', width: '100%', height: '100%' }}>
                            <Image
                               src={previewUrls[0]}
                               alt="Upload Preview"
                               fill
                               style={{ objectFit: 'cover' }}
                               unoptimized
                             />
                            {previewUrls.length > 1 && (
                              <div style={{ position: 'absolute', bottom: 10, right: 10, backgroundColor: 'var(--accent)', color: 'white', padding: '0.2rem 0.6rem', fontSize: '0.7rem', borderRadius: '4px', fontWeight: 'bold' }}>
                                + {previewUrls.length - 1} more files
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="picker-prompt">
                            <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 4v16m8-8H4" />
                            </svg>
                            <span className="picker-text-main">Choose Photographs</span>
                            <span className="picker-text-sub">Supports multi-file select</span>
                          </div>
                        )}
                      </div>

                      <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleFileChange}
                        accept="image/*"
                        multiple
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

          </div>
        )}

        {/* Ingest channels tab */}
        {activeTab === 'trends' && (
          <div className="ingest-layout-grid">
            
            {/* Add Feed column */}
            <div>
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
                    <label>RSS Feed URL</label>
                    <input
                      type="url"
                      required
                      value={newFeedUrl}
                      onChange={(e) => setNewFeedUrl(e.target.value)}
                      placeholder="https://..."
                    />
                  </div>

                  <div className="form-field">
                    <label>Feed Classification</label>
                    <select
                      value={newFeedType}
                      onChange={(e) => setNewFeedType(e.target.value)}
                    >
                      <option value="rss">RSS / Newsletter feed</option>
                      <option value="youtube">YouTube Video source</option>
                      <option value="substack">Substack feed</option>
                    </select>
                  </div>

                  <button type="submit" className="accent-button">
                    ADD INSPIRATION CHANNEL
                  </button>
                </form>
              </div>
            </div>

            {/* List channels column */}
            <div>
              <div className="lookbook-panel" style={{ padding: '1.5rem' }}>
                <h3 style={{ fontSize: '1.35rem', marginBottom: '1.25rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>
                  Inspiration Sources
                </h3>

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
                    {feeds.map((feed) => (
                      <div key={feed.id} className="ingest-item-row">
                        
                        <div className="ingest-item-meta">
                          <div className="ingest-item-header">
                            <span className={`ingest-item-title ${feed.isMuted ? 'muted' : ''}`}>
                              {feed.name}
                            </span>
                            <span className="ingest-type-badge">{feed.type}</span>
                          </div>
                          <span className="ingest-item-url">{feed.url}</span>
                        </div>

                        <div className="ingest-actions">
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
                            onClick={() => handleDeleteFeed(feed.id)}
                            className="delete-action-btn"
                          >
                            Delete
                          </button>
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
          const { outlinePath, headPath, leftCollarbone, rightCollarbone, centerLine } = getCroquisPath();
          return (
            <div className="auth-panel-wrapper" style={{ maxWidth: '1100px', margin: '0 auto' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: '3rem', alignItems: 'start' }}>
                
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

                    {/* Part 3 */}
                    <div className="form-group-stack" style={{ gap: '1rem', marginTop: '1rem' }}>
                      <h4 style={{ fontSize: '1.15rem', color: 'var(--accent)', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.25rem' }}>
                        3. Personalization Parameters
                      </h4>
                      
                      <div className="form-field" style={{ maxWidth: '400px' }}>
                        <label>Type of Work / Lifestyle</label>
                        <input
                          type="text"
                          value={profWorkLife}
                          onChange={(e) => setProfWorkLife(e.target.value)}
                          placeholder="e.g. Creative director, travels frequently, corporate office..."
                        />
                      </div>

                      <div className="form-field" style={{ maxWidth: '600px' }}>
                        <label>Styling Inspirations &amp; Mood Guidelines</label>
                        <textarea
                          value={profInspirations}
                          onChange={(e) => setProfInspirations(e.target.value)}
                          placeholder="Detail specific designer preferences, textures, color notes, or general visual ideas..."
                          rows={4}
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
                        {isSavingProfile ? 'Saving Sizing Profile...' : 'SAVE PROFILE'}
                      </button>
                    </div>

                  </form>

                </div>

                {/* Right Column: Haute Couture Designer Sketch Card */}
                <div className="lookbook-panel croquis-sticky-card" style={{ padding: '2rem', textAlign: 'center', position: 'sticky', top: '2rem', display: 'flex', flexDirection: 'column', alignItems: 'center', backgroundColor: '#FAF8F4', border: '1px solid var(--border-color)', borderRadius: '4px' }}>
                  <h4 style={{ fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.2em', marginBottom: '1.5rem', color: 'var(--accent)', borderBottom: '1px solid var(--border-color)', width: '100%', paddingBottom: '0.75rem' }}>
                    Haute Couture Croquis
                  </h4>
                  
                  <div className="croquis-canvas" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '440px', width: '100%', overflow: 'hidden' }}>
                    <svg width="220" height="440" viewBox="0 0 200 450" style={{ filter: 'drop-shadow(0px 8px 16px rgba(0, 0, 0, 0.03))' }}>
                      {/* Grid overlay for designer's draft sketch journal effect */}
                      <line x1="100" y1="10" x2="100" y2="440" stroke="#E6E3DB" strokeWidth="0.5" strokeDasharray="3 6" />
                      <line x1="20" y1="225" x2="180" y2="225" stroke="#E6E3DB" strokeWidth="0.5" strokeDasharray="3 6" />

                      {/* Chic gesture draft curve */}
                      <path d="M 103,20 Q 96,225 101,430" stroke="rgba(122, 122, 122, 0.15)" strokeWidth="0.8" fill="none" strokeDasharray="1 3" />
                      
                      {/* Head */}
                      <path d={headPath} stroke="#1A1A1A" strokeWidth="1.2" fill="none" />
                      
                      {/* Dynamic Body Contour */}
                      <path d={outlinePath} stroke="#1A1A1A" strokeWidth="1.6" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                      
                      {/* Hand-drawn style highlights */}
                      <path d={leftCollarbone} stroke="#7A7A7A" strokeWidth="0.8" fill="none" opacity="0.8" />
                      <path d={rightCollarbone} stroke="#7A7A7A" strokeWidth="0.8" fill="none" opacity="0.8" />
                      <path d={centerLine} stroke="#7A7A7A" strokeWidth="0.6" fill="none" opacity="0.4" strokeDasharray="2 2" />
                    </svg>
                  </div>
                  
                  <div style={{ marginTop: '1.5rem', width: '100%', borderTop: '1px solid var(--border-color)', paddingTop: '0.75rem' }}>
                    <p style={{ fontSize: '0.6rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.15em', fontWeight: 'bold' }}>
                      {profSex === 'Male' ? 'Croquis Silhouette — Homme' : 'Croquis Silhouette — Femme'}
                    </p>
                    <p style={{ fontSize: '0.55rem', color: 'var(--text-muted)', fontStyle: 'italic', marginTop: '0.25rem' }}>
                      Modulates dynamically in real time
                    </p>
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
        <p>© 2026 Atelier Edit. All styling rights reserved.</p>
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

      {toast && (
        <div className={`toast-notification ${toast.type}`}>
          <span className="toast-icon">{toast.type === 'success' ? '✓' : '✕'}</span>
          <span className="toast-message">{toast.message}</span>
        </div>
      )}

    </div>
  );
}
