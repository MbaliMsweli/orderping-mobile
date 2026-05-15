-- OrderPing — Supabase schema
-- Run this in the Supabase SQL Editor (https://supabase.com/dashboard → SQL Editor)

-- ─────────────────────────────────────────────────────────────────────────────
-- profiles
-- One row per authenticated user. Stores the business profile entered on
-- first launch. All order/recent data stays in AsyncStorage on-device.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.profiles (
  id             UUID        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  business_name  TEXT        NOT NULL DEFAULT '',
  business_phone TEXT        NOT NULL DEFAULT '',
  pickup_address TEXT        NOT NULL DEFAULT '',
  business_hours TEXT        NOT NULL DEFAULT '',
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
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
-- The mobile app uses AsyncStorage only; the web app syncs here as backup.
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
-- Row Level Security — recent_messages
-- Each user can only access their own message history.
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
-- Cleanup (run if migrating from the old schema that had a `couriers` column)
-- ─────────────────────────────────────────────────────────────────────────────

-- ALTER TABLE public.profiles DROP COLUMN IF EXISTS couriers;
