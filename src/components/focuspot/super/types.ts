// Shared types for the Super Admin dashboard.
// Mirrors the response shape of GET /api/super/dashboard.

export type Plan = 'STARTER' | 'GROWTH'

export type SubscriptionStatus = 'ACTIVE' | 'PAST_DUE' | 'CANCELED'

export type ChallengeStatus = 'DRAFT' | 'ACTIVE' | 'COMPLETED'

export type CompanyRow = {
  id: string
  name: string
  domain: string
  plan: Plan
  seats: number
  employeeCount: number
  subscriptionStatus: SubscriptionStatus
  monthlyRevenue: number
  utilization: number
  createdAt: string
}

export type RecentChallenge = {
  id: string
  name: string
  companyName: string
  status: ChallengeStatus
  prize: string
  giftCardValue: number
  startDate: string
  endDate: string
  winnerTeam: { name: string; color: string } | null
}

export type RevenueSlice = {
  plan: string
  revenue: number
  count: number
}

export type NotificationRow = {
  id: string
  title: string
  message: string
  type: string // INFO | SUCCESS | WARNING | CHALLENGE
  read: boolean
  createdAt: string
}

export type PlatformStats = {
  totalCompanies: number
  activeCompanies: number
  pastDueCompanies: number
  canceledCompanies: number
  mrr: number
  arr: number
  totalSeats: number
  totalEmployees: number
  totalSessions: number
  totalFocusHours: number
  starterRevenue: number
  growthRevenue: number
}

export type DashboardData = {
  superAdmin: { id: string; name: string; email: string }
  stats: PlatformStats
  companies: CompanyRow[]
  recentChallenges: RecentChallenge[]
  revenueBreakdown: RevenueSlice[]
  notifications: NotificationRow[]
}
