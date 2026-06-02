# CLAUDE.md — OrderPing

## The App in One Sentence

A small business owner types a customer's name and phone number, taps a status, and sends a professional order update via WhatsApp, SMS, or Email — in 5 seconds. The app already knows their business name and delivery times.

---

## Two Projects in This Workspace

| Project | Folder | Platform | Status |
|---|---|---|---|
| Mobile app | `mobile/` | React Native / Expo | **Active — primary** |
| Web app | `orderflow-ai/` | Next.js / Vercel | Live — hosts the AI API |
| Shared logic | `orderflow-ai/shared/` | Plain TypeScript | Re-exported by both apps (lives inside the web app so Vercel deploys it) |

The mobile app calls the AI endpoint hosted by `orderflow-ai` (`EXPO_PUBLIC_API_URL`).

> Full spec docs live in [`context/`](context/) — `project-overview.md`, `architecture.md`,
> `code-standards.md`, `ui-context.md`, `ai-workflow-rules.md`, `progress-tracker.md`.

---

## Mobile App — Tech Stack

| What | Tool |
|---|---|
| Framework | Expo SDK 54, React Native 0.81.5, React 19.1 (New Architecture on) |
| Routing | expo-router v6 |
| Auth | Supabase (email + password, plus anonymous "guest" sessions) |
| Local storage | AsyncStorage |
| Analytics | PostHog (`posthog-react-native`) — disabled in dev |
| AI | Anthropic API via `orderflow-ai` endpoint |
| Language | TypeScript |

---

## Mobile App — Project Structure

```
mobile/
├── app/
│   ├── _layout.tsx              # Root stack layout
│   ├── index.tsx                # Entry: checks auth → routes to (auth)/(setup)/(main)
│   ├── (auth)/index.tsx         # Sign in / Sign up
│   ├── (setup)/index.tsx        # Business profile setup (first time)
│   └── (main)/index.tsx         # Core flow — composes hooks + components below
├── components/
│   ├── Confetti.tsx             # Milestone celebration animation
│   ├── OrderPaste.tsx           # Paste order text → Extract Details
│   ├── CustomerInputs.tsx       # Name / phone / email fields
│   ├── StatusPicker.tsx         # Status selector
│   ├── StatusNotePicker.tsx     # Note picker: presets + history + custom
│   ├── MessageEditor.tsx        # Editable message + send buttons
│   ├── RecentList.tsx           # Recent list with filter/search/expand
│   └── EngagementCards.tsx      # Stats, reminders, weekly, welcome-back, frustration
├── hooks/
│   ├── useOrderForm.ts          # Composer state + debounced draft auto-save
│   └── useEngagement.ts         # Stats, milestones, recent list, frustration, guest mode
├── constants/
│   └── colors.ts                # Design tokens
├── lib/
│   ├── storage.ts               # AsyncStorage + Supabase sync helpers
│   ├── supabase.ts              # Supabase client (anon key, AsyncStorage sessions)
│   ├── deep-links.ts            # WhatsApp / SMS / Email URL builders
│   ├── analytics.ts             # PostHog: identify / capture / reset
│   ├── status-config.ts         # Status presets, couriers, badges, filters
│   ├── format.ts                # Greeting + re-export of @shared/format
│   ├── engagement.ts            # Re-export of @shared/engagement
│   └── frustration.ts           # Re-export of @shared/frustration
├── supabase/schema.sql          # DB schema + RLS for all tables
├── assets/                      # App icons and splash
├── index.ts                     # Expo entry point
├── metro.config.js              # maxWorkers: 1 (low-RAM machine)
└── app.json                     # Expo config
```

> Logic that was once all in `(main)/index.tsx` now lives in `hooks/` (state) and
> `components/` (UI), with shared, cross-app logic in `orderflow-ai/shared/` (re-exported by
> both apps via the `@shared/*` alias; it lives under the web app so Vercel can deploy it).

---

## App Flow

