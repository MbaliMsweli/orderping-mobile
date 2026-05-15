'use client';

import { useState } from 'react';
import { Check, Copy } from 'lucide-react';
import type { Recipient } from '@/components/CustomerInput';

type Channel = 'whatsapp' | 'sms' | 'email' | 'copy';

interface SendButtonsProps {
  recipients: Recipient[];
  onSend: (channel: Channel, recipient: Recipient) => void;
  onClear: () => void;
  hasMessage: boolean;
}

const clearBtnStyle: React.CSSProperties = {
  width: '100%', padding: '14px',
  borderRadius: 'var(--radius-xl)',
  border: '1.5px solid var(--border)',
  background: 'transparent',
  color: 'var(--text-muted)',
  cursor: 'pointer', fontFamily: 'var(--font-body)',
  fontSize: '0.875rem', fontWeight: 500,
  minHeight: 48, transition: 'var(--transition-fast)', marginTop: 4,
};

export default function SendButtons({ recipients, onSend, onClear, hasMessage }: SendButtonsProps) {
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  const handleCopy = (recipient: Recipient, index: number) => {
    onSend('copy', recipient);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const r = recipients[0];
    const hasEmail = !!r.email.trim();
    const copied = copiedIndex === 0;

    const btn = (
      label: string, bg: string, color: string,
      onClick: () => void, disabled = false, outlined = false,
      icon?: React.ReactNode,
    ) => (
      <button
        onClick={onClick} disabled={disabled}
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          gap: 6, padding: '14px 8px',
          borderRadius: 'var(--radius-xl)',
          border: outlined ? `2px solid ${disabled ? 'var(--border)' : bg}` : 'none',
          background: outlined ? 'transparent' : bg,
          color: outlined ? (disabled ? 'var(--text-light)' : bg) : color,
          cursor: disabled ? 'not-allowed' : 'pointer',
          fontFamily: 'var(--font-display)', fontSize: '0.875rem', fontWeight: 700,
          minHeight: 54, opacity: disabled ? 0.45 : 1,
          transition: 'all var(--transition-fast)', letterSpacing: '-0.01em',
        }}
      >
        {icon}{label}
      </button>
    );

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          {btn('WhatsApp', '#25D366', 'white', () => onSend('whatsapp', r), !hasMessage)}
          {btn('SMS', '#3B82F6', 'white', () => onSend('sms', r), !hasMessage)}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          {btn('Email', '#7C3AED', 'white', () => onSend('email', r), !hasMessage || !hasEmail)}
          {btn(
            copied ? 'Copied!' : 'Copy',
            'var(--text-secondary)', 'var(--text-secondary)',
            () => handleCopy(r, 0), !hasMessage, true,
            copied ? <Check size={14} /> : <Copy size={14} />,
          )}
        </div>
        {!hasEmail && hasMessage && (
          <p style={{
            textAlign: 'center', fontSize: '0.75rem',
            color: 'var(--text-light)', fontFamily: 'var(--font-body)', marginTop: -4,
          }}>
            Add an email address above to enable Email
          </p>
        )}
        <button onClick={onClear} style={clearBtnStyle}>Clear &amp; Start New ↺</button>
      </div>
    );
}
