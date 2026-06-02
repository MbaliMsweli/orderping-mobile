'use client';

import { useEffect } from 'react';

const RELOAD_FLAG = 'op_chunk_reloaded';

function isChunkError(error: Error): boolean {
  return error.name === 'ChunkLoadError' || /Loading chunk [\d]+ failed/.test(error.message);
}

// global-error replaces the root layout when an error is thrown in the layout
// itself, so it must render its own <html> and <body>.
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    if (isChunkError(error)) {
      if (!sessionStorage.getItem(RELOAD_FLAG)) {
        sessionStorage.setItem(RELOAD_FLAG, '1');
        window.location.reload();
      }
    } else {
      sessionStorage.removeItem(RELOAD_FLAG);
    }
  }, [error]);

  return (
    <html lang="en">
      <body style={{ margin: 0 }}>
        <div style={styles.wrap}>
          <div style={styles.card}>
            <div style={styles.icon}>⚠️</div>
            <h1 style={styles.title}>Something went wrong</h1>
            <p style={styles.body}>
              OrderPing hit an unexpected error. Try again — if it keeps happening, reload the page.
            </p>
            <div style={styles.actions}>
              <button style={styles.primary} onClick={() => reset()}>Try again</button>
              <button style={styles.secondary} onClick={() => window.location.reload()}>Reload</button>
            </div>
          </div>
        </div>
      </body>
    </html>
  );
}

const styles: Record<string, React.CSSProperties> = {
  wrap: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    background: '#EEF4FF',
    fontFamily: 'system-ui, sans-serif',
  },
  card: {
    width: '100%',
    maxWidth: 420,
    background: '#fff',
    borderRadius: 16,
    padding: 32,
    textAlign: 'center',
    boxShadow: '0 10px 40px rgba(15, 82, 200, 0.12)',
  },
  icon: { fontSize: 40, marginBottom: 12 },
  title: { fontSize: 22, fontWeight: 700, color: '#0F172A', margin: '0 0 8px' },
  body: { fontSize: 15, lineHeight: 1.5, color: '#475569', margin: '0 0 24px' },
  actions: { display: 'flex', gap: 12, justifyContent: 'center' },
  primary: {
    background: '#1A6EF5',
    color: '#fff',
    border: 'none',
    borderRadius: 10,
    padding: '12px 20px',
    fontSize: 15,
    fontWeight: 600,
    cursor: 'pointer',
  },
  secondary: {
    background: '#EEF4FF',
    color: '#1A6EF5',
    border: 'none',
    borderRadius: 10,
    padding: '12px 20px',
    fontSize: 15,
    fontWeight: 600,
    cursor: 'pointer',
  },
};
