// Engagement utilities — pure logic for the weekly report and forgotten-customer reminder.
// Source of truth: previously mobile/lib/engagement.ts.

import type { RecentEntry, ForgottenCustomer, WeekSummary } from './types';

const PENDING_STATUSES = [
  'received', 'delay', 'pre-order',
  'booking-confirmed', 'running-late', 'waiting-parts',
];

export function getForgottenCustomers(recent: RecentEntry[]): ForgottenCustomer[] {
  const byPhone: Record<string, RecentEntry> = {};
  for (const e of recent) {
    if (!byPhone[e.phoneNumber] || new Date(e.timestamp) > new Date(byPhone[e.phoneNumber].timestamp))
      byPhone[e.phoneNumber] = e;
  }
  const now = Date.now();
  return Object.values(byPhone)
    .filter(e => PENDING_STATUSES.includes(e.status))
    .map(e => ({
      customerName: e.customerName,
      phoneNumber:  e.phoneNumber,
      email:        e.email,
      lastStatus:   e.status,
      hoursAgo:     Math.floor((now - new Date(e.timestamp).getTime()) / 3600000),
    }))
    .filter(e => e.hoursAgo >= 24)
    .sort((a, b) => b.hoursAgo - a.hoursAgo);
}

export function getWeekKey(date: Date): string {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + 3 - ((d.getDay() + 6) % 7));
  const week1 = new Date(d.getFullYear(), 0, 4);
  const weekNum = 1 + Math.round(((d.getTime() - week1.getTime()) / 86400000 - 3 + (week1.getDay() + 6) % 7) / 7);
  return `${d.getFullYear()}-W${weekNum}`;
}

export function getLastWeekSummary(recent: RecentEntry[]): WeekSummary | null {
  const now = new Date();
  const startOfThisWeek = new Date(now);
  startOfThisWeek.setDate(now.getDate() - ((now.getDay() + 6) % 7));
  startOfThisWeek.setHours(0, 0, 0, 0);
  const startOfLastWeek = new Date(startOfThisWeek);
  startOfLastWeek.setDate(startOfThisWeek.getDate() - 7);

  const entries = recent.filter(e => {
    const t = new Date(e.timestamp);
    return t >= startOfLastWeek && t < startOfThisWeek;
  });
  if (entries.length === 0) return null;

  const uniqueCustomers = new Set(entries.map(e => e.phoneNumber)).size;
  const dayNames = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
  const countsByDay: Record<number, number> = {};
  entries.forEach(e => {
    const day = new Date(e.timestamp).getDay();
    countsByDay[day] = (countsByDay[day] ?? 0) + 1;
  });
  const bestDayNum = parseInt(Object.entries(countsByDay).sort((a, b) => b[1] - a[1])[0][0]);
  return { updates: entries.length, customers: uniqueCustomers, bestDay: dayNames[bestDayNum] };
}
