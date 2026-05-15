'use client';

import { useEffect, useState } from 'react';
import { getRecent, clearRecent } from '@/lib/storage';
import type { RecentEntry } from '@/lib/storage';
import { buildWhatsAppLink, buildSMSLink, buildEmailLink } from '@/lib/deep-links';

interface RecentListProps {
  onSelect: (name: string, phone: string, email: string, courier?: string | null) => void;
  businessName?: string;
}

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

const STATUS_META: Record<string, { label: string; color: string; bg: string }> = {
  received:    { label: 'Received',   color: '#8B5CF6', bg: '#EDE9FE' },
  delay:       { label: 'Delayed',    color: '#92400E', bg: '#FEF3C7' },
  dispatched:  { label: 'Dispatched', color: '#1D4ED8', bg: '#EFF6FF' },
  ready:       { label: 'Ready',      color: '#15803D', bg: '#DCFCE7' },
  'pre-order': { label: 'Pre-order',  color: '#4338CA', bg: '#EEF2FF' },
};

const CHANNEL_LABEL: Record<string, string> = {
  whatsapp: '💬 WA',
  sms:      '📱 SMS',
  email:    '📧 Email',
  copy:     '📋 Copy',
};

function StatusBadge({ status }: { status: string }) {
  const meta = STATUS_META[status];
  if (!meta) return null;
  return (
    <span style={{
      display: 'inline-block',
      padding: '2px 8px',
      borderRadius: 'var(--radius-full)',
      background: meta.bg,
      color: meta.color,
      fontSize: '0.6875rem', fontWeight: 700,
      fontFamily: 'var(--font-body)',
      letterSpacing: '0.04em',
      textTransform: 'uppercase',
      flexShrink: 0,
    }}>
      {meta.label}
    </span>
  );
}

