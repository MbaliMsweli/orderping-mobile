'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff, Loader2 } from 'lucide-react';
import BrandIcon from '@/components/BrandIcon';
import { supabase } from '@/lib/supabase';

export default function ResetPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [ready, setReady] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    const hash = window.location.hash;
    const params = new URLSearchParams(hash.slice(1));
    const type = params.get('type');
    const accessToken = params.get('access_token');
    const refreshToken = params.get('refresh_token') ?? '';

    if (type === 'recovery' && accessToken) {
      supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken })
        .then(({ data: { session } }) => {
          if (session) setReady(true);
          else setError('This reset link is invalid or has expired. Please request a new one.');
        });
      return;
    }

    // Fallback for already-established sessions (e.g. page reload)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY' || event === 'SIGNED_IN') setReady(true);
    });
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) setReady(true);
    });
    return () => subscription.unsubscribe();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords don't match.");
      return;
    }

    setLoading(true);
    try {
      const { error: err } = await supabase.auth.updateUser({ password });
      if (err) throw err;
      setDone(true);
      setTimeout(() => router.replace('/'), 2500);
    } catch (err: unknown) {
      const raw = (err instanceof Error ? err.message : '').toLowerCase();
      if (raw.includes('same password') || raw.includes('different from')) {
        setError('Please choose a different password from your current one.');
      } else if (raw.includes('weak') || raw.includes('should be')) {
        setError('Password is too weak. Use at least 6 characters.');
      } else {
        setError('Something went wrong. Please try again or request a new reset link.');
      }
    } finally {
      setLoading(false);
    }
  };

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '13px 48px 13px 16px',
    border: '1.5px solid var(--border)',
    borderRadius: 'var(--radius-lg)',
    background: 'var(--background)',
    fontFamily: 'var(--font-body)', fontSize: '1rem',
    color: 'var(--text)', outline: 'none',
  };

  return (
    <div style={{
      minHeight: '100dvh', background: 'var(--background)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 'var(--space-4)',
    }}>
      <div style={{ width: '100%', maxWidth: 'var(--max-width)' }}>

        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 'var(--space-8)' }}>
          <span style={{
            fontFamily: 'var(--font-display)',
            fontSize: '2rem', letterSpacing: '-0.02em',
            display: 'inline-flex', alignItems: 'center', gap: 6,
          }}>
            <BrandIcon size={38} />
            <span>
              <span style={{ color: 'var(--text)', fontWeight: 600 }}>Order</span>
              <span style={{ color: '#1A56E8', fontWeight: 800 }}>Ping</span>
            </span>
          </span>
        </div>

        <div style={{
          background: 'var(--surface)', borderRadius: 20,
          border: '1.5px solid var(--border)',
          padding: 'var(--space-6)',
          boxShadow: '0 4px 24px rgba(0,0,0,0.06)',
        }}>

          {/* Success state */}
          {done && (
            <div style={{ textAlign: 'center', padding: '8px 0' }}>
              <div style={{
                width: 56, height: 56, borderRadius: '50%',
                background: '#DCFCE7', border: '2px solid #86EFAC',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '1.5rem', margin: '0 auto 16px',
              }}>
                ✓
              </div>
              <p style={{
                margin: '0 0 8px', fontFamily: 'var(--font-display)',
                fontSize: '1.125rem', fontWeight: 700, color: 'var(--text)',
              }}>
                Password updated!
              </p>
              <p style={{
                margin: 0, fontFamily: 'var(--font-body)',
                fontSize: '0.875rem', color: 'var(--text-muted)',
              }}>
                Taking you back to the app…
              </p>
            </div>
          )}

          {/* Loading / waiting for recovery session */}
          {!done && !ready && !error && (
            <div style={{ textAlign: 'center', padding: '24px 0', color: 'var(--text-muted)', fontFamily: 'var(--font-body)' }}>
              <Loader2 size={24} className="animate-spin" style={{ margin: '0 auto 12px' }} />
              <p style={{ margin: 0, fontSize: '0.9375rem' }}>Verifying your reset link…</p>
            </div>
          )}

          {/* Invalid / expired link */}
          {!done && !ready && error && (
            <div style={{ textAlign: 'center', padding: '8px 0' }}>
              <p style={{ margin: '0 0 8px', fontFamily: 'var(--font-display)', fontSize: '1.125rem', fontWeight: 700, color: 'var(--text)' }}>
                Link expired
              </p>
              <p style={{ margin: '0 0 20px', fontFamily: 'var(--font-body)', fontSize: '0.875rem', color: 'var(--text-muted)' }}>
                {error}
              </p>
              <a href="/auth" style={{ color: 'var(--primary)', fontFamily: 'var(--font-body)', fontSize: '0.875rem', fontWeight: 600 }}>
                Back to sign in →
              </a>
            </div>
          )}

          {/* Reset form */}
          {!done && ready && (
            <>
              <p style={{
                margin: '0 0 24px', fontFamily: 'var(--font-display)',
                fontSize: '1.125rem', fontWeight: 700, color: 'var(--text)',
              }}>
                Set a new password
              </p>

              <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
                {/* New password */}
                <div>
                  <label style={{
                    display: 'block', fontFamily: 'var(--font-body)',
                    fontSize: '0.8125rem', fontWeight: 600,
                    color: 'var(--text-secondary)', marginBottom: 6,
                  }}>
                    New password
                  </label>
                  <div style={{ position: 'relative' }}>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      autoComplete="new-password"
                      autoFocus
                      style={inputStyle}
                      onFocus={(e) => (e.target.style.borderColor = 'var(--border-focus)')}
                      onBlur={(e) => (e.target.style.borderColor = 'var(--border)')}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      style={{
                        position: 'absolute', right: 14, top: '50%',
                        transform: 'translateY(-50%)',
                        background: 'none', border: 'none', cursor: 'pointer',
                        color: 'var(--text-muted)', padding: 4,
                        display: 'flex', alignItems: 'center',
                      }}
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                {/* Confirm password */}
                <div>
                  <label style={{
                    display: 'block', fontFamily: 'var(--font-body)',
                    fontSize: '0.8125rem', fontWeight: 600,
                    color: 'var(--text-secondary)', marginBottom: 6,
                  }}>
                    Confirm new password
                  </label>
                  <div style={{ position: 'relative' }}>
                    <input
                      type={showConfirm ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="••••••••"
                      autoComplete="new-password"
                      style={inputStyle}
                      onFocus={(e) => (e.target.style.borderColor = 'var(--border-focus)')}
                      onBlur={(e) => (e.target.style.borderColor = 'var(--border)')}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirm((v) => !v)}
                      style={{
                        position: 'absolute', right: 14, top: '50%',
                        transform: 'translateY(-50%)',
                        background: 'none', border: 'none', cursor: 'pointer',
                        color: 'var(--text-muted)', padding: 4,
                        display: 'flex', alignItems: 'center',
                      }}
                      aria-label={showConfirm ? 'Hide password' : 'Show password'}
                    >
                      {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                {error && (
                  <div style={{
                    padding: '12px 16px', borderRadius: 'var(--radius-lg)',
                    background: 'var(--error-soft)', border: '1.5px solid var(--error)',
                    fontFamily: 'var(--font-body)', fontSize: '0.875rem',
                    color: 'var(--error)', fontWeight: 500,
                  }}>
                    {error}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  style={{
                    width: '100%', padding: '15px',
                    borderRadius: 'var(--radius-xl)', border: 'none',
                    background: loading ? 'var(--primary-light)' : 'var(--primary)',
                    color: 'white',
                    cursor: loading ? 'not-allowed' : 'pointer',
                    fontFamily: 'var(--font-display)', fontSize: '1rem', fontWeight: 700,
                    minHeight: 52,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                    boxShadow: loading ? 'none' : '0 4px 16px rgba(26,110,245,0.35)',
                    transition: 'all var(--transition-fast)',
                    letterSpacing: '-0.01em',
                  }}
                >
                  {loading ? <><Loader2 size={18} className="animate-spin" /> Updating…</> : 'Update Password'}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
