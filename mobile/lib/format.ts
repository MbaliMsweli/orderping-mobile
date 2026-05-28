export function getGreeting(name: string): string {
  const h    = new Date().getHours();
  const time = h < 12 ? 'morning' : h < 17 ? 'afternoon' : 'evening';
  return `Good ${time}, ${name.split(' ')[0]} 👋`;
}

// relativeTime moved to shared/format.ts — re-exported for back-compat.
export { relativeTime } from '@shared/format';
