# AI Workflow Rules

## Approach

Build OrderPing incrementally using a spec-driven workflow. The files in `context/` define
what to build (`project-overview.md`), how the system is shaped (`architecture.md`), the
coding standards (`code-standards.md`), the visual language (`ui-context.md`), and the
current state (`progress-tracker.md`). Always implement against these specs — do not infer or
invent product behavior from scratch. OrderPing is two apps (`mobile/` Expo + `orderflow-ai/`
Next.js) sharing logic in `orderflow-ai/shared/` (imported as `@shared/*`); respect those
boundaries at every step.

## Scoping Rules

- Work on one feature unit at a time, within one boundary (mobile, web, the API, or shared).
- Prefer small, verifiable increments over large speculative changes.
- Do not combine unrelated system boundaries in a single implementation step.

## When to Split Work

Split an implementation step if it combines:

- Mobile UI changes and web UI changes in one go (they are separate apps).
- Client UI changes and API-route / background-worker changes.
- Multiple unrelated API routes, or shared-logic changes bundled with app-specific UI.
- Behavior not clearly defined in the context files.

If a change cannot be verified end to end quickly, the scope is too broad — split it.

## Handling Missing Requirements

- Do not invent product behavior not defined in the context files.
- If a requirement is ambiguous, resolve it in the relevant context file before implementing.
- If a requirement is missing, add it as an open question in `progress-tracker.md` before
  continuing.

## Protected Files

Do not modify the following unless explicitly instructed:

- `orderflow-ai/shared/*` (imported as `@shared/*`) — consumed by both apps; a change here
  ripples to mobile and web, so treat it as a deliberate cross-app decision, not an incidental
  edit. Keep it inside `orderflow-ai/` so Vercel can deploy it (do not relocate to repo root).
- `mobile/metro.config.js` — `maxWorkers: 1` is required for the low-RAM (4GB) dev machine.
- `mobile/supabase/schema.sql` RLS policies — security-critical; change only with intent.
- Generated assets (app icons, splash) and any third-party library internals.
- Security config: `orderflow-ai/middleware.ts`, `lib/rate-limit.ts`, `lib/cors.ts`,
  `next.config.mjs` headers — edit only as an explicit security task.

## Keeping Docs in Sync

Update the relevant context file whenever implementation changes:

- System architecture, boundaries, or invariants → `architecture.md`.
- Storage model decisions → `architecture.md`.
- Code conventions or standards → `code-standards.md`.
- Visual tokens, layout, or components → `ui-context.md`.
- Feature scope → `project-overview.md`.
- Always reflect completed work and decisions in `progress-tracker.md`.

## Before Moving to the Next Unit

1. The current unit works end to end within its defined scope.
2. No invariant in `architecture.md` was violated (AI key server-only; auth → Zod →
   rate-limit order; rate limiter fails closed; no in-app sending; RLS ownership).
3. `progress-tracker.md` reflects the completed work.
4. Build/typecheck passes for the app you touched:
   - Mobile: `cd mobile && npx tsc --noEmit`
   - Web: `cd orderflow-ai && npm run build`
