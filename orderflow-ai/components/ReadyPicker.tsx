'use client';

import StatusNotePicker from '@/components/StatusNotePicker';

const OPTIONS = [
  { id: 'Ready and waiting for you to collect',           icon: '🏪', label: 'Ready for collection now' },
  { id: 'Will be ready for you to collect from tomorrow', icon: '📅', label: 'Ready from tomorrow' },
  { id: 'Ready and we would love you to collect it soon', icon: '⚠️', label: 'Please collect soon' },
];

export const READY_PRESET_IDS = OPTIONS.map((o) => o.id);

interface ReadyPickerProps {
  selected: string | null;
  onSelect: (value: string | null) => void;
}

export default function ReadyPicker({ selected, onSelect }: ReadyPickerProps) {
  return (
    <StatusNotePicker
      heading="Pickup detail"
      options={OPTIONS}
      selected={selected}
      onSelect={onSelect}
      activeColor="#22C55E"
      customPlaceholder="e.g. ask for Thabo at the counter, ring the bell..."
      statusKey="ready"
    />
  );
}
