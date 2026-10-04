'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

interface ConfirmOptions {
  title: string;
  message?: string;
  confirmLabel?: string;
  destructive?: boolean;
}

interface PendingConfirm extends ConfirmOptions {
  resolve: (confirmed: boolean) => void;
}

/**
 * In-app replacement for window.confirm(). `confirm()` returns a promise that resolves
 * true/false once the person chooses; render `dialog` once near the root of the page.
 */
export function useConfirmDialog() {
  const [pending, setPending] = useState<PendingConfirm | null>(null);

  const confirm = useCallback(
    (options: ConfirmOptions) => new Promise<boolean>((resolve) => setPending({ ...options, resolve })),
    []
  );

  const close = useCallback(
    (confirmed: boolean) => {
      pending?.resolve(confirmed);
      setPending(null);
    },
    [pending]
  );

  const dialog = pending ? <ConfirmDialog options={pending} onClose={close} /> : null;

  return { confirm, dialog };
}

function ConfirmDialog({ options, onClose }: { options: ConfirmOptions; onClose: (confirmed: boolean) => void }) {
  const cancelRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    // Default focus on the safe choice
    cancelRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className="confirm-overlay" onClick={() => onClose(false)}>
      <div
        className="confirm-dialog"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-dialog-title"
        aria-describedby={options.message ? 'confirm-dialog-message' : undefined}
        onClick={(e) => e.stopPropagation()}
      >
        <h3 id="confirm-dialog-title">{options.title}</h3>
        {options.message && <p id="confirm-dialog-message">{options.message}</p>}
        <div className="confirm-actions">
          <button ref={cancelRef} type="button" className="confirm-cancel" onClick={() => onClose(false)}>
            Cancel
          </button>
          <button
            type="button"
            className={`confirm-accept ${options.destructive ? 'destructive' : ''}`}
            onClick={() => onClose(true)}
          >
            {options.confirmLabel || 'Confirm'}
          </button>
        </div>
      </div>
    </div>
  );
}
