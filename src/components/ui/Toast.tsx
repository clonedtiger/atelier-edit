'use client';

import React from 'react';

export interface ToastMessage {
  id?: string;
  type: 'success' | 'error' | 'info';
  message: string;
}

interface ToastProps {
  toast: ToastMessage | null;
  onDismiss: () => void;
}

export function Toast({ toast, onDismiss }: ToastProps) {
  if (!toast) return null;

  const bgStyles = {
    success: 'bg-[var(--accent)] text-white border-[var(--accent)]',
    error: 'bg-rose-950 text-rose-100 border-rose-800',
    info: 'bg-[var(--text-primary)] text-white border-[var(--text-primary)]',
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 animate-bounce-short">
      <div
        className={`flex items-center gap-3 px-5 py-3.5 rounded-lg border shadow-xl text-sm font-sans tracking-wide ${bgStyles[toast.type]}`}
        style={{ backdropFilter: 'blur(10px)' }}
      >
        <span>{toast.message}</span>
        <button
          onClick={onDismiss}
          className="opacity-70 hover:opacity-100 transition-opacity ml-2"
          aria-label="Dismiss notification"
        >
          ✕
        </button>
      </div>
    </div>
  );
}
