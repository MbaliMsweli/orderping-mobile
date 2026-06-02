'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, LogOut } from 'lucide-react';
import BusinessProfileForm from '@/components/BusinessProfileForm';
import { getProfile } from '@/lib/storage';
import { supabase } from '@/lib/supabase';

const TYPE_OPTIONS = [
  {
    value: 'product' as const,
    emoji: '📦',
    label: 'Product Business',
    sub: 'Orders, shipping & deliveries',
  },
  {
    value: 'service' as const,
    emoji: '🔧',
    label: 'Service Business',
    sub: 'Appointments, technicians & visits',
  },
];

function TypePickerStep({ onSelect }: { onSelect: (t: 'product' | 'service') => void }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
      <div>
        <h2 style={{
          fontFamily: 'var(--font-display)', fontSize: '1.25rem',
          fontWeight: 700, color: 'var(--text)', margin: '0 0 var(--space-2)',
        }}>
          What type of business do you run?
        </h2>
        <p style={{
          fontFamily: 'var(--font-body)', fontSize: '0.9375rem',
          color: 'var(--text-muted)', margin: 0, lineHeight: 1.6,
        }}>
          This personalises your statuses and messages.
        </p>
      </div>
      <div className="type-grid">
        {TYPE_OPTIONS.map(opt => (
          <button
            key={opt.value}
            type="button"
            onClick={() => onSelect(opt.value)}
            style={{
              padding: '28px 16px', borderRadius: 20,
              border: '2px solid var(--border)', background: 'var(--surface)',
              cursor: 'pointer', display: 'flex', flexDirection: 'column',
              alignItems: 'center', gap: 10,
              transition: 'all var(--transition-fast)',
              boxShadow: 'var(--shadow-sm)',
            }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--primary)';
              (e.currentTarget as HTMLButtonElement).style.background = 'var(--primary-soft)';
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--border)';
              (e.currentTarget as HTMLButtonElement).style.background = 'var(--surface)';
            }}
          >
            <span style={{ fontSize: '2.5rem' }}>{opt.emoji}</span>
            <span style={{
              fontFamily: 'var(--font-display)', fontSize: '1rem',
              fontWeight: 700, color: 'var(--text)',
            }}>
              {opt.label}
            </span>
            <span style={{
              fontFamily: 'var(--font-body)', fontSize: '0.8125rem',
              color: 'var(--text-muted)', textAlign: 'center', lineHeight: 1.4,
            }}>
              {opt.sub}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

export default function SetupPage() {
  const router = useRouter();
  const [isEdit, setIsEdit] = useState(false);
  const [ready, setReady] = useState(false);
  const [step, setStep] = useState<1 | 2>(1);
  const [selectedType, setSelectedType] = useState<'product' | 'service'>('product');

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) { router.replace('/auth'); return; }
      const profile = getProfile();
      setIsEdit(!!profile);
      if (profile) {
        setSelectedType(profile.businessType ?? 'product');
        setStep(2);
      }
      setReady(true);
    });
  }, [router]);

  if (!ready) return null;

  return (
    <div style={{ background: 'var(--background)', minHeight: '100dvh' }}>
      {/* Header */}
      <header style={{
        position: 'sticky', top: 0, zIndex: 50,
        height: 'var(--header-height)',
        background: 'var(--surface)',
        borderBottom: '1px solid var(--border-light)',
        boxShadow: 'var(--shadow-xs)',
        paddingTop: 'var(--safe-area-top)',
      }}>
        <div style={{
          maxWidth: 640, margin: '0 auto',
          padding: '0 var(--space-4)', height: '100%',
          display: 'flex', alignItems: 'center', gap: 'var(--space-3)',
        }}>
          {step === 2 && (
            <button
              onClick={() => isEdit ? router.back() : setStep(1)}
              style={{
                width: 40, height: 40, display: 'flex', alignItems: 'center',
                justifyContent: 'center', borderRadius: 'var(--radius-full)',
                border: 'none', background: 'transparent', cursor: 'pointer',
                color: 'var(--text-muted)',
              }}
              aria-label="Back"
            >
              <ArrowLeft size={20} />
            </button>
          )}
          <h1 style={{
            fontFamily: 'var(--font-display)', fontSize: '1.125rem',
            fontWeight: 700, color: 'var(--text)', margin: 0, flex: 1,
          }}>
            {isEdit
              ? 'Edit Business Profile'
              : step === 1
                ? "Let's set up your business"
                : 'Business Details'}
          </h1>
        </div>
      </header>

      <main className="setup-content">
        {step === 1 ? (
          <TypePickerStep onSelect={(type) => { setSelectedType(type); setStep(2); }} />
        ) : (
          <>
            {!isEdit && (
              <p style={{
                fontFamily: 'var(--font-body)', fontSize: '0.9375rem',
                color: 'var(--text-muted)', marginBottom: 'var(--space-6)',
                lineHeight: 1.6,
              }}>
                Two minutes once. Then every order update takes 5 seconds.
              </p>
            )}

            <BusinessProfileForm
              key={selectedType}
              isEdit={isEdit}
              initialType={selectedType}
              hideTypePicker
              onChangeType={() => setStep(1)}
            />

            <button
              type="button"
              onClick={async () => {
                await supabase.auth.signOut();
                router.replace('/auth');
              }}
              style={{
                marginTop: 'var(--space-8)',
                width: '100%', padding: '13px', minHeight: 48,
                borderRadius: 'var(--radius-xl)',
                border: '1.5px solid var(--border)',
                background: 'var(--surface)',
                color: 'var(--text-secondary)',
                cursor: 'pointer',
                fontFamily: 'var(--font-body)', fontSize: '0.9375rem', fontWeight: 600,
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                transition: 'all var(--transition-fast)',
              }}
              onMouseEnter={e => {
                const b = e.currentTarget;
                b.style.borderColor = 'var(--error)';
                b.style.color = 'var(--error)';
                b.style.background = 'var(--error-soft)';
              }}
              onMouseLeave={e => {
                const b = e.currentTarget;
                b.style.borderColor = 'var(--border)';
                b.style.color = 'var(--text-secondary)';
                b.style.background = 'var(--surface)';
              }}
            >
              <LogOut size={16} />
              Sign Out
            </button>
          </>
        )}
      </main>
    </div>
  );
}