```
FIRST OPEN:
  app/index.tsx checks Supabase session (+ cached profile, in parallel)
  → no user                  → (auth)  sign in / sign up / continue as guest
  → user, no profile (guest) → (setup) business profile
  → user, no profile (auth)  → fetch from Supabase → (main) or (setup)
  → user + profile           → (main)  core flow

EVERY TIME AFTER:
  (main)/index.tsx — one screen, top to bottom:
  1. Paste order text → Extract Details (AI)
  2. Customer name + phone + email (optional)
  3. Status — product or service set (see Features)
  4. Status note picker (presets + history + custom)
  5. Courier picker (only for Dispatching)
  6. Waybill field (optional, only for Dispatching)
  7. Tone: Friendly / Professional / Apologetic / Reassuring (auto-set by status)
  8. Generate Message ✨ (calls AI)
  9. Editable message textarea + char count
  10. Send: WhatsApp | SMS | Email | Copy
  11. Clear & Start New ↻
```

---

## Features Built

### Core Flow
- Customer name, phone, email (email optional — button shows alert if empty)
- Business type chosen at setup (**product** or **service**) drives which status set shows
- Product statuses: **Received**, **Delay**, **Dispatching**, **Ready for Pickup**, **Pre-order**
- Service statuses: separate presets from `@shared/service-options` (e.g. booking/appointment flow)
- Status note picker per status: preset options + last custom notes + "Write your own"
- Courier picker: The Courier Guy (3-5 working days), Pep (7-9), PostNet (5-7), Other (type your own)
- Waybill/tracking number field (optional)
- Tone selector: Friendly / Professional / Apologetic / Reassuring (auto-set by status)
- AI message generation + editable textarea + character count
- 4 send channels: WhatsApp, SMS, Email, Copy
- **Guest mode**: anonymous users can try the flow; gently gated after sending

### Recent List
- Last 30 entries, sorted newest first
- Filter by status
- Search by name or phone number
- Tap to expand in-place: see full message, resend via any channel
- "Use this contact" → pre-fills name + phone in main form
- Clear history

### Engagement Features
- **Stats card**: "sent today" — count resets each day
- **Milestone confetti**: fires at 10 / 50 / 100 total messages sent (tracked silently)
- **Reminder card**: shows last customer updated + anyone with a pending status (Received/Delay/Pre-order) not updated in 24h+. Tap to pre-fill their details.
- **Weekly report card**: appears every Monday — last week's update count, unique customers, best day. Dismiss with ✕.
- **Welcome back card**: appears if app not opened in 48h+ — greets by name, shows how many days away, flags pending customers.
- **Frustration card**: `detectFrustration` (`@shared/frustration`) reads recent history for repeat-contact / delay signals and surfaces a high/medium alert that auto-suggests the Apologetic tone.

### Business Profile (Setup)
- Business name, phone, pickup address, business hours
- Business **type** (product / service) and optional description — drives the status set
- Synced to Supabase on save; fetched on login

---

## AsyncStorage Keys

| Key | What it stores |
|---|---|
| `orderping_profile` | BusinessProfile object |
| `orderping_recent` | Array of last 30 RecentEntry objects |
| `orderping_note_history` | Custom note history per status key |
| `orderping_total_sent` | Lifetime message count (milestone tracking) |
| `orderping_last_milestone` | Last milestone hit (10/50/100) |
| `orderping_last_open` | Timestamp of last app open (welcome back card) |
| `orderping_week_report` | Week key of last dismissed weekly report |

Additional keys exist for the debounced **draft** auto-save, **last-used courier**, and
**guest-mode** state — see `mobile/lib/storage.ts` for the authoritative list.

---

## RecentEntry Shape

```typescript
{
  customerName: string;
  phoneNumber:  string;
  email?:       string;
  status:       string;
  delayReason?: string | null;
  courier?:     string | null;
  channel:      'whatsapp' | 'sms' | 'email' | 'copy';
  message:      string;
  timestamp:    string; // ISO
}
```

---

