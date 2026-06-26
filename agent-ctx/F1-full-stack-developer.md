# Task F1 — Admin Enterprise UI (full-stack-developer)

## Files created
- `src/components/focuspot/admin/rewards-tab.tsx` — Rewards tab (catalog + redemptions, ~1100 lines)
- `src/components/focuspot/admin/analytics-tab.tsx` — Analytics tab (charts + stat cards, ~620 lines)
- `src/components/focuspot/admin/audit-log-tab.tsx` — Audit Log tab (paginated table + filters, ~470 lines)

## Files modified
- `src/components/focuspot/company-admin-dashboard.tsx` — Added 3 new tabs (Rewards/Analytics/Audit Log) to TABS array + render branches. Imported Gift, BarChart3, ScrollText icons.
- `src/components/focuspot/admin/types.ts` — Extended TabKey; added RewardType, RedemptionStatus, RedemptionTier, RewardItem, RedemptionItem, Pagination, PaginatedRewards, PaginatedRedemptions, AnalyticsDaily/Weekly/Monthly/TeamTrendPoint/TeamTrend/Totals/Data, AuditLogItem, PaginatedAuditLog, ChallengeScoringModel, ChallengeStatus, ChallengeScope, ChallengeRich, ChallengesListResponse.
- `src/components/focuspot/admin/create-challenge-dialog.tsx` — Rewrote to add: scoring model selector with tooltips, scope selector (company/team with team dropdown), status selector (active/scheduled/draft), recurring checkbox, reward multi-select with per-reward tier. Fetches /api/admin/teams + /api/admin/teams on open. Submits all new fields to POST /api/admin/challenges.
- `src/components/focuspot/admin/challenge-tab.tsx` — Rewrote to fetch /api/admin/challenges for rich list. Added: scoring+scope+recurring+reward badges on active card and past cards, Cancel dialog with reason, Duplicate action, Archive action, "Show archived" toggle, "Upcoming & Drafts" section, status-colored accent strips, cancel-reason display.
- `src/components/focuspot/admin/employees-tab.tsx` — Added Import CSV + Export CSV buttons in header, handleExport function (blob download), ImportCsvDialog (format helper, Download Template, Download Current, paste textarea, Import button), ImportResultDialog (summary cards, created employees with temp passwords + copy buttons, errors list). Added Upload/Download/FileSpreadsheet/FileText/Textarea imports.

## Key implementation details
- **Rewards tab**: Two sub-tabs (Catalog + Redemptions) using shadcn Tabs. Catalog uses paginated cards (page state, type/active filters). Redemptions uses paginated table + mobile cards. Fulfill action opens a dialog requiring code input. Decline action opens dialog with notes. Quick Approve is a one-click PATCH.
- **Analytics tab**: Period selector (7/30/90 days) re-fetches /api/admin/analytics?days=N. Uses recharts: AreaChart (daily, emerald gradient), BarChart (weekly, dual Y-axis with hours/sessions on left + points on right), LineChart (team trends, one line per team with TEAM_LINE_COLORS palette). Monthly summary as stat cards. Scheduler note about hourly refresh.
- **Audit Log tab**: Paginated table with sticky header. Action dropdown pre-populated with 22 common actions + dynamically adds any actions seen in loaded data. Debounced search. Metadata parsed from JSON string and shown as preview chips (up to 3 keys).
- **Create Challenge dialog**: Now sm:max-w-2xl (wider for more fields). Scoring model has Select + tooltip text. Scope uses 2-card toggle buttons. Status uses 3-card toggle buttons with tooltips. Recurring uses Checkbox + Label. Reward linker uses a collapsible picker with add/remove + per-reward tier Select. Submit button label adapts to status choice.
- **Challenge tab**: Uses `data.teamStats` from dashboard to resolve targetTeamId → team name+color (avoids needing to modify the GET /api/admin/challenges route to include targetTeam). Groups other challenges into "Upcoming & Drafts" (SCHEDULED+DRAFT) and "Past Challenges" (COMPLETED+CANCELLED). Each card has a DropdownMenu with context-appropriate actions.
- **Employees CSV**: handleExport reads Content-Disposition for filename, falls back to focuspot-employees.csv. Import dialog has a "Download Template" that generates a sample CSV client-side with a real team name from the loaded teams. Import results dialog shows per-employee temp passwords with copy buttons + "Copy all" that copies name,email,team,password CSV.

## API endpoints used (all from E1/E2 backend)
- GET /api/admin/rewards (paginated, filter type/active)
- POST /api/admin/rewards (create)
- PATCH /api/admin/rewards/[id] (update + active toggle)
- DELETE /api/admin/rewards/[id] (delete)
- GET /api/admin/redeemptions (paginated, filter status, search)
- PATCH /api/admin/redeemptions/[id] (status + code + notes)
- GET /api/admin/analytics?days=N (daily/weekly/monthly/teamTrends/totals)
- GET /api/admin/audit-log (paginated, filter action, search)
- GET /api/admin/challenges (rich list with scoringModel/scope/status/rewards/winnerTeam)
- POST /api/admin/challenges (create with all enterprise fields)
- DELETE /api/admin/challenges/[id]?action=cancel|duplicate|archive
- GET /api/admin/teams (for scope team selector)
- POST /api/admin/employees/import (CSV with name,email,title,teamId)
- GET /api/admin/employees/export (text/csv download)

## Verification
- `bun run lint` → 0 errors, 0 warnings (fixed React Compiler memoization issue in analytics-tab by using [data] dep; fixed unused SAMPLE_CSV_TEMPLATE const in employees-tab)
- `npx tsc --noEmit` → 0 errors in src/ (fixed: analytics-tab dateMap type union; challenge-tab handleCancel call with wrong arg count → changed to setCancelTarget)
- Dev server compiles cleanly (verified via dev.log — only initial "module not found" errors during mid-edit, all resolved after files were created)

## Notes for downstream agents
- The `ChallengeRich` type has optional `targetTeam` and `rewards` fields because the GET /api/admin/challenges route doesn't currently include targetTeam relation. The challenge-tab resolves targetTeamId → team name using `data.teamStats` from the dashboard. If you want to add targetTeam to the API response, update the GET route's Prisma include and the ChallengeRich type.
- The audit-log-tab's COMMON_ACTIONS list is hardcoded but dynamically extended with any actions seen in loaded data. If new audit actions are added to the backend, they'll appear in the filter dropdown after the first load.
- The analytics-tab uses a fixed TEAM_LINE_COLORS palette (8 colors, no blue/indigo) that cycles for teams beyond 8. Teams with the same color name (e.g. two "emerald" teams) get distinct chart colors.
- The create-challenge-dialog fetches teams + rewards every time it opens (cache: no-store). For snappier UX, you could lift this state up to the dashboard and pass as props, but the current approach is simpler and avoids stale data.
- The employees CSV import flow: paste CSV → POST /api/admin/employees/import → server returns { successCount, errors, created, seats, employeeCount } → ImportResultDialog shows the created employees with their temp passwords for the admin to copy/share.
