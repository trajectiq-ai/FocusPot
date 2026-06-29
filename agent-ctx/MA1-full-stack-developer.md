# MA1 — Mobile App Preview (phone-frame simulator)

**Task ID:** MA1
**Agent:** full-stack-developer (Mobile App Preview)
**Task:** Build a phone-frame simulator that lets admins preview the employee mobile experience.

## Context recap

FocusPot has a strict architecture: **Web app = admins only**, **Mobile app = employees only**. Employees cannot access the web app. Admins need a "Mobile App Preview" tool (a phone-frame simulator) to test/preview the employee mobile experience without leaving the admin web portal.

State is driven by `useAuthStore.mobilePreview` + `previewEmployeeId` (`src/lib/store.ts`). When `mobilePreview === true`, `src/app/page.tsx` short-circuits the dashboards and renders `<MobileAppPreview />`.

## Files touched

| File | Purpose | Status |
|---|---|---|
| `src/components/focuspot/mobile/app-preview.tsx` | Phone frame wrapper, employee picker, top "Admin Testing Tool" banner + Exit button, side info panel | Already present — verified |
| `src/components/focuspot/mobile/mobile-app.tsx` | 4-tab native-feel mobile app (Timer / Ranks / Rewards / Profile) + bottom tab bar | Already present — **fixed lint error** |
| `src/app/api/admin/mobile-preview/route.ts` | `GET` → list of previewable employees (50 max, role-scoped) | Already present — verified |
| `src/app/api/admin/mobile-preview/[employeeId]/route.ts` | `GET` → full employee mobile payload; `POST` → create focus session on behalf of employee | Already present — verified |
| `src/components/focuspot/shared/app-shell.tsx` | "Preview Mobile App" Smartphone-icon button in header (SUPER_ADMIN + COMPANY_ADMIN only) + dropdown item | Already present — verified |
| `src/app/page.tsx` | `if (mobilePreview) return <MobileAppPreview />` short-circuit | Already present — verified |

## Lint fix applied

`src/components/focuspot/mobile/mobile-app.tsx` previously called `setLoading(true)` synchronously inside the mount effect (via `fetchData()`), which triggered the `react-hooks/set-state-in-effect` rule:

```ts
// BEFORE
const fetchData = useCallback((opts?: { silent?: boolean }) => {
  let cancelled = false
  if (!opts?.silent) setLoading(true)   // ❌ synchronous setState in effect
  fetch(...)
  ...
}, [employeeId])

useEffect(() => {
  const cleanup = fetchData()           // ← lint warned here
  return cleanup
}, [fetchData])
```

