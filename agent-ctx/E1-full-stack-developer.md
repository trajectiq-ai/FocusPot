# Task E1 — Enterprise APIs (full-stack-developer)

## Files created (20 routes across 18 files)

### Rewards System (Company Admin)
- `src/app/api/admin/rewards/route.ts` — GET (paginated, filterable by type/active) + POST (create with zod validation + audit log REWARD_CREATED)
- `src/app/api/admin/rewards/[id]/route.ts` — PATCH (update fields, audit REWARD_UPDATED) + DELETE (blocked if has redemptions or linked challenge rewards; audit REWARD_DELETED)

### Redemptions (Company Admin)
- `src/app/api/admin/redeemptions/route.ts` — GET (paginated, filterable by status/tier/rewardId/challengeId; includes reward + user + team info; supports relation-aware sortBy)
- `src/app/api/admin/redeemptions/[id]/route.ts` — PATCH (status APPROVED/FULFILLED/DECLINED/PENDING + code + notes; auto-sets fulfilledAt on FULFILLED; audit REDEMPTION_UPDATED)

### Company Settings (Company Admin)
- `src/app/api/admin/company-settings/route.ts` — GET (upserts defaults if missing; returns holidayCalendar as parsed array) + PATCH (timezone, workingHoursStart/End as HH:MM, workingDays as comma list, primaryColor, logoText, holidayCalendar as YYYY-MM-DD[]; audit COMPANY_SETTINGS_UPDATED)

### Invitations (Company Admin)
- `src/app/api/admin/invitations/route.ts` — GET (paginated, filterable by status; resolves team info separately since Invitation has no team relation) + POST (zod-validated email/teamId/role; generates URL-safe unique token; 7-day expiry; blocks duplicates & existing users; audit INVITATION_CREATED; returns inviteUrl)
- `src/app/api/admin/invitations/[id]/route.ts` — PATCH with `{ action: 'revoke' | 'expire' }`; blocks already-accepted invitations; audit INVITATION_REVOKED

### CSV Import/Export (Company Admin)
- `src/app/api/admin/employees/import/route.ts` — POST accepting `{ csv: "name,email,title,teamId\n..." }`; minimal RFC 4180 CSV parser (handles quoted fields + escaped quotes); validates each row (email format, team exists — accepts teamId or team name, email uniqueness, seat limit); creates employees with hashed temp passwords + welcome notification; returns `{ successCount, errors: [{row,email,error}], created: [{name,email,teamName,tempPassword}], seats, employeeCount }`; audit EMPLOYEES_IMPORTED
- `src/app/api/admin/employees/export/route.ts` — GET returning CSV (Content-Type: text/csv, Content-Disposition: focuspot-employees.csv); directory ONLY — Name, Email, Title, Role, Team, Status, Joined; properly escapes commas/quotes/newlines

### Employee Experience
- `src/app/api/employee/achievements/route.ts` — GET returning all achievements + unlocked status + unlockedAt + progress %, grouped by category; summary with total/unlocked/progress
- `src/app/api/employee/stats/route.ts` — GET returning 30-day personal stats: daily focus minutes (one entry per day in window), session calendar (dates with sessions), focus heatmap (7 days × 24 hours intensity matrix), weekly summary (total hours, sessions, points, avg per active day, best day, current week totals)
- `src/app/api/employee/notification-preferences/route.ts` — GET (upserts defaults) + PATCH (per-flag updates for challengeStart/End/Win, weeklyDigest, streakReminder, rewardReady)
- `src/app/api/employee/rewards/route.ts` — GET returning user's redemptions with reward info + status summary (pending/approved/fulfilled/declined counts + totalValue of fulfilled rewards)

