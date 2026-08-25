'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { Badge } from '@/components/ui/Badge';

export interface WardrobeItem {
  id: string;
  imageUrl: string;
  category: string;
  color: string[];
  brand: string | null;
  styleNotes: string | null;
  detectedTags: string[];
  createdAt: string;
}

interface GarmentCardProps {
  item: WardrobeItem;
  onSelect?: (item: WardrobeItem) => void;
  onAnchor?: (item: WardrobeItem) => void;
  onDelete?: (id: string) => void;
  isSelected?: boolean;
  isAnchored?: boolean;
  selectable?: boolean;
}

export function GarmentCard({
  item,
  onSelect,
  onAnchor,
  onDelete,
  isSelected = false,
  isAnchored = false,
  selectable = false,
}: GarmentCardProps) {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <div
      className={`group relative flex flex-col bg-[var(--bg-primary)] rounded-lg overflow-hidden border transition-all duration-300 ${
        isAnchored
          ? 'ring-2 ring-[var(--accent)] shadow-lg'
          : isSelected
          ? 'border-[var(--text-primary)] shadow-md'
          : 'border-[var(--border-color)] hover:border-[var(--border-color-hover)] hover:shadow-xl'
      }`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Garment Visual */}
      <div className="relative aspect-[3/4] w-full bg-[var(--bg-secondary)] overflow-hidden">
        <Image
          src={item.imageUrl}
          alt={item.styleNotes || `${item.brand || ''} ${item.category}`}
          fill
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
          className={`object-cover object-center transition-transform duration-700 ease-out ${
            isHovered ? 'scale-105' : 'scale-100'
          }`}
        />

        {/* Selection Checkbox Pill */}
        {selectable && onSelect && (
          <div className="absolute top-3 left-3 z-10">
            <input
              type="checkbox"
              checked={isSelected}
              onChange={() => onSelect(item)}
              aria-label={`Select ${item.category}`}
              className="w-5 h-5 accent-[var(--accent)] cursor-pointer rounded shadow"
            />
          </div>
        )}

        {/* Anchor Indicator / Badge */}
        {isAnchored && (
          <div className="absolute top-3 right-3 z-10">
            <span className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest bg-[var(--accent)] text-white rounded-full shadow-md">
              ★ Anchored
            </span>
          </div>
        )}

        {/* Quick Action Overlay on Hover */}
        <div
          className={`absolute inset-0 bg-black/40 backdrop-blur-[2px] flex flex-col justify-end p-4 transition-opacity duration-200 ${
            isHovered ? 'opacity-100' : 'opacity-0 pointer-events-none'
          }`}
        >
          <div className="flex items-center gap-2 mb-2">
            {onAnchor && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onAnchor(item);
                }}
                className={`flex-1 text-[11px] font-bold uppercase tracking-wider py-2 px-3 rounded transition-colors shadow ${
                  isAnchored
                    ? 'bg-rose-700 hover:bg-rose-800 text-white'
                    : 'bg-white hover:bg-[var(--bg-secondary)] text-[var(--text-primary)]'
                }`}
              >
                {isAnchored ? 'Remove Anchor' : 'Anchor Look'}
              </button>
            )}
            {onDelete && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  if (confirm('Are you sure you want to remove this garment from your closet?')) {
                    onDelete(item.id);
                  }
                }}
                className="p-2 bg-black/60 hover:bg-rose-700 text-white rounded transition-colors"
                aria-label="Delete garment"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Garment Metadata Editorial Card */}
      <div className="p-4 flex flex-col justify-between flex-1 bg-[var(--bg-primary)]">
        <div>
          <div className="flex items-center justify-between gap-2 mb-1">
            <span className="text-xs uppercase tracking-widest font-bold text-[var(--accent)]">
              {item.category}
            </span>
            {item.brand && (
              <span className="text-xs font-serif italic text-[var(--text-secondary)] truncate">
                {item.brand}
              </span>
            )}
          </div>

          {item.styleNotes && (
            <p className="text-xs text-[var(--text-secondary)] line-clamp-2 leading-relaxed mb-3">
              {item.styleNotes}
            </p>
          )}
        </div>

        {/* Detected Tags Pills */}
        <div className="flex flex-wrap gap-1 mt-auto pt-2 border-t border-[var(--border-color)]/50">
          {item.color?.map((c, i) => (
            <Badge key={`color-${i}`} variant="muted" size="sm">
              {c}
            </Badge>
          ))}
          {item.detectedTags?.slice(0, 2).map((tag, i) => (
            <Badge key={`tag-${i}`} variant="default" size="sm">
              {tag}
            </Badge>
          ))}
          {item.detectedTags && item.detectedTags.length > 2 && (
            <span className="text-[10px] text-[var(--text-muted)] self-center">
              +{item.detectedTags.length - 2}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
