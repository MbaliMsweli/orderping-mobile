import { Colors } from '@/constants/colors';

export type Tone    = 'friendly' | 'professional' | 'apologetic' | 'reassuring';
export type Channel = 'whatsapp' | 'sms' | 'email' | 'copy';

export const RECEIVED_OPTIONS = [
  { id: 'Order received and being carefully packed for you',   icon: '✅', label: 'Received & packing now' },
  { id: 'Just need you to confirm your delivery address',      icon: '📍', label: 'Need delivery address' },
  { id: 'Waiting for your payment to clear before we process', icon: '💳', label: 'Awaiting payment' },
];
export const DELAY_OPTIONS = [
  { id: 'The courier is running a little behind — your order is still on its way', icon: '🚚', label: 'Courier running a little late' },
  { id: 'We are waiting for stock to arrive before we can send yours out',          icon: '📦', label: 'Waiting on stock to arrive' },
  { id: 'We have had a high demand of orders and need just a bit more time',        icon: '⚡',  label: 'High demand, need extra time' },
];
export const DISPATCH_OPTIONS = [
  { id: 'already on its way to you',              icon: '✅',  label: 'Already on its way' },
  { id: 'going out to you today',                 icon: '📬',  label: 'Going out today' },
  { id: 'going out to you tomorrow',              icon: '📅',  label: 'Going out tomorrow' },
  { id: 'going out to you later this week',       icon: '🗓️', label: 'Going out this week' },
  { id: 'split into multiple parcels, all on the way', icon: '📦', label: 'Split into multiple parcels' },
];
export const READY_OPTIONS = [
  { id: 'Ready and waiting for you to collect',               icon: '🏪', label: 'Ready for collection now' },
  { id: 'Will be ready for you to collect from tomorrow',     icon: '📅', label: 'Ready from tomorrow' },
  { id: 'Ready and we would love you to collect it soon',     icon: '⚠️',  label: 'Please collect soon' },
];
export const PREORDER_OPTIONS = [
  { id: 'Pre-order is locked in and we are waiting for stock to arrive', icon: '🚢', label: 'Locked in, waiting on stock' },
  { id: 'Pre-order confirmed and will be ready in 2 to 3 weeks',         icon: '📅', label: 'Ready in 2–3 weeks' },
  { id: 'Pre-order confirmed and will be ready in 4 to 6 weeks',         icon: '🗓️', label: 'Ready in 4–6 weeks' },
];

export const COURIERS = [
  { name: 'The Courier Guy', deliveryTime: '3-5 working days' },
  { name: 'Pep',             deliveryTime: '7-9 working days' },
  { name: 'PostNet',         deliveryTime: '5-7 working days' },
];

export const STATUSES = [
  { id: 'received',   label: 'Received',   emoji: '📦', color: Colors.received },
  { id: 'delay',      label: 'Delay',       emoji: '⏳', color: Colors.delay },
  { id: 'dispatched', label: 'Dispatching', emoji: '🚚', color: Colors.dispatched },
  { id: 'ready',      label: 'Ready',       emoji: '📍', color: Colors.ready },
] as const;

export const SERVICE_STATUSES = [
  { id: 'booking-confirmed', label: 'Confirmed',    emoji: '✅', color: '#2BA784' },
  { id: 'on-the-way',        label: 'On the Way',   emoji: '🚗', color: '#3B82F6' },
  { id: 'running-late',      label: 'Running Late', emoji: '⏰', color: '#E8A435' },
  { id: 'arrived',           label: 'Arrived',      emoji: '📍', color: '#16A34A' },
  { id: 'completed',         label: 'Completed',    emoji: '🎉', color: '#8B5CF6' },
  { id: 'rescheduled',       label: 'Rescheduled',  emoji: '📅', color: '#6B7280' },
  { id: 'waiting-parts',     label: 'Waiting Parts',emoji: '🔧', color: '#D4A843' },
  { id: 'follow-up',         label: 'Follow-up',    emoji: '📞', color: '#EC4899' },
];

