import { NextRequest, NextResponse, after } from 'next/server';
import { createClient, type User } from '@supabase/supabase-js';
import Anthropic from '@anthropic-ai/sdk';
import { checkRateLimit } from '@/lib/rate-limit';
import { corsHeaders } from '@/lib/cors';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { enforceUsageLimits, getClientIp } from '@/lib/usage-guard';
import { log, logException } from '@/lib/logger';

if (!process.env.NEXT_PUBLIC_SUPABASE_URL)      throw new Error('NEXT_PUBLIC_SUPABASE_URL is not set');
if (!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) throw new Error('NEXT_PUBLIC_SUPABASE_ANON_KEY is not set');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
);

export interface GuardedContext {
  user:      User;
  rlHeaders: Record<string, string>;
}

/**
 * Shared auth → rate-limit → abuse-guard pipeline for the AI API routes.
 * Rate-limit and usage-guard checks run concurrently (Promise.all) since neither
 * depends on the other's result — both must pass regardless of order.
 */
export async function withApiGuards(
  req:      NextRequest,
  endpoint: string,
  handler:  (ctx: GuardedContext) => Promise<NextResponse>,
): Promise<NextResponse> {
  const origin = req.headers.get('origin');
  const cors = corsHeaders(origin);

  try {
    const authHeader = req.headers.get('authorization');
    const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers: cors });
    }
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers: cors });
    }

    const [{ limited, remaining, reset }, guard] = await Promise.all([
      checkRateLimit(user.id),
      enforceUsageLimits({ userId: user.id, isAnonymous: user.is_anonymous ?? false, ip: getClientIp(req) }),
    ]);
    const rlHeaders = {
      ...cors,
      'RateLimit-Remaining': String(remaining),
      'RateLimit-Reset':     String(reset),
    };
    if (limited) {
      log('warn', 'rate_limited', { userId: user.id, endpoint });
      return NextResponse.json(
        { error: 'Too many requests. Please wait a moment.' },
        { status: 429, headers: rlHeaders },
      );
    }
    if (!guard.ok) {
      return NextResponse.json({ error: guard.error }, { status: guard.status, headers: rlHeaders });
    }

    return await handler({ user, rlHeaders });
  } catch (err) {
    logException(err, { endpoint });
    return NextResponse.json(
      { error: 'Something went wrong. Please try again.' },
      { status: 500, headers: cors },
    );
  }
}

/** Logs AI token usage without delaying or risking the response — survives function freeze via after(). */
export function logUsage(userId: string, endpoint: string, tokensUsed: number): void {
  after(async () => {
    const { error } = await supabaseAdmin.from('usage_logs').insert({
      user_id:     userId,
      endpoint,
      tokens_used: tokensUsed,
    });
    if (error) log('warn', 'usage_log_failed', { userId, error: error.message });
  });
}

/**
 * Calls Claude and maps overload/rate errors to a 503 the client can retry.
 * Timeout/retries are tuned to land under the mobile client's own abort budget
 * (15-20s) so the server doesn't keep working on a request the user already gave up on.
 */
export async function callClaude(
  anthropic: Anthropic,
  params:    Anthropic.MessageCreateParamsNonStreaming,
  endpoint:  string,
  rlHeaders: Record<string, string>,
): Promise<Anthropic.Message | NextResponse> {
  try {
    return await anthropic.messages.create(params, { timeout: 12_000, maxRetries: 1 });
  } catch (err) {
    if (err instanceof Anthropic.APIError && (err.status === 429 || err.status === 529)) {
      log('warn', 'anthropic_overloaded', { status: err.status, endpoint });
      return NextResponse.json(
        { error: 'High demand right now — please try again in a moment.' },
        { status: 503, headers: rlHeaders },
      );
    }
    throw err;
  }
}
