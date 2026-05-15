'use client';

type Tone = 'friendly' | 'professional' | 'apologetic';

interface ToneSelectorProps {
  selected: Tone;
  onSelect: (t: Tone) => void;
}

const tones: { id: Tone; label: string; sub: string }[] = [
  { id: 'friendly',     label: 'Friendly',      sub: '😊 Warm' },
  { id: 'professional', label: 'Professional',   sub: '👔 Formal' },
  { id: 'apologetic',   label: 'Apologetic',     sub: '🙏 Sorry' },
];

export default function ToneSelector({ selected, onSelect }: ToneSelectorProps) {
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
      <div style={{ display: 'flex', gap: 8 }}>
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