export const SERVICE_CONFIRMED_OPTIONS = [
  { id: 'Your appointment has been confirmed and our technician will be there on time',   icon: '✅', label: 'Confirmed on time' },
  { id: 'Your booking is confirmed — just a reminder of the appointment details',          icon: '📅', label: 'Reminder confirmation' },
  { id: 'Confirmed and we have everything we need to complete the job',                    icon: '🔧', label: 'All prepared' },
];
export const SERVICE_ON_THE_WAY_OPTIONS = [
  { id: 'Our technician is on the way and should arrive shortly',   icon: '🚗', label: 'On the way now' },
  { id: 'Our team has just left and is heading to you',              icon: '📍', label: 'Just left' },
  { id: 'Almost there — about 10 to 15 minutes away',               icon: '⏱️', label: '10–15 min away' },
];
export const SERVICE_LATE_OPTIONS = [
  { id: 'Running behind due to traffic but still coming today',            icon: '🚦', label: 'Traffic delay' },
  { id: 'Running a little late due to the previous job taking longer',     icon: '🔧', label: 'Previous job overran' },
  { id: 'Slightly delayed due to weather conditions',                       icon: '🌧️', label: 'Weather delay' },
];
export const SERVICE_ARRIVED_OPTIONS = [
  { id: 'Technician has arrived on site and is getting started',   icon: '🏠', label: 'Arrived, getting started' },
  { id: 'We have arrived and are assessing the situation',          icon: '🔍', label: 'Arrived, assessing' },
  { id: 'Arrived and everything looks straightforward',             icon: '✅', label: 'Arrived, looks good' },
];
export const SERVICE_COMPLETED_OPTIONS = [
  { id: 'Job is complete and everything has been sorted',                    icon: '✅', label: 'All done' },
  { id: 'Service completed successfully — no further action needed',         icon: '🎉', label: 'Completed, all good' },
  { id: 'Service completed and a follow-up visit may be needed',             icon: '📞', label: 'Done, follow-up needed' },
];
export const SERVICE_RESCHEDULED_OPTIONS = [
  { id: 'Appointment rescheduled due to unforeseen circumstances',   icon: '📅', label: 'Unforeseen circumstances' },
  { id: 'We need to reschedule due to technician availability',       icon: '👤', label: 'Technician unavailable' },
  { id: 'Rescheduling as the required parts are not yet available',   icon: '🔧', label: 'Parts not yet available' },
];
export const SERVICE_PARTS_OPTIONS = [
  { id: 'Waiting for a part to arrive before we can complete the job',              icon: '🔧', label: 'Part on order' },
  { id: 'Special part needs to be sourced — this may take a day or two',            icon: '📦', label: 'Sourcing special part' },
  { id: 'Materials have been delayed but we will update you as soon as they arrive', icon: '⏳', label: 'Materials delayed' },
];
export const SERVICE_FOLLOWUP_OPTIONS = [
  { id: 'A follow-up visit has been scheduled to check on the work done',   icon: '📅', label: 'Follow-up booked' },
  { id: 'Checking in to see how everything is going after our visit',        icon: '👋', label: 'Checking in' },
  { id: 'Following up to confirm the issue has been fully resolved',         icon: '✅', label: 'Confirming resolved' },
];

export const STATUS_BADGES: Record<string, { label: string; color: string }> = {
  // Product
  received:           { label: 'Received',     color: Colors.received },
  delay:              { label: 'Delayed',       color: Colors.delay },
  dispatched:         { label: 'Dispatched',    color: Colors.dispatched },
  ready:              { label: 'Ready',         color: Colors.ready },
  'pre-order':        { label: 'Pre-order',     color: Colors.accent },
  // Service
  'booking-confirmed':{ label: 'Confirmed',     color: '#2BA784' },
  'on-the-way':       { label: 'On the Way',    color: '#3B82F6' },
  'running-late':     { label: 'Running Late',  color: '#E8A435' },
  'arrived':          { label: 'Arrived',       color: '#16A34A' },
  'completed':        { label: 'Completed',     color: '#8B5CF6' },
  'rescheduled':      { label: 'Rescheduled',   color: '#6B7280' },
  'waiting-parts':    { label: 'Waiting Parts', color: '#D4A843' },
  'follow-up':        { label: 'Follow-up',     color: '#EC4899' },
};

export const PRODUCT_FILTERS = ['all', 'received', 'delay', 'dispatched', 'ready', 'pre-order'] as const;
export const SERVICE_FILTERS  = ['all', 'booking-confirmed', 'on-the-way', 'running-late', 'arrived', 'completed', 'rescheduled', 'waiting-parts', 'follow-up'] as const;
export const FILTER_LABELS: Record<string, string> = {
  all: 'All',
  // Product
  received: 'Received', delay: 'Delayed', dispatched: 'Dispatched', ready: 'Ready', 'pre-order': 'Pre-order',
  // Service
  'booking-confirmed': 'Confirmed', 'on-the-way': 'On the Way', 'running-late': 'Running Late',
  'arrived': 'Arrived', 'completed': 'Completed', 'rescheduled': 'Rescheduled',
  'waiting-parts': 'Waiting Parts', 'follow-up': 'Follow-up',
};
export const CHANNEL_ICONS: Record<string, string> = { whatsapp: '💬', sms: '📱', email: '✉️', copy: '📋' };
