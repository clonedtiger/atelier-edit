const CUT_MARKERS = [',', '.', ';', ' with ', ' in ', ' cut from ', ' crafted', ' featuring', ' made from ', ' spun from ', ' that ', ' for '];

/**
 * Derives a short display name for a wardrobe piece from its style notes, e.g.
 * "Straight-leg trousers cut from buttery matte lamb leather…" → "Straight-leg trousers".
 * Falls back to the category when there are no usable notes.
 */
export function shortPieceName(styleNotes: string | null | undefined, category: string | null | undefined): string {
  const fallback = category || 'Piece';
  const notes = (styleNotes || '').trim();
  if (!notes) return fallback;

  let cut = notes.length;
  const lower = notes.toLowerCase();
  for (const marker of CUT_MARKERS) {
    const idx = lower.indexOf(marker);
    if (idx > 0 && idx < cut) cut = idx;
  }

  const words = notes.slice(0, cut).trim().split(/\s+/).slice(0, 6);
  const name = words.join(' ');
  if (name.length < 3) return fallback;
  return name.charAt(0).toUpperCase() + name.slice(1);
}

/** "AllSaints · Straight-leg trousers", or just the short name when the brand is unknown. */
export function pieceLabel(brand: string | null | undefined, styleNotes: string | null | undefined, category: string | null | undefined): string {
  const name = shortPieceName(styleNotes, category);
  return brand ? `${brand} · ${name}` : name;
}
