# Task F2 — Employee Experience Enhancements & Super Admin Enterprise UI

## What was built

### PART A — Employee Experience Enhancements

**New files:**
1. `src/components/focuspot/employee/achievements-tab.tsx`
   - Fetches `GET /api/employee/achievements`
   - Top summary card with SVG circular progress indicator (emerald gradient)
   - Achievements grouped by category (FOCUS, STREAK, SOCIAL, MILESTONE) with order
   - Each card: large emoji icon, name, description, threshold, progress bar,
     unlocked/locked state, unlocked date or "X to go" label
   - Unlocked = full color with glow + emerald border + colored progress bar
   - Locked = grayscale + opacity-70 + muted progress bar
   - Metric-aware formatting (sessions / hours / days)

2. `src/components/focuspot/employee/stats-tab.tsx`
   - Fetches `GET /api/employee/stats`
   - 4 summary cards: total focus (hours), sessions, avg per active day, current streak
   - Daily focus minutes line chart (recharts LineChart, emerald line)
   - Session calendar: GitHub-style 30-day contribution grid, weekday-aligned,
     emerald intensity buckets based on max daily minutes, with tooltip + legend
   - Best day card with date + sessions + this-week summary
   - Focus heatmap: 7×24 grid (days × hours), 5-level emerald intensity scale
     (muted → emerald-200 → emerald-400 → emerald-600 → emerald-800),
     with hour/day axis labels, hover tooltips, and full legend

3. `src/components/focuspot/employee/rewards-tab.tsx`
   - Fetches `GET /api/employee/rewards`
   - 3 summary cards: total rewards, fulfilled, pending (with $value when fulfilled)
   - Reward cards: reward icon (by type), name, description, value, tier badge
     (WINNER/RUNNER_UP/PARTICIPATION with icons), type badge, status badge
   - Fulfilled rewards show reward code in a dashed emerald-bordered box with
     copy-to-clipboard button (Clipboard API + toast feedback)
   - Footer dates: earned, fulfilled, expires (amber when applicable)
   - Empty state: "No rewards yet. Complete focus sessions and win challenges to earn rewards!"

**Modified files:**
4. `src/components/focuspot/employee-dashboard.tsx`
   - Added 3 new NavButtons: Achievements (Award icon), Stats (BarChart3 icon), Rewards (Gift icon)
   - Tab type extended with 'achievements' | 'stats' | 'rewards'
   - Render branches added for each new tab
   - Tab order: Focus Timer → Leaderboard → History → Challenge → Achievements → Stats → Rewards

5. `src/components/focuspot/employee/notifications.tsx`
   - Added icons: Award (achievements), AlertTriangle (warning)
   - iconFor() now handles: CHALLENGE, CHALLENGE_STARTED, CHALLENGE_ENDED (Trophy),
     CHALLENGE_WON, REWARD (Gift), STREAK, SUCCESS (CheckCircle2),
     WARNING (AlertTriangle), ACHIEVEMENT (Award), INFO (Info)
   - tintFor() updated with full color palette per spec:
     INFO=sky, SUCCESS=emerald, WARNING=amber, CHALLENGE=violet,
     REWARD=amber, ACHIEVEMENT=violet, STREAK=orange, CHALLENGE_WON=amber

### PART B — Super Admin Enterprise UI

**New files:**
6. `src/components/focuspot/super/feature-flags-tab.tsx`
   - Fetches `GET /api/super/feature-flags?pageSize=100`
   - 4 stat cards: total, enabled, global, company-scoped
   - Toolbar: search input, scope filter dropdown, refresh, "New flag" button
   - Table with columns: Flag (key + name + description), Scope (Global/Company badge),
     Enabled (Switch toggle + status icon), Actions (delete)
   - Toggle enabled → PATCH `/api/super/feature-flags/[id]` with `{ enabled }` (optimistic update + rollback)
   - Create flag dialog: key (auto-uppercase + sanitize), name, description,
     scope (GLOBAL/COMPANY), company selector (loaded from `/api/super/companies`), enabled switch
   - Delete confirmation via AlertDialog
   - All mutations trigger toast feedback

