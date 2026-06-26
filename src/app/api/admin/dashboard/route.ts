import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession } from '@/lib/auth'

// GET /api/admin/dashboard
// PRIVACY SHIELD: Returns ONLY anonymous, aggregated team data.
// Company Admins cannot see individual employee focus hours or sessions.
export async function GET() {
  const session = await getSession()
  if (!session || session.role !== 'COMPANY_ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }

  const admin = await db.user.findUnique({
    where: { id: session.id },
    select: {
      id: true,
      name: true,
      email: true,
      title: true,
      avatarColor: true,
      companyId: true,
      company: { select: { id: true, name: true, domain: true, joinCode: true, plan: true, seats: true, subscriptionStatus: true, monthlyRevenue: true } },
    },
  })

  if (!admin || !admin.companyId) {
    return NextResponse.json({ error: 'No company assigned' }, { status: 400 })
  }

  const companyId = admin.companyId

  // All teams (anonymous)
  const teams = await db.team.findMany({
    where: { companyId },
    select: { id: true, name: true, color: true },
    orderBy: { name: 'asc' },
  })

  // Employee count per team
  const teamMemberCounts = await db.user.groupBy({
    by: ['teamId'],
    where: { companyId, role: 'EMPLOYEE', teamId: { not: null } },
    _count: true,
  })
  const memberCountMap = new Map(teamMemberCounts.map((t) => [t.teamId, t._count]))
  const totalEmployees = teamMemberCounts.reduce((s, t) => s + t._count, 0)

  // Active challenge
  const activeChallenge = await db.challenge.findFirst({
    where: { companyId, status: 'ACTIVE' },
    orderBy: { startDate: 'desc' },
  })

  // Completed challenges
  const completedChallenges = await db.challenge.findMany({
    where: { companyId, status: 'COMPLETED' },
    orderBy: { endDate: 'desc' },
    take: 5,
    include: { winnerTeam: { select: { id: true, name: true, color: true } } },
  })

  // === ANONYMOUS TEAM AGGREGATES (Privacy Shield) ===
  // For active challenge (or all company sessions if none active)
  const challengeSessionWhere = activeChallenge
    ? { companyId, challengeId: activeChallenge.id }
    : { companyId }

  const teamAggregates = await db.focusSession.groupBy({
    by: ['teamId'],
    where: challengeSessionWhere,
    _sum: { durationMinutes: true, points: true },
    _count: true,
  })

  const teamStats = teams
    .map((team) => {
      const agg = teamAggregates.find((a) => a.teamId === team.id)
      const members = memberCountMap.get(team.id) || 0
      const hours = (agg?._sum.durationMinutes || 0) / 60
      return {
        teamId: team.id,
        teamName: team.name,
        teamColor: team.color,
        memberCount: members,
        totalHours: Math.round(hours * 10) / 10,
        avgHoursPerMember: members > 0 ? Math.round((hours / members) * 10) / 10 : 0,
        sessionCount: agg?._count || 0,
        totalPoints: agg?._sum.points || 0,
        participationRate: members > 0 ? Math.round(((agg?._count || 0) / (members * 3)) * 100) : 0,
      }
    })
    .sort((a, b) => b.totalHours - a.totalHours)

  // Company-wide totals (anonymous)
  const companyTotals = teamStats.reduce(
    (acc, t) => ({
      totalHours: acc.totalHours + t.totalHours,
      totalSessions: acc.totalSessions + t.sessionCount,
      totalPoints: acc.totalPoints + t.totalPoints,
    }),
    { totalHours: 0, totalSessions: 0, totalPoints: 0 }
  )
  companyTotals.totalHours = Math.round(companyTotals.totalHours * 10) / 10

  // Daily focus hours over the challenge period (anonymous, company-wide)
  const allChallengeSessions = activeChallenge
    ? await db.focusSession.findMany({
        where: { companyId, challengeId: activeChallenge.id },
        select: { startTime: true, durationMinutes: true, teamId: true },
      })
    : []
  const dailyMap = new Map<string, number>()
  for (const s of allChallengeSessions) {
    const day = s.startTime.toISOString().split('T')[0]
    dailyMap.set(day, (dailyMap.get(day) || 0) + s.durationMinutes / 60)
  }
  const dailyHours = Array.from(dailyMap.entries())
    .map(([date, hours]) => ({ date, hours: Math.round(hours * 10) / 10 }))
    .sort((a, b) => a.date.localeCompare(b.date))

  // Notifications for admin
  const notifications = await db.notification.findMany({
    where: { userId: admin.id },
    orderBy: { createdAt: 'desc' },
    take: 8,
  })

  return NextResponse.json({
    admin: {
      id: admin.id,
      name: admin.name,
      email: admin.email,
      avatarColor: admin.avatarColor,
    },
    company: admin.company,
    activeChallenge: activeChallenge
      ? {
          id: activeChallenge.id,
          name: activeChallenge.name,
          description: activeChallenge.description,
          startDate: activeChallenge.startDate,
          endDate: activeChallenge.endDate,
          prize: activeChallenge.prize,
          giftCardValue: activeChallenge.giftCardValue,
          giftCardCode: activeChallenge.giftCardCode,
        }
      : null,
    completedChallenges: completedChallenges.map((c) => ({
      id: c.id,
      name: c.name,
      startDate: c.startDate,
      endDate: c.endDate,
      prize: c.prize,
      winnerTeam: c.winnerTeam,
    })),
    teamStats,
    companyTotals,
    dailyHours,
    totalEmployees,
    totalSeats: admin.company?.seats ?? 0,
    notifications: notifications.map((n) => ({
      id: n.id,
      title: n.title,
      message: n.message,
      type: n.type,
      read: n.read,
      createdAt: n.createdAt,
    })),
    privacyNote:
      'This dashboard shows anonymous, aggregated team data only. Individual employee focus data is never visible to admins.',
  })
}
