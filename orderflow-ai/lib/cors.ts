const ALLOWED_ORIGINS = [
  'https://www.orderping.net',
  'https://orderping.net',
  ...(process.env.NODE_ENV !== 'production'
    ? ['http://localhost:3000', 'http://localhost:8081']
    : []),
];

/**
 * Returns CORS headers scoped to the request origin.
 * If the origin is in the allowlist, it is echoed back (required for
 * credentialed requests). If missing or unknown, no ACAO header is
 * returned — browsers will block the cross-origin request, which is
 * the correct behaviour. Native mobile callers are unaffected.
 */
export function corsHeaders(origin: string | null): Record<string, string> {
  const base: Record<string, string> = {
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Max-Age': '86400',
  };

  if (origin && ALLOWED_ORIGINS.includes(origin)) {
    return {
      ...base,
      'Access-Control-Allow-Origin': origin,
      Vary: 'Origin',
    };
  }

  return base;
}
