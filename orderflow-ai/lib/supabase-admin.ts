import { createClient, type SupabaseClient } from '@supabase/supabase-js';

let _admin: SupabaseClient | null = null;

function getAdmin(): SupabaseClient {
  if (_admin) return _admin;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('SUPABASE_SERVICE_ROLE_KEY is not set — add it to Vercel environment variables');
  _admin = createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
  return _admin;
}

// Server-only Supabase client using the service role key.
// Bypasses RLS — only use in API routes after verifying the user JWT.
// Never import on the client side.
export const supabaseAdmin = new Proxy({} as SupabaseClient, {
  get(_, prop: string) {
    return (getAdmin() as unknown as Record<string, unknown>)[prop];
  },
});
