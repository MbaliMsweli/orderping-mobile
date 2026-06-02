# Progress Tracker

Update this file after every meaningful implementation change.

## Current Phase

- In progress — working on the `rebuild` branch.

## Current Goal

- Establish the `context/` spec files as the source of truth, then continue hardening the
  rebuilt app (engagement features, observability, web-app deploy story).

## Completed

- **v1 refactor**: stripped to a localStorage/AsyncStorage-first model; web app reduced to a
  single AI route surface; UI broken into ~11 focused components.
- **Shared folder**: extracted duplicated logic into a `shared/` folder (`types`, `format`,
  `frustration`, `engagement`, `service-options`), re-exported by both apps via `@shared/*`.
  Later relocated from the repo root into `orderflow-ai/shared/` to fix the Vercel deploy
  blocker (see Architecture Decisions).
- **Mobile refactor**: pure helpers, `useOrderForm` + `useEngagement` hooks, and JSX
  extracted from the old single-file `(main)` screen; 4 correctness bugs fixed post-refactor.
- **Security audit**: API Bearer-JWT auth, Zod validation, prompt-injection hardening,
  error sanitization, Upstash rate limiting (fail-closed in prod), CORS allowlist, security
  headers/CSP, Next.js 15 upgrade.
- **Observability**: Sentry (client/server/edge), PostHog (mobile + web), structured JSON
  logger; `usage_logs` + `audit_logs` tables.
- **Engagement**: frustration detection, weekly report, welcome-back, forgotten-customer
  reminders, milestone confetti, stats bar.
- **Service businesses**: service-type statuses added alongside product statuses.
- **Worker groundwork**: `notification_jobs` table + daily Vercel cron
  (`/api/worker/process-jobs`) with retry/backoff (delivery providers stubbed).

## In Progress

- Authoring/maintaining the `context/` spec files (this set).

## Next Up

- Push `rebuild` and confirm the next Vercel git deploy of `orderflow-ai` succeeds end to end
  (the `@shared` resolution that previously failed should now build remotely).

## Open Questions

- Should server-side message delivery (the `notification_jobs` worker) ship, or stay as
  deep-link-only? Providers are currently stubbed.

## Architecture Decisions

- **Local-first storage**: order data stays on-device; Supabase holds only profile, synced
  history, and server-written logs — chosen to keep customer data private and the daily flow
  fast/offline-tolerant.
- **Shared logic in `orderflow-ai/shared/`**: single source of truth for cross-app code to
  avoid mobile/web drift. Originally at the repo root, which broke Vercel (project root is
  `orderflow-ai/`, so `../shared` was never uploaded). **Resolved** by relocating it inside
  `orderflow-ai/` (`@shared/* → ./shared/*`); mobile reaches in via Metro `watchFolders` +
  tsconfig. No duplicated copy, no Vercel dashboard change needed.
- **Fail-closed rate limiting**: in production the API blocks if Upstash is misconfigured,
  preferring availability loss over unbounded Claude spend/abuse.
- **No in-app sending**: deep links hand off to the device's WhatsApp/SMS/Email apps;
  `notification_jobs` is groundwork only, not a committed feature.

## Session Notes

- Two apps in one workspace: `mobile/` (Expo, primary) and `orderflow-ai/` (Next.js, hosts
  the AI API). Dev machine is low-RAM (4GB) — `metro.config.js` keeps `maxWorkers: 1`.
- Typecheck/build gates: `cd mobile && npx tsc --noEmit`; `cd orderflow-ai && npm run build`.
- Expo dev server must be started with the explicit WiFi host (see `CLAUDE.md` gotchas).
