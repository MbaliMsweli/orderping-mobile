import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';
import { log } from '@/lib/logger';
import { GUEST_FREE_LIMIT } from '@shared/types';

/**
 * Abuse / cost guards layered ON TOP OF the per-user rate limit (lib/rate-limit.ts).
 *
 * The per-user 20/min limit alone is bypassable: anonymous sign-up is free, so an attacker
 * can farm unlimited user IDs. These guards add ceilings that survive identity farming:
 *   1. Per-IP sliding window           — caps a single source regardless of how many users it mints.
 *   2. Server-side guest lifetime cap  — anonymous users get N lifetime AI calls, enforced here
 *                                        (the client-side guest gate is trivially bypassed).
 *   3. Global daily cap (optional)     — a hard ceiling on total AI calls/day to bound spend.
 *
 * Design choice: these EXTRA guards FAIL OPEN on a Redis error (return ok) so a transient Upstash
 * blip can't lock out every real user. The existing per-user limiter remains fail-CLOSED in prod
 * as the backstop, so "Redis totally unconfigured" is still blocked there.
 */

let redis: Redis | null = null;
function getRedis(): Redis | null {
  if (redis) return redis;
  if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) return null;
  redis = new Redis({
    url:   process.env.UPSTASH_REDIS_REST_URL,
    token: process.env.UPSTASH_REDIS_REST_TOKEN,
  });
  return redis;
}

let ipLimiter: Ratelimit | null = null;
function getIpLimiter(): Ratelimit | null {
  if (ipLimiter) return ipLimiter;
  const r = getRedis();
  if (!r) return null;
  ipLimiter = new Ratelimit({
    redis:     r,
    limiter:   Ratelimit.slidingWindow(IP_PER_MIN, '1 m'),
    analytics: false,
    prefix:    'rl:ip',
  });
  return ipLimiter;
}

// Tunable via env; sensible defaults. GUEST_LIFETIME_CAP mirrors the client gate (GUEST_FREE_LIMIT).
const IP_PER_MIN          = Number(process.env.IP_RATE_PER_MIN     ?? 60);
const GUEST_LIFETIME_CAP  = Number(process.env.GUEST_LIFETIME_CAP  ?? GUEST_FREE_LIMIT);
const GLOBAL_DAILY_CAP    = Number(process.env.GLOBAL_DAILY_CAP    ?? 0); // 0 = disabled
const GUEST_KEY_TTL_SEC   = 60 * 60 * 24 * 30; // 30d — anon ids are ephemeral

export interface GuardResult {
  ok:      boolean;
  status?: number;
  error?:  string;
}

/**
 * Best-effort client IP, trusting only headers Vercel's edge sets itself.
 * `x-forwarded-for`'s leftmost entry is client-supplied and trivially spoofable
 * (an attacker can rotate a fake IP every request) — `x-vercel-forwarded-for`
 * is appended by Vercel's edge network and can't be overridden by the client.
 */
export function getClientIp(req: Request): string {
  const vercelXff = req.headers.get('x-vercel-forwarded-for');
  if (vercelXff) return vercelXff.split(',')[0]!.trim();
  return req.headers.get('x-real-ip')?.trim() || 'unknown';
}

export async function enforceUsageLimits(opts: {
  userId:      string;
  isAnonymous: boolean;
  ip:          string;
}): Promise<GuardResult> {
  const r = getRedis();
  if (!r) return { ok: true }; // per-user limiter is the fail-closed backstop

  try {
    // 1. Per-IP ceiling
    const ipRl = getIpLimiter();
    if (ipRl && opts.ip !== 'unknown') {
      const { success } = await ipRl.limit(opts.ip);
      if (!success) {
        log('warn', 'ip_rate_limited', { ip: opts.ip });
        return { ok: false, status: 429, error: 'Too many requests. Please wait a moment.' };
      }
    }

    // 2. Server-side guest lifetime cap
    if (opts.isAnonymous && GUEST_LIFETIME_CAP > 0) {
      const key = `guest:${opts.userId}`;
      const count = await r.incr(key);
      if (count === 1) await r.expire(key, GUEST_KEY_TTL_SEC);
      if (count > GUEST_LIFETIME_CAP) {
        log('warn', 'guest_cap_reached', { userId: opts.userId });
        return { ok: false, status: 403, error: 'Free guest limit reached. Please sign up to keep going.' };
      }
    }

    // 3. Global daily cap (spend ceiling)
    if (GLOBAL_DAILY_CAP > 0) {
      const day = new Date().toISOString().slice(0, 10);
      const key = `global:${day}`;
      const count = await r.incr(key);
      if (count === 1) await r.expire(key, 60 * 60 * 48);
      if (count > GLOBAL_DAILY_CAP) {
        log('warn', 'global_cap_reached', { day, count });
        return { ok: false, status: 503, error: 'Service is busy right now. Please try again shortly.' };
      }
    }

    return { ok: true };
  } catch (err) {
    // Fail OPEN — don't lock out real users on a Redis blip; per-user limiter still applied.
    log('warn', 'usage_guard_error', { error: (err as Error).message });
    return { ok: true };
  }
}
