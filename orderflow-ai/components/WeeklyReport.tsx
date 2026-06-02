'use client';

import type { WeekSummary } from '@/lib/engagement-utils';

interface Props {
  summary:   WeekSummary;
  onDismiss: () => void;
}

export default function WeeklyReport({ summary, onDismiss }: Props) {
  const stats = [
    { num: summary.updates,              label: 'updates'   },
    { num: summary.customers,            label: 'customers' },
    { num: summary.bestDay.slice(0, 3),  label: 'best day'  },
  ] as const;

  return (
    <div style={{
      background: '#EFF6FF', border: '1.5px solid #BFDBFE',
      borderRadius: 16, padding: 16,
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <span style={{
          fontSize: '0.9375rem', fontWeight: 700,
          color: '#1E40AF', fontFamily: 'var(--font-display)',
        }}>
          📊 Last week
        </span>
        <button
          onClick={onDismiss}
          style={{
            background: 'none', border: 'none', cursor: 'pointer',
            fontSize: 18, color: 'var(--text-muted)', lineHeight: 1, padding: 2,
          }}
        >✕</button>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-around' }}>
        {stats.map(({ num, label }) => (
          <div key={label} style={{ textAlign: 'center' }}>
            <p style={{
              margin: 0, fontSize: '1.75rem', fontWeight: 800,
              color: 'var(--primary)', fontFamily: 'var(--font-display)',
            }}>
              {num}
            </p>
            <p style={{
              margin: 0, fontSize: '0.6875rem', color: 'var(--text-muted)',
              fontWeight: 600, fontFamily: 'var(--font-body)',
              textTransform: 'uppercase', letterSpacing: '0.04em',
            }}>
              {label}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
