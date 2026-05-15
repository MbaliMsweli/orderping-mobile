'use client';

import StatusNotePicker from '@/components/StatusNotePicker';

const OPTIONS = [
  { id: 'Order split into multiple parcels', icon: '📦', label: 'Split into multiple parcels' },
  { id: 'Arriving soon',                     icon: '⚡', label: 'Arriving soon' },
];

interface DispatchedNotePickerProps {
  selected: string | null;
  onSelect: (value: string | null) => void;
}

export default function DispatchedNotePicker({ selected, onSelect }: DispatchedNotePickerProps) {
  return (
    <StatusNotePicker
      heading="Anything extra to mention?"
      options={OPTIONS}
      selected={selected}
      onSelect={onSelect}
      activeColor="#3B82F6"
      customPlaceholder="e.g. leave at gate, contact courier for delivery time..."
    />
  );
}
