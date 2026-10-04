'use client';

import Image, { type ImageProps } from 'next/image';
import { useState, type ReactNode } from 'react';

/**
 * next/image that swaps in `fallback` (default: nothing) if the source fails to load,
 * so a dead link shows a neutral tile instead of broken-image alt text.
 */
export function SafeImage({ fallback = null, ...props }: ImageProps & { fallback?: ReactNode }) {
  const [failed, setFailed] = useState(false);
  if (failed) return <>{fallback}</>;
  // eslint-disable-next-line jsx-a11y/alt-text -- alt is passed through in props
  return <Image {...props} onError={() => setFailed(true)} />;
}
