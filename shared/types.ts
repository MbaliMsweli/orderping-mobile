// Shared type definitions used by both the mobile (Expo) and web (Next.js) apps.
// These are pure type declarations — no runtime code, no platform dependencies.

export interface BusinessProfile {
  businessName:        string;
  businessPhone:       string;
  pickupAddress:       string;
  businessHours:       string;
  businessType?:       'product' | 'service';
  businessDescription: string;
}

export interface RecentEntry {
  customerName: string;
  phoneNumber:  string;
  email?:       string;
  status:       string;
  delayReason?: string | null;
  courier?:     string | null;
  channel:      'whatsapp' | 'sms' | 'email' | 'copy';
  message:      string;
  timestamp:    string;
}

export type Tone    = 'friendly' | 'professional' | 'apologetic' | 'reassuring';
export type Channel = 'whatsapp' | 'sms' | 'email' | 'copy';

export type FrustrationLevel = 'none' | 'moderate' | 'high';

export interface FrustrationResult {
  level:   FrustrationLevel;
  signals: string[];
  context: string;
}

export interface WeekSummary {
  updates:   number;
  customers: number;
  bestDay:   string;
}

export interface ForgottenCustomer {
  customerName: string;
  phoneNumber:  string;
  email?:       string;
  lastStatus:   string;
  hoursAgo:     number;
}

export const STATUS_LABELS: Record<string, string> = {
  received:           'Received',
  delay:              'Delayed',
  dispatched:         'Dispatched',
  ready:              'Ready',
  'pre-order':        'Pre-order',
  'booking-confirmed':'Confirmed',
  'on-the-way':       'On the Way',
  'running-late':     'Running Late',
  arrived:            'Arrived',
  completed:          'Completed',
  rescheduled:        'Rescheduled',
  'waiting-parts':    'Waiting Parts',
  'follow-up':        'Follow-up',
};
