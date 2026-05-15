# CLAUDE.md — OrderPing

## The App in One Sentence

A small business owner types a customer's name and phone number, taps a status, and sends a professional order update via WhatsApp, SMS, or Email — in 5 seconds. The app already knows their business name and delivery times.

---

## Two Projects in This Workspace

| Project | Folder | Platform | Status |
|---|---|---|---|
| Mobile app | `mobile/` | React Native / Expo | **Active — primary** |
| Web app | `orderflow-ai/` | Next.js / Vercel | Live — hosts the AI API |

The mobile app calls the AI endpoint hosted by `orderflow-ai` (`EXPO_PUBLIC_API_URL`).

---

## Mobile App — Tech Stack

| What | Tool |
|---|---|
| Framework | Expo SDK 54, React Native 0.81.5, React 19.1 |
| Routing | expo-router v6 |
| Auth | Supabase (email + password) |
| Local storage | AsyncStorage |
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
│   └── (main)/index.tsx         # Core flow — everything the user does daily
├── components/
│   ├── Confetti.tsx             # Milestone celebration animation
│   └── StatusNotePicker.tsx     # Reusable note picker with presets + history + custom input
├── constants/
│   └── colors.ts                # Design tokens
├── lib/
│   ├── storage.ts               # AsyncStorage helpers
│   ├── supabase.ts              # Supabase client
│   └── deep-links.ts            # WhatsApp / SMS / Email URL builders
├── assets/                      # App icons and splash
├── index.ts                     # Expo entry point
├── metro.config.js              # maxWorkers: 1 (low-RAM machine)
└── app.json                     # Expo config
```

---

## App Flow

```
FIRST OPEN:
  app/index.tsx checks Supabase session
  → no session        → (auth)  sign in / sign up
  → session, no profile → (setup) business profile
  → session + profile  → (main)  core flow

EVERY TIME AFTER:
  (main)/index.tsx — one screen, top to bottom:
  1. Paste order text → Extract Details (AI)
  2. Customer name + phone + email (optional)
  3. Status: Received / Delay / Dispatching / Ready / Pre-order
  4. Status note picker (presets + history + custom)
  5. Courier picker (only for Dispatching)
  6. Waybill field (optional, only for Dispatching)
  7. Tone: Friendly / Professional / Apologetic
  8. Generate Message ✨ (calls AI)
  9. Editable message textarea + char count
  10. Send: WhatsApp | SMS | Email | Copy
  11. Clear & Start New ↻
```

---

## Features Built

### Core Flow
- Customer name, phone, email (email optional — button shows alert if empty)
- 5 statuses: **Received**, **Delay**, **Dispatching**, **Ready for Pickup**, **Pre-order**
- Status note picker per status: 3 preset options + last 3 custom notes + "Write your own"
- Courier picker: The Courier Guy (3-5 working days), Pep (7-9), PostNet (5-7), Other (type your own)
- Waybill/tracking number field (optional)
- Tone selector: Friendly / Professional / Apologetic (auto-set by status)
- AI message generation + editable textarea + character count
- 4 send channels: WhatsApp, SMS, Email, Copy

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

### Business Profile (Setup)
- Business name, phone, pickup address, business hours
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
```

## Environment Variables (orderflow-ai/.env.local)

```
ANTHROPIC_API_KEY=            # Anthropic console — never use NEXT_PUBLIC_ prefix
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
UPSTASH_REDIS_REST_URL=       # Upstash Redis — required in production for rate limiting
UPSTASH_REDIS_REST_TOKEN=     # Upstash Redis — required in production for rate limiting
```

All five must be set in Vercel → Settings → Environment Variables before deploying.
`UPSTASH_REDIS_*` are required — without them the API is blocked in production (fail-closed).

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

Both API routes require `Authorization: Bearer <supabase_access_token>` — unauthenticated requests return 401.
Input is validated with Zod before any processing.

---

## Security Architecture

### Authentication
- **Middleware** (`orderflow-ai/middleware.ts`): validates Supabase session from cookies on every page route server-side. Unauthenticated requests are redirected to `/auth`. Only `/auth` and `/auth/reset` are public.
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
- `profiles` table: RLS enabled, policies scoped to `auth.uid() = id`.
- `recent_messages` table: RLS enabled, policies scoped to `auth.uid() = user_id`. Schema in `mobile/supabase/schema.sql`.
- No service role key in codebase — anon key only.

---

## Web App — Key Files (orderflow-ai)

```
orderflow-ai/
├── app/
│   ├── api/
│   │   ├── generate-message/route.ts  # POST — AI message generation (auth + Zod + rate limit)
│   │   └── extract-order/route.ts     # POST — AI order extraction (auth + Zod + rate limit)
│   ├── auth/
│   │   ├── page.tsx                   # Sign in / Sign up
│   │   └── reset/page.tsx             # Password reset
│   ├── setup/page.tsx                 # Business profile setup
│   └── page.tsx                       # Main app (requires auth)
├── lib/
│   ├── cors.ts                        # Origin-aware CORS headers
│   ├── rate-limit.ts                  # Upstash Redis rate limiter (fail-closed)
│   ├── storage.ts                     # localStorage + Supabase sync helpers
│   ├── supabase.ts                    # Browser Supabase client (@supabase/ssr)
│   └── deep-links.ts                  # WhatsApp / SMS / Email URL builders
├── middleware.ts                      # Server-side auth gate for all page routes
└── next.config.mjs                    # Security headers (no wildcard CORS)
```

---

## Common Gotchas

- **Metro OOM**: `metro.config.js` sets `maxWorkers: 1` — required on this machine (4GB RAM)
- **Expo server**: run from `mobile/` with `npx expo start --host lan --port 8081`
- **Phone connection**: firewall rule added for ports 8081-8082 (inbound TCP). Use `--host lan` to get correct QR code IP.
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

Touches `mobile/app/(main)/index.tsx` only (all logic is in one file):

1. Add to `STATUSES` array: `{ id, label, emoji, color }`
2. Add preset options constant: `const X_OPTIONS = [{ id, icon, label }]`
3. Add state: `const [xNote, setXNote] = useState<string | null>(null)`
4. Add `setXNote(null)` inside `clearStatusNotes()`
5. Add conditional render in the status pickers section: `{status === 'x' && <StatusNotePicker ... />}`
6. Add to `handleGenerate` fetch body
7. Add tone auto-set in `handleStatusPress` if needed (apologetic: delay/pre-order, friendly: received/ready)
8. Add to `STATUS_BADGES` record for recent list display

### `/check` — Type Check (mobile)

Run TypeScript check from the mobile directory:
```
cd mobile && npx tsc --noEmit
```

---

## The Pitch

"Your customer just paid. Before they even think to ask — you've already told them it's on the way. One tap. Five seconds. Every order."
