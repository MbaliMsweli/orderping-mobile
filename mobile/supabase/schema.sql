-- OrderPing — Supabase schema
-- Run this in the Supabase SQL Editor (https://supabase.com/dashboard → SQL Editor)

-- ─────────────────────────────────────────────────────────────────────────────
-- profiles
-- One row per authenticated user. Stores the business profile entered on
-- first launch. All order/recent data stays in AsyncStorage on-device.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.profiles (
  id                   UUID        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  business_name        TEXT        NOT NULL DEFAULT '',
  business_phone       TEXT        NOT NULL DEFAULT '',
  pickup_address       TEXT        NOT NULL DEFAULT '',
  business_hours       TEXT        NOT NULL DEFAULT '',
  business_type        TEXT        NOT NULL DEFAULT 'product',
  business_description TEXT        NOT NULL DEFAULT '',
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─────────────────────────────────────────────────────────────────────────────
-- Row Level Security — profiles
-- Each user can only see and edit their own profile row.
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "select_own_profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "insert_own_profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

CREATE POLICY "update_own_profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- ─────────────────────────────────────────────────────────────────────────────
-- recent_messages
-- Stores the last 30 messages per user for cross-device sync (web app).
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.recent_messages (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  customer_name TEXT,
  phone_number  TEXT,
  email         TEXT,
  status        TEXT,
  delay_reason  TEXT,
  courier       TEXT,
  channel       TEXT,
  message       TEXT,
  sent_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Unique constraint required for upsert conflict resolution
ALTER TABLE public.recent_messages
  ADD CONSTRAINT recent_messages_user_phone_time_key
  UNIQUE (user_id, phone_number, sent_at);

-- ─────────────────────────────────────────────────────────────────────────────
-- Performance indexes — recent_messages
-- ─────────────────────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_recent_messages_user_id
  ON public.recent_messages(user_id);

CREATE INDEX IF NOT EXISTS idx_recent_messages_user_sent
  ON public.recent_messages(user_id, sent_at DESC);

CREATE INDEX IF NOT EXISTS idx_recent_messages_user_status
  ON public.recent_messages(user_id, status);

-- ─────────────────────────────────────────────────────────────────────────────
-- Row Level Security — recent_messages
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE public.recent_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "select_own_messages"
  ON public.recent_messages FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "insert_own_messages"
  ON public.recent_messages FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "delete_own_messages"
  ON public.recent_messages FOR DELETE
  USING (auth.uid() = user_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- usage_logs
-- Tracks every AI API call per user. Used for abuse detection and future
-- plan enforcement. Written server-side by API routes after each call.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.usage_logs (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  endpoint    TEXT        NOT NULL,  -- 'generate-message' | 'extract-order'
  tokens_used INT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_usage_logs_user_created
  ON public.usage_logs(user_id, created_at DESC);

ALTER TABLE public.usage_logs ENABLE ROW LEVEL SECURITY;

-- Users can view their own usage; only the service role can insert
CREATE POLICY "select_own_usage"
  ON public.usage_logs FOR SELECT
  USING (auth.uid() = user_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- audit_logs
-- Compliance trail: profile changes, sign-ins, history clears.
-- Written server-side; users can read their own entries.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.audit_logs (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  action      TEXT        NOT NULL,  -- 'profile_updated' | 'messages_cleared' | 'signed_in'
  metadata    JSONB,
  ip_address  TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_user_created
  ON public.audit_logs(user_id, created_at DESC);

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "select_own_audit"
  ON public.audit_logs FOR SELECT
  USING (auth.uid() = user_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- Retention: auto-delete messages older than 90 days
-- Enable the pg_cron extension in Supabase Dashboard → Database → Extensions
-- then run this once to schedule the daily cleanup job.
-- ─────────────────────────────────────────────────────────────────────────────

-- SELECT cron.schedule(
--   'cleanup-old-messages',
--   '0 3 * * *',
--   $$DELETE FROM public.recent_messages WHERE sent_at < NOW() - INTERVAL '90 days'$$
-- );

-- ─────────────────────────────────────────────────────────────────────────────
-- Migrations: safe to run against existing databases
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS business_type        TEXT NOT NULL DEFAULT 'product';

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS business_description TEXT NOT NULL DEFAULT '';

-- Indexes (idempotent — IF NOT EXISTS)
CREATE INDEX IF NOT EXISTS idx_recent_messages_user_id
  ON public.recent_messages(user_id);

CREATE INDEX IF NOT EXISTS idx_recent_messages_user_sent
  ON public.recent_messages(user_id, sent_at DESC);

CREATE INDEX IF NOT EXISTS idx_recent_messages_user_status
  ON public.recent_messages(user_id, status);

-- ─────────────────────────────────────────────────────────────────────────────
-- notification_jobs
-- Queue for server-side message delivery (future: WhatsApp API, SMS, Email).
-- Currently unused — infrastructure for when a delivery provider is added.
-- ─────────────────────────────────────────────────────────────────────────────

DO $$ BEGIN
  CREATE TYPE job_status AS ENUM ('pending', 'processing', 'sent', 'failed', 'dead');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE channel_type AS ENUM ('whatsapp', 'sms', 'email');
EXCEPTION WHEN duplicate_object THEN null; END $$;

CREATE TABLE IF NOT EXISTS public.notification_jobs (
  id                  UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             UUID          NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  channel             channel_type  NOT NULL,
  recipient_phone     TEXT,
  recipient_email     TEXT,
  message             TEXT          NOT NULL,
  subject             TEXT,
  status              job_status    NOT NULL DEFAULT 'pending',
  attempts            INT           NOT NULL DEFAULT 0,
  max_attempts        INT           NOT NULL DEFAULT 3,
  last_error          TEXT,
  provider_message_id TEXT,
  scheduled_for       TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  sent_at             TIMESTAMPTZ,
  created_at          TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notification_jobs_pending
  ON public.notification_jobs(status, scheduled_for)
  WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS idx_notification_jobs_user
  ON public.notification_jobs(user_id, created_at DESC);

ALTER TABLE public.notification_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "insert_own_jobs"
  ON public.notification_jobs FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "select_own_jobs"
  ON public.notification_jobs FOR SELECT
  USING (auth.uid() = user_id);
