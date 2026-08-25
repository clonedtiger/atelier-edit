import React from 'react';

interface SkeletonProps {
  className?: string;
  variant?: 'rect' | 'circle' | 'text' | 'card';
  style?: React.CSSProperties;
}

export function Skeleton({
  className = '',
  variant = 'rect',
  style,
}: SkeletonProps) {
  const variantStyles = {
    rect: 'rounded-md',
    circle: 'rounded-full',
    text: 'h-4 rounded w-full my-1',
    card: 'aspect-[3/4] rounded-lg w-full',
  };

  return (
    <div
      className={`animate-pulse bg-[var(--bg-secondary)]/80 border border-[var(--border-color)]/30 ${variantStyles[variant]} ${className}`}
      style={{
        backgroundImage: 'linear-gradient(90deg, rgba(255,255,255,0) 0, rgba(255,255,255,0.2) 20%, rgba(255,255,255,0.5) 60%, rgba(255,255,255,0))',
        backgroundSize: '200% 100%',
        ...style,
      }}
    />
  );
}