### Super Admin
- `src/app/api/super/feature-flags/route.ts` — GET (paginated, filterable by scope/enabled/companyId; resolves company info separately since FeatureFlag has no company relation) + POST (UPPERCASE_SNAKE_CASE key validation; scope+companyId consistency checks; audit FEATURE_FLAG_CREATED)
- `src/app/api/super/feature-flags/[id]/route.ts` — PATCH (toggle fields, scope/companyId coercion; audit FEATURE_FLAG_UPDATED) + DELETE (audit FEATURE_FLAG_DELETED)
- `src/app/api/super/announcements/route.ts` — GET (paginated, filterable by type/active) + POST (validates startsAt < endsAt; audit ANNOUNCEMENT_CREATED)
- `src/app/api/super/announcements/[id]/route.ts` — PATCH (title/message/type/active/dismissible/startsAt/endsAt with consistency check; audit ANNOUNCEMENT_UPDATED) + DELETE (audit ANNOUNCEMENT_DELETED)
- `src/app/api/super/search/route.ts` — GET `?q=...&limit=N`; global search across companies (name/domain/joinCode), users (name/email), challenges (name/description/prize); grouped response with counts
- `src/app/api/super/audit-log/route.ts` — GET platform-wide audit log (paginated, filterable by action/entityType/userId/companyId; parses metadata JSON; includes user + company info)
- `src/app/api/super/platform-stats/route.ts` — GET platform-wide stats: total companies by status/plan, MRR + ARR, total seats/employees/sessions/focus hours, MRR trend (last 6 months), companies-created trend, active-users trend (distinct users with sessions per month), top 10 companies by focus hours

## Files modified
- `src/lib/notifications.ts` — added explicit type annotation to `results` array in `sendNotifications()` to fix pre-existing TS error (`evolving array` doesn't work across `await` inside a loop). The annotation is `NonNullable<Awaited<ReturnType<typeof sendNotification>>>[]`.

## Patterns followed (consistent with existing codebase)
- All admin routes use `getSession()` + role check (`COMPANY_ADMIN` / `SUPER_ADMIN` / `EMPLOYEE`)
- Company admin routes scope by `admin.companyId` — no cross-company access
- All mutations call `auditLog(...)` with appropriate action/entityType/entityId/companyId/metadata
- Zod schemas on all POST/PATCH routes for input validation
- `getQueryParams` + `paginatedResponse` for all list endpoints
- `params: Promise<{ id: string }>` awaited in dynamic routes (Next.js 16)
- Returns consistent error envelope via `errorResponse(...)` from `@/lib/query`
- 409 Conflict for seat-limit / duplicate / blocking-dependency errors
- 404 Not Found for missing scoped entities
- 403 Unauthorized for missing session or wrong role

## Verification
- `bun run lint` → 0 errors
- `npx tsc --noEmit` → 0 errors in `src/`
- dev server compiles cleanly

## Notes for downstream agents
- `/api/admin/rewards` POST response is `{ reward }` (201 Created). GET response is paginated envelope with each item including `redemptionCount` and `linkedChallengeCount`.
- `/api/admin/redeemptions` GET supports `sortBy=rewardName|userName` for relation-aware sorting.
- `/api/admin/invitations` POST returns `{ invitation, inviteUrl }` where `inviteUrl` is `/?invite={token}`. The token can be used as a join-code alternative in the existing register-employee flow.
- `/api/admin/employees/import` requires CSV with at minimum `name,email` columns; optional `title,teamId` (also accepts team name in teamId column). Returns array of `created` users with their `tempPassword` for the admin to share.
- `/api/admin/employees/export` returns a CSV file directly (Content-Type: text/csv, filename: focuspot-employees.csv).
- `/api/employee/stats` returns a `heatmap` array of 168 entries (7 days × 24 hours) each with `{ day, hour, minutes, sessionCount }`.
- `/api/employee/achievements` returns `{ summary, byCategory, achievements }`. `byCategory` is keyed by category string (FOCUS, STREAK, SOCIAL, MILESTONE).
- `/api/super/platform-stats` returns `mrrTrend`, `companiesCreatedTrend`, `activeUsersTrend` (each 6 months), plus `topCompanies` (top 10 by focus hours).
- `/api/super/search?q=...` returns `{ companies, users, challenges, counts }` with `counts` giving per-group totals.
