'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Navigation } from '@/components/layout/Navigation';
import { SizingProfile, UserProfile, InspirationImage } from '@/features/account/SizingProfile';
import { Toast, ToastMessage } from '@/components/ui/Toast';
import { Skeleton } from '@/components/ui/Skeleton';

export default function AccountPage() {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [inspirations, setInspirations] = useState<InspirationImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<ToastMessage | null>(null);

  // Auth Form States
  const [authMode, setAuthMode] = useState<'login' | 'signup' | 'mfa' | 'forgot'>('login');
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authName, setAuthName] = useState('');
  const [authMfaCode, setAuthMfaCode] = useState('');
  const [tempUserId, setTempUserId] = useState<string | null>(null);
  const [isSubmittingAuth, setIsSubmittingAuth] = useState(false);

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const fetchUserData = useCallback(async () => {
    try {
      const [resUser, resIns] = await Promise.all([
        fetch('/api/auth/me'),
        fetch('/api/inspirations'),
      ]);

      if (resUser.ok) {
        const userData = await resUser.json();
        if (userData.authenticated && userData.user) {
          setUser(userData.user);
        }
      }

      if (resIns.ok) {
        const insData = await resIns.json();
        setInspirations(insData);
      }
    } catch (err) {
      console.error('Failed to load account data:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let ignore = false;

    async function load() {
      try {
        const [resUser, resIns] = await Promise.all([
          fetch('/api/auth/me'),
          fetch('/api/inspirations'),
        ]);

        if (!ignore) {
          if (resUser.ok) {
            const userData = await resUser.json();
            if (userData.authenticated && userData.user) {
              setUser(userData.user);
            }
          }
          if (resIns.ok) {
            const insData = await resIns.json();
            setInspirations(insData);
          }
          setLoading(false);
        }
      } catch (err) {
        console.error('Failed to load account data:', err);
        if (!ignore) {
          setLoading(false);
        }
      }
    }

    load();

    return () => {
      ignore = true;
    };
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmittingAuth(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: authEmail, password: authPassword }),
      });

      const data = await res.json();
      if (res.ok) {
        if (data.mfaRequired) {
          setTempUserId(data.userId);
          setAuthMode('mfa');
          showToast('Enter your 6-digit MFA code to complete sign in.', 'info');
        } else {
          await fetchUserData();
          showToast('Welcome back to Atelier Edit.', 'success');
        }
      } else {
        showToast(data.error || 'Invalid credentials.', 'error');
      }
    } catch (err) {
      console.error('Login error:', err);
      showToast('Network error during login.', 'error');
    } finally {
      setIsSubmittingAuth(false);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmittingAuth(true);
    try {
      const res = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: authEmail, password: authPassword, name: authName }),
      });

      const data = await res.json();
      if (res.ok) {
        await fetchUserData();
        showToast('Account created successfully!', 'success');
      } else {
        showToast(data.error || 'Failed to sign up.', 'error');
      }
    } catch (err) {
      console.error('Signup error:', err);
      showToast('Network error during registration.', 'error');
    } finally {
      setIsSubmittingAuth(false);
    }
  };

  const handleVerifyMfa = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tempUserId || !authMfaCode) return;
    setIsSubmittingAuth(true);
    try {
      const res = await fetch('/api/auth/mfa/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: tempUserId, token: authMfaCode }),
      });

      const data = await res.json();
      if (res.ok) {
        await fetchUserData();
        showToast('MFA verification successful!', 'success');
      } else {
        showToast(data.error || 'Invalid MFA code.', 'error');
      }
    } catch (err) {
      console.error('MFA verify error:', err);
      showToast('Network error verifying code.', 'error');
    } finally {
      setIsSubmittingAuth(false);
    }
  };

  const handleSaveProfile = async (profileData: Partial<UserProfile>) => {
    try {
      const res = await fetch('/api/auth/me', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(profileData),
      });

      if (res.ok) {
        const updated = await res.json();
        setUser(updated);
        showToast('Haute couture profile saved successfully!', 'success');
      } else {
        showToast('Failed to update profile.', 'error');
      }
    } catch (err) {
      console.error('Save profile error:', err);
      showToast('Network error saving profile.', 'error');
    }
  };

  const handleUploadInspiration = async (file: File) => {
    const formData = new FormData();
    formData.append('image', file);

    const res = await fetch('/api/inspirations', {
      method: 'POST',
      body: formData,
    });

    if (res.ok) {
      const newIns = await res.json();
      setInspirations((prev) => [newIns, ...prev]);
      showToast('Visual inspiration analyzed and saved to moodboard!', 'success');
    } else {
      showToast('Failed to upload inspiration image.', 'error');
    }
  };

  const handleDeleteInspiration = async (id: string) => {
    const res = await fetch(`/api/inspirations/${id}`, { method: 'DELETE' });
    if (res.ok) {
      setInspirations((prev) => prev.filter((i) => i.id !== id));
      showToast('Inspiration removed from moodboard.', 'info');
    }
  };

  const handleExportData = async () => {
    try {
      const res = await fetch('/api/user/gdpr/export');
      if (res.ok) {
        const data = await res.json();
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `atelier-edit-data-export-${Date.now()}.json`;
        a.click();
        URL.revokeObjectURL(url);
        showToast('Data archive downloaded successfully.', 'success');
      }
    } catch (err) {
      console.error('Export error:', err);
      showToast('Failed to export data archive.', 'error');
    }
  };

  const handleDeleteAccount = async (confirmText: string) => {
    const res = await fetch('/api/user/gdpr/delete', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ confirmText }),
    });

    if (res.ok) {
      showToast('Account permanently erased.', 'success');
      setTimeout(() => {
        window.location.href = '/';
      }, 1000);
    } else {
      showToast('Failed to execute account erasure.', 'error');
    }
  };

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] flex flex-col">
      <Navigation />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-8">
        {loading ? (
          <div className="space-y-6">
            <Skeleton variant="rect" style={{ height: '200px' }} />
            <Skeleton variant="rect" style={{ height: '350px' }} />
          </div>
        ) : !user ? (
          /* Unauthenticated State: Luxury Authentication Card */
          <div className="max-w-md mx-auto my-12 bg-[var(--bg-primary)] rounded-3xl border border-[var(--border-color)] p-8 shadow-xl">
            <div className="text-center mb-8">
              <span className="text-[10px] uppercase tracking-[0.35em] font-bold text-[var(--accent)]">
                Private Journal Access
              </span>
              <h2 className="text-3xl font-serif text-[var(--text-primary)] font-light mt-1">
                {authMode === 'login' && 'Sign In to Atelier'}
                {authMode === 'signup' && 'Create Your Atelier'}
                {authMode === 'mfa' && 'Two-Factor Authentication'}
                {authMode === 'forgot' && 'Account Recovery'}
              </h2>
            </div>

            {authMode === 'login' && (
              <form onSubmit={handleLogin} className="space-y-4">
                <div>
                  <label className="block text-xs uppercase tracking-wider font-semibold text-[var(--text-secondary)] mb-1">
                    Email Address
                  </label>
                  <input
                    type="email"
                    required
                    value={authEmail}
                    onChange={(e) => setAuthEmail(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-xs bg-[var(--bg-secondary)]/30 border border-[var(--border-color)] rounded-xl text-[var(--text-primary)]"
                  />
                </div>

                <div>
                  <label className="block text-xs uppercase tracking-wider font-semibold text-[var(--text-secondary)] mb-1">
                    Password
                  </label>
                  <input
                    type="password"
                    required
                    value={authPassword}
                    onChange={(e) => setAuthPassword(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-xs bg-[var(--bg-secondary)]/30 border border-[var(--border-color)] rounded-xl text-[var(--text-primary)]"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isSubmittingAuth}
                  className="w-full py-3 text-xs uppercase tracking-widest font-bold bg-[var(--accent)] text-white hover:bg-[var(--accent-hover)] rounded-xl shadow-md transition-colors disabled:opacity-50 mt-2"
                >
                  {isSubmittingAuth ? 'Verifying...' : 'Sign In'}
                </button>

                <div className="text-center pt-4 border-t border-[var(--border-color)]">
                  <button
                    type="button"
                    onClick={() => setAuthMode('signup')}
                    className="text-xs uppercase tracking-widest text-[var(--text-secondary)] hover:text-[var(--text-primary)] font-semibold"
                  >
                    Don&apos;t have an account? Sign Up
                  </button>
                </div>
              </form>
            )}

            {authMode === 'signup' && (
              <form onSubmit={handleSignup} className="space-y-4">
                <div>
                  <label className="block text-xs uppercase tracking-wider font-semibold text-[var(--text-secondary)] mb-1">
                    Your Name
                  </label>
                  <input
                    type="text"
                    required
                    value={authName}
                    onChange={(e) => setAuthName(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-xs bg-[var(--bg-secondary)]/30 border border-[var(--border-color)] rounded-xl text-[var(--text-primary)]"
                  />
                </div>

                <div>
                  <label className="block text-xs uppercase tracking-wider font-semibold text-[var(--text-secondary)] mb-1">
                    Email Address
                  </label>
                  <input
                    type="email"
                    required
                    value={authEmail}
                    onChange={(e) => setAuthEmail(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-xs bg-[var(--bg-secondary)]/30 border border-[var(--border-color)] rounded-xl text-[var(--text-primary)]"
                  />
                </div>

                <div>
                  <label className="block text-xs uppercase tracking-wider font-semibold text-[var(--text-secondary)] mb-1">
                    Password
                  </label>
                  <input
                    type="password"
                    required
                    value={authPassword}
                    onChange={(e) => setAuthPassword(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-xs bg-[var(--bg-secondary)]/30 border border-[var(--border-color)] rounded-xl text-[var(--text-primary)]"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isSubmittingAuth}
                  className="w-full py-3 text-xs uppercase tracking-widest font-bold bg-[var(--accent)] text-white hover:bg-[var(--accent-hover)] rounded-xl shadow-md transition-colors disabled:opacity-50 mt-2"
                >
                  {isSubmittingAuth ? 'Creating Atelier...' : 'Create Account'}
                </button>

                <div className="text-center pt-4 border-t border-[var(--border-color)]">
                  <button
                    type="button"
                    onClick={() => setAuthMode('login')}
                    className="text-xs uppercase tracking-widest text-[var(--text-secondary)] hover:text-[var(--text-primary)] font-semibold"
                  >
                    Already have an account? Sign In
                  </button>
                </div>
              </form>
            )}

            {authMode === 'mfa' && (
              <form onSubmit={handleVerifyMfa} className="space-y-4">
                <div>
                  <label className="block text-xs uppercase tracking-wider font-semibold text-[var(--text-secondary)] mb-1">
                    6-Digit Authenticator Code
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={6}
                    value={authMfaCode}
                    onChange={(e) => setAuthMfaCode(e.target.value)}
                    placeholder="000000"
                    className="w-full px-3.5 py-2.5 text-center text-lg font-mono tracking-widest bg-[var(--bg-secondary)]/30 border border-[var(--border-color)] rounded-xl text-[var(--text-primary)]"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isSubmittingAuth}
                  className="w-full py-3 text-xs uppercase tracking-widest font-bold bg-[var(--accent)] text-white hover:bg-[var(--accent-hover)] rounded-xl shadow-md transition-colors"
                >
                  Verify Code & Sign In
                </button>
              </form>
            )}
          </div>
        ) : (
          <SizingProfile
            user={user}
            inspirations={inspirations}
            onSaveProfile={handleSaveProfile}
            onUploadInspiration={handleUploadInspiration}
            onDeleteInspiration={handleDeleteInspiration}
            onExportData={handleExportData}
            onDeleteAccount={handleDeleteAccount}
          />
        )}
      </main>

      <Toast toast={toast} onDismiss={() => setToast(null)} />
    </div>
  );
}
