'use client';

import { SafeImage } from './SafeImage';
import { useState } from 'react';

export interface OutfitItem {
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
  wardrobeItemLabel?: string | null;
}

export interface OutfitLook {
  id: string;
  title: string;
  narrative: string;
  createdAt: string;
  feedback?: string | null;
  wornAt?: string | null;
  outfitItems: OutfitItem[];
}

export type OutfitFeedbackAction = 'love' | 'dismiss' | 'clear' | 'wore';

interface OutfitCardProps {
  look: OutfitLook;
  onFeedback: (action: OutfitFeedbackAction) => void;
  onDelete: () => void;
}

function itemName(item: OutfitItem): string {
  if (item.wardrobeItemId) return item.wardrobeItemLabel || item.wardrobeItemCategory || 'From your wardrobe';
  return item.purchaseName || 'Suggested piece';
}

/**
 * A look as a compact flat-lay strip: one row of pieces with their names, the styling
 * notes tucked behind "Why it works", and Love / Wore it / Not for me feedback.
 */
export function OutfitCard({ look, onFeedback, onDelete }: OutfitCardProps) {
  const loved = look.feedback === 'loved';
  const dismissed = look.feedback === 'dismissed';
  const wornToday = look.wornAt ? new Date(look.wornAt).toDateString() === new Date().toDateString() : false;
  const [expanded, setExpanded] = useState(false);

  if (dismissed) {
    return (
      <article className="outfit-card outfit-card-dismissed">
        <p>
          You passed on <em>{look.title}</em>. Future looks will steer away from it.
        </p>
        <div className="outfit-card-dismissed-actions">
          <button type="button" className="guide-helper-btn" onClick={() => onFeedback('clear')}>Undo</button>
          <button type="button" className="guide-helper-btn" onClick={onDelete}>Remove</button>
        </div>
      </article>
    );
  }

  return (
    <article className="outfit-card">
      <header className="outfit-card-header">
        <div>
          <p className="outfit-card-date">
            {new Date(look.createdAt).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}
            {look.wornAt && ` · Worn ${new Date(look.wornAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}`}
          </p>
          <h3 className="outfit-card-title">{look.title}</h3>
        </div>
        <button type="button" className="outfit-card-delete" onClick={onDelete} aria-label={`Delete ${look.title}`}>
          Delete
        </button>
      </header>

      <p className={`outfit-card-narrative ${expanded ? 'expanded' : ''}`}>{look.narrative}</p>

      <ul className="outfit-strip">
        {look.outfitItems.map((item) => {
          const image = item.wardrobeItemId ? item.wardrobeItemImage : item.purchaseImageUrl;
          return (
            <li key={item.id} className="outfit-piece">
              <div className="outfit-piece-image">
                {(() => {
                  const placeholder = (
                    <div className="outfit-piece-placeholder">
                      {item.purchaseBrand && <span>{item.purchaseBrand}</span>}
                      <strong>{item.purchaseName || item.wardrobeItemCategory || 'Piece'}</strong>
                    </div>
                  );
                  return image ? (
                    <SafeImage src={image} alt={itemName(item)} fill sizes="(max-width: 768px) 40vw, 160px" style={{ objectFit: 'cover' }} fallback={placeholder} />
                  ) : (
                    placeholder
                  );
                })()}
              </div>
              <p className="outfit-piece-source">{item.wardrobeItemId ? 'Yours' : 'To buy'}</p>
              <p className="outfit-piece-name">{itemName(item)}</p>
              {!item.wardrobeItemId && (
                <p className="outfit-piece-buy">
                  {item.priceEstimate && <span>{item.priceEstimate}</span>}
                  {item.purchaseUrl && (
                    <a href={item.purchaseUrl} target="_blank" rel="noopener noreferrer">Shop</a>
                  )}
                </p>
              )}
            </li>
          );
        })}
      </ul>

      <details className="outfit-card-why" onToggle={(e) => setExpanded(e.currentTarget.open)}>
        <summary>Why it works</summary>
        <ul>
          {look.outfitItems.map((item) => (
            <li key={item.id}>
              <strong>{itemName(item)}.</strong> {item.stylingRationale}
            </li>
          ))}
        </ul>
      </details>

      <footer className="outfit-card-actions">
        <button
          type="button"
          className={`outfit-action ${loved ? 'selected' : ''}`}
          aria-pressed={loved}
          onClick={() => onFeedback(loved ? 'clear' : 'love')}
        >
          {loved ? '♥ Loved' : '♡ Love'}
        </button>
        <button
          type="button"
          className={`outfit-action ${wornToday ? 'selected' : ''}`}
          aria-pressed={wornToday}
          disabled={wornToday}
          onClick={() => onFeedback('wore')}
        >
          {wornToday ? '✓ Worn today' : 'Wore it'}
        </button>
        <button type="button" className="outfit-action subtle" onClick={() => onFeedback('dismiss')}>
          Not for me
        </button>
      </footer>
    </article>
  );
}
