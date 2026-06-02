// Customer frustration detection — pure logic, used by both mobile and web.
// Source of truth: previously mobile/lib/frustration.ts (mobile version is broader
// than the web one — covers service statuses too).

import type { FrustrationResult, FrustrationLevel, RecentEntry } from './types';

export function detectFrustration(phone: string, recent: RecentEntry[]): FrustrationResult {
  const history = recent
    .filter(e => e.phoneNumber === phone)
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  if (history.length === 0) return { level: 'none', signals: [], context: '' };

  let score = 0;
  const signals: string[] = [];
  const now  = Date.now();
  const latest = history[0];
  const oldest = history[history.length - 1];
  const delays = history.filter(e => e.status === 'delay' || e.status === 'running-late');
  const hoursSinceLatest = (now - new Date(latest.timestamp).getTime()) / 3600000;
  const hoursSinceFirst  = (now - new Date(oldest.timestamp).getTime()) / 3600000;
  const pendingStatuses  = ['received', 'delay', 'pre-order', 'booking-confirmed', 'running-late', 'waiting-parts'];

  if (delays.length >= 3) { score += 50; signals.push(`${delays.length} delay updates`); }
  else if (delays.length === 2) { score += 35; signals.push('2 delay updates'); }
  else if (delays.length === 1) { score += 15; signals.push('1 delay update'); }

  if (history.length >= 5) { score += 20; signals.push(`${history.length} messages sent`); }
  else if (history.length >= 3) { score += 10; signals.push(`${history.length} messages sent`); }

  if (pendingStatuses.includes(latest.status) && hoursSinceLatest >= 72) {
    score += 25; signals.push('waiting 3+ days');
  } else if (pendingStatuses.includes(latest.status) && hoursSinceLatest >= 48) {
    score += 15; signals.push('waiting 2+ days');
  }

  if (hoursSinceFirst >= 168) { score += 15; signals.push('order 7+ days old'); }

  if (latest.status === 'delay') { score += 10; }

  const level: FrustrationLevel = score >= 55 ? 'high' : score >= 25 ? 'moderate' : 'none';

  const context = level === 'high'
    ? `This customer has been waiting a long time and received multiple delay updates (${signals.join(', ')}). They may be frustrated or anxious. Be genuinely empathetic, acknowledge their patience explicitly, and make them feel like a priority — this is a trust-repair moment.`
    : level === 'moderate'
    ? `This customer may be experiencing some frustration (${signals.join(', ')}). Be warmer and more reassuring than usual.`
    : '';

  return { level, signals, context };
}
