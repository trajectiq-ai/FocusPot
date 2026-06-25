# P2-a — Registration & Profile (full-stack-developer)

**Task ID:** P2-a
**Agent:** full-stack-developer (Registration & Profile)
**Scope:** Registration/onboarding flow (company signup + employee join) in login screen + employee profile/settings dialog + notification mark-as-read wiring

## Files Created/Modified

| File | Status | Purpose |
|------|--------|---------|
| `src/components/focuspot/employee/profile-dialog.tsx` | NEW | Profile & settings dialog (name, title, avatar color, change password) |
| `src/components/focuspot/login-screen.tsx` | MODIFIED | Tabbed Sign In / Get Started with company + employee registration forms |
| `src/components/focuspot/shared/app-shell.tsx` | MODIFIED | "Profile & Settings" menu item (EMPLOYEE only) + ProfileDialog mount |
| `src/components/focuspot/employee/notifications.tsx` | MODIFIED | Mark-all-read + click-to-mark-individual-read |

## API endpoints consumed (all built in P1)

- `POST /api/auth/register-company` — `{ companyName, domain, adminName, adminEmail, password, plan: 'STARTER'|'GROWTH' }` → user object + `company: { id, name, joinCode, plan }`
- `POST /api/auth/register-employee` — `{ joinCode, name, email, password }` → user object
- `PATCH /api/employee/profile` — `{ name?, title?, avatarColor?, currentPassword?, newPassword? }` → `{ user: {...} }`
- `POST /api/notifications/read-all` → `{ success, updated }`
- `PATCH /api/notifications/[id]/read` → `{ success }`

## Key design decisions

1. **Tabs at the top of the login card** (shadcn `Tabs`). Sign In tab is the default — preserves all existing quick-login behavior unchanged. Get Started tab swaps in a segmented HR-vs-Employee control.

2. **Plan selector as 2 large cards** (not a dropdown) — shows $99/$199 pricing, seat counts, and feature lists with emerald/violet accent dots so the value prop is immediately visible.

3. **Join code field is auto-uppercased** and styled with `font-mono uppercase tracking-wide` and placeholder `NORTHWIND-7K2M`. No team selector — backend assigns to default "General" team (kept simple per spec).

4. **ProfileDialog is controlled** (`open`/`onOpenChange`) — AppShell owns the state so the user-menu dropdown can trigger it.

5. **Avatar color picker** uses 6 gradient swatches (emerald/amber/rose/sky/violet/orange) with a check mark + ring on the active color. Live avatar preview at the top updates as the user edits.

6. **Password change is optional** — leave fields blank to keep current password. Client validates: current password required if changing, new password min 6, new === confirm.

7. **Notifications overlay pattern** — instead of syncing local state from props with `useEffect` (which would trip `react-hooks/set-state-in-effect`), I use a `readOverrides: Record<id, boolean>` overlay map. Effective read state = override ?? prop value. This keeps the prop as source of truth and avoids lint violations. Optimistic updates with rollback on API failure.

8. **setUser merge** — when profile is saved, I spread the existing user and override only the returned fields (name/email/avatarColor/role) plus stash `title` for re-open (title isn't on the SessionUser TS type but is harmless as an extra prop).

## Verification

- `npx eslint src/components/focuspot/employee/profile-dialog.tsx src/components/focuspot/login-screen.tsx src/components/focuspot/shared/app-shell.tsx src/components/focuspot/employee/notifications.tsx --max-warnings 0` → exit 0
- `npx tsc --noEmit` → 0 errors in `src/`
- `bun run lint` → 1 pre-existing error in `admin/employees-tab.tsx` (Task P2-b's territory, NOT mine)
- Dev server compiles cleanly with all changes

## Notes for downstream agents

- The `LoginScreen`'s left-side hero (pitch text + feature bullets) and footer were intentionally kept identical to preserve the polished landing experience.
- The `ProfileDialog` is only mounted for EMPLOYEE role; admins have their own settings UI in their dashboards (per task spec).
- The notifications bell now has clickable rows; if any other consumer was relying on the rows being passive `<div>`s, they'd need to update — but currently only `employee-dashboard.tsx` uses it, and it passes the same `notifications` prop with no behavior assumptions.
- The register-company toast shows for 6 seconds (longer than default) so the user has time to read/copy the join code. The join code is also saved to the DB and visible later in the Company Admin dashboard.
