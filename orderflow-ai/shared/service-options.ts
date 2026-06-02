// Service-business status preset options. Pure data — identical in both apps.

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
