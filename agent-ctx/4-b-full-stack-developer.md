# Task 4-b — Company Admin Dashboard (HR Manager)

## What was built
A full Company Admin dashboard at `src/components/focuspot/company-admin-dashboard.tsx`
plus helper components under `src/components/focuspot/admin/`.

## Files created
1. `src/components/focuspot/admin/types.ts` — TypeScript types mirroring
   `GET /api/admin/dashboard` response shape (DashboardData, ActiveChallenge,
   TeamStat, AdminNotification, etc.) plus a `TabKey` union.
2. `src/components/focuspot/admin/notifications-menu.tsx` — Bell icon button +
   dropdown of notifications (unread badge, "mark all read" action, type-coloured
   badges, relative timestamps via `date-fns formatDistanceToNow`).
3. `src/components/focuspot/admin/create-challenge-dialog.tsx` — Full challenge
   creation form: name, description, start/end dates (default today → +4 days),
   prize, gift card value, gift card code. POSTs to `/api/admin/challenges` and
   toasts "Challenge created! Employees notified." on success. Includes the
   Monday → Friday lifecycle hint and the gift-card-code helper text.
4. `src/components/focuspot/admin/end-challenge-dialog.tsx` — Confirm dialog
   that asks for the gift card code, POSTs to
   `/api/admin/challenges/[id]/end`, and toasts the winning team name +
   employee count.
5. `src/components/focuspot/admin/overview-tab.tsx` — Top stat cards
   (Company Focus Hours, Sessions, Active Employees, Seats Used with progress
   bar), the prominent **Privacy Shield banner** (emerald gradient, Shield icon,
   anonymous/aggregated badge, uses `privacyNote`), active challenge card with
   live countdown (days/hours/min/sec) + duration progress, recharts AreaChart
   of daily hours, and the subscription status card (plan, MRR, seats, status
   badge with ACTIVE=green / PAST_DUE=amber / CANCELED=red).
6. `src/components/focuspot/admin/challenge-tab.tsx` — Shows active challenge
   with "End Challenge Now" + "Replace with new challenge" buttons, the
   lifecycle hint banner, prize + gift card status, and an empty state when
   no challenge exists. Hosts the create + end dialogs.
7. `src/components/focuspot/admin/teams-tab.tsx` — The Privacy Shield showcase:
   header banner explaining anonymity, recharts horizontal BarChart comparing
   team total hours (coloured by team color), grid of ranked team cards (with
   👑 crown for #1, lock icon + "Anonymous team data" label on each card,
   participation rate progress bar, no individual names anywhere), and a
   detailed anonymous table with sticky header.
8. `src/components/focuspot/admin/history-tab.tsx` — Grid of completed challenge
   cards with winner team (colour dot + crown), dates, prize.
9. `src/components/focuspot/company-admin-dashboard.tsx` — Main orchestrator:
   - Wraps everything in `<AppShell nav={...}>`
   - `nav` = 4 `<NavButton>`s (Overview, Challenge, Teams, History) +
     `<NotificationsMenu>` separated by a divider
   - Sticky page sub-header with admin avatar + "Welcome back, {name}",
     company/domain subtitle, Privacy Shield badge, refresh button
   - State: `loading`, `refreshing`, `error`, `data`, `activeTab`
   - Fetches `/api/admin/dashboard` (cache: 'no-store') on mount
   - AnimatePresence tab transitions
   - Skeleton loading state, error state with retry

## Key features
- **Privacy Shield** is prominent everywhere: hero banner in Overview, header
  banner in Teams, lock icons on every team card, badge in the page sub-header,
  and the footer (already in AppShell) says "Privacy Shield active".
- NO individual employee names appear anywhere — only team-level aggregates.
- Color palette: emerald primary (focus/success), amber (challenges/leader),
  rose (destructive/end), violet (employees), sky (seats), orange (leader crown).
  No blue/indigo.
- Mobile-first responsive: grid collapses 4→2 cols, table hides secondary
  columns on small screens, sticky headers, `scrollbar-thin` on long lists.
- Subtle framer-motion animations on stat cards, tab transitions, team bars,
  and notification badge.
- recharts AreaChart (daily hours) and horizontal BarChart (team comparison)
  both wrapped in ResponsiveContainer.

## Verification
- `bun run lint`: my files produce **0 errors**. (3 errors exist but are all
  in `src/components/focuspot/employee/*` files written by the parallel
  Task 4-c agent — not in my scope.)
- `npx tsc --noEmit -p tsconfig.json`: 0 errors in my files. (Pre-existing
  TS errors in `src/app/api/admin/dashboard/route.ts` from the orchestrator's
  Task 1 are outside my scope; I did not modify API routes.)
- Dev server recompiles cleanly with "✓ Compiled" — no module-not-found
  errors for my files.

## API contracts used
- `GET  /api/admin/dashboard`           → full dashboard payload
- `POST /api/admin/challenges`          → `{ name, description, startDate, endDate, prize, giftCardValue, giftCardCode }`
- `POST /api/admin/challenges/[id]/end` → `{ giftCardCode }`

## Did NOT modify
- Any API route
- `prisma/schema.prisma`
- Any other dashboard component (employee/super-admin)
- `src/components/focuspot/shared/app-shell.tsx`
- `src/app/page.tsx`
