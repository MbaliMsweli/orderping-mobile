'use client';

import StatusNotePicker from '@/components/StatusNotePicker';

const OPTIONS = [
  { id: 'The courier is running a little behind — your order is still on its way', icon: '🚚', label: 'Courier running a little late' },
  { id: 'We are waiting for stock to arrive before we can send yours out',          icon: '📦', label: 'Waiting on stock to arrive' },
  { id: 'We have had a high demand of orders and need just a bit more time',        icon: '⚡', label: 'High demand, need extra time' },
];

export const DELAY_PRESET_IDS = OPTIONS.map((o) => o.id);

interface DelayPickerProps {
  selected: string | null;
  onSelect: (value: string | null) => void;
}

export default function DelayPicker({ selected, onSelect }: DelayPickerProps) {
  return (
    <StatusNotePicker
      heading="What's the delay?"
      options={OPTIONS}
      selected={selected}
      onSelect={onSelect}
      activeColor="#FBBF24"
      customPlaceholder="e.g. customs hold, supplier issue, weather..."
      statusKey="delay"
    />
  );
}
