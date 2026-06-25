// Shared types for the Company Admin dashboard.
// Mirror the shape returned by GET /api/admin/dashboard.

export type AdminUser = {
  id: string
  name: string
  email: string
  avatarColor: string
}

export type CompanyInfo = {
  id: string
  name: string
  domain: string
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

export type TabKey = 'overview' | 'challenge' | 'teams' | 'history'