7. `src/components/focuspot/super/announcements-tab.tsx`
   - Fetches `GET /api/super/announcements?pageSize=100`
   - 4 stat cards: total, active, warnings, maintenance
   - Announcement cards: type icon (Info/Warning/Maintenance), title, message,
     type badge, active badge, "Live now" badge (when active + within date window),
     dismissible label, start/end dates
   - Edit/Delete buttons on each card
   - Create/Edit dialog: title, message, type, active toggle, dismissible toggle,
     startsAt (datetime-local), optional endsAt (toggle to enable)
   - Date validation (endsAt cannot be before startsAt)
   - POST/PATCH/DELETE to `/api/super/announcements` and `/api/super/announcements/[id]`

8. `src/components/focuspot/super/audit-log-tab.tsx`
   - Fetches `GET /api/super/audit-log?page=N&pageSize=25&search=...&action=...`
   - 4 stat cards: total events, current page, total pages, page size
   - Toolbar: search input (debounced 350ms), action filter dropdown (8 options)
   - Table columns: Timestamp (date + time + ago), User (avatar + name + email),
     Action (color-coded badge by category), Entity (type + ID),
     Company (name with icon), IP address, Details (expand button with count)
   - Click row to expand metadata JSON in a sub-row
   - Pagination controls (prev/next + page indicator)
   - Action color coding: CREATE=emerald, UPDATE/TOGGLE=amber, DELETE=rose,
     LOGIN/AUTH=sky, CHALLENGE=violet, default=muted

9. `src/components/focuspot/super/global-search.tsx`
   - Search input with ⌘K / Ctrl+K keyboard shortcut to focus
   - 300ms debounced search via `GET /api/super/search?q=...&limit=8`
   - Animated dropdown with grouped results: Companies, People, Challenges
   - Each result row shows: icon, title, subtitle, type/status badge, chevron
   - Click-outside to close, Escape to close
   - Empty state + loading state
   - Clicking a result opens a DetailDialog with full info:
     - Company: plan, status, employees/teams/seats/revenue, join code, created date
     - User: role, active status, company, team, joined date
     - Challenge: status, scope, prize, duration, winner team
   - Footer link "Browse all companies" calls onNavigateCompanies callback
   - Search executor in useCallback to avoid setState-in-effect lint rule

**Modified files:**
10. `src/components/focuspot/super-admin-dashboard.tsx`
    - TAB_META extended with 3 new tabs: flags (Flag), announcements (Megaphone), audit (ScrollText)
    - PAGE_TITLES extended with titles + subtitles for each new tab
    - GlobalSearch component added to header (hidden on mobile, visible md+)
    - onNavigateCompanies callback switches to the Companies tab
    - Render branches added for flags/announcements/audit tabs

## Key design decisions
- **No blue/indigo colors**: Used emerald (primary), amber, rose, sky, violet, orange per spec
- **Mobile-first responsive**: All grids collapse to 1-2 columns on mobile,
  tables wrapped in `overflow-x-auto scrollbar-thin`
- **Achievement unlocked/locked**: unlocked = full color + emerald border + glow + colored progress;
  locked = grayscale + opacity-70 + muted progress bar
- **Heatmap colors**: 5-level emerald intensity (muted → emerald-200 → 400 → 600 → 800)
- **Notification colors**: INFO=sky, SUCCESS=emerald, WARNING=amber, CHALLENGE=violet,
  REWARD=amber, ACHIEVEMENT=violet
- **Announcement type badges**: INFO=sky, WARNING=amber, MAINTENANCE=rose
- **Cards**: p-4 or p-6 with gap-4 / gap-6 between
- **Shared components used**: AppShell, NavButton, getColor, getInitials, all shadcn/ui,
  sonner toasts, recharts, framer-motion, lucide-react, date-fns

## Verification
- `bun run lint` → 0 errors, 0 warnings
- `npx tsc --noEmit` → 0 errors in `src/` (only pre-existing errors in examples/mini-services/skills)
- Dev server compiles cleanly with no errors related to my files
- All API endpoints (achievements, stats, rewards, feature-flags, announcements, audit-log, search)
  were already built by E1 agent and verified to return the expected response shapes
