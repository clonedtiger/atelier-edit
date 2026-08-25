'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export interface UserSessionState {
  id: string;
  email: string;
  name?: string | null;
  role?: string;
}

interface NavigationProps {
  onOpenUpload?: () => void;
  wardrobeCount?: number;
}

export function Navigation({ onOpenUpload, wardrobeCount }: NavigationProps) {
  const pathname = usePathname();
  const [user, setUser] = useState<UserSessionState | null>(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    async function checkAuth() {
      try {
        const res = await fetch('/api/auth/me');
        if (res.ok) {
          const data = await res.json();
          if (data.authenticated && data.user) {
            setUser(data.user);
          }
        }
      } catch (err) {
        console.error('Session check error:', err);
      }
    }
    checkAuth();
  }, [pathname]);

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      window.location.href = '/';
    } catch (err) {
      console.error('Logout error:', err);
    }
  };

  const navLinks = [
    { href: '/', label: "What's New", key: 'editorial' },
    { href: '/closet', label: 'Closet', key: 'closet', count: wardrobeCount },
    { href: '/stylist', label: 'AI Stylist', key: 'stylist' },
    { href: '/trends', label: 'Trend Radar', key: 'trends' },
    { href: '/account', label: 'Account & Sizing', key: 'account' },
  ];

  if (user?.role === 'admin') {
    navLinks.push({ href: '/admin', label: 'Admin Portal', key: 'admin' });
  }

  const isActive = (href: string) => {
    if (href === '/' && pathname === '/') return true;
    if (href !== '/' && pathname.startsWith(href)) return true;
    return false;
  };

  return (
    <header className="editorial-header sticky top-0 z-40 bg-[var(--bg-primary)]/90 backdrop-blur-md border-b border-[var(--border-color)] transition-all">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        {/* Brand Header */}
        <div className="flex flex-col items-center justify-center py-4">
          <Link href="/" className="group text-center">
            <h1 className="brand-logo text-3xl sm:text-4xl lg:text-5xl font-serif tracking-[0.25em] text-[var(--text-primary)] group-hover:opacity-80 transition-opacity uppercase font-light">
              Atelier Edit
            </h1>
            <p className="brand-subtitle text-[10px] sm:text-xs uppercase tracking-[0.35em] text-[var(--text-secondary)] font-semibold mt-1">
              The Personal Wardrobe Journal
            </p>
          </Link>
        </div>

        {/* Desktop Navigation */}
        <div className="hidden md:flex items-center justify-between py-3 border-t border-[var(--border-color)]/60">
          <nav className="flex items-center space-x-8">
            {navLinks.map((link) => (
              <Link
                key={link.key}
                href={link.href}
                className={`text-xs uppercase tracking-[0.18em] font-semibold pb-1 border-b-2 transition-all duration-200 flex items-center gap-1.5 ${
                  isActive(link.href)
                    ? 'text-[var(--text-primary)] border-[var(--accent)]'
                    : 'text-[var(--text-muted)] border-transparent hover:text-[var(--text-primary)]'
                }`}
              >
                <span>{link.label}</span>
                {typeof link.count === 'number' && (
                  <span className="text-[10px] px-1.5 py-0.2 bg-[var(--bg-tertiary)] text-[var(--text-secondary)] rounded-full font-mono">
                    {link.count}
                  </span>
                )}
              </Link>
            ))}
          </nav>

          {/* Quick Actions */}
          <div className="flex items-center space-x-4">
            {onOpenUpload && (
              <button
                onClick={onOpenUpload}
                className="text-xs uppercase tracking-widest font-semibold px-4 py-2 bg-[var(--accent)] text-white hover:bg-[var(--accent-hover)] rounded transition-all shadow-sm flex items-center gap-1.5"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
                </svg>
                <span>Add Garment</span>
              </button>
            )}

            {user ? (
              <div className="flex items-center space-x-3 text-xs">
                <span className="text-[var(--text-secondary)] uppercase tracking-wider text-[11px]">
                  {user.name || user.email.split('@')[0]}
                </span>
                <button
                  onClick={handleLogout}
                  className="text-[var(--text-muted)] hover:text-rose-600 uppercase tracking-widest text-[11px] font-semibold transition-colors"
                >
                  Sign Out
                </button>
              </div>
            ) : (
              <Link
                href="/account"
                className="text-xs uppercase tracking-widest font-semibold text-[var(--text-primary)] hover:text-[var(--accent)] transition-colors"
              >
                Sign In
              </Link>
            )}
          </div>
        </div>

        {/* Mobile Hamburger Header */}
        <div className="flex md:hidden items-center justify-between py-2 border-t border-[var(--border-color)]/60">
          <span className="text-[11px] uppercase tracking-widest text-[var(--text-muted)] font-semibold">
            {navLinks.find((l) => isActive(l.href))?.label || 'Menu'}
          </span>
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="p-2 text-[var(--text-primary)] hover:text-[var(--accent)]"
            aria-label="Toggle navigation menu"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              {isMobileMenuOpen ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>
        </div>

        {/* Mobile Dropdown Drawer */}
        {isMobileMenuOpen && (
          <div className="md:hidden py-4 border-t border-[var(--border-color)] bg-[var(--bg-primary)] animate-fadeIn">
            <div className="flex flex-col space-y-3">
              {navLinks.map((link) => (
                <Link
                  key={link.key}
                  href={link.href}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={`text-sm uppercase tracking-widest font-semibold px-2 py-1.5 rounded transition-colors ${
                    isActive(link.href)
                      ? 'bg-[var(--bg-secondary)] text-[var(--text-primary)]'
                      : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                  }`}
                >
                  {link.label}
                </Link>
              ))}

              {onOpenUpload && (
                <button
                  onClick={() => {
                    setIsMobileMenuOpen(false);
                    onOpenUpload();
                  }}
                  className="w-full text-center text-xs uppercase tracking-widest font-semibold py-2.5 bg-[var(--accent)] text-white rounded mt-2"
                >
                  + Add Garment
                </button>
              )}

              {user ? (
                <button
                  onClick={handleLogout}
                  className="w-full text-left text-xs uppercase tracking-widest font-semibold py-2 text-rose-600 mt-2"
                >
                  Sign Out ({user.email})
                </button>
              ) : (
                <Link
                  href="/account"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="text-xs uppercase tracking-widest font-semibold py-2 text-[var(--accent)]"
                >
                  Sign In / Register
                </Link>
              )}
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
