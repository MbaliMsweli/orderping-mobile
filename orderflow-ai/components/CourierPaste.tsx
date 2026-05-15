'use client';

export type CourierId = 'pep' | 'courier-guy' | 'postnet' | 'other';

const COURIERS: { id: CourierId; label: string; deliveryTime: string | null }[] = [
  { id: 'courier-guy', label: 'The Courier Guy', deliveryTime: '3-5 working days' },
  { id: 'pep',         label: 'Pep',             deliveryTime: '7-9 working days' },
  { id: 'postnet',     label: 'PostNet',          deliveryTime: '5-7 working days' },
  { id: 'other',       label: 'Other',            deliveryTime: null },
];

export function resolveCourier(id: CourierId | null, customName: string): { name: string | null; deliveryTime: string | null } {
  if (!id) return { name: null, deliveryTime: null };
  if (id === 'other') return { name: customName.trim() || null, deliveryTime: null };
  const c = COURIERS.find((x) => x.id === id);
  return { name: c?.label ?? null, deliveryTime: c?.deliveryTime ?? null };
}

interface CourierPasteProps {
  courier: CourierId | null;
  customCourierName: string;
  waybill: string;
  onCourierChange: (v: CourierId | null) => void;
  onCustomCourierChange: (v: string) => void;
  onWaybillChange: (v: string) => void;
}

export default function CourierPaste({
  courier, customCourierName, waybill,
  onCourierChange, onCustomCourierChange, onWaybillChange,
}: CourierPasteProps) {
  const selected = COURIERS.find((c) => c.id === courier);

  return (
    <div>
      <p style={{
        fontFamily: 'var(--font-body)', fontSize: '0.75rem',
        fontWeight: 700, color: 'var(--text-muted)',
        textTransform: 'uppercase', letterSpacing: '0.06em',
        margin: '0 0 10px',
      }}>
        Courier
      </p>

      {/* Courier picker pills */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 10 }}>
        {COURIERS.map((c) => {
          const active = courier === c.id;
          return (
            <button
              key={c.id}
              type="button"
              onClick={() => onCourierChange(active ? null : c.id)}
              style={{
                padding: '8px 16px',
                borderRadius: 20,
                border: active ? '2px solid #3B82F6' : '1.5px solid var(--border)',
                background: active ? '#EFF6FF' : 'var(--surface)',
                color: active ? '#3B82F6' : 'var(--text-muted)',
                fontFamily: 'var(--font-body)', fontSize: '0.875rem', fontWeight: 600,
                cursor: 'pointer', transition: 'all var(--transition-fast)',
              }}
            >
              {c.label}
            </button>
          );
        })}
      </div>

      {/* Delivery time badge */}
      {selected?.deliveryTime && (
        <p style={{
          fontFamily: 'var(--font-body)', fontSize: '0.8125rem',
          color: '#3B82F6', fontWeight: 600, margin: '0 0 10px',
        }}>
          ⏱ {selected.deliveryTime}
        </p>
      )}

      {/* Custom courier name */}
      {courier === 'other' && (
        <input
          type="text"
          value={customCourierName}
          onChange={(e) => onCustomCourierChange(e.target.value)}
          placeholder="Courier name (e.g. PostNet, RAM)"
          style={{
            width: '100%', boxSizing: 'border-box',
            padding: '12px 16px', marginBottom: 10,
            border: `1.5px solid ${customCourierName ? '#3B82F6' : 'var(--border)'}`,
            borderRadius: 'var(--radius-lg)',
            background: 'var(--surface)',
            fontFamily: 'var(--font-body)', fontSize: '0.9375rem',
            color: 'var(--text)', outline: 'none',
            transition: 'border-color var(--transition-fast)',
          }}
          onFocus={(e) => (e.target.style.borderColor = '#3B82F6')}
          onBlur={(e) => (e.target.style.borderColor = customCourierName ? '#3B82F6' : 'var(--border)')}
        />
      )}

      {/* Waybill number */}
      <input
        type="text"
        value={waybill}
        onChange={(e) => onWaybillChange(e.target.value)}
        placeholder="Waybill / tracking number (e.g. RAM1234567)"
        style={{
          width: '100%', boxSizing: 'border-box',
          padding: '12px 16px',
          border: `1.5px solid ${waybill ? '#3B82F6' : 'var(--border)'}`,
          borderRadius: 'var(--radius-lg)',
          background: 'var(--surface)',
          fontFamily: 'var(--font-body)', fontSize: '0.9375rem',
          color: 'var(--text)', outline: 'none',
          transition: 'border-color var(--transition-fast)',
        }}
        onFocus={(e) => (e.target.style.borderColor = '#3B82F6')}
        onBlur={(e) => (e.target.style.borderColor = waybill ? '#3B82F6' : 'var(--border)')}
      />
    </div>
  );
}
