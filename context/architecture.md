# Architecture Context

OrderPing is **two apps in one workspace** plus a shared logic folder. The mobile app is the
primary product; the web app mirrors it and also hosts the AI API the mobile app calls.

## Stack

### Mobile (`mobile/`)

| Layer       | Technology                                  | Role                                            |
| ----------- | ------------------------------------------- | ----------------------------------------------- |
| Framework   | Expo SDK 54, React Native 0.81, React 19, TS | App shell, native runtime (New Architecture on) |
| Routing     | expo-router v6 (file-based)                 | `(auth)` / `(setup)` / `(main)` route groups    |
| Auth        | Supabase (`@supabase/supabase-js`)          | Email/password + anonymous guest sessions       |
| Local store | AsyncStorage                                | All order data lives on-device                  |
| Analytics   | PostHog (`posthog-react-native`)            | Event + identity tracking (disabled in dev)     |
| Native      | expo-linking / -haptics / -updates / -constants | Deep links, haptics, OTA updates            |
| AI          | (none local) → calls web app endpoints      | `extract-order`, `generate-message`             |

### Web (`orderflow-ai/`)

| Layer        | Technology                                      | Role                                         |
| ------------ | ----------------------------------------------- | -------------------------------------------- |
| Framework    | Next.js 15 (App Router), React 18, TS, Tailwind | Web app + API host                           |
| AI           | Anthropic Claude (`@anthropic-ai/sdk`), `claude-sonnet-4-6` | Message generation + order extraction |
| Auth + DB    | Supabase (`@supabase/supabase-js`, `@supabase/ssr`) | Auth, profiles, message history, logs    |
| Rate limit   | Upstash Redis (`@upstash/ratelimit`, `@upstash/redis`) | 20 req/min per user, sliding window   |
| Validation   | Zod                                             | Strict input schemas at API boundaries       |
| Observability| Sentry (`@sentry/nextjs`), PostHog, JSON logger | Errors, analytics, structured logs           |
| Hosting      | Vercel (region `cpt1`, Cape Town) + daily cron  | Functions, page hosting, worker job          |
| Icons        | lucide-react                                    | UI icons                                     |

### Shared (`orderflow-ai/shared/`, imported as `@shared/*`)

| Module                  | Role                                                         |
| ----------------------- | ----------------------------------------------------------- |
| `types.ts`              | Shared TypeScript types (e.g. RecentEntry, profile shapes)  |
| `format.ts`             | Relative-time / formatting helpers                          |
| `frustration.ts`        | `detectFrustration` — mood signals from recent history      |
| `engagement.ts`         | Forgotten customers, week keys, last-week summary           |
| `service-options.ts`    | Service-business status presets                             |

## System Boundaries

- `mobile/` — the Expo app: UI, routing, hooks (`useOrderForm`, `useEngagement`), local
  storage, deep-link send. Owns the daily owner experience. Calls the web AI API; never
  embeds an Anthropic key.
- `orderflow-ai/` — the Next.js app: web mirror of the flow **and** the host of all server
  logic (AI routes, auth middleware, rate limiting, cron worker, observability).
- `orderflow-ai/app/api/` — the only place server-side AI/Claude calls happen. Each route
  owns its own auth + validation + rate limit; nothing trusts the caller by default.
- `orderflow-ai/shared/` — the single source of truth for logic used by both apps, reached
  via the `@shared/*` alias. Each app re-exports from here (`mobile/lib/engagement.ts`,
  `orderflow-ai/lib/engagement-utils.ts`, etc.). Logic that both apps need lives here, not
  duplicated. It sits **inside** `orderflow-ai/` (not at the repo root) so that Vercel — whose
  project root is `orderflow-ai/` — uploads and builds it; mobile reaches into it via Metro
  `watchFolders` + a tsconfig path. See the deploy-blocker note in `progress-tracker.md`.
- Supabase — managed auth + Postgres. Owns identity, the business profile, message history,
  and server-written usage/audit logs. Access is enforced by RLS, not app code.

## Storage Model

- **On-device (AsyncStorage on mobile, localStorage on web)**: all order data — profile
  cache, recent messages (last 30), note history, draft form, session stats (total sent,
  milestones, last open, weekly-report key), guest state. This is the source of truth for
  the day-to-day flow.
- **Supabase (Postgres)**: `profiles` (business info), `recent_messages` (synced history),
  `usage_logs` (server-written AI token usage), `audit_logs` (server-written security
  events), `notification_jobs` (future server-side delivery queue). Each table is RLS-scoped
  to the owner. Schema in `mobile/supabase/schema.sql`.
- **Upstash Redis**: ephemeral rate-limit counters only (no business data).

## Auth and Access Model

- Every user signs in via Supabase (email + password) or starts an **anonymous guest**
  session; guests are routed to setup and gently gated after sending.
- Identity is a Supabase JWT. Page routes are gated server-side by `middleware.ts`
  (`supabase.auth.getUser()`); API routes verify `Authorization: Bearer <JWT>` independently.
- Every profile has a **single owner** — there are no teams or shared accounts.
- Access control is enforced at the database via **RLS**: every policy is scoped to
  `auth.uid()`. App code does not hand-roll ownership checks for data reads.
- The Supabase **service-role** key is server-only (`lib/supabase-admin.ts`, lazy proxy) and
  is never shipped to the browser.

## Invariants

1. The Anthropic API key is server-only and never reaches the client — all Claude calls go
   through `orderflow-ai/app/api/*`. Never add a `NEXT_PUBLIC_`/`EXPO_PUBLIC_` AI key.
2. Every AI API route runs in this fixed order before doing work: **validate auth (Bearer
   JWT) → validate input (Zod) → enforce rate limit (Upstash) → call Claude**. No shortcut.
3. The rate limiter **fails closed in production**: if Upstash env vars are missing, the API
   blocks all requests rather than allowing unlimited calls.
4. OrderPing does not send messages itself — it only builds deep links (`wa.me/27…`, `sms:`,
   `mailto:`) and hands off to the device's apps. Do not add in-app sending without an
   explicit decision (see `notification_jobs` groundwork).
5. Shared logic lives in `orderflow-ai/shared/` (imported as `@shared/*`) and is re-exported
   by both apps; do not fork or duplicate it. It must stay inside `orderflow-ai/` so Vercel
   deploys it — do not move it back to the repo root.
6. Database access is RLS-scoped to the owner; the service-role client never touches the
   client bundle.
7. CORS is an explicit allowlist (`orderping.net`, `www.orderping.net`, localhost in dev) —
   no wildcard `*`.
