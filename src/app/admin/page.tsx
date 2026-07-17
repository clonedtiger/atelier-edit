'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';

interface AdminStats {
  totalUsers: number;
  totalWardrobeItems: number;
  totalOutfitRecommendations: number;
  activeUsersCount: number;
  avgSessionDuration: number;
  activityLogs: Array<{
    id: string;
    userId: string;
    userName: string;
    userEmail: string;
    action: 'LOGIN' | 'UPLOAD_IMAGE' | 'GENERATE_OUTFIT';
    timestamp: string;
  }>;
  usageOverTime: Array<{
    date: string;
    logins: number;
    uploads: number;
    generations: number;
  }>;
}

interface AdminUser {
  id: string;
  email: string;
  name: string;
  role: string;
  suspended: boolean;
  createdAt: string;
  wardrobeCount: number;
  recommendationCount: number;
  loginCount: number;
  lastActive: string | null;
}

export default function AdminPortal() {
  const [user, setUser] = useState<{ id: string; email: string; name: string | null; role: string } | null>(null);
  const [loadingUser, setLoadingUser] = useState(true);
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // Password reset state
  const [resettingUser, setResettingUser] = useState<AdminUser | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [isSubmittingReset, setIsSubmittingReset] = useState(false);

  const showToast = useCallback((message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  }, []);

  const fetchAdminData = useCallback(async () => {
    setLoadingData(true);
    try {
      const [resStats, resUsers] = await Promise.all([
        fetch('/api/admin/stats'),
        fetch('/api/admin/users'),
      ]);

      if (resStats.ok && resUsers.ok) {
        const statsData = await resStats.json();
        const usersData = await resUsers.json();
        setStats(statsData);
        setUsers(usersData);
      } else {
        showToast('Failed to load administrative logs or user records.', 'error');
      }
    } catch (err) {
      console.error(err);
      showToast('Connection error fetching administration stats.', 'error');
    } finally {
      setLoadingUser(false);
      setLoadingData(false);
    }
  }, [showToast]);

  useEffect(() => {
    // 1. Fetch active session
    async function checkAuth() {
      try {
        const res = await fetch('/api/auth/me');
        if (res.ok) {
          const data = await res.json();
          if (data.authenticated && data.user.role === 'admin') {
            setUser(data.user);
            // 2. Fetch stats & users list
            fetchAdminData();
          } else {
            setLoadingUser(false);
          }
        } else {
          setLoadingUser(false);
        }
      } catch (err) {
        console.error(err);
        setLoadingUser(false);
      }
    }
    checkAuth();
  }, [fetchAdminData]);

  const handleAction = async (userId: string, action: 'suspend' | 'unsuspend' | 'delete') => {
    const confirmationMsg = 
      action === 'delete' 
        ? 'Are you absolutely sure you want to permanently delete this user and all their wardrobe data?' 
        : `Confirm account ${action}?`;

    if (!confirm(confirmationMsg)) return;

    try {
      const res = await fetch('/api/admin/users/action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, action }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        showToast(data.message);
        fetchAdminData(); // Refresh list & metrics
      } else {
        showToast(data.error || 'Action failed.', 'error');
      }
    } catch (err) {
      console.error(err);
      showToast('Error executing administrative command.', 'error');
    }
  };

  const handlePasswordResetSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resettingUser) return;

    if (newPassword.trim().length < 6) {
      showToast('Password must be at least 6 characters long.', 'error');
      return;
    }

    setIsSubmittingReset(true);
    try {
      const res = await fetch('/api/admin/users/action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: resettingUser.id,
          action: 'reset-password',
          newPassword,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        showToast(data.message);
        setResettingUser(null);
        setNewPassword('');
      } else {
        showToast(data.error || 'Password reset failed.', 'error');
      }
    } catch (err) {
      console.error(err);
      showToast('Error resetting user password.', 'error');
    } finally {
      setIsSubmittingReset(false);
    }
  };

  const formatDuration = (sec: number) => {
    if (sec < 60) return `${sec}s`;
    const min = Math.floor(sec / 60);
    if (min < 60) return `${min}m`;
    const hrs = Math.floor(min / 60);
    return `${hrs}h ${min % 60}m`;
  };

  if (loadingUser) {
    return (
      <div className="admin-container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: 'var(--bg-app)' }}>
        <div style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
          <p style={{ fontSize: '1.25rem', fontWeight: 600 }}>Checking administrator credentials...</p>
        </div>
      </div>
    );
  }

  if (!user || user.role !== 'admin') {
    return (
      <div className="admin-container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: 'var(--bg-app)' }}>
        <div style={{ background: 'var(--bg-panel)', padding: '2.5rem', borderRadius: '8px', border: '1px solid var(--border)', textAlign: 'center', maxWidth: '400px' }}>
          <h2 style={{ fontSize: '1.75rem', fontWeight: '800', color: 'var(--accent-red)', marginBottom: '1rem' }}>403 Forbidden</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '1.5rem' }}>
            Administrative permission is required to access this portal. If you believe this is an error, please login with an administrator account.
          </p>
          <Link href="/" className="btn-primary" style={{ display: 'inline-block', textDecoration: 'none' }}>
            Return to Stylist
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-layout" style={{ background: 'var(--bg-app)', minHeight: '100vh', color: 'var(--text-main)' }}>
      {/* Toast Alert */}
      {toast && (
        <div className={`toast ${toast.type}`} style={{
          position: 'fixed',
          top: '20px',
          right: '20px',
          padding: '1rem 1.5rem',
          borderRadius: '5px',
          color: '#fff',
          zIndex: 9999,
          background: toast.type === 'error' ? 'var(--accent-red)' : 'var(--accent-gold)',
          boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
          fontWeight: 600,
          fontSize: '0.85rem'
        }}>
          {toast.message}
        </div>
      )}

      {/* Top Banner */}
      <header style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '1.5rem 2rem',
        borderBottom: '1px solid var(--border)',
        background: 'var(--bg-panel)'
      }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: '800', letterSpacing: '0.05em', color: 'var(--accent-gold)' }}>
            ATELIER EDIT <span style={{ color: 'var(--text-main)', fontWeight: 300, fontSize: '1rem', marginLeft: '0.5rem' }}>ADMIN PORTAL</span>
          </h1>
        </div>
        <Link href="/" className="btn-secondary" style={{ textDecoration: 'none', padding: '0.5rem 1rem', fontSize: '0.8rem' }}>
          Back to Stylist Application
        </Link>
      </header>

      {/* Main Body */}
      <main style={{ padding: '2rem' }}>
        {/* Metric Cards Grid */}
        <section className="admin-grid" style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '1.5rem',
          marginBottom: '2rem'
        }}>
          <div className="metric-card" style={{ background: 'var(--bg-panel)', padding: '1.5rem', borderRadius: '8px', border: '1px solid var(--border)' }}>
            <span style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)' }}>Total Registered Users</span>
            <div style={{ fontSize: '2.5rem', fontWeight: 900, marginTop: '0.5rem', color: '#fff' }}>{loadingData ? '...' : stats?.totalUsers}</div>
          </div>
          <div className="metric-card" style={{ background: 'var(--bg-panel)', padding: '1.5rem', borderRadius: '8px', border: '1px solid var(--border)' }}>
            <span style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)' }}>Active Users (7d)</span>
            <div style={{ fontSize: '2.5rem', fontWeight: 900, marginTop: '0.5rem', color: 'var(--accent-gold)' }}>{loadingData ? '...' : stats?.activeUsersCount}</div>
          </div>
          <div className="metric-card" style={{ background: 'var(--bg-panel)', padding: '1.5rem', borderRadius: '8px', border: '1px solid var(--border)' }}>
            <span style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)' }}>Average Session Time</span>
            <div style={{ fontSize: '2.5rem', fontWeight: 900, marginTop: '0.5rem', color: '#fff' }}>{loadingData ? '...' : stats ? formatDuration(stats.avgSessionDuration) : '0s'}</div>
          </div>
          <div className="metric-card" style={{ background: 'var(--bg-panel)', padding: '1.5rem', borderRadius: '8px', border: '1px solid var(--border)' }}>
            <span style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)' }}>Total Wardrobe Items</span>
            <div style={{ fontSize: '2.5rem', fontWeight: 900, marginTop: '0.5rem', color: '#fff' }}>{loadingData ? '...' : stats?.totalWardrobeItems}</div>
          </div>
          <div className="metric-card" style={{ background: 'var(--bg-panel)', padding: '1.5rem', borderRadius: '8px', border: '1px solid var(--border)' }}>
            <span style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)' }}>Outfit Lookbooks Generated</span>
            <div style={{ fontSize: '2.5rem', fontWeight: 900, marginTop: '0.5rem', color: '#fff' }}>{loadingData ? '...' : stats?.totalOutfitRecommendations}</div>
          </div>
        </section>

        <div style={{ display: 'grid', gridTemplateColumns: '3fr 1fr', gap: '2rem' }}>
          {/* Left Column: User Directory */}
          <section style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
            {/* User Directory Card */}
            <div className="admin-panel" style={{ background: 'var(--bg-panel)', borderRadius: '8px', border: '1px solid var(--border)', overflow: 'hidden' }}>
              <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h2 style={{ fontSize: '1rem', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.05em' }}>User Directory</h2>
                <button onClick={fetchAdminData} className="btn-secondary" style={{ fontSize: '0.75rem', padding: '0.3rem 0.6rem' }} disabled={loadingData}>
                  Refresh Data
                </button>
              </div>

              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
                  <thead>
                    <tr style={{ background: 'rgba(255,255,255,0.02)', borderBottom: '1px solid var(--border)' }}>
                      <th style={{ padding: '1rem 1.5rem', color: 'var(--text-muted)' }}>User</th>
                      <th style={{ padding: '1rem', color: 'var(--text-muted)' }}>Role</th>
                      <th style={{ padding: '1rem', color: 'var(--text-muted)' }}>Status</th>
                      <th style={{ padding: '1rem', color: 'var(--text-muted)', textAlign: 'center' }}>Logins</th>
                      <th style={{ padding: '1rem', color: 'var(--text-muted)', textAlign: 'center' }}>Wardrobe</th>
                      <th style={{ padding: '1rem', color: 'var(--text-muted)', textAlign: 'center' }}>Outfits</th>
                      <th style={{ padding: '1rem 1.5rem', color: 'var(--text-muted)' }}>Last Active</th>
                      <th style={{ padding: '1rem 1.5rem', color: 'var(--text-muted)', textAlign: 'right' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loadingData ? (
                      <tr>
                        <td colSpan={8} style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                          Retrieving records...
                        </td>
                      </tr>
                    ) : users.length === 0 ? (
                      <tr>
                        <td colSpan={8} style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                          No users registered.
                        </td>
                      </tr>
                    ) : (
                      users.map((u) => (
                        <tr key={u.id} style={{ borderBottom: '1px solid var(--border)', transition: 'background 0.2s' }}>
                          <td style={{ padding: '1rem 1.5rem' }}>
                            <div style={{ fontWeight: 600 }}>{u.name}</div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{u.email}</div>
                          </td>
                          <td style={{ padding: '1rem' }}>
                            <span style={{
                              fontSize: '0.7rem',
                              textTransform: 'uppercase',
                              padding: '0.2rem 0.4rem',
                              borderRadius: '3px',
                              fontWeight: 600,
                              background: u.role === 'admin' ? 'rgba(212,175,55,0.15)' : 'rgba(255,255,255,0.08)',
                              color: u.role === 'admin' ? 'var(--accent-gold)' : 'var(--text-muted)'
                            }}>
                              {u.role}
                            </span>
                          </td>
                          <td style={{ padding: '1rem' }}>
                            <span style={{
                              fontSize: '0.7rem',
                              textTransform: 'uppercase',
                              padding: '0.2rem 0.4rem',
                              borderRadius: '3px',
                              fontWeight: 600,
                              background: u.suspended ? 'rgba(239,68,68,0.15)' : 'rgba(34,197,94,0.15)',
                              color: u.suspended ? 'var(--accent-red)' : '#22c55e'
                            }}>
                              {u.suspended ? 'Suspended' : 'Active'}
                            </span>
                          </td>
                          <td style={{ padding: '1rem', textAlign: 'center', fontWeight: 600 }}>{u.loginCount}</td>
                          <td style={{ padding: '1rem', textAlign: 'center', fontWeight: 600 }}>{u.wardrobeCount}</td>
                          <td style={{ padding: '1rem', textAlign: 'center', fontWeight: 600 }}>{u.recommendationCount}</td>
                          <td style={{ padding: '1rem 1.5rem', color: 'var(--text-muted)', fontSize: '0.75rem' }}>
                            {u.lastActive ? new Date(u.lastActive).toLocaleString() : 'Never'}
                          </td>
                          <td style={{ padding: '1rem 1.5rem', textAlign: 'right' }}>
                            <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                              <button
                                onClick={() => {
                                  setResettingUser(u);
                                  setNewPassword('');
                                }}
                                className="btn-secondary"
                                style={{ fontSize: '0.7rem', padding: '0.2rem 0.5rem' }}
                              >
                                Reset Pass
                              </button>
                              
                              {u.suspended ? (
                                <button
                                  onClick={() => handleAction(u.id, 'unsuspend')}
                                  className="btn-secondary"
                                  style={{ fontSize: '0.7rem', padding: '0.2rem 0.5rem', borderColor: '#22c55e', color: '#22c55e' }}
                                >
                                  Activate
                                </button>
                              ) : (
                                <button
                                  onClick={() => handleAction(u.id, 'suspend')}
                                  className="btn-secondary"
                                  style={{ fontSize: '0.7rem', padding: '0.2rem 0.5rem', borderColor: 'var(--accent-red)', color: 'var(--accent-red)' }}
                                  disabled={u.id === user.id}
                                >
                                  Suspend
                                </button>
                              )}

                              <button
                                onClick={() => handleAction(u.id, 'delete')}
                                className="btn-secondary"
                                style={{ fontSize: '0.7rem', padding: '0.2rem 0.5rem', background: 'rgba(239,68,68,0.1)', color: 'var(--accent-red)', borderColor: 'var(--accent-red)' }}
                                disabled={u.id === user.id}
                              >
                                Delete
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Custom Simple Flex-Graph of Daily Usage */}
            {stats && stats.usageOverTime && (
              <div className="admin-panel" style={{ background: 'var(--bg-panel)', padding: '1.5rem', borderRadius: '8px', border: '1px solid var(--border)' }}>
                <h2 style={{ fontSize: '1rem', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '1.5rem' }}>
                  Site Usage Trends (Last 14 Days)
                </h2>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {stats.usageOverTime.map((day) => {
                    const totalAct = day.logins + day.uploads + day.generations;
                    const maxPossible = 30; // Scale guide
                    const percent = Math.min(100, Math.max(3, (totalAct / maxPossible) * 100));
                    
                    return (
                      <div key={day.date} style={{ display: 'flex', alignItems: 'center', gap: '1rem', fontSize: '0.75rem' }}>
                        <span style={{ width: '80px', color: 'var(--text-muted)' }}>{day.date}</span>
                        <div style={{ flex: 1, background: 'rgba(255,255,255,0.05)', height: '16px', borderRadius: '3px', overflow: 'hidden', display: 'flex' }}>
                          <div style={{
                            width: `${percent}%`,
                            background: 'linear-gradient(to right, var(--accent-gold), #e5c158)',
                            height: '100%',
                            transition: 'width 0.5s'
                          }} />
                        </div>
                        <span style={{ width: '130px', textAlign: 'right', color: 'var(--text-muted)' }}>
                          <strong>{totalAct}</strong> acts ({day.logins} L, {day.uploads} U, {day.generations} G)
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </section>

          {/* Right Column: Real-time logs timeline */}
          <aside className="admin-panel" style={{ background: 'var(--bg-panel)', borderRadius: '8px', border: '1px solid var(--border)', display: 'flex', flexDirection: 'column', height: 'fit-content' }}>
            <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid var(--border)' }}>
              <h2 style={{ fontSize: '1rem', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Real-time Audit Trail</h2>
            </div>
            
            <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem', maxHeight: '600px', overflowY: 'auto' }}>
              {loadingData ? (
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textAlign: 'center' }}>Loading events...</p>
              ) : stats?.activityLogs.length === 0 ? (
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textAlign: 'center' }}>No audit trail actions recorded yet.</p>
              ) : (
                stats?.activityLogs.map((log) => {
                  let badgeColor = 'var(--accent-gold)';
                  if (log.action === 'UPLOAD_IMAGE') badgeColor = '#22c55e';
                  else if (log.action === 'GENERATE_OUTFIT') badgeColor = '#3b82f6';
                  
                  return (
                    <div key={log.id} style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem', borderBottom: '1px solid rgba(255,255,255,0.03)', paddingBottom: '0.5rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '0.65rem', fontWeight: 900, color: badgeColor, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                          {log.action}
                        </span>
                        <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>
                          {new Date(log.timestamp).toLocaleTimeString()}
                        </span>
                      </div>
                      <div style={{ fontSize: '0.8rem', fontWeight: 600 }}>{log.userName}</div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{log.userEmail}</div>
                    </div>
                  );
                })
              )}
            </div>
          </aside>
        </div>
      </main>

      {/* Editorial Footer */}
      <footer className="editorial-footer" style={{ marginTop: '3rem', padding: '2rem 0', borderTop: '1px solid var(--border)' }}>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.75rem', textAlign: 'center', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
          © misson 2026 | Atelier Edit. All styling rights reserved.
        </p>
      </footer>

      {/* Password Reset Modal Dialog */}
      {resettingUser && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.85)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 99999
        }}>
          <div style={{
            background: 'var(--bg-panel)',
            padding: '2rem',
            borderRadius: '8px',
            border: '1px solid var(--border)',
            width: '100%',
            maxWidth: '400px'
          }}>
            <h3 style={{ fontSize: '1.25rem', fontWeight: '800', marginBottom: '0.5rem', color: 'var(--accent-gold)' }}>Reset User Password</h3>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
              Resetting password for <strong>{resettingUser.name}</strong> ({resettingUser.email}).
            </p>

            <form onSubmit={handlePasswordResetSubmit}>
              <div className="form-group" style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'block', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
                  New Password
                </label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Enter at least 6 characters"
                  required
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    background: 'rgba(255,255,255,0.02)',
                    border: '1px solid var(--border)',
                    borderRadius: '4px',
                    color: '#fff',
                    outline: 'none',
                    fontSize: '0.85rem'
                  }}
                />
              </div>

              <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  onClick={() => setResettingUser(null)}
                  className="btn-secondary"
                  style={{ fontSize: '0.8rem', padding: '0.5rem 1rem' }}
                  disabled={isSubmittingReset}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-primary"
                  style={{ fontSize: '0.8rem', padding: '0.5rem 1rem' }}
                  disabled={isSubmittingReset}
                >
                  {isSubmittingReset ? 'Saving...' : 'Update Password'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
