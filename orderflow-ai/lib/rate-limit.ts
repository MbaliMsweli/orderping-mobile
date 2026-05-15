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

/**
 * Returns true if the request should be blocked (rate limit exceeded).
 *
 * In production without Upstash configured, this fails CLOSED — all requests
 * are blocked to prevent unlimited billing attacks on the Anthropic API.
 * In development without Upstash, requests are allowed through.
 */
export async function isRateLimited(identifier: string): Promise<boolean> {
  const rl = getRatelimit();
  if (!rl) {
    if (process.env.NODE_ENV === 'production') {
      console.error('[rate-limit] UPSTASH_REDIS_REST_URL not configured — blocking request to protect Anthropic API budget');
      return true;
    }
    return false;
  }
  const { success } = await rl.limit(identifier);
  return !success;
}
