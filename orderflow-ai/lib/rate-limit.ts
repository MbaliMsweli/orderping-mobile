import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

let ratelimit: Ratelimit | null = null;

function getRatelimit(): Ratelimit | null {
  if (ratelimit) return ratelimit;
  if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) {
    return null;
  }
  ratelimit = new Ratelimit({
    redis: new Redis({
      url:   process.env.UPSTASH_REDIS_REST_URL,
      token: process.env.UPSTASH_REDIS_REST_TOKEN,
    }),
    limiter: Ratelimit.slidingWindow(20, '1 m'),
    analytics: false,
  });
  return ratelimit;
}

export interface RateLimitResult {
  limited:   boolean;
  remaining: number;
  reset:     number; // unix timestamp (ms) when the window resets
}

/**
 * Check rate limit for a given identifier (user ID).
 *
 * In production without Upstash configured, fails CLOSED — all requests
 * are blocked to protect the Anthropic API budget.
 * In development without Upstash, requests are allowed through.
 */
export async function checkRateLimit(identifier: string): Promise<RateLimitResult> {
  const rl = getRatelimit();
  if (!rl) {
    if (process.env.NODE_ENV === 'production') {
      console.error('[rate-limit] UPSTASH_REDIS_REST_URL not configured — blocking request');
      return { limited: true, remaining: 0, reset: Date.now() + 60_000 };
    }
    return { limited: false, remaining: 20, reset: Date.now() + 60_000 };
  }
  const { success, remaining, reset } = await rl.limit(identifier);
  return { limited: !success, remaining, reset };
}

/** @deprecated Use checkRateLimit instead */
export async function isRateLimited(identifier: string): Promise<boolean> {
  const { limited } = await checkRateLimit(identifier);
  return limited;
}
