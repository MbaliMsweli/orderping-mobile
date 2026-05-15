'use client';

import { useState, useEffect } from 'react';
import BrandIcon from '@/components/BrandIcon';

interface HeaderProps {
  onSettingsClick: () => void;
  onRecentClick: () => void;
  showRecent: boolean;
  businessName?: string;
}

function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

export default function Header({ onSettingsClick, onRecentClick, showRecent, businessName }: HeaderProps) {
  const [greeting, setGreeting] = useState('');
  const displayName = businessName ? businessName.split(' ')[0] : null;

  useEffect(() => {
    setGreeting(getGreeting());
  }, []);

  const pillStyle: React.CSSProperties = {
    display: 'flex', alignItems: 'center', gap: 5,
    padding: '7px 13px',
    borderRadius: 'var(--radius-full)',
    border: 'none',
    background: 'rgba(255,255,255,0.18)',
    cursor: 'pointer',
    color: '#FFFFFF',
    fontFamily: 'var(--font-display)', fontSize: '0.8125rem', fontWeight: 600,
    backdropFilter: 'blur(8px)',
    transition: 'background var(--transition-fast)',
  };

  return (
    <header style={{
      background: 'linear-gradient(145deg, #1A56E8 0%, #3B82F6 100%)',
      paddingTop: 'var(--safe-area-top)',
      paddingBottom: 'var(--space-8)',
    }}>
      <div style={{
        maxWidth: 'var(--max-width)', margin: '0 auto',
        padding: 'var(--space-4) var(--space-4) 0',
      }}>
        {/* Top row: brand + actions */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          marginBottom: 'var(--space-5)',
        }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <span style={{
              fontFamily: 'var(--font-display)',
              fontSize: '1.5rem', letterSpacing: '-0.02em',
              display: 'flex', alignItems: 'center', gap: 2,
            }}>
              <BrandIcon size={28} />
              <span>
                <span style={{ color: 'rgba(255,255,255,0.80)', fontWeight: 600 }}>Order</span><span style={{ color: '#FFFFFF', fontWeight: 800 }}>Ping</span>
              </span>
            </span>
            <span style={{
              fontFamily: 'var(--font-body)', fontSize: '0.6875rem', fontWeight: 500,
              color: 'rgba(255,255,255,0.60)', letterSpacing: '0.02em',
            }}>
              One click. Communicate. Connect.
            </span>
          </div>

          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={onRecentClick} style={pillStyle} aria-label="Recent messages">
              {showRecent ? '✕ Close' : '🕒 Recent'}
            </button>
            <button onClick={onSettingsClick} style={{ ...pillStyle, padding: '7px 11px' }} aria-label="Settings">
              ⚙️
            </button>
          </div>
        </div>

        {/* Greeting */}
        <p style={{
          fontFamily: 'var(--font-display)', fontWeight: 600,
          fontSize: '1.375rem', color: '#FFFFFF',
          margin: '0 0 4px', letterSpacing: '-0.01em',
        }}>
          {greeting}{displayName ? `, ${displayName}` : ''} 👋
        </p>
        <p style={{
          fontFamily: 'var(--font-body)', fontSize: '0.9375rem',
          color: 'rgba(255,255,255,0.70)', margin: 0, fontWeight: 400,
        }}>
          {showRecent ? 'Recent messages' : 'Keep customers informed while they wait.'}
        </p>
      </div>
    </header>
  );
}
