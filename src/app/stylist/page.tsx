'use client';

import React, { useState, useEffect } from 'react';
import { Navigation } from '@/components/layout/Navigation';
import { OutfitLookbook, Recommendation } from '@/features/stylist/OutfitLookbook';
import { AtelierCanvas } from '@/features/stylist/AtelierCanvas';
import { WardrobeItem } from '@/features/closet/GarmentCard';
import { Toast, ToastMessage } from '@/components/ui/Toast';
import { Skeleton } from '@/components/ui/Skeleton';

export default function StylistPage() {
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [wardrobe, setWardrobe] = useState<WardrobeItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [vibePrompt, setVibePrompt] = useState('');
  const [selectedAnchorId, setSelectedAnchorId] = useState<string | null>(null);
  const [activeStudioTab, setActiveStudioTab] = useState<'lookbook' | 'canvas'>('lookbook');
  const [toast, setToast] = useState<ToastMessage | null>(null);

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  useEffect(() => {
    let ignore = false;

    async function load() {
      try {
        const [resRecs, resWardrobe] = await Promise.all([
          fetch('/api/recommendations'),
          fetch('/api/wardrobe'),
        ]);

        if (!ignore) {
          if (resRecs.ok) {
            const recsData = await resRecs.json();
            setRecommendations(recsData);
          }
          if (resWardrobe.ok) {
            const wardrobeData = await resWardrobe.json();
            setWardrobe(wardrobeData);
          }
          setLoading(false);
        }
      } catch (err) {
        console.error('Failed to load stylist data:', err);
        if (!ignore) {
          showToast('Error loading stylist looks', 'error');
          setLoading(false);
        }
      }
    }

    load();

    return () => {
      ignore = true;
    };
  }, []);

  const handleGenerateOutfits = async (anchorId?: string, overrideVibe?: string) => {
    setIsGenerating(true);
    try {
      const targetAnchor = anchorId || selectedAnchorId || undefined;
      const targetVibe = overrideVibe || vibePrompt.trim() || undefined;

      const res = await fetch('/api/recommendations/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vibe: targetVibe,
          anchorItemId: targetAnchor,
        }),
      });

      if (res.ok) {
        const newRecs = await res.json();
        setRecommendations(newRecs);
        setActiveStudioTab('lookbook');
        showToast('New bespoke outfits synthesized by Gemini Stylist!', 'success');
      } else {
        const data = await res.json().catch(() => ({}));
        showToast(data.error || 'Failed to generate recommendations.', 'error');
      }
    } catch (err) {
      console.error('Generation error:', err);
      showToast('Network error during outfit generation.', 'error');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleGenerateFromCanvas = async (canvasGarments: WardrobeItem[]) => {
    if (canvasGarments.length === 0) return;
    const anchorId = canvasGarments[0].id;
    const vibe = `Coordinated ensemble based on: ${canvasGarments.map((g) => g.brand || g.category).join(', ')}`;
    await handleGenerateOutfits(anchorId, vibe);
  };

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] flex flex-col">
      <Navigation wardrobeCount={wardrobe.length} />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-8 space-y-8">
        {/* Stylist Hero Console */}
        <div className="bg-[var(--bg-secondary)]/40 rounded-3xl p-6 sm:p-10 border border-[var(--border-color)] shadow-sm">
          <div className="max-w-3xl">
            <span className="text-[10px] uppercase tracking-[0.35em] font-bold text-[var(--accent)]">
              AI Haute Couture Engine
            </span>
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-serif text-[var(--text-primary)] font-light mt-1">
              Personal Stylist & Lookbook Studio
            </h1>
            <p className="text-xs sm:text-sm text-[var(--text-secondary)] mt-2 leading-relaxed">
              Gemini AI synthesizes your physical measurements, closet inventory, and real-time runway trends into cohesive styling spreads with missing retail piece recommendations.
            </p>

            {/* Vibe Prompt Bar */}
            <div className="mt-6 flex flex-col sm:flex-row gap-3">
              <input
                type="text"
                placeholder="Occasion or vibe (e.g. 'Milan Fashion Week gala', 'Autumn rainy gallery walk')..."
                value={vibePrompt}
                onChange={(e) => setVibePrompt(e.target.value)}
                disabled={isGenerating}
                className="flex-1 px-4 py-3 text-xs bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-xl text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--accent)] shadow-sm"
              />
              <button
                onClick={() => handleGenerateOutfits()}
                disabled={isGenerating}
                className="px-6 py-3 text-xs uppercase tracking-widest font-bold bg-[var(--accent)] text-white hover:bg-[var(--accent-hover)] rounded-xl shadow-md transition-all disabled:opacity-50 flex items-center justify-center gap-2"
              >
                <svg className={`w-4 h-4 ${isGenerating ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                <span>{isGenerating ? 'Consulting Gemini...' : 'Generate New Outfits'}</span>
              </button>
            </div>

            {/* Anchor Pill Indicator */}
            {selectedAnchorId && (
              <div className="flex items-center gap-2 mt-3 text-xs">
                <span className="text-[var(--text-muted)] uppercase tracking-wider font-semibold">
                  Anchored around:
                </span>
                <span className="px-2 py-0.5 bg-[var(--accent)] text-white text-[10px] font-bold rounded-full">
                  {wardrobe.find((i) => i.id === selectedAnchorId)?.brand || 'Garment'}
                </span>
                <button
                  onClick={() => setSelectedAnchorId(null)}
                  className="text-rose-600 hover:underline text-[11px]"
                >
                  Clear Anchor
                </button>
              </div>
            )}
          </div>

          {/* Studio Tab Switcher */}
          <div className="flex items-center space-x-4 mt-8 pt-6 border-t border-[var(--border-color)]">
            <button
              onClick={() => setActiveStudioTab('lookbook')}
              className={`text-xs uppercase tracking-widest font-bold pb-1 border-b-2 transition-all ${
                activeStudioTab === 'lookbook'
                  ? 'text-[var(--text-primary)] border-[var(--accent)]'
                  : 'text-[var(--text-muted)] border-transparent hover:text-[var(--text-primary)]'
              }`}
            >
              Lookbook Magazine ({recommendations.length})
            </button>
            <button
              onClick={() => setActiveStudioTab('canvas')}
              className={`text-xs uppercase tracking-widest font-bold pb-1 border-b-2 transition-all ${
                activeStudioTab === 'canvas'
                  ? 'text-[var(--text-primary)] border-[var(--accent)]'
                  : 'text-[var(--text-muted)] border-transparent hover:text-[var(--text-primary)]'
              }`}
            >
              Interactive Moodboard Canvas
            </button>
          </div>
        </div>

        {/* Tab Contents */}
        {loading ? (
          <div className="space-y-8">
            <Skeleton variant="rect" style={{ height: '300px' }} />
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} variant="card" />
              ))}
            </div>
          </div>
        ) : activeStudioTab === 'canvas' ? (
          <AtelierCanvas
            wardrobe={wardrobe}
            onGenerateFromCanvas={handleGenerateFromCanvas}
            isGenerating={isGenerating}
          />
        ) : (
          <OutfitLookbook
            recommendations={recommendations}
            onSelectAnchor={(id) => {
              setSelectedAnchorId(id);
              handleGenerateOutfits(id);
            }}
            isLoading={isGenerating}
          />
        )}
      </main>

      <Toast toast={toast} onDismiss={() => setToast(null)} />
    </div>
  );
}
