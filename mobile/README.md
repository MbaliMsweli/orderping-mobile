# OrderPing — Mobile App

React Native / Expo app for sending professional order update messages to customers in seconds. Pick a status, tap Generate, send via WhatsApp or SMS — done in 5 seconds.

---

## What it does

1. Paste an order → AI extracts the customer's name and phone number
2. Pick a status: Received / Delayed / Dispatched / Ready / Pre-order
3. Add a note, choose a tone, pick your courier and waybill number
4. Hit Generate — AI writes a professional message using your business name
5. Send via WhatsApp, SMS, Email, or copy to clipboard

---

## Features

- **AI message generation** — powered by Claude, personalised with your business name, courier, and delivery times
- **Order paste & extraction** — paste raw order text and auto-fill customer details
- **5 order statuses** — Received, Delayed, Dispatched, Ready for Pickup, Pre-order
- **Status note picker** — preset options + last 3 custom notes + write your own
- **Courier picker** — The Courier Guy, Pep, PostNet, or custom with waybill field
- **Tone selector** — Friendly / Professional / Apologetic (auto-set by status)
- **4 send channels** — WhatsApp, SMS, Email, Copy
- **Recent messages** — last 30 entries with search, status filters, and one-tap resend
- **Stats card** — messages sent today
- **Milestone confetti** — fires at 10, 50, 100 messages sent
- **Reminder card** — flags customers with pending statuses not updated in 24h+
- **Weekly report card** — Mondays: last week's updates, unique customers, best day
- **Welcome back card** — appears after 48h+ away, shows pending customers
- **Business profile** — synced to Supabase, persists across reinstalls

---

## Tech stack

| What | Tool |
|---|---|
| Framework | Expo SDK 54, React Native 0.81 |
| Routing | expo-router v6 |
| Auth + DB | Supabase |
| Storage | AsyncStorage |
| AI | Anthropic Claude via orderping.net API |
| Language | TypeScript |

---

## Project structure

```
mobile/
├── app/
│   ├── _layout.tsx              # Root stack layout
│   ├── index.tsx                # Entry: checks auth → routes to screens
│   ├── (auth)/index.tsx         # Sign in / Sign up
│   ├── (setup)/index.tsx        # Business profile setup
│   └── (main)/index.tsx         # Core flow — everything done daily
├── components/
│   ├── Confetti.tsx             # Milestone celebration animation
│   └── StatusNotePicker.tsx     # Note picker with presets + history
├── constants/
│   └── colors.ts                # Design tokens
└── lib/
    ├── storage.ts               # AsyncStorage helpers
    ├── supabase.ts              # Supabase client
    └── deep-links.ts            # WhatsApp / SMS / Email URL builders
```

---

## Running locally

```bash
npm install
```

Create `mobile/.env.local`:

```
EXPO_PUBLIC_SUPABASE_URL=
EXPO_PUBLIC_SUPABASE_ANON_KEY=
EXPO_PUBLIC_API_URL=https://www.orderping.net
```

Start the dev server (from the `mobile/` directory):

```bash
npx expo start --host lan --port 8081
```

Scan the QR code with **Expo Go** on your phone. Phone and PC must be on the same Wi-Fi network.

> **Note:** `metro.config.js` sets `maxWorkers: 1` for low-RAM machines. Remove that line if you have 8GB+ RAM for faster builds.

---

## Related

**Web app** → [github.com/MbaliMsweli/orderping](https://github.com/MbaliMsweli/orderping) — Next.js app hosted on Vercel, provides the AI API
