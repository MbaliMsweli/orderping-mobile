import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  // Capture 10% of transactions for performance monitoring in production
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,

  // Only enable in production to avoid noise in development
  enabled: process.env.NODE_ENV === 'production',

  // Suppress Sentry's own noisy debug output
  debug: false,
});
