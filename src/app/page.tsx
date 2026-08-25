'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Navigation } from '@/components/layout/Navigation';
import { EditorialSpread } from '@/features/editorial/EditorialSpread';
import { WhatsNewPost } from '@/lib/whatsNew';
import { Skeleton } from '@/components/ui/Skeleton';
import { Toast, ToastMessage } from '@/components/ui/Toast';

export default function AtelierEditHomePage() {
  const [posts, setPosts] = useState<WhatsNewPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<ToastMessage | null>(null);

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  useEffect(() => {
    let ignore = false;

    async function loadEditorial() {
      try {
        const res = await fetch('/api/feed/whats-new');
        if (res.ok) {
          const data = await res.json();
          if (!ignore) {
            setPosts(data.posts || []);
            setLoading(false);
          }
        }
      } catch (err) {
        console.error('Failed to load editorial feed:', err);
        if (!ignore) {
          showToast('Error loading editorial issue.', 'error');
          setLoading(false);
        }
      }
    }

    loadEditorial();

    return () => {
      ignore = true;
    };
  }, []);

  const handleRefresh = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/feed/whats-new?force=true');
      if (res.ok) {
        const data = await res.json();
        setPosts(data.posts || []);
      }
    } catch (err) {
      console.error('Failed to refresh editorial feed:', err);
      showToast('Error refreshing editorial issue.', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] flex flex-col">
      <Navigation />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-8 space-y-12">
        {/* Editorial Feed */}
        {loading ? (
          <div className="space-y-8">
            <Skeleton variant="rect" style={{ height: '420px', borderRadius: '1.5rem' }} />
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} variant="card" style={{ borderRadius: '1rem' }} />
              ))}
            </div>
          </div>
        ) : (
          <EditorialSpread
            posts={posts}
            onRefresh={handleRefresh}
            isLoading={loading}
          />
        )}

        {/* Feature Highlights Grid */}
        <section className="pt-8 border-t border-[var(--border-color)]">
          <div className="text-center mb-8">
            <span className="text-[10px] uppercase tracking-[0.3em] font-bold text-[var(--accent)]">
              Atelier Suite
            </span>
            <h3 className="text-2xl sm:text-3xl font-serif text-[var(--text-primary)] font-light mt-1">
              Elevate Your Personal Style
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Card 1: Closet */}
            <Link
              href="/closet"
              className="group p-8 bg-[var(--bg-secondary)]/30 rounded-2xl border border-[var(--border-color)] hover:border-[var(--accent)] hover:shadow-lg transition-all"
            >
              <div className="w-12 h-12 rounded-xl bg-[var(--bg-primary)] flex items-center justify-center text-[var(--accent)] mb-4 shadow-sm group-hover:scale-110 transition-transform">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                </svg>
              </div>
              <h4 className="text-xl font-serif text-[var(--text-primary)] font-light">Digital Wardrobe</h4>
              <p className="text-xs text-[var(--text-secondary)] mt-2 leading-relaxed">
                Ingest photos of your clothing pieces. Gemini Vision automatically detects silhouettes, colors, and cuts.
              </p>
              <span className="inline-block mt-4 text-[11px] uppercase tracking-widest font-bold text-[var(--accent)] group-hover:underline">
                Explore Closet →
              </span>
            </Link>

            {/* Card 2: AI Stylist */}
            <Link
              href="/stylist"
              className="group p-8 bg-[var(--bg-secondary)]/30 rounded-2xl border border-[var(--border-color)] hover:border-[var(--accent)] hover:shadow-lg transition-all"
            >
              <div className="w-12 h-12 rounded-xl bg-[var(--bg-primary)] flex items-center justify-center text-[var(--accent)] mb-4 shadow-sm group-hover:scale-110 transition-transform">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                </svg>
              </div>
              <h4 className="text-xl font-serif text-[var(--text-primary)] font-light">AI Stylist & Lookbook</h4>
              <p className="text-xs text-[var(--text-secondary)] mt-2 leading-relaxed">
                Synthesize bespoke looks matching your measurements and current runway movements, paired with shopping links.
              </p>
              <span className="inline-block mt-4 text-[11px] uppercase tracking-widest font-bold text-[var(--accent)] group-hover:underline">
                Open Studio →
              </span>
            </Link>

            {/* Card 3: Trends */}
            <Link
              href="/trends"
              className="group p-8 bg-[var(--bg-secondary)]/30 rounded-2xl border border-[var(--border-color)] hover:border-[var(--accent)] hover:shadow-lg transition-all"
            >
              <div className="w-12 h-12 rounded-xl bg-[var(--bg-primary)] flex items-center justify-center text-[var(--accent)] mb-4 shadow-sm group-hover:scale-110 transition-transform">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
              </div>
              <h4 className="text-xl font-serif text-[var(--text-primary)] font-light">Trend Intelligence</h4>
              <p className="text-xs text-[var(--text-secondary)] mt-2 leading-relaxed">
                Connect RSS feeds from Vogue, Harper&apos;s Bazaar, and Substack newsletters for automated runway trend extraction.
              </p>
              <span className="inline-block mt-4 text-[11px] uppercase tracking-widest font-bold text-[var(--accent)] group-hover:underline">
                View Radar →
              </span>
            </Link>
          </div>
        </section>
      </main>

      {/* Editorial Footer */}
      <footer className="border-t border-[var(--border-color)] py-8 bg-[var(--bg-secondary)]/20 mt-12 text-center">
        <p className="text-xs uppercase tracking-[0.25em] text-[var(--text-muted)] font-semibold">
          Atelier Edit • Haute Couture Wardrobe Engineering
        </p>
      </footer>

      <Toast toast={toast} onDismiss={() => setToast(null)} />
    </div>
  );
}
