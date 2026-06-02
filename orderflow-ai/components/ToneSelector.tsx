'use client';

export type Tone = 'friendly' | 'professional' | 'apologetic' | 'reassuring';

interface ToneSelectorProps {
  selected: Tone;
  onSelect: (t: Tone) => void;
  businessType?: 'product' | 'service';
}

const allTones: { id: Tone; label: string }[] = [
  { id: 'friendly',     label: 'Friendly' },
  { id: 'professional', label: 'Professional' },
  { id: 'apologetic',   label: 'Apologetic' },
  { id: 'reassuring',   label: 'Reassuring' },
];

export default function ToneSelector({ selected, onSelect, businessType = 'product' }: ToneSelectorProps) {
  const tones = businessType === 'service' ? allTones : allTones.slice(0, 3);

  return (
    <div style={{ marginTop: 'var(--space-3)', marginBottom: 'var(--space-3)' }}>
      <p style={{
        fontFamily: 'var(--font-body)', fontSize: '0.8125rem',
        fontWeight: 700, color: 'var(--text-muted)',
        textTransform: 'uppercase', letterSpacing: '0.06em',
        marginBottom: 8,
      }}>
        Tone
      </p>
      <div style={{
        display: 'grid',
        gridTemplateColumns: tones.length === 4 ? '1fr 1fr' : `repeat(${tones.length}, 1fr)`,
        gap: 8,
      }}>
        {tones.map(({ id, label }) => {
          const isActive = selected === id;
          return (
            <button
              key={id}
              onClick={() => onSelect(id)}
              style={{
                flex: 1, padding: '10px 6px',
                borderRadius: 'var(--radius-full)',
                border: `2px solid ${isActive ? 'var(--primary)' : 'var(--border)'}`,
                background: isActive ? 'var(--primary)' : 'var(--surface)',
                color: isActive ? 'white' : 'var(--text-secondary)',
                cursor: 'pointer', fontFamily: 'var(--font-display)',
                fontSize: '0.8125rem', fontWeight: 700,
                transition: 'all var(--transition-fast)',
                minHeight: 44,
              }}
            >
              {label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
