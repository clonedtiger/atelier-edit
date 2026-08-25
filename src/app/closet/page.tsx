'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Navigation } from '@/components/layout/Navigation';
import { GarmentCard, WardrobeItem } from '@/features/closet/GarmentCard';
import { FacetedFilterBar } from '@/features/closet/FacetedFilterBar';
import { SpreadsheetEditor } from '@/features/closet/SpreadsheetEditor';
import { BatchUploadModal } from '@/features/closet/BatchUploadModal';
import { Toast, ToastMessage } from '@/components/ui/Toast';
import { Skeleton } from '@/components/ui/Skeleton';

export default function ClosetPage() {
  const [wardrobe, setWardrobe] = useState<WardrobeItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [isSpreadsheetMode, setIsSpreadsheetMode] = useState(false);
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [anchoredItemId, setAnchoredItemId] = useState<string | null>(null);
  const [toast, setToast] = useState<ToastMessage | null>(null);

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const fetchWardrobe = useCallback(async () => {
    try {
      const res = await fetch('/api/wardrobe');
      if (res.ok) {
        const data = await res.json();
        setWardrobe(data);
      }
    } catch (err) {
      console.error('Failed to load wardrobe:', err);
      showToast('Error loading wardrobe items', 'error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let ignore = false;

    async function load() {
      try {
        const res = await fetch('/api/wardrobe');
        if (res.ok) {
          const data = await res.json();
          if (!ignore) {
            setWardrobe(data);
            setLoading(false);
          }
        }
      } catch (err) {
        console.error('Failed to load wardrobe:', err);
        if (!ignore) {
          showToast('Error loading wardrobe items', 'error');
          setLoading(false);
        }
      }
    }

    load();

    return () => {
      ignore = true;
    };
  }, []);

  const handleAnchor = (item: WardrobeItem) => {
    if (anchoredItemId === item.id) {
      setAnchoredItemId(null);
      showToast('Removed anchor garment.', 'info');
    } else {
      setAnchoredItemId(item.id);
      showToast(`Anchored styling around ${item.brand || item.category}.`, 'success');
    }
  };

  const handleDeleteItem = async (id: string) => {
    try {
      const res = await fetch(`/api/wardrobe?id=${id}`, { method: 'DELETE' });
      if (res.ok) {
        setWardrobe((prev) => prev.filter((i) => i.id !== id));
        if (anchoredItemId === id) setAnchoredItemId(null);
        showToast('Garment removed from closet.', 'success');
      } else {
        showToast('Failed to delete garment.', 'error');
      }
    } catch (err) {
      console.error('Delete error:', err);
      showToast('Network error deleting garment.', 'error');
    }
  };

  const handleSaveItem = async (item: WardrobeItem) => {
    try {
      const res = await fetch('/api/wardrobe/bulk', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: [
            {
              id: item.id,
              brand: item.brand,
              category: item.category,
              styleNotes: item.styleNotes,
              detectedTags: item.detectedTags,
            },
          ],
        }),
      });
      if (res.ok) {
        setWardrobe((prev) => prev.map((i) => (i.id === item.id ? item : i)));
        showToast('Garment updated successfully.', 'success');
      }
    } catch (err) {
      console.error('Update item error:', err);
      showToast('Failed to save changes.', 'error');
    }
  };

  const handleBulkUpdateBrand = async (ids: string[], brand: string) => {
    try {
      const updates = ids.map((id) => ({ id, brand }));
      const res = await fetch('/api/wardrobe/bulk', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: updates }),
      });
      if (res.ok) {
        setWardrobe((prev) =>
          prev.map((item) => (ids.includes(item.id) ? { ...item, brand } : item))
        );
        showToast(`Updated brand to "${brand}" for ${ids.length} items.`, 'success');
      }
    } catch (err) {
      console.error('Bulk brand update error:', err);
      showToast('Failed to execute bulk update.', 'error');
    }
  };

  // Filter items based on Category and Search
  const filteredItems = wardrobe.filter((item) => {
    const matchesCat =
      selectedCategory === 'All' ||
      item.category.toLowerCase() === selectedCategory.toLowerCase();
    
    if (!matchesCat) return false;
    if (!searchQuery.trim()) return true;

    const q = searchQuery.toLowerCase();
    const matchBrand = item.brand?.toLowerCase().includes(q);
    const matchNotes = item.styleNotes?.toLowerCase().includes(q);
    const matchCategory = item.category?.toLowerCase().includes(q);
    const matchTags = item.detectedTags?.some((t) => t.toLowerCase().includes(q));
    const matchColors = item.color?.some((c) => c.toLowerCase().includes(q));

    return matchBrand || matchNotes || matchCategory || matchTags || matchColors;
  });

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] flex flex-col">
      <Navigation
        onOpenUpload={() => setIsUploadOpen(true)}
        wardrobeCount={wardrobe.length}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-8">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8 pb-4 border-b border-[var(--border-color)]">
          <div>
            <span className="text-[10px] uppercase tracking-[0.3em] font-bold text-[var(--accent)]">
              Wardrobe Archive
            </span>
            <h2 className="text-3xl sm:text-4xl font-serif text-[var(--text-primary)] font-light mt-1">
              Personal Digital Closet
            </h2>
            <p className="text-xs text-[var(--text-secondary)] mt-1">
              Curate, filter, and organize your apparel with automated Gemini AI vision tagging.
            </p>
          </div>

          <button
            onClick={() => setIsUploadOpen(true)}
            className="px-5 py-2.5 text-xs uppercase tracking-widest font-bold bg-[var(--accent)] text-white hover:bg-[var(--accent-hover)] rounded-lg shadow-sm transition-colors self-start sm:self-auto flex items-center gap-1.5"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
            </svg>
            <span>+ Add Garment</span>
          </button>
        </div>

        {/* Filter Bar */}
        <FacetedFilterBar
          selectedCategory={selectedCategory}
          onSelectCategory={setSelectedCategory}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          isSpreadsheetMode={isSpreadsheetMode}
          onToggleSpreadsheetMode={() => setIsSpreadsheetMode(!isSpreadsheetMode)}
          totalCount={wardrobe.length}
          filteredCount={filteredItems.length}
        />

        {/* Loading State */}
        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-6">
            {Array.from({ length: 8 }).map((_, idx) => (
              <div key={idx} className="space-y-3">
                <Skeleton variant="card" />
                <Skeleton variant="text" style={{ width: '60%' }} />
                <Skeleton variant="text" style={{ width: '90%' }} />
              </div>
            ))}
          </div>
        ) : isSpreadsheetMode ? (
          <SpreadsheetEditor
            items={filteredItems}
            onSaveItem={handleSaveItem}
            onBulkUpdateBrand={handleBulkUpdateBrand}
            onDeleteItem={handleDeleteItem}
          />
        ) : filteredItems.length === 0 ? (
          <div className="text-center py-20 bg-[var(--bg-secondary)]/30 rounded-2xl border border-[var(--border-color)]">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-[var(--bg-primary)] flex items-center justify-center text-[var(--accent)]">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
              </svg>
            </div>
            <h3 className="text-xl font-serif text-[var(--text-primary)] font-light">
              No Matching Garments Found
            </h3>
            <p className="text-xs uppercase tracking-widest text-[var(--text-muted)] max-w-sm mx-auto mt-2">
              {searchQuery || selectedCategory !== 'All'
                ? 'Try resetting your filter or search query.'
                : 'Your digital closet is empty. Add photos of your favorite clothing pieces to begin.'}
            </p>
            <button
              onClick={() => setIsUploadOpen(true)}
              className="mt-6 px-6 py-2.5 text-xs uppercase tracking-widest font-bold bg-[var(--accent)] text-white rounded-lg shadow-sm hover:bg-[var(--accent-hover)] transition-colors"
            >
              Add First Garment
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {filteredItems.map((item) => (
              <GarmentCard
                key={item.id}
                item={item}
                isAnchored={anchoredItemId === item.id}
                onAnchor={handleAnchor}
                onDelete={handleDeleteItem}
              />
            ))}
          </div>
        )}
      </main>

      {/* Batch Upload Modal */}
      <BatchUploadModal
        isOpen={isUploadOpen}
        onClose={() => setIsUploadOpen(false)}
        onUploadSuccess={fetchWardrobe}
      />

      {/* Toast Notification */}
      <Toast toast={toast} onDismiss={() => setToast(null)} />
    </div>
  );
}