## Environment Variables (mobile/.env.local)

```
EXPO_PUBLIC_SUPABASE_URL=
EXPO_PUBLIC_SUPABASE_ANON_KEY=
EXPO_PUBLIC_API_URL=          # Base URL of the orderflow-ai Vercel deployment
EXPO_PUBLIC_POSTHOG_KEY=      # PostHog project key (analytics; disabled in dev)
EXPO_PUBLIC_POSTHOG_HOST=     # optional — defaults to https://app.posthog.com
```

## Environment Variables (orderflow-ai/.env.local)

```
ANTHROPIC_API_KEY=            # Anthropic console — never use NEXT_PUBLIC_ prefix
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=    # server-only (supabase-admin) — never expose to client
UPSTASH_REDIS_REST_URL=       # Upstash Redis — required in production for rate limiting
UPSTASH_REDIS_REST_TOKEN=     # Upstash Redis — required in production for rate limiting
CRON_SECRET=                  # guards /api/worker/process-jobs
NEXT_PUBLIC_SENTRY_DSN=       # Sentry error tracking
SENTRY_ORG=                   # source-map upload (CI/prod only)
SENTRY_PROJECT=               # source-map upload (CI/prod only)
NEXT_PUBLIC_POSTHOG_KEY=      # PostHog project key
NEXT_PUBLIC_POSTHOG_HOST=     # optional — PostHog host
```

The Supabase + Anthropic + Upstash vars must be set in Vercel → Settings → Environment
Variables before deploying. `UPSTASH_REDIS_*` are required — without them the API is blocked
in production (fail-closed). Sentry/PostHog vars are optional but enable observability.

---

## Deep Links

```
WhatsApp: https://wa.me/27XXXXXXXXX?text={encoded}   — strip leading 0, prepend 27
SMS iOS:  sms:NUMBER&body={encoded}                   — & separator on iOS
SMS Android: sms:NUMBER?body={encoded}                — ? separator on Android
Email:    mailto:EMAIL?subject=...&body={encoded}
```

---

## Hardcoded Couriers (mobile)

Couriers are no longer managed in settings — they are hardcoded in `(main)/index.tsx`:

```typescript
const COURIERS = [
  { name: 'The Courier Guy', deliveryTime: '3-5 working days' },
  { name: 'Pep',             deliveryTime: '7-9 working days' },
  { name: 'PostNet',         deliveryTime: '5-7 working days' },
];
```

"Other" lets the user type a custom courier name — included in the generated message.

---

## AI API Route (hosted in orderflow-ai)

### `POST /api/generate-message`

```json
{
  "customerName":        "Thandi",
  "status":              "dispatched",
  "tone":                "friendly",
  "businessName":        "African Butter Essential Oils",
  "courierName":         "The Courier Guy",
  "courierDeliveryTime": "3-5 working days",
  "waybillNumber":       "RAM1234567",
  "delayReason":         null,
  "receivedNote":        null,
  "dispatchDate":        null,
  "readyNote":           null,
  "preOrderNote":        null
}
```

Response: `{ "message": "..." }`

The body also carries `businessType` (`product` | `service`) plus service fields
(`serviceNote`, `appointmentTime`) and supports the `reassuring` tone. `POST /api/extract-order`
takes `{ "orderText": "..." }` and returns `{ name, phone, email, items }`.

Both routes run on Anthropic **`claude-sonnet-4-6`** (`max_tokens: 256`) and enforce, in order:
**Bearer JWT auth → Zod validation → Upstash rate limit → Claude**. User input is wrapped in
XML delimiters and the model is told to ignore embedded directives (prompt-injection hardening).
Usage is logged fire-and-forget to `usage_logs`.

---

## Security Architecture

### Authentication
- **Middleware** (`orderflow-ai/middleware.ts`): validates Supabase session from cookies on every page route server-side. Unauthenticated requests are redirected to `/auth`. Public routes: `/auth`, `/auth/reset`, `/privacy`. API routes are excluded from the matcher (they verify their own Bearer token).
- **API routes**: verify `Authorization: Bearer <token>` via `supabase.auth.getUser(token)` (server-validated JWT, not just local session read).

