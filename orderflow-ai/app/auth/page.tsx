'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff, Loader2 } from 'lucide-react';
import BrandIcon from '@/components/BrandIcon';
import { supabase } from '@/lib/supabase';
import { getProfile, fetchProfileFromSupabase } from '@/lib/storage';

type Mode = 'signin' | 'signup' | 'forgot';

export default function AuthPage() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [resetSent, setResetSent] = useState(false);
  const [checking, setChecking] = useState(true);

  // If already signed in, redirect away
  useEffect(() => {
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (user) {
        let profile = getProfile();
        if (!profile) profile = await fetchProfileFromSupabase();
        router.replace(profile ? '/' : '/setup');
      } else {
        setChecking(false);
      }
    });
  }, [router]);

  const handleForgot = async (e?: React.FormEvent) => {
    e?.preventDefault();
    setError('');
    if (!email.trim()) { setError('Enter your email address.'); return; }
    setLoading(true);
    try {
      const { error: err } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: `${window.location.origin}/auth/reset`,
      });
      if (err) throw err;
      setResetSent(true);
    } catch (err: unknown) {
      const raw = (err instanceof Error ? err.message : '').toLowerCase();
      if (raw.includes('rate limit') || raw.includes('too many')) {
        setError('Too many attempts. Please wait a moment and try again.');
      } else {
        setError('Something went wrong. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGuest = async () => {
    setError('');
    setLoading(true);
    try {
      const { error: err } = await supabase.auth.signInAnonymously();
      if (err) throw err;
      const profile = getProfile();
      router.replace(profile ? '/' : '/setup');
    } catch {
      setError('Could not start guest session. Try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    setError('');

    if (!email.trim() || !password) {
      setError('Please enter your email and password.');
      return;
    }

    if (mode === 'signup') {
      if (password.length < 6) {
        setError('Password must be at least 6 characters.');
        return;
      }
      if (password !== confirmPassword) {
        setError("Passwords don't match.");
        return;
      }
    }

    setLoading(true);
    try {
      if (mode === 'signin') {
        const { error: err } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
        if (err) throw err;
      } else {
        const { error: err } = await supabase.auth.signUp({ email: email.trim(), password });
        if (err) throw err;
      }

      let profile = getProfile();
      if (!profile) profile = await fetchProfileFromSupabase();
      router.replace(profile ? '/' : '/setup');
    } catch (err: unknown) {
      const raw = (err instanceof Error ? err.message : '').toLowerCase();
      if (raw.includes('invalid login credentials') || raw.includes('invalid credentials')) {
        setError("Wrong email or password. Don't have an account yet? Sign up first.");
      } else if (raw.includes('user not found') || raw.includes('no user found')) {
        setError("No account found with that email. Please sign up first.");
      } else if (raw.includes('invalid email') || raw.includes('unable to validate email')) {
        setError("That doesn't look like a valid email address.");
      } else if (raw.includes('email not confirmed')) {
        setError("Please confirm your email address before signing in.");
      } else if (raw.includes('already registered') || raw.includes('already exists')) {
        setError("An account with this email already exists. Sign in instead.");
      } else if (raw.includes('weak password') || raw.includes('password should be')) {
        setError("Password is too weak. Use at least 6 characters.");
      } else if (raw.includes('rate limit') || raw.includes('too many requests')) {
        setError("Too many attempts. Please wait a moment and try again.");
      } else {
        setError("Something went wrong. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  if (checking) return null;

  return (
    <div className="auth-outer">
      <div className="auth-inner">

        {/* ── Desktop brand panel (left side) ── */}
        <div className="auth-brand-panel">
          <div style={{ marginBottom: 48 }}>
            <span style={{
              fontFamily: 'var(--font-display)',
              fontSize: '2rem', letterSpacing: '-0.02em',
              display: 'flex', alignItems: 'center', gap: 8,
              marginBottom: 8,
            }}>
              <BrandIcon size={40} />
              <span>
                <span style={{ color: 'rgba(255,255,255,0.85)', fontWeight: 600 }}>Order</span>
                <span style={{ color: '#FFFFFF', fontWeight: 800 }}>Ping</span>
              </span>
            </span>
            <p style={{
              margin: 0, fontFamily: 'var(--font-body)', fontSize: '1rem',
              color: 'rgba(255,255,255,0.7)', fontWeight: 400, lineHeight: 1.5,
            }}>
              Keep customers informed while they wait.
            </p>
          </div>

          {[
            { icon: '⚡', title: '5 seconds per update', body: 'Type a name, pick a status, send. Done.' },
            { icon: '💬', title: 'WhatsApp, SMS & Email', body: 'One tap opens the right app with your message ready.' },
            { icon: '🤖', title: 'AI writes it for you', body: 'Professional messages in your business name, every time.' },
            { icon: '📊', title: 'Built for African businesses', body: 'Simple, fast, and works on any phone or computer.' },
          ].map(({ icon, title, body }) => (
            <div key={title} style={{ display: 'flex', gap: 16, marginBottom: 28 }}>
              <div style={{
                width: 44, height: 44, borderRadius: 12,
                background: 'rgba(255,255,255,0.15)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '1.375rem', flexShrink: 0,
              }}>
                {icon}
              </div>
              <div>
                <p style={{ margin: '0 0 2px', fontFamily: 'var(--font-display)', fontSize: '0.9375rem', fontWeight: 700, color: '#FFFFFF' }}>
                  {title}
                </p>
                <p style={{ margin: 0, fontFamily: 'var(--font-body)', fontSize: '0.875rem', color: 'rgba(255,255,255,0.65)', lineHeight: 1.5 }}>
                  {body}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* ── Form panel (right side on desktop, full-screen on mobile) ── */}
        <div className="auth-form-panel" style={{
          minHeight: '100dvh', background: 'var(--background)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: 'var(--space-6)',
        }}>
        <div style={{ width: '100%', maxWidth: 440 }}>
        {/* Logo / brand — mobile only (hidden on desktop via CSS) */}
        <div className="auth-mobile-logo" style={{ textAlign: 'center', marginBottom: 'var(--space-8)' }}>
          <div style={{
            display: 'inline-flex', flexDirection: 'column',
            alignItems: 'center', gap: 4,
          }}>
            <span style={{
              fontFamily: 'var(--font-display)',
              fontSize: '2rem', letterSpacing: '-0.02em',
              display: 'flex', alignItems: 'center', gap: 6,
            }}>
              <BrandIcon size={38} />
              <span>
                <span style={{ color: 'var(--text)', fontWeight: 600 }}>Order</span><span style={{ color: '#1A56E8', fontWeight: 800 }}>Ping</span>
              </span>
            </span>
            <span style={{
              fontFamily: 'var(--font-body)', fontSize: '0.75rem', fontWeight: 500,
              color: 'var(--text-muted)', letterSpacing: '0.02em',
            }}>
              One click. Communicate. Connect.
            </span>
          </div>
        </div>

        {/* Card */}
        <div style={{
          background: 'var(--surface)', borderRadius: 20,
          border: '1.5px solid var(--border)',
          padding: 'var(--space-6)',
          boxShadow: '0 4px 24px rgba(0,0,0,0.06)',
        }}>

          {/* ── Forgot password view ── */}
          {mode === 'forgot' && (
            <>
              <button
                type="button"
                onClick={() => { setMode('signin'); setError(''); setResetSent(false); }}
                style={{
                  background: 'none', border: 'none', cursor: 'pointer',
                  color: 'var(--text-muted)', fontFamily: 'var(--font-body)',
                  fontSize: '0.8125rem', fontWeight: 600, padding: '0 0 16px',
                  display: 'flex', alignItems: 'center', gap: 4,
                }}
              >
                ← Back to sign in
              </button>

              {resetSent ? (
                <div style={{ textAlign: 'center', padding: '8px 0 4px' }}>
                  <div style={{
                    width: 56, height: 56, borderRadius: '50%',
                    background: '#DCFCE7', border: '2px solid #86EFAC',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '1.5rem', margin: '0 auto 16px',
                  }}>
                    ✉️
                  </div>
                  <p style={{
                    margin: '0 0 8px', fontFamily: 'var(--font-display)',
                    fontSize: '1.125rem', fontWeight: 700, color: 'var(--text)',
                  }}>
                    Check your inbox
                  </p>
                  <p style={{
                    margin: '0 0 20px', fontFamily: 'var(--font-body)',
                    fontSize: '0.875rem', color: 'var(--text-muted)', lineHeight: 1.5,
                  }}>
                    We sent a reset link to <strong style={{ color: 'var(--text)' }}>{email}</strong>.
                    Click it to set a new password.
                  </p>
                  <p style={{
                    margin: 0, fontFamily: 'var(--font-body)',
                    fontSize: '0.8125rem', color: 'var(--text-muted)',
                  }}>
                    Didn&apos;t get it?{' '}
                    <button
                      type="button"
                      onClick={() => { setResetSent(false); setError(''); }}
                      style={{
                        background: 'none', border: 'none', cursor: 'pointer',
                        color: 'var(--primary)', fontWeight: 600,
                        fontFamily: 'var(--font-body)', fontSize: '0.8125rem', padding: 0,
                      }}
                    >
                      Try again
                    </button>
                  </p>
                </div>
              ) : (
                <form onSubmit={handleForgot} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
                  <div>
                    <p style={{
                      margin: '0 0 16px', fontFamily: 'var(--font-body)',
                      fontSize: '0.9375rem', color: 'var(--text-secondary)', lineHeight: 1.5,
                    }}>
                      Enter your email and we&apos;ll send you a link to reset your password.
                    </p>
                    <label style={{
                      display: 'block', fontFamily: 'var(--font-body)',
                      fontSize: '0.8125rem', fontWeight: 600,
                      color: 'var(--text-secondary)', marginBottom: 6,
                    }}>
                      Email
                    </label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@example.com"
                      autoComplete="email"
                      autoFocus
                      style={{
                        width: '100%', padding: '13px var(--space-4)',
                        border: '1.5px solid var(--border)',
                        borderRadius: 'var(--radius-lg)',
                        background: 'var(--background)',
                        fontFamily: 'var(--font-body)', fontSize: '1rem',
                        color: 'var(--text)', outline: 'none',
                      }}
                      onFocus={(e) => (e.target.style.borderColor = 'var(--border-focus)')}
                      onBlur={(e) => (e.target.style.borderColor = 'var(--border)')}
                    />
                  </div>

                  {error && (
                    <div style={{
                      padding: '12px var(--space-4)', borderRadius: 'var(--radius-lg)',
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
                    {loading ? <><Loader2 size={18} className="animate-spin" /> Sending...</> : 'Send Reset Link'}
                  </button>
                </form>
              )}
            </>
          )}

          {/* ── Sign in / Sign up view ── */}
          {mode !== 'forgot' && (
            <>
              {/* Mode toggle */}
              <div style={{
                display: 'grid', gridTemplateColumns: '1fr 1fr',
                background: 'var(--surface-tint)',
                borderRadius: 'var(--radius-xl)',
                padding: 4, marginBottom: 'var(--space-6)',
              }}>
                {(['signin', 'signup'] as const).map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => { setMode(m); setError(''); }}
                    style={{
                      padding: '10px',
                      borderRadius: 'var(--radius-lg)',
                      border: 'none',
                      background: mode === m ? 'var(--surface)' : 'transparent',
                      boxShadow: mode === m ? '0 1px 4px rgba(0,0,0,0.08)' : 'none',
                      fontFamily: 'var(--font-display)', fontSize: '0.9375rem',
                      fontWeight: mode === m ? 700 : 500,
                      color: mode === m ? 'var(--primary)' : 'var(--text-muted)',
                      cursor: 'pointer', transition: 'all var(--transition-fast)',
                    }}
                  >
                    {m === 'signin' ? 'Sign In' : 'Sign Up'}
                  </button>
                ))}
              </div>

              <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
                {/* Email */}
                <div>
                  <label style={{
                    display: 'block', fontFamily: 'var(--font-body)',
                    fontSize: '0.8125rem', fontWeight: 600,
                    color: 'var(--text-secondary)', marginBottom: 6,
                  }}>
                    Email
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    autoComplete="email"
                    style={{
                      width: '100%', padding: '13px var(--space-4)',
                      border: '1.5px solid var(--border)',
                      borderRadius: 'var(--radius-lg)',
                      background: 'var(--background)',
                      fontFamily: 'var(--font-body)', fontSize: '1rem',
                      color: 'var(--text)', outline: 'none',
                    }}
                    onFocus={(e) => (e.target.style.borderColor = 'var(--border-focus)')}
                    onBlur={(e) => (e.target.style.borderColor = 'var(--border)')}
                  />
                </div>

                {/* Password */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 6 }}>
                    <label style={{
                      fontFamily: 'var(--font-body)',
                      fontSize: '0.8125rem', fontWeight: 600,
                      color: 'var(--text-secondary)',
                    }}>
                      Password
                    </label>
                    {mode === 'signin' && (
                      <button
                        type="button"
                        onClick={() => { setMode('forgot'); setError(''); setResetSent(false); }}
                        style={{
                          background: 'none', border: 'none', cursor: 'pointer',
                          color: 'var(--primary)', fontWeight: 600,
                          fontFamily: 'var(--font-body)', fontSize: '0.75rem', padding: 0,
                        }}
                      >
                        Forgot password?
                      </button>
                    )}
                  </div>
                  <div style={{ position: 'relative' }}>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
                      style={{
                        width: '100%', padding: '13px 48px 13px var(--space-4)',
                        border: '1.5px solid var(--border)',
                        borderRadius: 'var(--radius-lg)',
                        background: 'var(--background)',
                        fontFamily: 'var(--font-body)', fontSize: '1rem',
                        color: 'var(--text)', outline: 'none',
                      }}
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

                {/* Confirm Password (sign up only) */}
                {mode === 'signup' && (
                  <div>
                    <label style={{
                      display: 'block', fontFamily: 'var(--font-body)',
                      fontSize: '0.8125rem', fontWeight: 600,
                      color: 'var(--text-secondary)', marginBottom: 6,
                    }}>
                      Confirm Password
                    </label>
                    <div style={{ position: 'relative' }}>
                      <input
                        type={showConfirm ? 'text' : 'password'}
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="••••••••"
                        autoComplete="new-password"
                        style={{
                          width: '100%', padding: '13px 48px 13px var(--space-4)',
                          border: '1.5px solid var(--border)',
                          borderRadius: 'var(--radius-lg)',
                          background: 'var(--background)',
                          fontFamily: 'var(--font-body)', fontSize: '1rem',
                          color: 'var(--text)', outline: 'none',
                        }}
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
                )}

                {/* Error */}
                {error && (
                  <div style={{
                    padding: '12px var(--space-4)',
                    borderRadius: 'var(--radius-lg)',
                    background: 'var(--error-soft)',
                    border: '1.5px solid var(--error)',
                    fontFamily: 'var(--font-body)', fontSize: '0.875rem',
                    color: 'var(--error)', fontWeight: 500,
                  }}>
                    {error}
                  </div>
                )}

                {/* Submit */}
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
                  {loading ? (
                    <><Loader2 size={18} className="animate-spin" /> {mode === 'signin' ? 'Signing in...' : 'Creating account...'}</>
                  ) : (
                    mode === 'signin' ? 'Sign In' : 'Create Account'
                  )}
                </button>
              </form>

              {/* Divider + Guest */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '4px 0' }}>
                <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
                <span style={{ fontFamily: 'var(--font-body)', fontSize: '0.75rem', color: 'var(--text-muted)' }}>or</span>
                <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
              </div>

              <button
                type="button"
                onClick={handleGuest}
                disabled={loading}
                style={{
                  width: '100%', padding: '14px',
                  borderRadius: 'var(--radius-xl)',
                  border: '1.5px solid var(--border)',
                  background: 'transparent',
                  color: 'var(--text-muted)',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  fontFamily: 'var(--font-display)', fontSize: '0.9375rem', fontWeight: 600,
                  minHeight: 50,
                  transition: 'all var(--transition-fast)',
                }}
                onMouseEnter={(e) => { (e.target as HTMLButtonElement).style.borderColor = 'var(--border-focus)'; (e.target as HTMLButtonElement).style.color = 'var(--text)'; }}
                onMouseLeave={(e) => { (e.target as HTMLButtonElement).style.borderColor = 'var(--border)'; (e.target as HTMLButtonElement).style.color = 'var(--text-muted)'; }}
              >
                Continue as Guest
              </button>
            </>
          )}
        </div>

        {mode !== 'forgot' && (
        <p style={{
          textAlign: 'center', marginTop: 'var(--space-6)',
          fontFamily: 'var(--font-body)', fontSize: '0.8125rem',
          color: 'var(--text-muted)',
        }}>
          {mode === 'signin' ? "Don't have an account? " : 'Already have an account? '}
          <button
            type="button"
            onClick={() => { setMode(mode === 'signin' ? 'signup' : 'signin'); setError(''); }}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              color: 'var(--primary)', fontWeight: 600,
              fontFamily: 'var(--font-body)', fontSize: '0.8125rem',
              padding: 0,
            }}
          >
            {mode === 'signin' ? 'Sign up' : 'Sign in'}
          </button>
        </p>
        )}
        </div>{/* end form max-width wrapper */}
        </div>{/* end auth-form-panel */}

      </div>{/* end auth-inner */}
    </div>
  );
}
