'use client';

import { useEffect, useRef, useState } from 'react';

interface ProfileMenuProps {
  name: string | null | undefined;
  email: string;
  isAdmin: boolean;
  active: boolean;
  onProfile: () => void;
  onGuides: () => void;
  onSignOut: () => void;
}

/**
 * Account dropdown in the header: profile, help, admin and sign out live here so the
 * main navigation only carries the three everyday sections.
 */
export function ProfileMenu({ name, email, isAdmin, active, onProfile, onGuides, onSignOut }: ProfileMenuProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const initial = (name || email || '?').trim().charAt(0).toUpperCase();

  useEffect(() => {
    if (!open) return;
    const onPointer = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onPointer);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onPointer);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const choose = (action: () => void) => () => {
    setOpen(false);
    action();
  };

  return (
    <div className="profile-menu" ref={rootRef}>
      <button
        type="button"
        className={`profile-menu-trigger ${active ? 'active' : ''}`}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        title="Your account"
      >
        <span className="profile-initial" aria-hidden="true">{initial}</span>
        <span className="profile-menu-label">Account</span>
      </button>
      {open && (
        <div className="profile-menu-list" role="menu">
          <div className="profile-menu-identity">
            <strong>{name || 'Your account'}</strong>
            <span>{email}</span>
          </div>
          <button type="button" role="menuitem" onClick={choose(onProfile)}>Profile &amp; sizes</button>
          <button type="button" role="menuitem" onClick={choose(onGuides)}>Help &amp; guides</button>
          {isAdmin && (
            <a role="menuitem" href="/admin">Admin</a>
          )}
          <button type="button" role="menuitem" className="profile-menu-signout" onClick={choose(onSignOut)}>Sign out</button>
        </div>
      )}
    </div>
  );
}