### Rate Limiting
- Upstash Redis slidingWindow — 20 requests per user per minute.
- Configured in `orderflow-ai/lib/rate-limit.ts`.
- **Fails closed in production**: if `UPSTASH_REDIS_*` env vars are missing the API blocks all requests rather than allowing unlimited calls.
- Upstash database region: `af-south-1` (Cape Town) — matches Vercel function region `cpt1`.

### CORS
- `orderflow-ai/lib/cors.ts` — origin allowlist: `orderping.net`, `www.orderping.net`, plus localhost in non-production.
- No wildcard `*`. Unrecognised origins receive no `Access-Control-Allow-Origin` header (browser blocks the request).

### Database (Supabase)
All RLS-enabled, policies scoped to the owner. Schema in `mobile/supabase/schema.sql`.

| Table | Scope | Purpose |
|---|---|---|
| `profiles` | `auth.uid() = id` | Business profile (name, phone, address, hours, type, description) |
| `recent_messages` | `auth.uid() = user_id` | Synced sent-message history |
| `usage_logs` | own rows (read) | Server-written AI token usage per endpoint |
| `audit_logs` | own rows (read) | Server-written security events (profile_updated, messages_cleared, signed_in) |
| `notification_jobs` | own rows | Future server-side delivery queue (pending→processing→sent/failed/dead) |

- The **service-role** key is used server-side only via `orderflow-ai/lib/supabase-admin.ts`
  (lazy proxy, bypasses RLS for `usage_logs`/`audit_logs` writes and the worker). It is
  **never** shipped to the client. Clients use the anon key only.

---

## Observability & Background Jobs

- **Sentry** (`@sentry/nextjs`): client/server/edge configs; `lib/logger.ts` routes
  error-level logs to Sentry in production. Source maps upload in CI/prod only.
- **PostHog**: web (`lib/posthog.tsx`, auto pageviews) and mobile (`lib/analytics.ts`).
  Both disabled in dev.
- **Cron worker** (`app/api/worker/process-jobs`): Vercel cron runs daily at 06:00 UTC
  (`vercel.json`), drains pending `notification_jobs` with retry/backoff. Guarded by
  `CRON_SECRET`. Delivery providers are currently **stubbed** — groundwork for possible
  future server-side sending, not a live feature.

---

## Web App — Key Files (orderflow-ai)

```
orderflow-ai/
├── app/
│   ├── api/
│   │   ├── generate-message/route.ts  # POST — AI message generation (auth + Zod + rate limit)
│   │   ├── extract-order/route.ts     # POST — AI order extraction (auth + Zod + rate limit)
│   │   └── worker/process-jobs/route.ts # Cron — drains notification_jobs (CRON_SECRET-gated)
│   ├── auth/{page.tsx, reset/page.tsx} # Sign in / Sign up / Password reset
│   ├── setup/page.tsx                 # Business profile setup
│   ├── privacy/page.tsx               # Privacy policy (public)
│   ├── page.tsx                       # Main app (requires auth)
│   ├── layout.tsx                     # Root layout — wires in Sentry + PostHog
│   ├── error.tsx / global-error.tsx   # Error boundaries (auto-reload on stale-chunk errors)
│   └── not-found.tsx                  # 404
├── components/                        # StatsBar, WeeklyReport, WelcomeCard, AllGoodCard,
│                                      #   FrustrationCard, form pieces
├── lib/
│   ├── cors.ts                        # Origin-aware CORS headers
│   ├── rate-limit.ts                  # Upstash Redis rate limiter (fail-closed)
│   ├── storage.ts                     # localStorage + Supabase sync helpers
│   ├── supabase.ts                    # Browser Supabase client (@supabase/ssr)
│   ├── supabase-admin.ts              # Server-only service-role client (never client-side)
│   ├── deep-links.ts                  # WhatsApp / SMS / Email URL builders
│   ├── logger.ts                      # Structured JSON logs → Sentry in prod
│   ├── posthog.tsx                    # PostHog init + pageview/event tracking
│   ├── engagement-utils.ts            # Re-export of @shared/engagement + frustration
│   └── service-options.ts             # Re-export of @shared/service-options
├── shared/                            # @shared/* — pure TS reused by BOTH apps
│                                      #   (types, format, engagement, frustration, service-options)
├── sentry.{client,server,edge}.config.ts # Sentry init per runtime
├── middleware.ts                      # Server-side auth gate for page routes
├── next.config.mjs                    # Security headers + CSP, Sentry wrapper
└── vercel.json                        # region cpt1, legacy-peer-deps, daily cron
```

