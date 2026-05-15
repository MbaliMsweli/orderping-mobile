'use client';

import { forwardRef, useImperativeHandle, useRef } from 'react';
import { User, Phone, Mail } from 'lucide-react';
import CourierPaste, { type CourierId } from '@/components/CourierPaste';

export interface CustomerInputHandle {
  focusName: () => void;
}

export interface Recipient {
  name: string;
  phone: string;
  email: string;
  courier?: CourierId | null;
  customCourierName?: string;
  waybill?: string;
}

type StringRecipientField = 'name' | 'phone' | 'email' | 'customCourierName' | 'waybill';

interface CustomerInputProps {
  recipients: Recipient[];
  onUpdate: (index: number, field: StringRecipientField, value: string) => void;
  onCourierChange: (index: number, courier: CourierId | null) => void;
  errors: Array<{ name?: string; phone?: string }>;
  showCourier?: boolean;
}

const inputStyle = (hasError = false): React.CSSProperties => ({
  width: '100%',
  padding: '15px var(--space-4)',
  border: `2px solid ${hasError ? 'var(--error)' : 'var(--border)'}`,
  borderRadius: 'var(--radius-xl)',
  background: 'var(--surface)',
  fontFamily: 'var(--font-body)',
  fontSize: '1rem',
  fontWeight: 500,
  color: 'var(--text)',
  outline: 'none',
  transition: 'border-color var(--transition-fast)',
  minHeight: 54,
});

const CustomerInput = forwardRef<CustomerInputHandle, CustomerInputProps>(
function CustomerInput({ recipients, onUpdate, onCourierChange, errors, showCourier = false }, ref) {
  const nameInputRef = useRef<HTMLInputElement>(null);

  useImperativeHandle(ref, () => ({
    focusName: () => nameInputRef.current?.focus(),
  }));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 'var(--space-4)' }}>
      {recipients.map((r, i) => {
        const errs = errors[i] || {};
        return (
          <div key={i} style={{
            background: 'var(--surface)',
            borderRadius: 20,
            border: '1.5px solid var(--border)',
            padding: 'var(--space-4)',
            display: 'flex', flexDirection: 'column', gap: 'var(--space-3)',
            boxShadow: '0 2px 12px rgba(0,0,0,0.05)',
          }}>
            {/* Card header */}
            <span style={{
              fontFamily: 'var(--font-body)', fontSize: '0.75rem',
              fontWeight: 700, color: 'var(--text-muted)',
              textTransform: 'uppercase', letterSpacing: '0.06em',
            }}>
              Customer
            </span>

            {/* Name */}
            <div>
              <label style={{
                display: 'flex', alignItems: 'center', gap: 6,
                fontFamily: 'var(--font-body)', fontSize: '0.8125rem',
                fontWeight: 700, color: 'var(--text-muted)',
                textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6,
              }}>
                <User size={12} strokeWidth={2.5} /> Name
              </label>
              <input
                ref={i === 0 ? nameInputRef : undefined}
                type="text"
                value={r.name}
                onChange={(e) => onUpdate(i, 'name', e.target.value)}
                placeholder={i === 0 ? 'Thandi' : 'Mike'}
                style={inputStyle(!!errs.name)}
                autoComplete="off"
              />
              {errs.name && (
                <p style={{ marginTop: 4, fontSize: '0.8125rem', color: 'var(--error)', fontFamily: 'var(--font-body)' }}>
                  {errs.name}
                </p>
              )}
            </div>

            {/* Phone */}
            <div>
              <label style={{
                display: 'flex', alignItems: 'center', gap: 6,
                fontFamily: 'var(--font-body)', fontSize: '0.8125rem',
                fontWeight: 700, color: 'var(--text-muted)',
                textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6,
              }}>
                <Phone size={12} strokeWidth={2.5} /> Phone
              </label>
              <input
                type="tel"
                value={r.phone}
                onChange={(e) => onUpdate(i, 'phone', e.target.value)}
                placeholder="0712345678"
                style={inputStyle(!!errs.phone)}
                inputMode="tel"
                autoComplete="tel"
              />
              {errs.phone && (
                <p style={{ marginTop: 4, fontSize: '0.8125rem', color: 'var(--error)', fontFamily: 'var(--font-body)' }}>
                  {errs.phone}
                </p>
              )}
            </div>

            {/* Email */}
            <div>
              <label style={{
                display: 'flex', alignItems: 'center', gap: 6,
                fontFamily: 'var(--font-body)', fontSize: '0.8125rem',
                fontWeight: 700, color: 'var(--text-muted)',
                textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6,
              }}>
                <Mail size={12} strokeWidth={2.5} /> Email (optional)
              </label>
              <input
                type="email"
                value={r.email}
                onChange={(e) => onUpdate(i, 'email', e.target.value)}
                placeholder="thandi@example.com"
                style={inputStyle()}
                inputMode="email"
                autoComplete="email"
                autoCapitalize="none"
              />
            </div>

            {/* Courier info — only shown when status is Dispatched */}
            {showCourier && (
              <div style={{ borderTop: '1px solid var(--border-light)', paddingTop: 'var(--space-3)', marginTop: 4 }}>
                <CourierPaste
                  courier={r.courier ?? null}
                  customCourierName={r.customCourierName ?? ''}
                  waybill={r.waybill ?? ''}
                  onCourierChange={(v) => onCourierChange(i, v)}
                  onCustomCourierChange={(v) => onUpdate(i, 'customCourierName', v)}
                  onWaybillChange={(v) => onUpdate(i, 'waybill', v)}
                />
              </div>
            )}
          </div>
        );
      })}

    </div>
  );
});

export default CustomerInput;
