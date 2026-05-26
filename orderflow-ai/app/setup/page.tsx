'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, LogOut } from 'lucide-react';
import BusinessProfileForm from '@/components/BusinessProfileForm';
import { getProfile } from '@/lib/storage';
import { supabase } from '@/lib/supabase';

export default function SetupPage() {
  const router = useRouter();
  const [isEdit, setIsEdit] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) { router.replace('/auth'); return; }
      setIsEdit(!!getProfile());
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
          {isEdit && (
            <button
              onClick={() => router.back()}
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
            {isEdit ? 'Edit Business Profile' : "Let's set up your business"}
          </h1>
        </div>
      </header>

      <main className="setup-content">
        {!isEdit && (
          <p style={{
            fontFamily: 'var(--font-body)', fontSize: '0.9375rem',
            color: 'var(--text-muted)', marginBottom: 'var(--space-6)',
            lineHeight: 1.6,
          }}>
            Two minutes once. Then every order update takes 5 seconds.
          </p>
        )}

        <BusinessProfileForm isEdit={isEdit} />

        <button
          type="button"
          onClick={async () => {
            await supabase.auth.signOut();
            router.replace('/auth');
          }}
          style={{
            marginTop: 'var(--space-8)',
            width: '100%', padding: '13px',
            borderRadius: 'var(--radius-xl)',
            border: '1.5px solid var(--border)',
            background: 'transparent',
            color: 'var(--text-muted)',
            cursor: 'pointer',
            fontFamily: 'var(--font-body)', fontSize: '0.9375rem', fontWeight: 600,
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            transition: 'all var(--transition-fast)',
          }}
        >
          <LogOut size={16} />
          Sign Out
        </button>
      </main>
    </div>
  );
}
