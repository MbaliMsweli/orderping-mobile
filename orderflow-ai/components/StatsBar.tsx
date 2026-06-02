'use client';

interface Props {
  count: number;
}

export default function StatsBar({ count }: Props) {
  return (
    <div style={{
      background: 'linear-gradient(135deg, #EEF4FF 0%, #F8FAFF 100%)',
      borderRadius: 16,
      border: '1.5px solid #BFDBFE',
      padding: '18px 20px',
      marginBottom: 4,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      boxShadow: '0 2px 12px rgba(26,110,245,0.08)',
    }}>
      <div style={{ textAlign: 'center' }}>
        <p style={{
          margin: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
          fontSize: '2.5rem', fontWeight: 800,
          color: 'var(--primary)', fontFamily: 'var(--font-display)', lineHeight: 1,
        }}>
          {count}
          <span style={{ fontSize: '1.5rem' }}>📈</span>
        </p>
        <p style={{
          margin: '6px 0 0', fontSize: '0.75rem', color: '#1A6EF5',
          fontWeight: 700, fontFamily: 'var(--font-body)',
          textTransform: 'uppercase', letterSpacing: '0.06em',
        }}>
          customers informed today
        </p>
      </div>
    </div>
  );
}
