'use client';

interface TrackingInputProps {
  value: string;
  onChange: (v: string) => void;
}

export default function TrackingInput({ value, onChange }: TrackingInputProps) {
  return (
    <div style={{ marginBottom: 'var(--space-4)' }}>
      <label style={{
        display: 'block', fontFamily: 'var(--font-body)',
        fontSize: '0.8125rem', fontWeight: 700,
        color: 'var(--text-muted)', textTransform: 'uppercase',
        letterSpacing: '0.06em', marginBottom: 6,
      }}>
        Tracking / Waybill
        <span style={{ fontWeight: 500, textTransform: 'none', letterSpacing: 0, marginLeft: 6, color: 'var(--text-light)' }}>
          (optional)
        </span>
      </label>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="e.g. RAM1234567"
        style={{
          width: '100%',
          padding: '15px var(--space-4)',
          border: '2px solid var(--border)',
          borderRadius: 'var(--radius-xl)',
          background: 'var(--surface)',
          fontFamily: 'var(--font-body)',
          fontSize: '1rem', fontWeight: 500,
          color: 'var(--text)',
          outline: 'none',
          minHeight: 54,
          letterSpacing: '0.03em',
        }}
        autoComplete="off"
        autoCapitalize="characters"
      />
    </div>
  );
}
