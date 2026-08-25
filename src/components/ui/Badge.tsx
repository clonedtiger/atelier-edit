import React from 'react';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'default' | 'accent' | 'outline' | 'muted';
  size?: 'sm' | 'md';
  onClick?: () => void;
  className?: string;
}

export function Badge({
  children,
  variant = 'default',
  size = 'sm',
  onClick,
  className = '',
}: BadgeProps) {
  const baseStyles = 'inline-flex items-center font-medium tracking-wider uppercase transition-all duration-200';
  
  const sizeStyles = {
    sm: 'text-[10px] px-2 py-0.5 rounded-full',
    md: 'text-xs px-2.5 py-1 rounded-full',
  };

  const variantStyles = {
    default: 'bg-[var(--bg-secondary)] text-[var(--text-primary)] border border-[var(--border-color)]',
    accent: 'bg-[var(--accent)] text-white border border-[var(--accent)]',
    outline: 'bg-transparent text-[var(--text-secondary)] border border-[var(--border-color-hover)] hover:border-[var(--text-primary)] hover:text-[var(--text-primary)]',
    muted: 'bg-[rgba(24,24,26,0.04)] text-[var(--text-muted)] border border-transparent',
  };

  const clickableStyles = onClick ? 'cursor-pointer hover:scale-105 active:scale-95' : '';

  return (
    <span
      onClick={onClick}
      className={`${baseStyles} ${sizeStyles[size]} ${variantStyles[variant]} ${clickableStyles} ${className}`}
      style={{ letterSpacing: '0.12em' }}
    >
      {children}
    </span>
  );
}
