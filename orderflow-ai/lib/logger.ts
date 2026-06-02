import * as Sentry from '@sentry/nextjs';

type LogLevel = 'info' | 'warn' | 'error';

interface LogEntry {
  level: LogLevel;
  event: string;
  timestamp: string;
  [key: string]: unknown;
}

export function log(level: LogLevel, event: string, data?: Record<string, unknown>): void {
  const entry: LogEntry = {
    level,
    event,
    timestamp: new Date().toISOString(),
    ...data,
  };
  const line = JSON.stringify(entry);

  if (level === 'error') {
    console.error(line);
    if (process.env.NODE_ENV === 'production') {
      Sentry.captureMessage(event, { level: 'error', extra: data });
    }
  } else if (level === 'warn') {
    console.warn(line);
  } else {
    console.log(line);
  }
}

export function logException(err: unknown, context?: Record<string, unknown>): void {
  console.error(JSON.stringify({ level: 'error', event: 'exception', timestamp: new Date().toISOString(), error: (err as Error).message, ...context }));
  if (process.env.NODE_ENV === 'production') {
    Sentry.captureException(err, { extra: context });
  }
}
