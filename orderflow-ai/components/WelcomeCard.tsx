'use client';

interface Props {
  businessName: string;
  hoursAway:    number;
  forgottenCount: number;
  onDismiss:    () => void;
}

export default function WelcomeCard({ businessName, hoursAway, forgottenCount, onDismiss }: Props) {
  const firstName = businessName ? businessName.split(' ')[0] : '';
  return (
    <div style={{
      background: '#F0FDF4', border: '1.5px solid #BBF7D0',
      borderRadius: 16, padding: 16, position: 'relative',
    }}>
      <button
        onClick={onDismiss}
        style={{
          position: 'absolute', top: 10, right: 12,
          background: 'none', border: 'none', cursor: 'pointer',
          fontSize: 18, color: 'var(--text-muted)', lineHeight: 1, padding: 2,
        }}
      >✕</button>
      <p style={{
        margin: '0 0 4px', fontSize: '1rem', fontWeight: 700,
        color: '#166534', fontFamily: 'var(--font-display)',
      }}>
        👋 Welcome back{firstName ? `, ${firstName}` : ''}!
      </p>
      <p style={{ margin: 0, fontSize: '0.875rem', color: '#15803D', fontFamily: 'var(--font-body)' }}>
        You&apos;ve been away {hoursAway} day{hoursAway !== 1 ? 's' : ''}.
        {forgottenCount > 0 && (
          <> {forgottenCount} customer{forgottenCount !== 1 ? 's' : ''} may need an update.</>
        )}
      </p>
    </div>
  );
}
