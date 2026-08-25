'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { WardrobeItem } from '../closet/GarmentCard';

interface CanvasGarment {
  item: WardrobeItem;
  x: number;
  y: number;
  scale: number;
  zIndex: number;
}

interface AtelierCanvasProps {
  wardrobe: WardrobeItem[];
  onGenerateFromCanvas: (canvasItems: WardrobeItem[]) => void;
  isGenerating?: boolean;
}

export function AtelierCanvas({
  wardrobe,
  onGenerateFromCanvas,
  isGenerating = false,
}: AtelierCanvasProps) {
  const [canvasItems, setCanvasItems] = useState<CanvasGarment[]>([]);
  const [selectedCanvasIdx, setSelectedCanvasIdx] = useState<number | null>(null);

  const handleAddItemToCanvas = (item: WardrobeItem) => {
    // Avoid duplicate item on canvas
    if (canvasItems.some((c) => c.item.id === item.id)) return;

    const offset = canvasItems.length * 30;
    const newCanvasItem: CanvasGarment = {
      item,
      x: 60 + (offset % 200),
      y: 60 + (offset % 200),
      scale: 1,
      zIndex: canvasItems.length + 1,
    };

    setCanvasItems((prev) => [...prev, newCanvasItem]);
    setSelectedCanvasIdx(canvasItems.length);
  };

  const handleRemoveFromCanvas = (idx: number) => {
    setCanvasItems((prev) => prev.filter((_, i) => i !== idx));
    setSelectedCanvasIdx(null);
  };

  const handleClearCanvas = () => {
    setCanvasItems([]);
    setSelectedCanvasIdx(null);
  };


  return (
    <div className="bg-[var(--bg-primary)] rounded-2xl border border-[var(--border-color)] overflow-hidden shadow-sm">
      {/* Canvas Top Bar */}
      <div className="p-4 sm:p-6 bg-[var(--bg-secondary)]/40 border-b border-[var(--border-color)] flex flex-wrap items-center justify-between gap-4">
        <div>
          <span className="text-[10px] uppercase tracking-[0.3em] font-bold text-[var(--accent)]">
            Lookbook Studio
          </span>
          <h3 className="text-xl sm:text-2xl font-serif text-[var(--text-primary)] font-light">
            Atelier Moodboard Canvas
          </h3>
          <p className="text-xs text-[var(--text-secondary)] mt-0.5">
            Stage garment combinations visually. Arrange tops, bottoms, outerwear, and accessories.
          </p>
        </div>

        {/* Canvas Controls */}
        <div className="flex items-center space-x-3">
          {canvasItems.length > 0 && (
            <button
              onClick={handleClearCanvas}
              disabled={isGenerating}
              className="px-3 py-1.5 text-xs uppercase tracking-widest font-semibold text-rose-600 hover:bg-rose-50 rounded transition-colors"
            >
              Clear Canvas
            </button>
          )}

          <button
            onClick={() => onGenerateFromCanvas(canvasItems.map((c) => c.item))}
            disabled={isGenerating || canvasItems.length === 0}
            className="px-5 py-2 text-xs uppercase tracking-widest font-bold bg-[var(--accent)] text-white hover:bg-[var(--accent-hover)] rounded-lg shadow-sm transition-all disabled:opacity-50 flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="1.5"
                d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z"
              />
            </svg>
            <span>{isGenerating ? 'Synthesizing...' : `AI Complete Ensemble (${canvasItems.length})`}</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 min-h-[460px]">
        {/* Garment Selector Tray */}
        <div className="p-4 border-r border-[var(--border-color)] bg-[var(--bg-secondary)]/20 overflow-y-auto max-h-[500px]">
          <h4 className="text-xs uppercase tracking-widest font-bold text-[var(--text-primary)] mb-3">
            Add from Closet ({wardrobe.length})
          </h4>

          {wardrobe.length === 0 ? (
            <p className="text-xs text-[var(--text-muted)] italic">No items in closet yet.</p>
          ) : (
            <div className="grid grid-cols-2 gap-2.5">
              {wardrobe.map((item) => {
                const isAdded = canvasItems.some((c) => c.item.id === item.id);
                return (
                  <button
                    key={item.id}
                    onClick={() => handleAddItemToCanvas(item)}
                    disabled={isAdded}
                    className={`group relative aspect-[3/4] rounded-lg overflow-hidden border text-left transition-all ${
                      isAdded
                        ? 'opacity-40 border-dashed border-[var(--border-color)]'
                        : 'hover:border-[var(--accent)] hover:shadow-md'
                    }`}
                  >
                    <Image
                      src={item.imageUrl}
                      alt={item.category}
                      fill
                      sizes="120px"
                      className="object-cover"
                    />
                    <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-1.5">
                      <span className="text-[10px] text-white font-semibold uppercase tracking-wider block truncate">
                        {item.brand || item.category}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Visual Canvas Drop Area */}
        <div className="lg:col-span-3 relative bg-[var(--bg-primary)] p-6 flex items-center justify-center overflow-hidden min-h-[400px]">
          {canvasItems.length === 0 ? (
            <div className="text-center text-[var(--text-muted)] space-y-2">
              <svg className="w-10 h-10 mx-auto opacity-40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="1"
                  d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z"
                />
              </svg>
              <p className="text-xs uppercase tracking-widest">Select Garments from the Left Tray to Stage Your Look</p>
            </div>
          ) : (
            <div className="w-full h-full flex flex-wrap items-center justify-center gap-6 p-4">
              {canvasItems.map((canvasItem, idx) => (
                <div
                  key={canvasItem.item.id}
                  onClick={() => setSelectedCanvasIdx(idx)}
                  className={`relative w-40 sm:w-48 aspect-[3/4] rounded-xl overflow-hidden bg-[var(--bg-secondary)] border-2 transition-all cursor-pointer shadow-md hover:shadow-xl ${
                    selectedCanvasIdx === idx
                      ? 'border-[var(--accent)] scale-105 ring-2 ring-[var(--accent)]/30'
                      : 'border-[var(--border-color)]'
                  }`}
                  style={{ zIndex: canvasItem.zIndex }}
                >
                  <Image
                    src={canvasItem.item.imageUrl}
                    alt={canvasItem.item.category}
                    fill
                    sizes="200px"
                    className="object-cover"
                  />

                  {/* Item Overlay */}
                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-3 text-white">
                    <span className="text-[10px] uppercase tracking-wider font-bold block">
                      {canvasItem.item.category}
                    </span>
                    {canvasItem.item.brand && (
                      <span className="text-[11px] font-serif italic text-white/80 block truncate">
                        {canvasItem.item.brand}
                      </span>
                    )}
                  </div>

                  {/* Remove Button */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRemoveFromCanvas(idx);
                    }}
                    className="absolute top-2 right-2 p-1 bg-black/60 hover:bg-rose-700 text-white rounded-full text-xs transition-colors"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
