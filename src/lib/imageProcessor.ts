import sharp from 'sharp';

export interface CropOptions {
  paddingPercent?: number; // default 0.04 (4%)
  maxWidth?: number; // default 1080
  maxHeight?: number; // default 1080
  quality?: number; // default 80
}

/**
 * Crops a specific region from an image buffer using normalized coordinates [ymin, xmin, ymax, xmax] (0..1000 scale),
 * adds a gentle padding margin so the garment isn't sliced too tightly, and compresses to WebP.
 * If box2d is null/undefined, degenerate, or encompasses the full image, compresses the full image.
 */
export async function cropAndCompressItem(
  imageBuffer: Buffer,
  box2d?: [number, number, number, number] | null,
  options: CropOptions = {}
): Promise<Buffer> {
  const {
    paddingPercent = 0.04,
    maxWidth = 1080,
    maxHeight = 1080,
    quality = 80,
  } = options;

  // Auto-rotate according to EXIF orientation metadata
  const oriented = sharp(imageBuffer).rotate();
  const metadata = await oriented.metadata();

  const imgWidth = metadata.width || 1080;
  const imgHeight = metadata.height || 1080;

  if (box2d && Array.isArray(box2d) && box2d.length === 4) {
    let [ymin, xmin, ymax, xmax] = box2d;

    // Sanitize
    ymin = Math.max(0, Math.min(1000, Number(ymin) || 0));
    xmin = Math.max(0, Math.min(1000, Number(xmin) || 0));
    ymax = Math.max(0, Math.min(1000, Number(ymax) || 0));
    xmax = Math.max(0, Math.min(1000, Number(xmax) || 0));

    if (ymin > ymax) [ymin, ymax] = [ymax, ymin];
    if (xmin > xmax) [xmin, xmax] = [xmax, xmin];

    const boxH = ymax - ymin;
    const boxW = xmax - xmin;

    if (boxH > 10 && boxW > 10) {
      // Calculate padding in 0..1000 units
      const padY = Math.round(boxH * paddingPercent);
      const padX = Math.round(boxW * paddingPercent);

      const paddedYmin = Math.max(0, ymin - padY);
      const paddedXmin = Math.max(0, xmin - padX);
      const paddedYmax = Math.min(1000, ymax + padY);
      const paddedXmax = Math.min(1000, xmax + padX);

      // Convert to exact pixel coordinates
      const left = Math.round((paddedXmin / 1000) * imgWidth);
      const top = Math.round((paddedYmin / 1000) * imgHeight);
      const right = Math.min(imgWidth, Math.round((paddedXmax / 1000) * imgWidth));
      const bottom = Math.min(imgHeight, Math.round((paddedYmax / 1000) * imgHeight));

      const cropWidth = Math.max(1, right - left);
      const cropHeight = Math.max(1, bottom - top);

      if (cropWidth >= 20 && cropHeight >= 20) {
        return await sharp(imageBuffer)
          .rotate()
          .extract({
            left,
            top,
            width: cropWidth,
            height: cropHeight,
          })
          .resize({
            width: maxWidth,
            height: maxHeight,
            fit: 'inside',
            withoutEnlargement: true,
          })
          .webp({ quality })
          .toBuffer();
      }
    }
  }

  // Fallback: full image resized to max dimensions and converted to WebP
  return await sharp(imageBuffer)
    .rotate()
    .resize({
      width: maxWidth,
      height: maxHeight,
      fit: 'inside',
      withoutEnlargement: true,
    })
    .webp({ quality })
    .toBuffer();
}
