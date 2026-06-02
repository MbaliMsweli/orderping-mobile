# Code Standards

## General

- Keep modules small and single-purpose. UI is split into focused components
  (`OrderPaste`, `CustomerInputs`, `StatusPicker`, `MessageEditor`, …) and state into hooks
  (`useOrderForm`, `useEngagement`) — keep it that way.
- Fix root causes, not symptoms. Do not layer workarounds over a broken boundary.
- Do not mix unrelated concerns in one component, hook, or route.
- Shared logic goes in `orderflow-ai/shared/` (imported as `@shared/*`) and is re-exported by
  each app — never copy-paste it between `mobile/` and `orderflow-ai/`.

## TypeScript

- TypeScript throughout, both apps. Treat type errors as build failures
  (`npx tsc --noEmit` on mobile must pass).
- Avoid `any`. Use the shared types in `shared/types.ts`; add narrow interfaces where needed.
- Validate all external input at system boundaries (API request bodies, pasted order text,
  AI responses) before trusting it — Zod on the server, explicit parsing for AI JSON.

## Next.js (web — `orderflow-ai/`)

- App Router. Default to server components; add `'use client'` only where browser
  interactivity requires it.
- Keep route handlers focused: one responsibility per route under `app/api/`.
- Page routes are protected by `middleware.ts`; do not assume an API caller is authed —
  every API route re-verifies the Bearer JWT itself.
- Long-running / retryable work belongs in the cron worker
  (`app/api/worker/process-jobs`), not in request handlers.

## React Native (mobile — `mobile/`)

- expo-router file-based routing; keep the `(auth)` / `(setup)` / `(main)` boundaries clean.
- Screen state lives in hooks (`useOrderForm`, `useEngagement`), not sprinkled through JSX.
- Persist via `lib/storage.ts` helpers — do not call AsyncStorage keys directly from screens.

## Styling

- Use design tokens — no hardcoded hex values.
  - Web: CSS custom properties from `orderflow-ai/app/globals.css` (`var(--primary)`,
    `var(--surface)`, `var(--text)`, status/channel tokens…).
  - Mobile: the `Colors` constant in `mobile/constants/colors.ts`.
- Follow the radius scale (`--radius-sm` … `--radius-2xl`, `--radius-full`) and spacing
  scale (`--space-1` … `--space-12`) defined in `ui-context.md` / `globals.css`.
- Fonts via tokens: `--font-display` (Sora) for headings, `--font-body` (DM Sans) for text.

## API Routes

- Validate and parse the request body with Zod **before any logic runs**; reject with a
  clear status on failure.
- Enforce auth (Bearer JWT → `supabase.auth.getUser()`) and then rate limit (Upstash) before
  calling Claude or touching data.
- Return consistent shapes: `{ message: string }` / `{ name, phone, email, items }` on
  success; sanitized errors with appropriate status codes (401, 429, 4xx/5xx) — never leak
  internal details or the Anthropic key.
- Wrap user-supplied text in delimiters in prompts and instruct the model to ignore embedded
  directives (prompt-injection hardening).
- Log via `lib/logger.ts` (structured JSON; errors routed to Sentry in prod); record AI
  usage to `usage_logs` fire-and-forget.

## Data and Storage

- Order data is local-first (AsyncStorage / localStorage) — that is the working source of
  truth for the daily flow.
- Supabase holds the business profile, synced message history, and server-written
  usage/audit logs; every table is RLS-scoped to the owner.
- The service-role Supabase client (`lib/supabase-admin.ts`) is server-only — never import
  it into client code.
- Rate-limit/ephemeral state goes in Upstash Redis, not Postgres.

## File Organization

- `mobile/app/` — expo-router screens and route-group layouts.
- `mobile/components/` — presentational RN components; `mobile/hooks/` — screen state;
  `mobile/lib/` — storage, supabase, deep-links, analytics, shared re-exports;
  `mobile/constants/colors.ts` — design tokens.
- `orderflow-ai/app/` — pages, layouts, error boundaries, and `api/` route handlers.
- `orderflow-ai/components/` — web UI (engagement cards, form pieces);
  `orderflow-ai/lib/` — cors, rate-limit, storage, supabase, supabase-admin, logger, posthog,
  deep-links, shared re-exports.
- `orderflow-ai/shared/` (imported as `@shared/*`) — cross-app logic (types, format,
  frustration, engagement, service-options); the single source of truth for anything both
  apps use. Lives inside the web app so Vercel deploys it; mobile reaches in via Metro.
