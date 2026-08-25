'use client';

import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Badge } from '@/components/ui/Badge';
import { WhatsNewPost } from '@/lib/whatsNew';

interface EditorialSpreadProps {
  posts: WhatsNewPost[];
  onRefresh?: () => void;
  isLoading?: boolean;
}

export function EditorialSpread({
  posts,
  onRefresh,
  isLoading = false,
}: EditorialSpreadProps) {
  const heroPost = posts[0];
  const secondaryPosts = posts.slice(1);

  return (
    <div className="space-y-12">
      {/* Editorial Spread Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-[var(--border-color)] pb-6">
        <div>
          <span className="text-[10px] uppercase tracking-[0.35em] font-bold text-[var(--accent)]">
            Issue No. 04 • The Contemporary Edit
          </span>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-serif text-[var(--text-primary)] font-light mt-1">
            Haute Couture & Runway Radar
          </h2>
          <p className="text-xs text-[var(--text-secondary)] mt-1 max-w-xl">
            Curated intelligence synthesized from leading fashion houses, global runways, and independent style newsletters.
          </p>
        </div>

        {onRefresh && (
          <button
            onClick={onRefresh}
            disabled={isLoading}
            className="px-4 py-2 text-xs uppercase tracking-widest font-bold border border-[var(--border-color-hover)] hover:bg-[var(--bg-secondary)] rounded-lg transition-colors flex items-center gap-1.5 self-start sm:self-auto"
          >
            <svg
              className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
            <span>{isLoading ? 'Curating...' : 'Refresh Issue'}</span>
          </button>
        )}
      </div>

      {/* Hero Editorial Feature */}
      {heroPost && (
        <article className="relative rounded-3xl overflow-hidden bg-[var(--bg-secondary)] border border-[var(--border-color)] shadow-lg group">
          <div className="grid grid-cols-1 lg:grid-cols-12 min-h-[440px]">
            {/* Hero Image */}
            <div className="relative lg:col-span-7 aspect-[4/3] lg:aspect-auto overflow-hidden">
              <Image
                src={heroPost.imageUrl}
                alt={heroPost.title}
                fill
                priority
                sizes="(max-width: 1024px) 100vw, 60vw"
                className="object-cover transition-transform duration-1000 ease-out group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent lg:hidden" />
            </div>

            {/* Hero Editorial Copy */}
            <div className="lg:col-span-5 p-8 sm:p-12 flex flex-col justify-between bg-[var(--bg-primary)]">
              <div>
                <div className="flex items-center space-x-2 mb-3">
                  <span className="text-[10px] uppercase tracking-[0.25em] font-bold text-[var(--accent)]">
                    Lead Editorial
                  </span>
                  <span className="text-[10px] text-[var(--text-muted)]">• {heroPost.source}</span>
                </div>

                <h3 className="text-2xl sm:text-3xl font-serif text-[var(--text-primary)] font-light leading-tight">
                  {heroPost.title}
                </h3>

                <p className="text-xs sm:text-sm text-[var(--text-secondary)] font-serif italic mt-4 leading-relaxed line-clamp-4">
                  {heroPost.summary}
                </p>
              </div>

              <div className="pt-6 mt-6 border-t border-[var(--border-color)]">
                <div className="flex flex-wrap gap-1.5 mb-4">
                  {heroPost.tags?.map((t, idx) => (
                    <Badge key={idx} variant="default" size="sm">
                      {t}
                    </Badge>
                  ))}
                </div>

                <Link
                  href="/stylist"
                  className="inline-flex items-center space-x-2 text-xs uppercase tracking-widest font-bold text-[var(--accent)] hover:text-[var(--text-primary)] transition-colors"
                >
                  <span>Style Looks Around This Trend</span>
                  <span>→</span>
                </Link>
              </div>
            </div>
          </div>
        </article>
      )}

      {/* Secondary Editorial Grid */}
      {secondaryPosts.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {secondaryPosts.map((post) => (
            <article
              key={post.id}
              className="group flex flex-col bg-[var(--bg-primary)] rounded-2xl overflow-hidden border border-[var(--border-color)] hover:border-[var(--border-color-hover)] hover:shadow-xl transition-all duration-300"
            >
              <div className="relative aspect-[3/2] w-full bg-[var(--bg-secondary)] overflow-hidden">
                <Image
                  src={post.imageUrl}
                  alt={post.title}
                  fill
                  sizes="(max-width: 768px) 100vw, 33vw"
                  className="object-cover transition-transform duration-700 ease-out group-hover:scale-105"
                />
                <div className="absolute top-3 left-3">
                  <span className="text-[9px] uppercase tracking-wider font-bold px-2 py-0.5 bg-black/60 text-white backdrop-blur-sm rounded">
                    {post.source}
                  </span>
                </div>
              </div>

              <div className="p-6 flex flex-col justify-between flex-1 space-y-4">
                <div>
                  <h4 className="text-xl font-serif text-[var(--text-primary)] font-light group-hover:text-[var(--accent)] transition-colors line-clamp-2">
                    {post.title}
                  </h4>
                  <p className="text-xs text-[var(--text-secondary)] mt-2 leading-relaxed line-clamp-3">
                    {post.summary}
                  </p>
                </div>

                <div className="pt-3 border-t border-[var(--border-color)] flex items-center justify-between">
                  <div className="flex flex-wrap gap-1">
                    {post.tags?.slice(0, 2).map((t, idx) => (
                      <Badge key={idx} variant="muted" size="sm">
                        {t}
                      </Badge>
                    ))}
                  </div>
                  <Link
                    href="/stylist"
                    className="text-[11px] uppercase tracking-widest font-bold text-[var(--accent)] hover:underline"
                  >
                    Style →
                  </Link>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
