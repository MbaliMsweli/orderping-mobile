'use client';

import { useState, useEffect, useRef } from 'react';
import { PenLine } from 'lucide-react';
import { getNoteHistory } from '@/lib/storage';

export interface NoteOption {
  id: string;
  icon: string;
  label: string;
}

interface StatusNotePickerProps {
  heading: string;
  options: NoteOption[];
  selected: string | null;
  onSelect: (value: string | null) => void;
  activeColor: string;
  customPlaceholder?: string;
  statusKey?: string;
}

export default function StatusNotePicker({
  heading, options, selected, onSelect,
  activeColor,
  customPlaceholder = "Describe what's happening in one line...",
  statusKey,
}: StatusNotePickerProps) {
  const presetIds = options.map((o) => o.id);
  const [customMode, setCustomMode] = useState(
    selected !== null && !presetIds.includes(selected),
  );
  const [customText, setCustomText] = useState(
    selected !== null && !presetIds.includes(selected) ? selected : '',
  );
  const [history, setHistory] = useState<string[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (customMode) inputRef.current?.focus();
  }, [customMode]);

  useEffect(() => {
    if (statusKey) {
      const saved = getNoteHistory(statusKey).filter((n) => !presetIds.includes(n));
      setHistory(saved);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusKey]);

  const handlePreset = (id: string) => {
    setCustomMode(false);
    setCustomText('');
    onSelect(id);
  };

  const handleCustomClick = () => {
    setCustomMode(true);
    onSelect(customText.trim() || null);
  };

  const handleCustomChange = (text: string) => {
    setCustomText(text);
    onSelect(text.trim() || null);
  };

  return (
    <div style={{ marginBottom: 'var(--space-4)' }}>
      <p style={{
        fontFamily: 'var(--font-body)', fontSize: '0.875rem',
        fontWeight: 700, color: 'var(--text-muted)',
        textTransform: 'uppercase', letterSpacing: '0.06em',
        marginBottom: 8, margin: '0 0 8px',
      }}>
        {heading}
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {/* Preset options */}
        {options.map(({ id, icon, label }) => {
          const isActive = selected === id && !customMode;
          return (
            <button
              key={id}
              onClick={() => handlePreset(id)}
              style={{
                display: 'flex', alignItems: 'center', gap: 12,
                padding: '14px 16px',
                borderRadius: 'var(--radius-xl)',
                border: `2px solid ${isActive ? activeColor : 'var(--border)'}`,
                background: isActive ? activeColor : 'var(--surface)',
                cursor: 'pointer', textAlign: 'left',
                transition: 'all var(--transition-fast)',
                minHeight: 56,
                boxShadow: isActive ? `0 2px 12px ${activeColor}40` : 'none',
              }}
            >
              <span style={{ fontSize: '1.2rem', lineHeight: 1, flexShrink: 0 }}>{icon}</span>
              <span style={{
                fontFamily: 'var(--font-body)', fontSize: '0.9375rem', fontWeight: 600,
                color: isActive ? 'white' : 'var(--text)',
              }}>
                {label}
              </span>
            </button>
          );
        })}

        {/* Saved custom notes from history */}
        {history.map((note) => {
          const isActive = selected === note && !customMode;
          return (
            <button
              key={note}
              onClick={() => handlePreset(note)}
              style={{
                display: 'flex', alignItems: 'center', gap: 12,
                padding: '14px 16px',
                borderRadius: 'var(--radius-xl)',
                border: `2px solid ${isActive ? activeColor : 'var(--border)'}`,
                background: isActive ? activeColor : 'var(--surface)',
                cursor: 'pointer', textAlign: 'left',
                transition: 'all var(--transition-fast)',
                minHeight: 56,
                boxShadow: isActive ? `0 2px 12px ${activeColor}40` : 'none',
              }}
            >
              <span style={{ fontSize: '1.1rem', lineHeight: 1, flexShrink: 0 }}>↩️</span>
              <span style={{
                fontFamily: 'var(--font-body)', fontSize: '0.9375rem', fontWeight: 600,
                color: isActive ? 'white' : 'var(--text)',
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              }}>
                {note}
              </span>
            </button>
          );
        })}

        {/* Custom "write your own" option */}
        <button
          onClick={handleCustomClick}
          style={{
            display: 'flex', alignItems: 'center', gap: 12,
            padding: '14px 16px',
            borderRadius: 'var(--radius-xl)',
            border: `2px solid ${customMode ? activeColor : 'var(--border)'}`,
            background: customMode ? activeColor : 'var(--surface)',
            cursor: 'pointer', textAlign: 'left',
            transition: 'all var(--transition-fast)',
            minHeight: 56,
            boxShadow: customMode ? `0 2px 12px ${activeColor}40` : 'none',
          }}
        >
          <PenLine
            size={18}
            color={customMode ? 'white' : 'var(--text-muted)'}
            strokeWidth={2}
            style={{ flexShrink: 0 }}
          />
          <span style={{
            fontFamily: 'var(--font-body)', fontSize: '0.9375rem', fontWeight: 600,
            color: customMode ? 'white' : 'var(--text)',
          }}>
            {customMode && customText ? customText : 'Write your own...'}
          </span>
        </button>

        {/* Custom text input */}
        {customMode && (
          <>
            <input
              ref={inputRef}
              type="text"
              value={customText}
              onChange={(e) => handleCustomChange(e.target.value)}
              placeholder={customPlaceholder}
              maxLength={120}
              style={{
                width: '100%',
                padding: '14px 16px',
                border: `2px solid ${activeColor}`,
                borderRadius: 'var(--radius-xl)',
                background: 'var(--surface)',
                fontFamily: 'var(--font-body)',
                fontSize: '0.9375rem', fontWeight: 500,
                color: 'var(--text)',
                outline: 'none',
                minHeight: 52,
                boxShadow: `0 0 0 3px ${activeColor}22`,
              }}
            />
            <p style={{
              margin: '-2px 0 0',
              fontFamily: 'var(--font-body)', fontSize: '0.75rem',
              color: 'var(--text-muted)', fontWeight: 500,
              paddingLeft: 4,
            }}>
              One line — the AI writes the message around it
            </p>
          </>
        )}
      </div>
    </div>
  );
}
