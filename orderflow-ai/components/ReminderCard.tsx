'use client';

import { STATUS_LABELS, relativeTime } from '@/lib/engagement-utils';
import type { RecentEntry } from '@/lib/storage';
import type { ForgottenCustomer } from '@/lib/engagement-utils';

interface Props {
  lastEntry:        RecentEntry;
  forgotten:        ForgottenCustomer[];
  onFillRecipient:  (name: string, phone: string, email: string) => void;
  onDismiss:        () => void;
}

export default function ReminderCard({ lastEntry, forgotten, onFillRecipient, onDismiss }: Props) {
  return (
    <div style={{
      background: '#FFFBEB', border: '1.5px solid #FDE68A',
      borderRadius: 16, padding: '12px 16px',
    }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 2 }}>
        <p style={{
          margin: 0, fontSize: '0.8125rem', fontWeight: 500,
          color: '#92400E', fontFamily: 'var(--font-body)', flex: 1,
        }}>
          Last update: <strong>{lastEntry.customerName}</strong>{' '}
          <span style={{ color: '#B45309' }}>
            ({STATUS_LABELS[lastEntry.status] ?? lastEntry.status} · {relativeTime(lastEntry.timestamp)})
          </span>
        </p>
        <button
          onClick={onDismiss}
          style={{
            background: 'none', border: 'none', cursor: 'pointer',
            color: '#B45309', fontSize: '1rem', lineHeight: 1,
            padding: '0 0 0 8px', opacity: 0.7, flexShrink: 0,
          }}
          aria-label="Dismiss"
        >
          ✕
        </button>
      </div>
      <p style={{
        margin: '0 0 10px', fontSize: '0.875rem', fontWeight: 700,
        color: '#92400E', fontFamily: 'var(--font-display)',
      }}>
        Are you sure you&apos;re not missing anyone? 👀
      </p>
      {forgotten.map((c, i) => (
        <button
          key={i}
          onClick={() => onFillRecipient(c.customerName, c.phoneNumber, c.email ?? '')}
          style={{
            width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            background: 'rgba(255,255,255,0.6)', border: '1px solid #FDE68A',
            borderRadius: 10, padding: '10px 12px', marginBottom: 6,
            cursor: 'pointer', textAlign: 'left',
          }}
        >
          <div>
            <p style={{ margin: 0, fontSize: '0.875rem', fontWeight: 700, color: '#92400E', fontFamily: 'var(--font-display)' }}>
              {c.customerName}
            </p>
            <p style={{ margin: 0, fontSize: '0.75rem', color: '#B45309', fontFamily: 'var(--font-body)' }}>
              {STATUS_LABELS[c.lastStatus] ?? c.lastStatus} · {c.hoursAgo < 48 ? `${c.hoursAgo}h ago` : `${Math.floor(c.hoursAgo / 24)}d ago`}
            </p>
          </div>
          <span style={{ color: '#B45309', fontSize: '1rem' }}>→</span>
        </button>
      ))}
    </div>
  );
}
