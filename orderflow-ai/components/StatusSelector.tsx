'use client';

import {
  PackageCheck, Clock, Truck, MapPin, CalendarClock,
  CalendarCheck, Navigation2, CheckCircle2, CalendarX, Wrench, Phone,
} from 'lucide-react';

export type Status =
  | 'received' | 'delay' | 'dispatched' | 'ready' | 'pre-order'
  | 'booking-confirmed' | 'on-the-way' | 'running-late' | 'arrived'
  | 'completed' | 'rescheduled' | 'waiting-parts' | 'follow-up';

interface StatusSelectorProps {
  selected: Status | null;
  onSelect: (s: Status) => void;
  error?: string;
  businessType?: 'product' | 'service';
}

const productStatuses: { id: Status; label: string; Icon: React.ElementType; color: string }[] = [
  { id: 'received',   label: 'Received',   Icon: PackageCheck, color: '#8B5CF6' },
  { id: 'delay',      label: 'Delay',       Icon: Clock,        color: '#FBBF24' },
  { id: 'dispatched', label: 'Dispatching', Icon: Truck,        color: '#3B82F6' },
  { id: 'ready',      label: 'Ready',       Icon: MapPin,       color: '#22C55E' },
];

const serviceStatuses: { id: Status; label: string; Icon: React.ElementType; color: string }[] = [
  { id: 'booking-confirmed', label: 'Confirmed',     Icon: CalendarCheck, color: '#2BA784' },
  { id: 'on-the-way',        label: 'On the Way',    Icon: Navigation2,   color: '#3B82F6' },
  { id: 'running-late',      label: 'Running Late',  Icon: Clock,         color: '#E8A435' },
  { id: 'arrived',           label: 'Arrived',       Icon: MapPin,        color: '#16A34A' },
  { id: 'completed',         label: 'Completed',     Icon: CheckCircle2,  color: '#8B5CF6' },
  { id: 'rescheduled',       label: 'Rescheduled',   Icon: CalendarX,     color: '#6B7280' },
  { id: 'waiting-parts',     label: 'Waiting Parts', Icon: Wrench,        color: '#D4A843' },
  { id: 'follow-up',         label: 'Follow-up',     Icon: Phone,         color: '#EC4899' },
];

const PRE_ORDER_COLOR = '#6366F1';

export default function StatusSelector({ selected, onSelect, error, businessType = 'product' }: StatusSelectorProps) {
  const isService = businessType === 'service';
  const statuses = isService ? serviceStatuses : productStatuses;

  return (
    <div style={{ marginBottom: 'var(--space-4)' }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        {statuses.map(({ id, label, Icon, color }) => {
          const isActive = selected === id;
          return (
            <button
              key={id}
              onClick={() => onSelect(id)}
              style={{
                display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center',
                gap: 8, padding: '18px 12px',
                borderRadius: 16,
                border: `2px solid ${isActive ? color : 'var(--border)'}`,
                background: isActive ? color : 'var(--surface)',
                cursor: 'pointer',
                transition: 'all var(--transition-fast)',
                minHeight: 90,
                boxShadow: isActive
                  ? `0 4px 16px ${color}40`
                  : '0 1px 4px rgba(0,0,0,0.04)',
              }}
            >
              <Icon size={24} color={isActive ? 'white' : color} strokeWidth={2} />
              <span style={{
                fontFamily: 'var(--font-display)',
                fontSize: '0.875rem', fontWeight: 700,
                color: isActive ? 'white' : 'var(--text)',
                letterSpacing: '-0.01em',
              }}>
                {label}
              </span>
            </button>
          );
        })}
      </div>

      {/* Pre-order — product only, full width below the 2x2 grid */}
      {!isService && (() => {
        const isActive = selected === 'pre-order';
        return (
          <button
            onClick={() => onSelect('pre-order')}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              gap: 10, width: '100%', marginTop: 10,
              padding: '16px 12px',
              borderRadius: 16,
              border: `2px solid ${isActive ? PRE_ORDER_COLOR : 'var(--border)'}`,
              background: isActive ? PRE_ORDER_COLOR : 'var(--surface)',
              cursor: 'pointer',
              transition: 'all var(--transition-fast)',
              minHeight: 60,
              boxShadow: isActive
                ? `0 4px 16px ${PRE_ORDER_COLOR}40`
                : '0 1px 4px rgba(0,0,0,0.04)',
            }}
          >
            <CalendarClock size={22} color={isActive ? 'white' : PRE_ORDER_COLOR} strokeWidth={2} />
            <span style={{
              fontFamily: 'var(--font-display)',
              fontSize: '0.9375rem', fontWeight: 700,
              color: isActive ? 'white' : 'var(--text)',
              letterSpacing: '-0.01em',
            }}>
              Pre-order
            </span>
          </button>
        );
      })()}

      {error && (
        <p style={{
          marginTop: 6, fontSize: '0.8125rem',
          color: 'var(--error)', fontFamily: 'var(--font-body)',
        }}>
          {error}
        </p>
      )}
    </div>
  );
}
