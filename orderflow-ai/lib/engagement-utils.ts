// All pure engagement utilities have moved to shared/. This file re-exports them
// so existing `from '@/lib/engagement-utils'` imports keep working.

export {
  getWeekKey,
  getLastWeekSummary,
  getForgottenCustomers,
} from '@shared/engagement';

export { relativeTime } from '@shared/format';

export { detectFrustration } from '@shared/frustration';

export type {
  WeekSummary,
  FrustrationLevel,
  FrustrationResult,
  ForgottenCustomer,
} from '@shared/types';

export { STATUS_LABELS } from '@shared/types';
