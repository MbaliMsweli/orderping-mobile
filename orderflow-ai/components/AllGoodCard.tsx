'use client';

import { STATUS_LABELS, relativeTime } from '@/lib/engagement-utils';
import type { RecentEntry } from '@/lib/storage';

interface Props {
  lastEntry: RecentEntry;
}

export default function AllGoodCard({ lastEntry }: Props) {
  return (
    <div style={{
      background: 'linear-gradient(135deg, #F0FDF4 0%, #ECFDF5 100%)',
      border: '1.5px solid #BBF7D0',
      borderRadius: 16, padding: '14px 18px',
      display: 'flex', alignItems: 'center', gap: 12,
      boxShadow: '0 2px 12px rgba(34,197,94,0.08)',
    }}>
      <div style={{
        width: 36, height: 36, borderRadius: '50%',
        background: '#DCFCE7', border: '1.5px solid #86EFAC',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexShrink: 0, fontSize: '1.125rem', fontWeight: 700, color: '#166534',
      }}>
        ✓
      </div>
      <div>
        <p style={{
          margin: 0, fontSize: '0.9375rem', fontWeight: 700,
          color: '#166534', fontFamily: 'var(--font-display)',
        }}>
          All customers have been informed.
        </p>
        <p style={{
          margin: '2px 0 0', fontSize: '0.8125rem',
          color: '#15803D', fontFamily: 'var(--font-body)', fontWeight: 400,
        }}>
          Last: {lastEntry.customerName} · {STATUS_LABELS[lastEntry.status] ?? lastEntry.status} · {relativeTime(lastEntry.timestamp)}
        </p>
      </div>
    </div>
  );
}