---

## Common Gotchas

- **Metro OOM**: `metro.config.js` sets `maxWorkers: 1` — required on this machine (4GB RAM)
- **Expo server**: run from `mobile/` — use this exact command (forces correct WiFi IP, bypasses multi-adapter confusion):
  ```
  set REACT_NATIVE_PACKAGER_HOSTNAME=192.168.110.207 && npx expo start --port 8081
  ```
- **Phone connection**: firewall rule required for ports 8081-8082 (inbound TCP). Add it once from an admin prompt:
  ```
  netsh advfirewall firewall add rule name="Expo Metro 8081" dir=in action=allow protocol=TCP localport=8081-8082
  ```
- **Multi-adapter gotcha**: PC has two network adapters (Wi-Fi on `192.168.110.207` via "Buthelezi Wifi", hotspot on `172.20.10.11`). `--host lan` picks the wrong one. Always set `REACT_NATIVE_PACKAGER_HOSTNAME=192.168.110.207` explicitly.
- **Phone must be on "Buthelezi Wifi"** — same network as the PC.
- **iOS SMS separator**: use `&body=` not `?body=` on iOS (handled in `deep-links.ts` via `Platform.OS`)
- **WhatsApp**: `https://wa.me/27XXXXXXXXX` — no + symbol, no spaces, no leading 0
- **Email button**: always tappable — shows Alert if email field is empty
- **Waybill field**: labelled "optional" — included in message only if filled
- **Supabase auth**: used for sign in/sign up only. All order data stays in AsyncStorage (mobile) / localStorage (web).
- **Character count**: 160 chars per SMS segment
- **Rate limiter**: fails closed in production — if Upstash env vars are missing, API blocks all requests. Always set `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` in Vercel before deploying.
- **Vercel region**: functions run in `cpt1` (Cape Town, af-south-1). Upstash Redis also in af-south-1.

---

## Custom Skills

### `/add-status` — Add a New Order Status (mobile)

> Logic is no longer in a single file — it now spans `lib/status-config.ts`, the
> `useOrderForm` hook, the `StatusPicker` / `StatusNotePicker` components, and the
> `generate-message` API. The steps below describe the pattern; confirm current names in
> those files before applying.

1. Add the status + its preset options and badge to `mobile/lib/status-config.ts`
   (`STATUSES`, the per-status `*_OPTIONS`, `STATUS_BADGES`, filter labels).
2. Add the note state + its reset to `mobile/hooks/useOrderForm.ts`.
3. Render the note picker for the new status in the status-picker section
   (`{status === 'x' && <StatusNotePicker ... />}`).
4. Add the field to the `handleGenerate` fetch body and to the Zod schema +
   prompt in `orderflow-ai/app/api/generate-message/route.ts`.
5. Auto-set tone in the status-press handler if needed (apologetic: delay/pre-order;
   friendly: received/ready; reassuring where appropriate).

### `/check` — Type Check (mobile)

Run TypeScript check from the mobile directory:
```
cd mobile && npx tsc --noEmit
```

---

## The Pitch

"Your customer just paid. Before they even think to ask — you've already told them it's on the way. One tap. Five seconds. Every order."