Fix: removed the synchronous `setLoading(true)` call entirely. The initial mount already starts with `useState(true)`, refreshes use `{ silent: true }` (which skips `setLoading`), and `setLoading(false)` is deferred to the `.finally()` callback (async, so it doesn't trigger the rule). This preserves all behavior — initial load still shows the skeleton, refreshes keep existing data visible (no flash), and retry-on-error still works.

```ts
// AFTER
const fetchData = useCallback((opts?: { silent?: boolean }) => {
  let cancelled = false
  fetch(`/api/admin/mobile-preview/${employeeId}`, { cache: 'no-store' })
    .then(async (r) => { ... })
    .then((d) => { if (!cancelled) { setData(d); setError(null) } })
    .catch((e) => { if (!cancelled) setError(...) })
    .finally(() => {
      // Silent refreshes keep the existing loading state untouched
      if (!cancelled && !opts?.silent) setLoading(false)
    })
  return () => { cancelled = true }
}, [employeeId])
```

## Verification

### Static checks
- `bun run lint` → **0 errors, 0 warnings**
- `npx tsc --noEmit 2>&1 | grep "^src/"` → **0 errors**

### Runtime checks (dev server on :3000)
- `GET /` → 200 (login screen renders)
- `POST /api/auth/login` (sree@focuspot.io / demo) → 200 (Super Admin session cookie set)
- `GET /api/admin/mobile-preview` → 200, returns `{ employees: [...] }` with 50 employees (avatar color, team badge, streak, totalFocusHours, totalSessions)
- `GET /api/admin/mobile-preview/{id}` → 200, returns full payload: `{ user, company, team, activeChallenge, lastCompleted, recentSessions, todaySessionCount, todayFocusMinutes, leaderboard, achievements, rewards, stats }`
- `POST /api/admin/mobile-preview/{id}` with `{ durationMinutes: 30, points: 5, challengeId: null }` → 200, returns `{ session, updatedStats, newAchievements }`; verified the FocusSession row was inserted, User stats updated (totalFocusHours 2.5→3, totalPoints 25→30, totalSessions 3→4), and TeamStatistics + CompanyStatistics + EmployeeStatistics were refreshed

### UI checks (agent-browser end-to-end)
1. Loaded `/` → login screen rendered with "Super Admin" quick-login button
2. Clicked quick-login → Super Admin dashboard rendered with all 7 tabs (Overview, Companies, Activity, Feature Flags, Announcements, Audit Log) + **"Preview Mobile App"** button in header
3. Clicked "Preview Mobile App" → routed to `<MobileAppPreview />`:
   - Top banner: "Mobile App Preview" + "Admin Testing Tool" amber badge + "Exit Preview" button
   - Phone frame (375×812, rounded-[3rem], notch, status bar showing live time "4:58 PM", signal/wifi/battery icons, home indicator)
   - Side info panel: "About this tool", "Preview Controls", "Tips"
4. Employee picker rendered: scrollable list of 50 employees with avatar (initials), name, title, team badge (color dot + name), streak 🔥, focus hours + sessions count; search box filters by name/email/title/team
5. Picked "Alex Chen" → MobileApp rendered inside phone frame, defaulting to **Timer tab**:
   - Greeting "Hi, Alex" + streak pill (🔥 + days)
   - 3 mini-stats (Today / Total / Points) with emerald/violet/amber tints
   - Active challenge banner (emerald→teal gradient) with trophy icon
   - Large circular timer (220px SVG) with mm:ss display, "Ready to focus" status, 30m/60m duration picker, big "Start Deep Work" button (emerald)
   - Recent sessions list (last 3)
6. Clicked **Ranks** tab → personal rank banner (emerald gradient with #rank, hours, points, streak) + My Team/Company toggle + team leaderboard (ranked bars with medals + progress bars + my-team highlighted) + personal leaderboard
7. Clicked **Rewards** tab → circular progress (fulfilled/total %), 3 summary stats, achievements grid (unlocked badges), reward history cards with tier + status badges + gift-card codes
8. Clicked **Profile** tab → avatar + name + title + team/company badges, 4-stat grid (Hours/Sessions/Streak/Best), points summary, achievements grid, last-completed challenge result (winner/loser), notification preferences row, exit preview button, "FocusPot Mobile · v1.0 · Preview Mode" footer
9. Bottom tab bar: 4 tabs (Timer / Ranks / Rewards / Profile) with emerald active indicator that slides between tabs via `motion.div layoutId="tabIndicator"`
10. "Switch employee" button in side panel returns to picker

### Anti-cheat verification
The mobile TimerTab reuses the same Page Visibility API pattern as the production `EmployeeFocusTimer`:
- `document.hidden` → `setIsPaused(true)` + `setInterruptions((c) => c + 1)` + toast.error("Stay focused!")
- Tab regain → `setIsPaused(false)` + toast.success("Welcome back!")
- Paused banner with rose tint + "Tap back into the app to resume" message
- Interruption counter shown next to "End Early" button (turns rose when > 0)

### Privacy boundary verification
- COMPANY_ADMIN scope: `where: { role: 'EMPLOYEE', active: true, companyId: session.companyId }` for picker GET; cross-company employeeId returns 403 on both GET and POST
- SUPER_ADMIN scope: `{ role: 'EMPLOYEE', active: true }` (all companies)
- `auditLog` records `MOBILE_PREVIEW_VIEW` (GET) and `MOBILE_PREVIEW_SESSION` (POST) actions with admin ID + employee ID/name in metadata

## Architecture notes for downstream agents

- The MobileApp is keyed by `employeeId` in `app-preview.tsx` (`key={`mobile-${employeeId}`}`), so switching employees unmounts/remounts and re-runs the initial fetch.
- `handleRefresh` (silent refresh) is invoked after every session completion in TimerTab — it re-fetches the full payload so Leaderboard/Rewards/Profile reflect the new session without remounting.
- The mobile timer's `liveStats` state mirrors `data.user.*` from props but is updated optimistically after POST returns, so the streak/today's minutes/total update instantly without waiting for the silent refresh.
- The phone frame uses fixed dimensions (375×812) which fits standard iPhone viewport; the parent container `flex items-center justify-center` centers it. On small screens, the side info panel hides (`hidden lg:block`) but the phone itself doesn't scale — could be improved with a `transform: scale()` wrapper if needed.
- All "Exit Preview" buttons call `setMobilePreview(false)` which sets both `mobilePreview=false` and `previewEmployeeId=null`, returning the admin to their dashboard.

## Stage summary

The Mobile App Preview simulator is fully functional:
- ✅ Realistic iPhone-style phone frame (rounded-[3rem], notch, status bar with live time + signal/wifi/battery, home indicator, side buttons)
- ✅ Admin-only "Preview Mobile App" entry point in AppShell header (SUPER_ADMIN + COMPANY_ADMIN only) + dropdown menu item
- ✅ Employee picker with search, scrollable list, team badges, streak indicators
- ✅ Full 4-tab mobile app: Timer (anti-cheat Page Visibility, circular SVG timer, plant/flame animations, recent sessions), Ranks (personal banner, team/company toggle, ranked bars with medals + progress, my-team highlighting), Rewards (circular progress summary, achievement grid, redemption history with tier/status badges + gift-card codes), Profile (avatar, stats grid, achievements, last-challenge result, exit button)
- ✅ Native feel: framer-motion slide transitions on tab change, layoutId-based tab indicator spring animation, touch-friendly 44px+ targets, hidden scrollbars via `mobile-scroll` class
- ✅ Preview API with role-scoped access, audit logging, full data payload (user/company/team/challenges/sessions/leaderboard/achievements/rewards/stats), session creation with streak computation + stats refresh + achievement checks
- ✅ NO blue/indigo — emerald primary, accents amber/rose/sky/violet/orange
- ✅ `bun run lint` clean, `npx tsc --noEmit` clean, dev server compiles cleanly, all endpoints return 200, end-to-end UI flow verified via agent-browser
