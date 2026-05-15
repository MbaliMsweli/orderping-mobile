# OrderPing — Web App

Send professional order update messages to customers in seconds. Type a name and phone number, pick a status, and send via WhatsApp, SMS, or Email — the AI writes the message for you.

Live at **[orderping.net](https://www.orderping.net)**

---

## What it does

Small business owners send order updates constantly. OrderPing removes the friction:

1. Paste an order → AI extracts the customer's name, phone, and items
2. Pick a status: Received / Delayed / Dispatched / Ready / Pre-order
3. Add a note, choose a tone, pick your courier
4. Hit Generate — AI writes a professional message using your business name
5. Send via WhatsApp, SMS, Email, or copy to clipboard

---

## Features

- **AI message generation** — powered by Claude (Anthropic), personalised with your business name, courier, and delivery times
- **Order paste & extraction** — paste raw order text and auto-fill customer details
- **5 order statuses** — Received, Delayed, Dispatched, Ready for Pickup, Pre-order
- **Courier picker** — The Courier Guy, Pep, PostNet, or custom; auto-fills delivery times
- **Tone selector** — Friendly / Professional / Apologetic (auto-set by status)
- **4 send channels** — WhatsApp, SMS, Email, Copy
- **Recent messages** — last 30 entries with search, status filters, and one-tap resend
- **Stats card** — messages sent today
- **Milestone confetti** — fires at 10, 25, 50, 100+ messages sent
- **Reminder card** — flags customers with pending statuses not updated in 24h+
- **Weekly report card** — Mondays: last week's updates, unique customers, best day
- **Welcome back card** — appears after 48h+ away, shows pending customers
- **Business profile** — stored in Supabase, synced across devices

---

## Tech stack

| What | Tool |
|---|---|
| Framework | Next.js 14, React 19 |
| AI | Anthropic Claude API |
| Auth + DB | Supabase |
| Hosting | Vercel |
| Language | TypeScript |

---

## Project structure

```
orderflow-ai/
├── app/
│   ├── page.tsx              # Main order flow
│   ├── auth/page.tsx         # Sign in / Sign up
│   ├── setup/page.tsx        # Business profile setup
│   └── api/
│       ├── generate-message/ # AI message generation
│       └── extract-order/    # AI order detail extraction
├── components/               # UI components
└── lib/
    ├── storage.ts            # localStorage helpers
    ├── supabase.ts           # Supabase client
    └── deep-links.ts         # WhatsApp / SMS / Email URL builders
```

---

## Running locally

```bash
npm install
cp .env.example .env.local   # add your keys
npm run dev
```

Required environment variables:

```
ANTHROPIC_API_KEY=
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
```

---

## Related

**Mobile app** → [github.com/MbaliMsweli/orderping-mobile](https://github.com/MbaliMsweli/orderping-mobile) — React Native / Expo app, calls this app's AI API
