'use client';

import StatusNotePicker from '@/components/StatusNotePicker';

const OPTIONS = [
  { id: 'Pre-order is locked in and we are waiting for stock to arrive', icon: '🚢', label: 'Locked in, waiting on stock' },
  { id: 'Pre-order confirmed and will be ready in 2 to 3 weeks',         icon: '📅', label: 'Ready in 2–3 weeks' },
  { id: 'Pre-order confirmed and will be ready in 4 to 6 weeks',         icon: '🗓️', label: 'Ready in 4–6 weeks' },
];

export const PREORDER_PRESET_IDS = OPTIONS.map((o) => o.id);

interface PreOrderPickerProps {
  selected: string | null;
  onSelect: (value: string | null) => void;
}

export default function PreOrderPicker({ selected, onSelect }: PreOrderPickerProps) {
  return (
    <StatusNotePicker
      heading="Pre-order detail"
      options={OPTIONS}
      selected={selected}
      onSelect={onSelect}
      activeColor="#6366F1"
      customPlaceholder="e.g. available end of month, limited to 20 units..."
      statusKey="pre-order"
    />
  );
}
