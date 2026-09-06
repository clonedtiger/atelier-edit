import sharp from 'sharp';
import { cropAndCompressItem } from '@/lib/imageProcessor';

describe('imageProcessor - cropAndCompressItem', () => {
  let sampleImageBuffer: Buffer;

  beforeAll(async () => {
    // Generate a 400x300 sample image buffer with sharp
    sampleImageBuffer = await sharp({
      create: {
        width: 400,
        height: 300,
        channels: 4,
        background: { r: 100, g: 150, b: 200, alpha: 1 },
      },
    })
      .png()
      .toBuffer();
  });

  it('should crop a subregion when given valid normalized [ymin, xmin, ymax, xmax] coordinates', async () => {
    // Coordinates representing top-left quadrant with some padding: y: [100, 400], x: [100, 400]
    const box2d: [number, number, number, number] = [100, 100, 400, 400];

    const croppedBuffer = await cropAndCompressItem(sampleImageBuffer, box2d);
    expect(croppedBuffer).toBeInstanceOf(Buffer);

    // Verify metadata of resulting cropped buffer
    const meta = await sharp(croppedBuffer).metadata();
    expect(meta.format).toBe('webp');
    expect(meta.width).toBeGreaterThan(20);
    expect(meta.height).toBeGreaterThan(20);
  });

  it('should fallback to compressing the full image when box2d is null or undefined', async () => {
    const fullBuffer = await cropAndCompressItem(sampleImageBuffer, null);
    expect(fullBuffer).toBeInstanceOf(Buffer);

    const meta = await sharp(fullBuffer).metadata();
    expect(meta.format).toBe('webp');
    // Dimensions should match original 400x300
    expect(meta.width).toBe(400);
    expect(meta.height).toBe(300);
  });

  it('should fallback to full image when box coordinates are degenerate or zero area', async () => {
    const degenerateBox: [number, number, number, number] = [200, 200, 200, 200];
    const resultBuffer = await cropAndCompressItem(sampleImageBuffer, degenerateBox);
    expect(resultBuffer).toBeInstanceOf(Buffer);

    const meta = await sharp(resultBuffer).metadata();
    expect(meta.format).toBe('webp');
    expect(meta.width).toBe(400);
    expect(meta.height).toBe(300);
  });

  it('should clamp out-of-bounds coordinates cleanly without throwing', async () => {
    const outOfBoundsBox: [number, number, number, number] = [-200, -100, 1500, 1200];
    const resultBuffer = await cropAndCompressItem(sampleImageBuffer, outOfBoundsBox);
    expect(resultBuffer).toBeInstanceOf(Buffer);

    const meta = await sharp(resultBuffer).metadata();
    expect(meta.format).toBe('webp');
    expect(meta.width).toBeGreaterThan(0);
    expect(meta.height).toBeGreaterThan(0);
  });
});
