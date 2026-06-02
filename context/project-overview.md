# OrderPing

## Overview

OrderPing is a tool for South-African small business owners that turns a customer order
update into a professional WhatsApp, SMS, or Email message in about five seconds. The owner
types (or pastes) a customer's name and phone number, taps an order status, and AI writes a
warm, on-brand message — the app already knows the business name, hours, couriers, and
delivery times. It exists as a primary **mobile app** (Expo / React Native) and a matching
**web app** (Next.js), where the web app also hosts the shared AI API. The goal is to remove
the friction that stops busy owners from keeping customers informed.

## Goals

1. Let an owner send a professional, on-brand order update in under 5 seconds, from name +
   status to a sent message.
2. Keep all order data private and on-device (AsyncStorage / localStorage); only the business
   profile and message history sync to Supabase.
3. Nudge owners to stay engaged — surface forgotten customers, milestones, weekly summaries,
   and frustration signals so no customer is left without an update.

## Core User Flow

1. User signs in (email + password) or continues as a guest (anonymous Supabase session).
2. First-time users complete a business profile (name, phone, pickup address, hours, type).
3. On the main screen, the user pastes raw order text and taps **Extract Details** (AI fills
   in name, phone, email, items).
4. User confirms customer name + phone (+ optional email).
5. User taps an order **status** (product or service business statuses).
6. User picks a **status note** (preset, recent custom, or write-your-own); for dispatch,
   also a courier + optional waybill.
7. User picks a **tone** (Friendly / Professional / Apologetic / Reassuring — auto-set by
   status) and taps **Generate Message** (AI).
8. User edits the message in a textarea (with character count) and sends via **WhatsApp /
   SMS / Email / Copy**.
9. The entry is saved to the recent list; engagement cards update (count, milestones, etc.).

## Features

### Core Flow

- Customer name, phone, optional email.
- Status set for product businesses (Received, Delay, Dispatching, Ready for Pickup,
  Pre-order) and service businesses.
- Per-status note picker: presets + last custom notes + write-your-own.
- Courier picker (The Courier Guy, Pep, PostNet, Other) + optional waybill, for dispatch.
- Tone selector, auto-set by status.
- AI message generation, editable message, character count (160/segment for SMS).
- Four send channels: WhatsApp, SMS, Email, Copy.

### Recent List

- Last 30 entries, newest first; filter by status; search by name or phone.
- Tap to expand: full message + resend via any channel; "use this contact" pre-fills the form.
- Clear history.

### Engagement

- Stats: "customers informed today" (resets daily).
- Milestone confetti at 10 / 50 / 100 lifetime messages.
- Forgotten-customer reminders (pending status not updated in 24h+).
- Weekly report card (every Monday) and welcome-back card (after 48h+ away).
- Frustration detection from recent history → auto-suggests Apologetic tone.

### Business Profile

- Business name, phone, pickup address, hours, type (product / service), description.
- Synced to Supabase on save; fetched on login.

### AI

- `extract-order` (pull structured details from pasted text) and `generate-message`
  (write the update), both backed by Anthropic Claude, hosted in the web app.

## Scope

### In Scope

- Composing and AI-generating order-update messages.
- Handing the message off to the device's WhatsApp / SMS / Email app via deep links.
- Local-first storage of order data with Supabase sync for profile + history.
- Engagement and retention surfaces (stats, reminders, reports, frustration).

### Out of Scope

- Sending messages *from inside* the app — OrderPing only builds deep links and hands off
  to the device's messaging apps. (The `notification_jobs` table + cron worker are
  groundwork for possible future server-side sending, not a current feature.)
- Payments, inventory, or order management beyond status updates.
- Multi-user / team accounts — each profile has a single owner.
- Light/dark theming — the product is light-theme only.

## Success Criteria

1. A signed-in (or guest) user can go from pasted order text to a sent WhatsApp/SMS/Email
   update in a single screen without leaving the flow.
2. Order data never leaves the device except as profile + message-history rows in Supabase,
   each scoped to the owner by RLS.
3. AI endpoints reject unauthenticated, malformed, or over-rate requests before doing any
   work, and never expose the Anthropic key to the client.
