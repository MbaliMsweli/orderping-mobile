# UI Context

## Theme

Light only. No dark mode. The design language is a clean, friendly mobile-first workspace —
soft off-white backgrounds, white card surfaces, a single confident logo-blue accent, and
warm status/channel colors. The web app and the mobile app share the same visual language;
the web app is built to feel like the mobile app, scaling up to a two-column desktop layout.

## Colors

All components must use tokens — no hardcoded hex values. Web uses the CSS custom properties
in `orderflow-ai/app/globals.css`; mobile uses the `Colors` constant in
`mobile/constants/colors.ts`. (Brand blue differs very slightly between the two: web
`#1A6EF5`, mobile `#1A56E8` — keep using the token for each platform.)

| Role            | CSS Variable (web)     | Value     |
| --------------- | ---------------------- | --------- |
| Page background | `--background`         | `#F8F9FC` |
| Surface / card  | `--surface` / `--card` | `#FFFFFF` |
| Primary text    | `--text`               | `#1E293B` |
| Secondary text  | `--text-secondary`     | `#475569` |
| Muted text      | `--text-muted`         | `#94A3B8` |
| Primary accent  | `--primary` / `--accent` | `#1A6EF5` |
| Accent hover    | `--accent-hover`       | `#0F52C8` |
| Accent soft     | `--accent-soft`        | `#EEF4FF` |
| Border          | `--border`             | `#E2E8F0` |
| Error           | `--error`              | `#EF4444` |
| Success         | `--success`            | `#22C55E` |
| Warning         | `--warning`            | `#FBBF24` |

**Status tokens** (web): `--status-received #8B5CF6`, `--status-delay #FBBF24`,
`--status-dispatched #3B82F6`, `--status-ready #22C55E` (each with a `-bg` soft pair).
**Channel tokens**: `--channel-whatsapp #25D366`, `--channel-sms #3B82F6`,
`--channel-copy #6B7280` (email `#7C3AED` on mobile).

## Typography

| Role    | Font     | Variable         |
| ------- | -------- | ---------------- |
| Display | Sora     | `--font-display` |
| Body/UI | DM Sans  | `--font-body`    |

Web loads both from Google Fonts in `globals.css`; body uses DM Sans at 1rem / 1.6 line
height. Use the `.font-display` utility for headings.

## Border Radius

| Context             | Token           | Value      |
| ------------------- | --------------- | ---------- |
| Inline / small UI   | `--radius-sm`   | `0.375rem` |
| Inputs / buttons    | `--radius-md`   | `0.5rem`   |
| Cards               | `--radius-lg`   | `0.75rem`  |
| Panels              | `--radius-xl`   | `1rem`     |
| Large cards / modals| `--radius-2xl`  | `1.25rem`  |
| Pills / avatars     | `--radius-full` | `9999px`   |

Spacing follows `--space-1` (0.25rem) … `--space-12` (3rem). Shadows use `--shadow-xs` …
`--shadow-lg` / `--shadow-card`; focus rings use `--ring`.

## Component Library

No third-party component framework — components are hand-built. Web components live in
`orderflow-ai/components/` (e.g. `StatsBar`, `WeeklyReport`, `WelcomeCard`, `AllGoodCard`,
`FrustrationCard`, form pieces), styled with Tailwind + the CSS token variables. Mobile
components live in `mobile/components/`, styled with React Native `StyleSheet` + the `Colors`
constant.

## Layout Patterns

- **Mobile-first container**: single column, `max-width: 480px`, centered, `--space-4`
  padding (`.main-container`).
- **Tablet (≥768px)**: container widens to 740px with more padding.
- **Desktop (≥1024px)**: two-column layout — a form column (`max-width 680px`) beside a
  sticky `360px` sidebar column; the top stats/reminder cards lay out in a row.
- **Auth**: single centered card on mobile; on desktop a split panel — a gradient brand panel
  beside a `480px` form panel.
- **Setup**: centered card, `max-width` 560–640px depending on breakpoint.
- Cards stack with small gaps; surfaces use `--shadow-card`; loading uses the `.skeleton`
  shimmer and `.animate-spin`.

## Icons

lucide-react on web (stroke-based; `h-4 w-4` inline, `h-5 w-5` in buttons). Mobile uses emoji
status badges and simple custom visuals rather than an icon font.
