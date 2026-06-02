'use client';

import type { FrustrationResult } from '@/lib/engagement-utils';

interface Props {
  frustration: FrustrationResult;
}

export default function FrustrationCard({ frustration }: Props) {
  if (frustration.level === 'none') return null;

  const isHigh = frustration.level === 'high';
  return (
    <div style={{
      background: isHigh ? '#FFF7ED' : '#FFFBEB',
      border: `1.5px solid ${isHigh ? '#FED7AA' : '#FDE68A'}`,
      borderRadius: 16, padding: '14px 16px',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
        <div style={{
          width: 36, height: 36, borderRadius: '50%',
          background: 'rgba(0,0,0,0.05)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '1rem', flexShrink: 0,
        }}>
          {isHigh ? '⚠️' : '🔍'}
        </div>
        <div>
          <p style={{
            margin: 0, fontSize: '0.8125rem', fontWeight: 700,
            color: isHigh ? '#78350F' : '#92400E',
            fontFamily: 'var(--font-display)',
          }}>
            {isHigh ? 'Customer may be frustrated' : 'Customer needs extra care'}
          </p>
          <p style={{ margin: 0, fontSize: '0.75rem', color: '#B45309', fontFamily: 'var(--font-body)' }}>
            Tone auto-set to Apologetic
          </p>
        </div>
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
        {frustration.signals.map((sig, i) => (
          <span key={i} style={{
            padding: '3px 10px', borderRadius: 20,
            background: isHigh ? '#FFEDD5' : '#FEF3C7',
            border: `1px solid ${isHigh ? '#FED7AA' : '#FDE68A'}`,
            fontSize: '0.6875rem', fontWeight: 600,
            color: isHigh ? '#78350F' : '#92400E',
            fontFamily: 'var(--font-body)',
          }}>
            {sig}
          </span>
        ))}
      </div>
    </div>
  );
}
