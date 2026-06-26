// Shared types for the Company Admin dashboard.
// Mirror the shape returned by GET /api/admin/dashboard.

export type AdminUser = {
  id: string
  name: string
  email: string
  title: string
  avatarColor: string
}

export type CompanyInfo = {
  id: string
  name: string
  domain: string
  joinCode: string
  plan: string
  seats: number
  subscriptionStatus: string
  monthlyRevenue: number
}

export type ActiveChallenge = {
  id: string
  name: string
  description: string
  startDate: string
  endDate: string
  prize: string
  giftCardValue: number
  giftCardCode: string
}

export type CompletedChallenge = {
  id: string
  name: string
  startDate: string
  endDate: string
  prize: string
  winnerTeam: { id: string; name: string; color: string } | null
}

export type TeamStat = {
  teamId: string
  teamName: string
  teamColor: string
  memberCount: number
  totalHours: number
  avgHoursPerMember: number
  sessionCount: number
  totalPoints: number
  participationRate: number
}

export type CompanyTotals = {
  totalHours: number
  totalSessions: number
  totalPoints: number
}

export type DailyHours = {
  date: string
  hours: number
}

export type AdminNotification = {
  id: string
  title: string
  message: string
  type: string
  read: boolean
  createdAt: string
}

export type DashboardData = {
  admin: AdminUser
  company: CompanyInfo
  activeChallenge: ActiveChallenge | null
  completedChallenges: CompletedChallenge[]
  teamStats: TeamStat[]
  companyTotals: CompanyTotals
  dailyHours: DailyHours[]
  totalEmployees: number
  totalSeats: number
  notifications: AdminNotification[]
  privacyNote: string
}

export type TabKey =
  | 'overview'
  | 'challenge'
  | 'teams'
  | 'employees'
  | 'rewards'
  | 'analytics'
  | 'audit'
  | 'settings'
  | 'history'

// Employee directory item (PRIVACY SHIELD: directory only — no focus data)
export type EmployeeDirectoryItem = {
  id: string
  name: string
  email: string
  title: string
  role: 'COMPANY_ADMIN' | 'EMPLOYEE'
  avatarColor: string
  active: boolean
  teamId: string | null
  createdAt: string
  team: { id: string; name: string; color: string } | null
}

export type EmployeesResponse = {
  employees: EmployeeDirectoryItem[]
  seats: number
  employeeCount: number
}

export type TeamManageItem = {
  id: string
  name: string
  color: string
  memberCount: number
  createdAt: string
}

export type TeamsManageResponse = {
  teams: TeamManageItem[]
}

export const TEAM_COLORS = [
  'emerald',
  'amber',
  'rose',
  'sky',
  'violet',
  'orange',
] as const

export type TeamColor = (typeof TEAM_COLORS)[number]

// ============================================================
// REWARDS — reward catalog + redemptions
// ============================================================

export type RewardType = 'GIFT_CARD' | 'MERCH' | 'EXPERIENCE' | 'CUSTOM'
export type RedemptionStatus =
  | 'PENDING'
  | 'APPROVED'
  | 'FULFILLED'
  | 'DECLINED'
  | 'EXPIRED'
export type RedemptionTier = 'WINNER' | 'RUNNER_UP' | 'PARTICIPATION'

export type RewardItem = {
  id: string
  name: string
  description: string
  type: RewardType
  value: number
  provider: string
  inventory: number
  imageColor: string
  active: boolean
  expiresAt: string | null
  createdAt: string
  updatedAt: string
  redemptionCount: number
  linkedChallengeCount: number
}

export type RedemptionItem = {
  id: string
  rewardId: string
  userId: string
  challengeId: string | null
  companyId: string
  tier: RedemptionTier
  position: number
  status: RedemptionStatus
  code: string
  notes: string
  redeemedAt: string
  fulfilledAt: string | null
  expiresAt: string | null
  reward: {
    id: string
    name: string
    type: RewardType
    value: number
    provider: string
    imageColor: string
  }
  user: {
    id: string
    name: string
    email: string
    avatarColor: string
    teamId: string | null
    team: { id: string; name: string; color: string } | null
  }
}

export type Pagination = {
  page: number
  pageSize: number
  total: number
  totalPages: number
  hasNext: boolean
  hasPrev: boolean
}

export type PaginatedRewards = {
  data: RewardItem[]
  pagination: Pagination
}

export type PaginatedRedemptions = {
  data: RedemptionItem[]
  pagination: Pagination
}

// ============================================================
// ANALYTICS — persisted statistics
// ============================================================

export type AnalyticsDaily = {
  date: string
  focusHours: number
  sessions: number
  points: number
  activeEmployees: number
}

export type AnalyticsWeekly = {
  week: string
  focusHours: number
  sessions: number
  points: number
}

export type AnalyticsMonthly = {
  month: string
  focusHours: number
  sessions: number
  points: number
}

export type AnalyticsTeamTrendPoint = {
  date: string
  focusHours: number
  sessions: number
  activeMembers: number
}

export type AnalyticsTeamTrend = {
  teamId: string
  teamName: string
  teamColor: string
  data: AnalyticsTeamTrendPoint[]
}

export type AnalyticsTotals = {
  totalHours: number
  totalSessions: number
  totalPoints: number
  avgActiveEmployees: number
}

export type AnalyticsData = {
  daily: AnalyticsDaily[]
  weekly: AnalyticsWeekly[]
  monthly: AnalyticsMonthly[]
  teamTrends: AnalyticsTeamTrend[]
  totals: AnalyticsTotals
}

// ============================================================
// AUDIT LOG
// ============================================================

export type AuditLogItem = {
  id: string
  userId: string | null
  action: string
  entityType: string
  entityId: string | null
  companyId: string | null
  metadata: string
  ipAddress: string
  createdAt: string
  user: { name: string; email: string } | null
}

export type PaginatedAuditLog = {
  data: AuditLogItem[]
  pagination: Pagination
}

// ============================================================
// CHALLENGE (rich) — for badges + cancel/duplicate/archive actions
// ============================================================

export type ChallengeScoringModel =
  | 'TOTAL_HOURS'
  | 'AVG_PER_MEMBER'
  | 'PARTICIPATION_RATE'
  | 'WEIGHTED'

export type ChallengeStatus =
  | 'DRAFT'
  | 'SCHEDULED'
  | 'ACTIVE'
  | 'COMPLETED'
  | 'CANCELLED'

export type ChallengeScope = 'COMPANY' | 'TEAM'

export type ChallengeRich = {
  id: string
  name: string
  description: string
  startDate: string
  endDate: string
  prize: string
  giftCardValue: number
  giftCardCode: string
  status: ChallengeStatus
  scoringModel: ChallengeScoringModel
  scoringWeights: string
  scope: ChallengeScope
  targetTeamId: string | null
  isRecurring: boolean
  recurrencePattern: string
  archived: boolean
  cancelledReason: string
  cancelledAt: string | null
  createdAt: string
  winnerTeam: { id: string; name: string; color: string } | null
  targetTeam?: { id: string; name: string; color: string } | null
  rewards?: {
    id: string
    rewardId: string
    tier: RedemptionTier
    position: number
    reward: {
      id: string
      name: string
      type: RewardType
      value: number
      imageColor: string
    }
  }[]
}

export type ChallengesListResponse = {
  challenges: ChallengeRich[]
}
