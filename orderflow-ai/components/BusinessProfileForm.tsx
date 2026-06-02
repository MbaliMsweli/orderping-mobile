'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getProfile, saveProfile, syncProfileToSupabase } from '@/lib/storage';
import type { BusinessProfile } from '@/lib/storage';

interface BusinessProfileFormProps {
  isEdit?: boolean;
  initialType?: 'product' | 'service';
  hideTypePicker?: boolean;
  onChangeType?: () => void;
}

const labelStyle: React.CSSProperties = {
  display: 'block', fontFamily: 'var(--font-body)',
  fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-secondary)',
  marginBottom: '6px',
};

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '14px var(--space-4)',
  border: '1.5px solid var(--border)',
  borderRadius: 'var(--radius-lg)',
  background: 'var(--surface)',
  fontFamily: 'var(--font-body)', fontSize: '1rem',
  color: 'var(--text)', outline: 'none', minHeight: 52,
};

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

export default function BusinessProfileForm({
  isEdit = false,
  initialType,
  hideTypePicker = false,
  onChangeType,
}: BusinessProfileFormProps) {
  const router = useRouter();
  const [businessType, setBusinessType]   = useState<'product' | 'service'>('product');
  const [businessName, setBusinessName]   = useState('');
  const [businessPhone, setBusinessPhone] = useState('');
  const [pickupAddress, setPickupAddress] = useState('');
  const [businessHours, setBusinessHours]               = useState('');
  const [businessDescription, setBusinessDescription]   = useState('');
  const [nameError, setNameError]                       = useState('');
  const [descriptionError, setDescriptionError]         = useState('');
  const [saved, setSaved]                               = useState(false);

  useEffect(() => {
    const p = getProfile();
    if (p) {
      setBusinessType(initialType ?? p.businessType ?? 'product');
      setBusinessName(p.businessName);
      setBusinessPhone(p.businessPhone || '');
      setPickupAddress(p.pickupAddress || '');
      setBusinessHours(p.businessHours || '');
      setBusinessDescription(p.businessDescription || '');
    } else {
      setBusinessType(initialType ?? 'product');
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSave = async () => {
    if (!businessName.trim()) {
      setNameError('Business name is required');
      return;
    }
    setNameError('');
    if (!businessDescription.trim()) {
      setDescriptionError('Please describe your business');
      return;
    }
    setDescriptionError('');

    const profile: BusinessProfile = {
      businessType,
      businessName:        businessName.trim(),
      businessPhone:       businessPhone.trim(),
      pickupAddress:       businessType === 'product' ? pickupAddress.trim() : '',
      businessHours:       businessHours.trim(),
      businessDescription: businessDescription.trim(),
    };

    saveProfile(profile);
    await syncProfileToSupabase(profile);
    setSaved(true);
    setTimeout(() => router.push('/'), 400);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>

      {/* Type badge (shown when picker is hidden) */}
      {hideTypePicker && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            padding: '6px 12px', borderRadius: 'var(--radius-full)',
            background: 'var(--primary-soft)',
            fontFamily: 'var(--font-body)', fontSize: '0.875rem', fontWeight: 600,
            color: 'var(--primary)',
          }}>
            {businessType === 'product' ? '📦 Product Business' : '🔧 Service Business'}
          </span>
          {onChangeType && (
            <button
              type="button"
              onClick={onChangeType}
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                fontFamily: 'var(--font-body)', fontSize: '0.875rem',
                color: 'var(--text-muted)', padding: '4px 0',
              }}
            >
              ← Change
            </button>
          )}
        </div>
      )}

      {/* Business type selector */}
      {!hideTypePicker && <div>
        <p style={{ ...labelStyle, marginBottom: 10 }}>Business Type</p>
        <p style={{ fontFamily: 'var(--font-body)', fontSize: '0.8125rem', color: 'var(--text-muted)', marginBottom: 12, lineHeight: 1.5 }}>
          This personalises your statuses and messages.
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          {TYPE_OPTIONS.map(opt => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setBusinessType(opt.value)}
              style={{
                padding: '16px 14px',
                borderRadius: 16,
                border: `2px solid ${businessType === opt.value ? 'var(--primary)' : 'var(--border)'}`,
                background: businessType === opt.value ? 'var(--primary-soft)' : 'var(--surface)',
                cursor: 'pointer',
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
                transition: 'all var(--transition-fast)',
              }}
            >
              <span style={{ fontSize: '2rem' }}>{opt.emoji}</span>
              <span style={{
                fontFamily: 'var(--font-display)', fontSize: '0.9375rem', fontWeight: 700,
                color: businessType === opt.value ? 'var(--primary)' : 'var(--text)',
              }}>
                {opt.label}
              </span>
              <span style={{
                fontFamily: 'var(--font-body)', fontSize: '0.75rem',
                color: 'var(--text-muted)', textAlign: 'center', lineHeight: 1.4,
              }}>
                {opt.sub}
              </span>
            </button>
          ))}
        </div>
        {businessType === 'service' && (
          <p style={{
            marginTop: 10, fontFamily: 'var(--font-body)', fontSize: '0.75rem',
            color: 'var(--text-muted)', textAlign: 'center', lineHeight: 1.6,
          }}>
            Electricians · Plumbers · Salons · Mechanics · Cleaners · Tutors · Installers
          </p>
        )}
      </div>}

      {/* Business Name */}
      <div>
        <label style={labelStyle}>Business Name *</label>
        <input
          type="text"
          value={businessName}
          onChange={(e) => { setBusinessName(e.target.value); setNameError(''); }}
          placeholder={businessType === 'service' ? 'Bright Fix Electricals' : "Lebo's Linen Co"}
          style={{ ...inputStyle, borderColor: nameError ? 'var(--error)' : 'var(--border)' }}
        />
        {nameError && (
          <p style={{ marginTop: 4, fontSize: '0.8125rem', color: 'var(--error)', fontFamily: 'var(--font-body)' }}>
            {nameError}
          </p>
        )}
      </div>

      {/* Business Phone */}
      <div>
        <label style={labelStyle}>
          Business Phone
          <span style={{ fontWeight: 400, color: 'var(--text-muted)', marginLeft: 4 }}>(optional)</span>
        </label>
        <input
          type="tel"
          value={businessPhone}
          onChange={(e) => setBusinessPhone(e.target.value)}
          placeholder="071 234 5678"
          style={inputStyle}
          inputMode="tel"
        />
      </div>

      {/* Pickup Address — product only */}
      {businessType === 'product' && (
        <div>
          <label style={labelStyle}>
            Pickup Address
            <span style={{ fontWeight: 400, color: 'var(--text-muted)', marginLeft: 4 }}>(optional)</span>
          </label>
          <input
            type="text"
            value={pickupAddress}
            onChange={(e) => setPickupAddress(e.target.value)}
            placeholder="42 Main Rd, Sandton"
            style={inputStyle}
          />
        </div>
      )}

      {/* Business Hours */}
      <div>
        <label style={labelStyle}>
          {businessType === 'service' ? 'Operating Hours' : 'Business Hours'}
          <span style={{ fontWeight: 400, color: 'var(--text-muted)', marginLeft: 4 }}>(optional)</span>
        </label>
        <input
          type="text"
          value={businessHours}
          onChange={(e) => setBusinessHours(e.target.value)}
          placeholder="Mon-Fri 9am-5pm, Sat 9am-1pm"
          style={inputStyle}
        />
      </div>

      {/* About Your Business */}
      <div>
        <label style={labelStyle}>About Your Business *</label>
        <textarea
          value={businessDescription}
          onChange={(e) => { setBusinessDescription(e.target.value); setDescriptionError(''); }}
          placeholder={
            businessType === 'service'
              ? 'e.g. We fix electrical faults and install lighting in homes and offices.'
              : 'e.g. We sell handmade skincare products and hair care bundles.'
          }
          maxLength={500}
          rows={3}
          style={{
            ...inputStyle,
            minHeight: 88,
            resize: 'vertical',
            lineHeight: 1.5,
            paddingTop: 12,
          }}
        />
        {descriptionError && (
          <p style={{ marginTop: 4, fontSize: '0.8125rem', color: 'var(--error)', fontFamily: 'var(--font-body)' }}>
            {descriptionError}
          </p>
        )}
      </div>

      {/* Save button */}
      <button
        onClick={handleSave}
        style={{
          width: '100%', padding: 'var(--space-4)',
          borderRadius: 'var(--radius-xl)',
          border: 'none',
          background: saved ? 'var(--success)' : 'var(--primary)',
          color: 'white', cursor: 'pointer',
          fontFamily: 'var(--font-display)', fontSize: '1rem', fontWeight: 600,
          minHeight: 52, transition: 'var(--transition-fast)',
        }}
      >
        {saved ? 'Saved! ✓' : isEdit ? 'Save Changes' : 'Save & Start ›'}
      </button>
    </div>
  );
}
