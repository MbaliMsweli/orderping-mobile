'use client';

import StatusNotePicker from '@/components/StatusNotePicker';

const OPTIONS = [
  { id: 'already on its way to you',                 icon: '✅',  label: 'Already on its way' },
  { id: 'going out to you today',                    icon: '📬',  label: 'Going out today' },
  { id: 'going out to you tomorrow',                 icon: '📅',  label: 'Going out tomorrow' },
  { id: 'going out to you later this week',          icon: '🗓️', label: 'Going out this week' },
  { id: 'split into multiple parcels, all on the way', icon: '📦', label: 'Split into multiple parcels' },
];

export const DISPATCH_PRESET_IDS = OPTIONS.map((o) => o.id);

interface DispatchDatePickerProps {
  selected: string | null;
  onSelect: (value: string | null) => void;
}

export default function DispatchDatePicker({ selected, onSelect }: DispatchDatePickerProps) {
  return (
    <StatusNotePicker
      heading="When will it be dispatched?"
      options={OPTIONS}
      selected={selected}
      onSelect={onSelect}
      activeColor="#3B82F6"
      customPlaceholder="e.g. Monday, 15 May, end of week..."
      statusKey="dispatched"
    />
  );
}
