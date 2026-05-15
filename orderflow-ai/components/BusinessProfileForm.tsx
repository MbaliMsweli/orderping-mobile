'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getProfile, saveProfile, syncProfileToSupabase } from '@/lib/storage';
import type { BusinessProfile } from '@/lib/storage';

interface BusinessProfileFormProps {
  isEdit?: boolean;
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

export default function BusinessProfileForm({ isEdit = false }: BusinessProfileFormProps) {
  const router = useRouter();
  const [businessName, setBusinessName]   = useState('');
  const [businessPhone, setBusinessPhone] = useState('');
  const [pickupAddress, setPickupAddress] = useState('');
  const [businessHours, setBusinessHours] = useState('');
  const [nameError, setNameError]         = useState('');
  const [saved, setSaved]                 = useState(false);

  useEffect(() => {
    const p = getProfile();
    if (p) {
      setBusinessName(p.businessName);
      setBusinessPhone(p.businessPhone || '');
      setPickupAddress(p.pickupAddress || '');
      setBusinessHours(p.businessHours || '');
    }
  }, []);

  const handleSave = async () => {
    if (!businessName.trim()) {
      setNameError('Business name is required');
      return;
    }
    setNameError('');

    const profile: BusinessProfile = {
      businessName:  businessName.trim(),
      businessPhone: businessPhone.trim(),
      pickupAddress: pickupAddress.trim(),
      businessHours: businessHours.trim(),
    };

    saveProfile(profile);
    await syncProfileToSupabase(profile);
    setSaved(true);
    setTimeout(() => router.push('/'), 400);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>
      {/* Business Name */}
      <div>
        <label style={labelStyle}>Business Name *</label>
        <input
          type="text"
          value={businessName}
          onChange={(e) => { setBusinessName(e.target.value); setNameError(''); }}
          placeholder="Lebo's Linen Co"
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

      {/* Pickup Address */}
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

      {/* Business Hours */}
      <div>
        <label style={labelStyle}>
          Business Hours
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
