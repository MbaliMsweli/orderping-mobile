// Re-export from shared/. Real implementation lives in shared/engagement.ts.
export { getForgottenCustomers, getWeekKey, getLastWeekSummary } from '@shared/engagement';
export type { ForgottenCustomer, WeekSummary } from '@shared/types';
