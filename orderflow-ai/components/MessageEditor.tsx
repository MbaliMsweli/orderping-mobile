'use client';

import { RotateCcw, Loader2 } from 'lucide-react';

interface MessageEditorProps {
  message: string;
  onChange: (v: string) => void;
  onRegenerate: () => void;
  isGenerating: boolean;
}

export default function MessageEditor({ message, onChange, onRegenerate, isGenerating }: MessageEditorProps) {
  const charCount = message.length;
  const segment = Math.max(1, Math.ceil(charCount / 160));
  const segmentMax = segment * 160;
  const nearLimit = charCount > segmentMax - 20;

  return (
    <div style={{
      marginTop: 'var(--space-4)',
      background: 'var(--surface)',
      borderRadius: 20,
      border: '1.5px solid var(--border)',
      overflow: 'hidden',
      boxShadow: '0 2px 12px rgba(0,0,0,0.05)',
    }}>
      {/* Header bar */}
      <div style={{
        padding: '10px var(--space-4)',
        borderBottom: '1px solid var(--border-light)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        background: 'var(--card)',
      }}>
        <span style={{
          fontFamily: 'var(--font-body)', fontSize: '0.75rem',
          fontWeight: 700, color: 'var(--text-muted)',
          textTransform: 'uppercase', letterSpacing: '0.06em',
        }}>
          Message Preview
        </span>
        <span style={{
          fontFamily: 'var(--font-body)', fontSize: '0.75rem', fontWeight: 600,
          color: nearLimit ? 'var(--warning)' : 'var(--text-muted)',
        }}>
          {charCount}/{segmentMax}
        </span>
      </div>

      {/* Textarea */}
      <div style={{ position: 'relative' }}>
        <textarea
          value={message}
          onChange={(e) => onChange(e.target.value)}
          disabled={isGenerating}
          style={{
            width: '100%', minHeight: 160,
            padding: 'var(--space-4)',
            border: 'none',
            background: 'transparent',
            fontFamily: 'var(--font-body)',
            fontSize: '0.9375rem', lineHeight: 1.75,
            color: 'var(--text)', resize: 'vertical',
            outline: 'none', display: 'block',
            opacity: isGenerating ? 0.4 : 1,
            transition: 'opacity var(--transition-fast)',
          }}
        />
        {isGenerating && (
          <div style={{
            position: 'absolute', inset: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            gap: 8,
            fontFamily: 'var(--font-body)', fontSize: '0.875rem',
            fontWeight: 600, color: 'var(--text-muted)',
          }}>
            <Loader2 size={16} className="animate-spin" />
            Rewriting...
          </div>
        )}
      </div>

      {/* Footer bar */}
      <div style={{
        padding: '10px var(--space-4)',
        borderTop: '1px solid var(--border-light)',
        background: 'var(--card)',
      }}>
        <button
          onClick={onRegenerate}
          disabled={isGenerating}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            background: 'none', border: 'none',
            cursor: isGenerating ? 'not-allowed' : 'pointer',
            color: isGenerating ? 'var(--text-light)' : 'var(--primary)',
            fontFamily: 'var(--font-body)', fontSize: '0.875rem', fontWeight: 600,
            padding: 0,
          }}
        >
          <RotateCcw size={13} />
          {isGenerating ? 'Writing...' : 'Regenerate'}
        </button>
      </div>
    </div>
  );
}
