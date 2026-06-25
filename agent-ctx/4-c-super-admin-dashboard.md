# Task 4-c — Super Admin Dashboard (full-stack-developer)

## Scope
Build the Super Admin (platform owner) dashboard for FocusPot.

Files created (all under `src/components/focuspot/`):
- `super-admin-dashboard.tsx` (replaced stub) — main entry, tabs, data fetching, loading/error states
- `super/types.ts` — shared TS types mirroring `GET /api/super/dashboard` response
- `super/helpers.tsx` — currency/number/date formatters + PlanBadge / StatusBadge / ChallengeStatusBadge / UtilizationBar
- `super/notifications-bell.tsx` — bell icon + badge + dropdown of platform notifications
- `super/overview-tab.tsx` — MRR hero, ARR, KPI grid, revenue PieChart, revenue/companies BarChart, status breakdown row
- `super/companies-tab.tsx` — search/filter/sort toolbar + responsive table (desktop) / card grid (mobile) + View-as-Admin + Manage dropdown
- `super/activity-tab.tsx` — total focus-hours headline + recent-challenges timeline with winner callouts

## API usage
- `GET /api/super/dashboard` — primary data source for all tabs
- `PATCH /api/super/companies/[id]` body `{ subscriptionStatus, plan }` — called from Manage dropdown (Activate / Mark Past Due / Cancel / Upgrade to Growth / Downgrade to Starter). On success calls `onRefresh()` to re-fetch dashboard.
- `POST /api/super/login-as` body `{ companyId }` — called from "View as Admin" button; on success toasts then `window.location.reload()` so `page.tsx` re-routes to the Company Admin dashboard.

## Design
- Emerald primary throughout (MRR hero uses emerald→teal gradient). Accent colors: amber (Starter), violet (Growth), rose (canceled/danger), sky (info notifications). NO blue/indigo.
- MRR is the visual hero: 5xl/6xl bold on emerald gradient card spanning 2/3 width.
- Cards use `p-4`/`p-6`, gaps `gap-4`/`gap-6`, table lists scrollable with `scrollbar-thin`.
- Mobile-first: table collapses to card grid below `md`; nav tabs scroll horizontally on mobile (handled by AppShell).
- Framer Motion: staggered KPI card entrance, AnimatePresence tab transitions, timeline node reveal.
- recharts: PieChart (revenue by plan, amber+violet) + BarChart (revenue vs company count).

## Lint status
My files pass `eslint` cleanly (EXIT 0). The only project-wide lint error is in `src/components/focuspot/employee/confetti.tsx` (Task 4-a, outside this task's scope) — `react-hooks/set-state-in-effect` on line 33. Dev server compiles successfully with no module errors.

## Notes for downstream agents
- The notifications bell lives in the page header (top-right of main content) because `AppShell` does not expose a header slot. If a future agent wants to move it into the AppShell header next to the user menu, they'd need to extend `AppShell` to accept a `headerActions` prop.
- `CompaniesTab` receives an `onRefresh` callback from the parent so PATCH success triggers a silent dashboard re-fetch (no full-page loading state).
- "View as Admin" reloads the page after a 700ms delay so the success toast is visible before the route changes.