export default function RecentList({ onSelect, businessName }: RecentListProps) {
  const [entries, setEntries] = useState<RecentEntry[]>([]);
  const [filter, setFilter] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);

  useEffect(() => {
    setEntries(getRecent());
  }, []);

  const ALL_STATUSES = ['received', 'delay', 'dispatched', 'ready', 'pre-order'];
  const filtered = entries.filter((e) => {
    const matchesFilter = !filter || e.status === filter;
    const q = searchQuery.trim().toLowerCase();
    const matchesSearch = !q || e.customerName.toLowerCase().includes(q) || e.phoneNumber.includes(q);
    return matchesFilter && matchesSearch;
  });

  const handleResend = (ev: React.MouseEvent, entry: RecentEntry, channel: string) => {
    ev.stopPropagation();
    if (channel === 'whatsapp') {
      window.open(buildWhatsAppLink(entry.phoneNumber, entry.message), '_blank');
    } else if (channel === 'sms') {
      window.open(buildSMSLink(entry.phoneNumber, entry.message));
    } else if (channel === 'email' && entry.email) {
      window.open(buildEmailLink(entry.email, businessName ?? '', entry.message));
    } else {
      navigator.clipboard.writeText(entry.message).catch(() => {});
    }
  };

  if (entries.length === 0) {
    return (
      <div style={{
        textAlign: 'center', padding: 'var(--space-8) 0',
        color: 'var(--text-muted)', fontFamily: 'var(--font-body)',
        fontSize: '0.9rem',
      }}>
        No messages sent yet
      </div>
    );
  }

  return (
    <div>
      {/* Search */}
      <input
        type="text"
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        placeholder="Search by name or number…"
        style={{
          width: '100%', boxSizing: 'border-box',
          padding: '10px 14px', marginBottom: 10,
          border: '1.5px solid var(--border)',
          borderRadius: 'var(--radius-xl)',
          background: 'var(--surface)',
          fontFamily: 'var(--font-body)', fontSize: '0.9375rem',
          color: 'var(--text)', outline: 'none',
        }}
      />

      {/* Status filter pills */}
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 10 }}>
        <button
          onClick={() => setFilter(null)}
          style={{
            padding: '5px 12px',
            borderRadius: 'var(--radius-full)',
            border: `1.5px solid ${filter === null ? 'var(--primary)' : 'var(--border)'}`,
            background: filter === null ? 'var(--primary)' : 'var(--surface)',
            color: filter === null ? 'white' : 'var(--text-muted)',
            fontFamily: 'var(--font-body)', fontSize: '0.8125rem', fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          All
        </button>
        {ALL_STATUSES.map((s) => {
          const meta = STATUS_META[s];
          const isActive = filter === s;
          return (
            <button
              key={s}
              onClick={() => setFilter(isActive ? null : s)}
              style={{
                padding: '5px 12px',
                borderRadius: 'var(--radius-full)',
                border: `1.5px solid ${isActive ? meta?.color ?? 'var(--border)' : 'var(--border)'}`,
                background: isActive ? (meta?.bg ?? 'var(--surface)') : 'var(--surface)',
                color: isActive ? (meta?.color ?? 'var(--text)') : 'var(--text-muted)',
                fontFamily: 'var(--font-body)', fontSize: '0.8125rem', fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              {meta?.label ?? s}
            </button>
          );
        })}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {filtered.length === 0 ? (
          <p style={{
            textAlign: 'center', padding: 'var(--space-4) 0',
            color: 'var(--text-muted)', fontFamily: 'var(--font-body)',
            fontSize: '0.875rem',
          }}>
            {searchQuery.trim() ? 'No results found.' : `No ${STATUS_META[filter!]?.label ?? (filter ?? 'recent')} messages yet`}
          </p>
        ) : filtered.map((entry, i) => {
          const isExpanded = expandedIndex === i;
          const preview = entry.message.replace(/\n/g, ' ');
          return (
            <div
              key={i}
              onClick={() => setExpandedIndex(isExpanded ? null : i)}
              style={{
                padding: 'var(--space-4)',
                borderRadius: 16,
                border: '1.5px solid var(--border)',
                background: 'var(--surface)',
                cursor: 'pointer',
                boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
              }}
            >
              {/* Top row: name + badge + time */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 4 }}>
                <span style={{
                  fontFamily: 'var(--font-display)', fontSize: '0.9375rem',
                  fontWeight: 700, color: 'var(--text)', flex: 1,
                  minWidth: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                }}>
                  {entry.customerName}
                </span>
                <StatusBadge status={entry.status} />
                <span style={{
                  fontSize: '0.75rem', color: 'var(--text-light)',
                  fontFamily: 'var(--font-body)', flexShrink: 0,
                }}>
                  {relativeTime(entry.timestamp)}
                </span>
              </div>

              {/* Phone + channel */}
              <div style={{
                display: 'flex', alignItems: 'center', gap: 8,
                fontSize: '0.8125rem', color: 'var(--text-muted)',
                fontFamily: 'var(--font-body)', marginBottom: 6,
              }}>
                <span>{entry.phoneNumber}</span>
                <span style={{ color: 'var(--border)' }}>·</span>
                <span>{CHANNEL_LABEL[entry.channel] || entry.channel}</span>
              </div>

              {isExpanded ? (
                <>
                  {/* Full message */}
                  <p style={{
                    margin: '6px 0 0',
                    padding: '12px 14px',
                    background: 'var(--background)',
                    borderRadius: 12,
                    fontSize: '0.9375rem', color: 'var(--text)',
                    fontFamily: 'var(--font-body)', lineHeight: 1.6,
                    whiteSpace: 'pre-wrap', wordBreak: 'break-word',
                  }}>
                    {entry.message}
                  </p>

                  {/* Resend buttons */}
                  <div style={{ display: 'flex', gap: 6, marginTop: 10 }}>
                    <button
                      onClick={(e) => handleResend(e, entry, 'whatsapp')}
                      style={{ flex: 1, padding: '10px 2px', borderRadius: 12, border: 'none', background: '#25D366', color: 'white', fontFamily: 'var(--font-display)', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer' }}
                    >
                      WhatsApp
                    </button>
                    <button
                      onClick={(e) => handleResend(e, entry, 'sms')}
                      style={{ flex: 1, padding: '10px 2px', borderRadius: 12, border: 'none', background: '#3B82F6', color: 'white', fontFamily: 'var(--font-display)', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer' }}
                    >
                      SMS
                    </button>
                    {entry.email && (
                      <button
                        onClick={(e) => handleResend(e, entry, 'email')}
                        style={{ flex: 1, padding: '10px 2px', borderRadius: 12, border: 'none', background: '#7C3AED', color: 'white', fontFamily: 'var(--font-display)', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer' }}
                      >
                        Email
                      </button>
                    )}
                    <button
                      onClick={(e) => handleResend(e, entry, 'copy')}
                      style={{ flex: 1, padding: '10px 2px', borderRadius: 12, border: 'none', background: '#6B7280', color: 'white', fontFamily: 'var(--font-display)', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer' }}
                    >
                      Copy
                    </button>
                  </div>

                  {/* Use this contact */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelect(entry.customerName, entry.phoneNumber, entry.email ?? '', entry.courier);
                    }}
                    style={{
                      marginTop: 8, width: '100%',
                      background: 'none', border: 'none', cursor: 'pointer',
                      color: 'var(--primary)', fontFamily: 'var(--font-body)',
                      fontSize: '0.8125rem', fontWeight: 600,
                      textAlign: 'center', padding: '6px 0',
                    }}
                  >
                    Use this contact for a new message →
                  </button>
                </>
              ) : (
                <p style={{
                  margin: 0, fontSize: '0.8125rem',
                  color: 'var(--text-secondary)', fontFamily: 'var(--font-body)',
                  lineHeight: 1.5, fontStyle: 'italic',
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                }}>
                  &ldquo;{preview.slice(0, 72)}{entry.message.length > 72 ? '...' : ''}&rdquo;
                </p>
              )}
            </div>
          );
        })}
      </div>

      <button
        onClick={() => { clearRecent(); setEntries([]); setFilter(null); setExpandedIndex(null); }}
        style={{
          marginTop: 'var(--space-4)', width: '100%',
          background: 'none', border: 'none', cursor: 'pointer',
          color: 'var(--error)', fontFamily: 'var(--font-body)',
          fontSize: '0.875rem', fontWeight: 500,
          padding: 'var(--space-3)', textAlign: 'center',
        }}
      >
        Clear History
      </button>
    </div>
  );
}
