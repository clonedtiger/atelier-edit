'use client';

import React from 'react';
import Image from 'next/image';

export interface RecommendationItem {
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

export interface Recommendation {
  id: string;
  title: string;
  narrative: string;
  createdAt: string;
  outfitItems: RecommendationItem[];
}

interface OutfitLookbookProps {
  recommendations: Recommendation[];
  onSelectAnchor?: (wardrobeItemId: string) => void;
  isLoading?: boolean;
}

export function OutfitLookbook({
  recommendations,
  onSelectAnchor,
  isLoading = false,
}: OutfitLookbookProps) {
  if (recommendations.length === 0 && !isLoading) {
    return (
      <div className="text-center py-16 px-4 bg-[var(--bg-secondary)]/30 rounded-2xl border border-[var(--border-color)]">
        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-[var(--bg-primary)] flex items-center justify-center text-[var(--accent)]">
          <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="1.5"
              d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z"
            />
          </svg>
        </div>
        <h3 className="text-xl font-serif tracking-tight text-[var(--text-primary)]">
          No Stylist Consultations Yet
        </h3>
        <p className="text-xs uppercase tracking-widest text-[var(--text-muted)] max-w-md mx-auto mt-2 leading-relaxed">
          Generate bespoke looks tailored to your wardrobe, sizing measurements, and live runway trends above.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-12">
      {recommendations.map((rec, idx) => (
        <article
          key={rec.id}
          className="bg-[var(--bg-primary)] rounded-2xl border border-[var(--border-color)] shadow-sm hover:shadow-md transition-shadow overflow-hidden"
        >
          {/* Editorial Outfit Header */}
          <div className="p-6 sm:p-8 bg-[var(--bg-secondary)]/40 border-b border-[var(--border-color)]">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <span className="text-[10px] uppercase tracking-[0.3em] font-bold text-[var(--accent)]">
                  Look {idx + 1} • Editorial Ensemble
                </span>
                <h2 className="text-2xl sm:text-3xl font-serif text-[var(--text-primary)] mt-1 font-light">
                  {rec.title}
                </h2>
              </div>
              <span className="text-[11px] text-[var(--text-muted)] font-mono self-start md:self-auto">
                {new Date(rec.createdAt).toLocaleDateString(undefined, {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                })}
              </span>
            </div>

            {/* Stylist Narrative */}
            <p className="text-sm sm:text-base text-[var(--text-secondary)] font-serif italic mt-4 leading-relaxed max-w-4xl">
              &ldquo;{rec.narrative}&rdquo;
            </p>
          </div>

          {/* Outfit Items Grid */}
          <div className="p-6 sm:p-8">
            <h3 className="text-xs uppercase tracking-widest font-bold text-[var(--text-primary)] mb-6">
              Curated Outfit Composition ({rec.outfitItems?.length || 0} Pieces)
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {rec.outfitItems?.map((item) => {
                const isOwned = Boolean(item.wardrobeItemId);
                const imageUrl = item.wardrobeItemImage || item.purchaseImageUrl;
                const title = isOwned
                  ? item.wardrobeItemCategory || 'Wardrobe Garment'
                  : item.purchaseName || 'Curated Acquisition';
                const brand = item.purchaseBrand || (isOwned ? 'From Your Closet' : null);

                return (
                  <div
                    key={item.id}
                    className="flex flex-col bg-[var(--bg-secondary)]/20 rounded-xl overflow-hidden border border-[var(--border-color)] hover:border-[var(--border-color-hover)] transition-all"
                  >
                    {/* Visual */}
                    <div className="relative aspect-[3/4] w-full bg-[var(--bg-secondary)] overflow-hidden">
                      {imageUrl ? (
                        <Image
                          src={imageUrl}
                          alt={title}
                          fill
                          sizes="(max-width: 640px) 100vw, 25vw"
                          className="object-cover transition-transform duration-500 hover:scale-105"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-xs text-[var(--text-muted)] uppercase tracking-wider">
                          No Visual
                        </div>
                      )}

                      {/* Source Badge */}
                      <div className="absolute top-2.5 left-2.5">
                        <span
                          className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full shadow-sm ${
                            isOwned
                              ? 'bg-[var(--accent)] text-white'
                              : 'bg-[var(--text-primary)] text-white'
                          }`}
                        >
                          {isOwned ? 'In Closet' : 'Suggested Purchase'}
                        </span>
                      </div>

                      {/* Price Tag if Suggested Purchase */}
                      {!isOwned && item.priceEstimate && (
                        <div className="absolute bottom-2.5 right-2.5">
                          <span className="text-[10px] font-mono font-bold px-2 py-0.5 bg-white/90 text-[var(--text-primary)] rounded shadow-sm">
                            {item.priceEstimate}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Content & Styling Rationale */}
                    <div className="p-4 flex flex-col justify-between flex-1 space-y-3">
                      <div>
                        <div className="flex items-center justify-between gap-1">
                          <span className="text-xs uppercase font-bold text-[var(--text-primary)] truncate">
                            {title}
                          </span>
                        </div>
                        {brand && (
                          <span className="text-[11px] font-serif italic text-[var(--text-muted)] block">
                            {brand}
                          </span>
                        )}
                        <p className="text-xs text-[var(--text-secondary)] mt-2 leading-relaxed">
                          {item.stylingRationale}
                        </p>
                      </div>

                      {/* Action Button */}
                      {!isOwned && item.purchaseUrl && (
                        <a
                          href={item.purchaseUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="mt-auto block text-center text-[11px] uppercase tracking-widest font-bold py-2 bg-[var(--text-primary)] text-white hover:bg-[var(--accent)] rounded transition-colors"
                        >
                          Shop at {item.purchaseBrand || 'Retailer'} →
                        </a>
                      )}

                      {isOwned && item.wardrobeItemId && onSelectAnchor && (
                        <button
                          onClick={() => onSelectAnchor(item.wardrobeItemId!)}
                          className="mt-auto block w-full text-center text-[11px] uppercase tracking-widest font-bold py-2 border border-[var(--border-color-hover)] text-[var(--text-primary)] hover:bg-[var(--bg-secondary)] rounded transition-colors"
                        >
                          Anchor New Looks Around This
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </article>
      ))}
    </div>
  );
}
