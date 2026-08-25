'use client';

import React, { useState } from 'react';
import { Badge } from '@/components/ui/Badge';

export interface FeedSource {
  id: string;
  name: string;
  url: string;
  type: string;
  isMuted: boolean;
  createdAt: string;
}

interface TrendRadarProps {
  feeds: FeedSource[];
  onToggleMute: (feedId: string, isMuted: boolean) => Promise<void>;
  onAddFeed: (name: string, url: string, type: string) => Promise<void>;
  onSyncFeeds: () => Promise<void>;
  isSyncing?: boolean;
}

export function TrendRadar({
  feeds,
  onToggleMute,
  onAddFeed,
  onSyncFeeds,
  isSyncing = false,
}: TrendRadarProps) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [newFeedName, setNewFeedName] = useState('');
  const [newFeedUrl, setNewFeedUrl] = useState('');
  const [newFeedType, setNewFeedType] = useState('rss');
  const [isAdding, setIsAdding] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFeedUrl.trim() || !newFeedName.trim()) return;

    setIsAdding(true);
    try {
      await onAddFeed(newFeedName.trim(), newFeedUrl.trim(), newFeedType);
      setNewFeedName('');
      setNewFeedUrl('');
      setShowAddForm(false);
    } finally {
      setIsAdding(false);
    }
  };

  return (
    <div className="bg-[var(--bg-primary)] rounded-2xl border border-[var(--border-color)] p-6 sm:p-8 shadow-sm">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-[var(--border-color)]">
        <div>
          <span className="text-[10px] uppercase tracking-[0.3em] font-bold text-[var(--accent)]">
            Intelligence Engine
          </span>
          <h2 className="text-2xl sm:text-3xl font-serif text-[var(--text-primary)] font-light mt-1">
            Fashion Intelligence & Trend Radar
          </h2>
          <p className="text-xs text-[var(--text-secondary)] mt-1">
            Live RSS, YouTube, and Substack fashion publications parsed by Gemini AI to extract real-time runway trends.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={onSyncFeeds}
            disabled={isSyncing}
            className="px-4 py-2 text-xs uppercase tracking-widest font-bold border border-[var(--border-color-hover)] hover:bg-[var(--bg-secondary)] rounded-lg transition-colors flex items-center gap-1.5"
          >
            <svg
              className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`}
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
            <span>{isSyncing ? 'Syncing...' : 'Sync Feeds'}</span>
          </button>

          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="px-4 py-2 text-xs uppercase tracking-widest font-bold bg-[var(--accent)] text-white hover:bg-[var(--accent-hover)] rounded-lg shadow-sm transition-colors"
          >
            {showAddForm ? 'Cancel' : '+ Add Outlet'}
          </button>
        </div>
      </div>

      {/* Add Feed Inline Form */}
      {showAddForm && (
        <form onSubmit={handleSubmit} className="p-4 my-6 bg-[var(--bg-secondary)]/40 rounded-xl border border-[var(--border-color)] space-y-4 animate-fadeIn">
          <h4 className="text-xs uppercase tracking-wider font-bold text-[var(--text-primary)]">
            Connect New Editorial Publication Source
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <input
              type="text"
              placeholder="Publication Name (e.g. Vogue Runway)"
              value={newFeedName}
              onChange={(e) => setNewFeedName(e.target.value)}
              required
              className="px-3 py-2 text-xs bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-lg text-[var(--text-primary)]"
            />
            <input
              type="url"
              placeholder="Feed URL (RSS or Atom endpoint)"
              value={newFeedUrl}
              onChange={(e) => setNewFeedUrl(e.target.value)}
              required
              className="px-3 py-2 text-xs bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-lg text-[var(--text-primary)]"
            />
            <select
              value={newFeedType}
              onChange={(e) => setNewFeedType(e.target.value)}
              className="px-3 py-2 text-xs bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-lg text-[var(--text-primary)]"
            >
              <option value="rss">RSS / Atom Feed</option>
              <option value="youtube">YouTube Channel Feed</option>
              <option value="substack">Substack Newsletter</option>
            </select>
          </div>
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={isAdding}
              className="px-5 py-2 text-xs uppercase tracking-widest font-bold bg-[var(--accent)] text-white rounded-lg hover:bg-[var(--accent-hover)] transition-colors"
            >
              {isAdding ? 'Connecting...' : 'Save Feed Source'}
            </button>
          </div>
        </form>
      )}

      {/* Connected Outlets List */}
      <div className="mt-6">
        <h3 className="text-xs uppercase tracking-widest font-bold text-[var(--text-primary)] mb-4">
          Active Feed Subscriptions ({feeds.length})
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {feeds.map((feed) => (
            <div
              key={feed.id}
              className={`p-4 rounded-xl border flex items-center justify-between transition-all ${
                feed.isMuted
                  ? 'bg-[var(--bg-secondary)]/20 border-dashed border-[var(--border-color)] opacity-60'
                  : 'bg-[var(--bg-secondary)]/40 border-[var(--border-color)] hover:border-[var(--border-color-hover)]'
              }`}
            >
              <div className="min-w-0 pr-3">
                <div className="flex items-center space-x-2">
                  <span className="text-xs uppercase tracking-wider font-bold text-[var(--text-primary)] truncate">
                    {feed.name}
                  </span>
                  <Badge variant="muted" size="sm">
                    {feed.type}
                  </Badge>
                </div>
                <p className="text-[11px] text-[var(--text-muted)] truncate font-mono mt-0.5">
                  {feed.url}
                </p>
              </div>

              <button
                onClick={() => onToggleMute(feed.id, !feed.isMuted)}
                className={`px-3 py-1 text-[10px] font-bold uppercase tracking-wider rounded transition-colors ${
                  feed.isMuted
                    ? 'bg-[var(--text-primary)] text-white hover:bg-[var(--accent)]'
                    : 'border border-[var(--border-color)] hover:bg-[var(--bg-primary)] text-[var(--text-secondary)]'
                }`}
              >
                {feed.isMuted ? 'Unmute' : 'Mute'}
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
