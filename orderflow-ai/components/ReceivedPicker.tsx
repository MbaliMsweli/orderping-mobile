'use client';

import StatusNotePicker from '@/components/StatusNotePicker';

const OPTIONS = [
  { id: 'Order received and being carefully packed for you',    icon: '✅', label: 'Received & packing now' },
  { id: 'Just need you to confirm your delivery address',       icon: '📍', label: 'Need delivery address' },
  { id: 'Waiting for your payment to clear before we process', icon: '💳', label: 'Awaiting payment' },
];

export const RECEIVED_PRESET_IDS = OPTIONS.map((o) => o.id);

interface ReceivedPickerProps {
  selected: string | null;
  onSelect: (value: string | null) => void;
}

export default function ReceivedPicker({ selected, onSelect }: ReceivedPickerProps) {
  return (
    <StatusNotePicker
      heading="What type of order?"
      options={OPTIONS}
      selected={selected}
      onSelect={onSelect}
      activeColor="#8B5CF6"
      customPlaceholder="e.g. pre-order, group buy, special request..."
      statusKey="received"
    />
  );
}
