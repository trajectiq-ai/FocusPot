# Task P2-b — Company Admin full management

## What was built
Full CRUD management features for the Company Admin dashboard:
- New **Employees** tab (directory CRUD with Privacy Shield)
- New **Settings** tab (join code, company info, billing, danger zone)
- Enhanced **Teams** tab (create/edit/delete on top of existing anonymous analytics)
- Enhanced **Challenge** tab (delete completed challenges)
- Wired **Notifications** menu (mark-all-read + per-notification mark-read via API)
- Updated orchestrator with two new tabs + onMarkRead wiring

## Files created
1. `src/components/focuspot/admin/employees-tab.tsx`
2. `src/components/focuspot/admin/settings-tab.tsx`

## Files modified
1. `src/components/focuspot/admin/types.ts` — TabKey + new types
2. `src/components/focuspot/admin/teams-tab.tsx` — added CRUD
3. `src/components/focuspot/admin/challenge-tab.tsx` — added delete
4. `src/components/focuspot/admin/notifications-menu.tsx` — wired API
5. `src/components/focuspot/company-admin-dashboard.tsx` — added 2 tabs + onMarkRead

## Key features
- **PRIVACY SHIELD**: employee directory shows directory info only (name, email, title, team, role, active, joined) — NEVER focus data. Lock icon + "Directory only" note prominent.
- **One-time temp password reveal**: dedicated success Dialog with copy buttons for email + password + security warning. Uses `key` prop to remount cleanly (avoids setState-in-effect lint).
- **Join code**: emerald-bordered card with large monospace display, copy button, regenerate flow with AlertDialog confirm.
- **Confirm dialogs** for all destructive actions (remove employee, delete team, delete challenge, regenerate code).
- **Mobile-first**: table on desktop, card list on mobile for employees.
- **Self-row protection**: admin can't remove/deactivate/change-team themselves, only edit name/title.
- **All mutations trigger `onRefresh()`** to keep dashboard aggregates in sync.

## API contracts used
- GET/POST `/api/admin/employees` (tempPassword returned once on POST)
- PATCH/DELETE `/api/admin/employees/[id]`
- GET/POST `/api/admin/teams`
- PATCH/DELETE `/api/admin/teams/[id]`
- GET/PATCH/POST `/api/admin/company` (POST = regenerate join code)
- DELETE `/api/admin/challenges/[id]`
- POST `/api/notifications/read-all`
- PATCH `/api/notifications/[id]/read`

## Verification
- `bun run lint` → 0 errors
- `npx tsc --noEmit` → 0 errors in src/ (pre-existing errors in examples/ and skills/ only)
- Dev server compiles all my files cleanly

## Pre-existing issue flagged (NOT my scope)
The dev server has a stale in-memory Prisma Client from before Task P1 added the `active` and `title` columns to the User model. Until the dev server is restarted, `/api/auth/login` returns 403 "deactivated" (because `user.active` is undefined in the stale client) and `/api/admin/dashboard` returns 500 ("Unknown field `title`"). My code is verified correct via lint + tsc and will work once the dev server picks up the regenerated Prisma Client.

## Did NOT modify
- Any API route
- prisma/schema.prisma
- src/lib/* (db.ts, auth.ts, password.ts, store.ts, colors.ts)
- src/components/focuspot/shared/app-shell.tsx
- src/components/focuspot/employee/* or super/*
- src/app/page.tsx
