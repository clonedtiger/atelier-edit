import { shortPieceName, pieceLabel } from '@/lib/pieceName';

describe('pieceName helpers', () => {
  it('shortens style notes to the garment name', () => {
    expect(shortPieceName('Straight-leg trousers cut from buttery matte lamb leather.', 'Bottoms')).toBe('Straight-leg trousers');
    expect(shortPieceName('Semi-sheer silk chiffon blouse with tie-neck lavallière bow', 'Tops')).toBe('Semi-sheer silk chiffon blouse');
    expect(shortPieceName('classic double-breasted trench coat in water-repellent cotton', 'Outerwear')).toBe('Classic double-breasted trench coat');
  });

  it('falls back to the category when notes are missing', () => {
    expect(shortPieceName(null, 'Shoes')).toBe('Shoes');
    expect(shortPieceName('', null)).toBe('Piece');
  });

  it('prefixes the brand when known', () => {
    expect(pieceLabel('AllSaints', 'Chunky sole combat boots in matte leather', 'Shoes')).toBe('AllSaints · Chunky sole combat boots');
    expect(pieceLabel(null, 'Chunky sole combat boots in matte leather', 'Shoes')).toBe('Chunky sole combat boots');
  });
});
