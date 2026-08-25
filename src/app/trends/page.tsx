'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Navigation } from '@/components/layout/Navigation';
import { TrendRadar, FeedSource } from '@/features/trends/TrendRadar';
import { Toast, ToastMessage } from '@/components/ui/Toast';
import { Skeleton } from '@/components/ui/Skeleton';

export default function TrendsPage() {
  const [feeds, setFeeds] = useState<FeedSource[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [toast, setToast] = useState<ToastMessage | null>(null);

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const fetchFeeds = useCallback(async () => {
    try {
      const res = await fetch('/api/feeds');
      if (res.ok) {
        const data = await res.json();
        setFeeds(data);
      }
    } catch (err) {
      console.error('Failed to load feeds:', err);
      showToast('Error loading feeds', 'error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let ignore = false;

    async function load() {
      try {
        const res = await fetch('/api/feeds');
        if (res.ok) {
          const data = await res.json();
          if (!ignore) {
            setFeeds(data);
            setLoading(false);
          }
        }
      } catch (err) {
        console.error('Failed to load feeds:', err);
        if (!ignore) {
          showToast('Error loading feeds', 'error');
          setLoading(false);
        }
      }
    }

    load();

    return () => {
      ignore = true;
    };
  }, []);

  const handleToggleMute = async (feedId: string, isMuted: boolean) => {
    try {
      const res = await fetch(`/api/feeds/${feedId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isMuted }),
      });
      if (res.ok) {
        setFeeds((prev) =>
          prev.map((f) => (f.id === feedId ? { ...f, isMuted } : f))
        );
        showToast(isMuted ? 'Feed muted.' : 'Feed unmuted.', 'info');
      }
    } catch (err) {
      console.error('Mute error:', err);
      showToast('Failed to update feed state.', 'error');
    }
  };

  const handleAddFeed = async (name: string, url: string, type: string) => {
    try {
      const res = await fetch('/api/feeds', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, url, type }),
      });
      if (res.ok) {
        await fetchFeeds();
        showToast(`Connected ${name} successfully!`, 'success');
      } else {
        const data = await res.json().catch(() => ({}));
        showToast(data.error || 'Failed to add feed source.', 'error');
      }
    } catch (err) {
      console.error('Add feed error:', err);
      showToast('Network error adding feed.', 'error');
    }
  };

  const handleSyncFeeds = async () => {
    setIsSyncing(true);
    try {
      const res = await fetch('/api/feed/sync', { method: 'POST' });
      if (res.ok) {
        showToast('Feed synchronization started in background!', 'success');
      } else {
        showToast('Failed to start sync.', 'error');
      }
    } catch (err) {
      console.error('Sync error:', err);
      showToast('Network error syncing feeds.', 'error');
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] flex flex-col">
      <Navigation />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-8 space-y-8">
        {loading ? (
          <div className="space-y-4">
            <Skeleton variant="rect" style={{ height: '240px' }} />
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} variant="rect" style={{ height: '90px' }} />
              ))}
            </div>
          </div>
        ) : (
          <TrendRadar
            feeds={feeds}
            onToggleMute={handleToggleMute}
            onAddFeed={handleAddFeed}
            onSyncFeeds={handleSyncFeeds}
            isSyncing={isSyncing}
          />
        )}
      </main>

      <Toast toast={toast} onDismiss={() => setToast(null)} />
    </div>
  );
}
