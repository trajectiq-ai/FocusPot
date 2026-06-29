import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession } from '@/lib/auth'
import { auditLog } from '@/lib/audit'
import {
  refreshEmployeeStats,
  refreshTeamStats,
  refreshCompanyStats,
  checkAchievements,
} from '@/lib/stats'

// ============================================================
// Admin-only Mobile App Preview API
// ============================================================
// FocusPot has a strict architecture: Web app = admins only, Mobile app =
// employees only. This endpoint lets a logged-in admin fetch the data needed
// to render the mobile app inside a phone-frame simulator (a.k.a. preview).
// Company admins can only preview employees inside their own company.

async function requireAdmin() {
  const session = await getSession()
  if (
    !session ||
    (session.role !== 'COMPANY_ADMIN' && session.role !== 'SUPER_ADMIN')
  ) {
    return null
  }
  return session
}

// GET /api/admin/mobile-preview/[employeeId]
// Returns the full employee payload used to render the mobile app preview:
//   { user, company, team, activeChallenge, lastCompleted,
//     recentSessions, todaySessionCount, todayFocusMinutes,
//     leaderboard, achievements, rewards, stats }
export async function GET(
  _req: NextRequest,
  ctx: { params: Promise<{ employeeId: string }> }
) {
  const admin = await requireAdmin()
  if (!admin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }

  const { employeeId } = await ctx.params

  const employee = await db.user.findUnique({
    where: { id: employeeId },
    include: {
      company: { select: { id: true, name: true, domain: true } },
      team: { select: { id: true, name: true, color: true } },
    },
  })

  if (!employee || employee.role !== 'EMPLOYEE' || !employee.active) {
    return NextResponse.json({ error: 'Employee not found' }, { status: 404 })
  }

  // Privacy boundary: company admins may only preview their own employees
  if (admin.role === 'COMPANY_ADMIN' && employee.companyId !== admin.companyId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }
  if (!employee.companyId || !employee.teamId) {
    return NextResponse.json(
      { error: 'Employee profile is incomplete' },
      { status: 400 }
    )
  }

  await auditLog({
    userId: admin.id,
    action: 'MOBILE_PREVIEW_VIEW',
    entityType: 'User',
    entityId: employee.id,
    companyId: admin.companyId || undefined,
    metadata: { employeeId: employee.id, employeeName: employee.name },
  })

  // Active + last completed challenges for the company
  const [activeChallenge, lastCompleted] = await Promise.all([
    db.challenge.findFirst({
      where: { companyId: employee.companyId, status: 'ACTIVE' },
      orderBy: { startDate: 'desc' },
    }),
    db.challenge.findFirst({
      where: { companyId: employee.companyId, status: 'COMPLETED' },
      orderBy: { endDate: 'desc' },
      include: { winnerTeam: { select: { id: true, name: true, color: true } } },
    }),
  ])

  // Recent sessions (last 10)
  const recentSessions = await db.focusSession.findMany({
    where: { userId: employee.id },
    orderBy: { startTime: 'desc' },
    take: 10,
  })

  // Today's stats
  const todayStart = new Date()
  todayStart.setHours(0, 0, 0, 0)
  const todaySessions = await db.focusSession.findMany({
    where: {
      userId: employee.id,
      startTime: { gte: todayStart },
      completed: true,
    },
  })

  // ---- Leaderboard (parameterized by employeeId) ----
  const sessionWhere = activeChallenge
    ? { companyId: employee.companyId, challengeId: activeChallenge.id }
    : { companyId: employee.companyId }

  const [teamSessions, teams, teamMemberCounts, employeeSessions, allEmployees] =
    await Promise.all([
      db.focusSession.groupBy({
        by: ['teamId'],
        where: sessionWhere,
        _sum: { durationMinutes: true, points: true },
        _count: true,
      }),
      db.team.findMany({
        where: { companyId: employee.companyId },
        select: { id: true, name: true, color: true },
      }),
      db.user.groupBy({
        by: ['teamId'],
        where: {
          companyId: employee.companyId,
          role: 'EMPLOYEE',
          teamId: { not: null },
        },
        _count: true,
      }),
      db.focusSession.groupBy({
        by: ['userId'],
        where: sessionWhere,
        _sum: { durationMinutes: true, points: true },
      }),
      db.user.findMany({
        where: { companyId: employee.companyId, role: 'EMPLOYEE' },
        select: {
          id: true,
          name: true,
          avatarColor: true,
          teamId: true,
          streak: true,
        },
      }),
    ])

  const teamMap = new Map(teams.map((t) => [t.id, t]))
  const memberCountMap = new Map(teamMemberCounts.map((t) => [t.teamId, t._count]))

  const teamLeaderboard = teamSessions
    .map((ts) => {
      const team = teamMap.get(ts.teamId)
      const members = memberCountMap.get(ts.teamId) || 1
      const hours = (ts._sum.durationMinutes || 0) / 60
      return {
        teamId: ts.teamId,
        teamName: team?.name || 'Unknown',
        teamColor: team?.color || 'emerald',
        totalHours: Math.round(hours * 10) / 10,
        totalPoints: ts._sum.points || 0,
        sessionCount: ts._count,
        avgHoursPerMember: Math.round((hours / members) * 10) / 10,
        memberCount: members,
        isMyTeam: ts.teamId === employee.teamId,
      }
    })
    .sort((a, b) => b.totalHours - a.totalHours)

  const empMap = new Map(allEmployees.map((e) => [e.id, e]))
  const myTeamMembers = allEmployees.filter((e) => e.teamId === employee.teamId)
  const myTeamIds = new Set(myTeamMembers.map((e) => e.id))

  const ranked = employeeSessions
    .map((es) => {
      const emp = empMap.get(es.userId)
      return {
        userId: es.userId,
        name: emp?.name || 'Unknown',
        avatarColor: emp?.avatarColor || 'emerald',
        hours: Math.round(((es._sum.durationMinutes || 0) / 60) * 10) / 10,
        points: es._sum.points || 0,
        streak: emp?.streak || 0,
        isMe: es.userId === employee.id,
        isTeammate: myTeamIds.has(es.userId),
      }
    })
    .sort((a, b) => b.hours - a.hours)

  const myRank = ranked.findIndex((r) => r.isMe) + 1
  const myEntry = ranked.find((r) => r.isMe)
  const myTeamRank = teamLeaderboard.findIndex((t) => t.isMyTeam) + 1
  const topOverall = ranked.slice(0, 10)
  const myTeamLeaderboard = ranked.filter((r) => r.isTeammate).slice(0, 10)

  const leaderboard = {
    teamLeaderboard,
    myTeamRank,
    personalRank: myRank || null,
    myStats: myEntry || {
      hours: 0,
      points: 0,
      streak: employee.streak || 0,
      isMe: true,
    },
    totalParticipants: ranked.length,
    topOverall,
    myTeamLeaderboard,
  }

  // ---- Achievements ----
  const [achievements, unlocked] = await Promise.all([
    db.achievement.findMany({
      orderBy: [{ category: 'asc' }, { threshold: 'asc' }],
    }),
    db.userAchievement.findMany({
      where: { userId: employee.id },
      select: { achievementId: true, unlockedAt: true },
    }),
  ])

  const unlockedMap = new Map(unlocked.map((u) => [u.achievementId, u.unlockedAt]))

  const enrichedAchievements = achievements.map((a) => {
    const currentValue =
      ((employee as Record<string, unknown>)[a.metric] as number) || 0
    const unlockedAt = unlockedMap.get(a.id) || null
    return {
      id: a.id,
      key: a.key,
      name: a.name,
      description: a.description,
      icon: a.icon,
      category: a.category,
      threshold: a.threshold,
      metric: a.metric,
      color: a.color,
      unlocked: !!unlockedAt,
      unlockedAt: unlockedAt ? (unlockedAt as Date).toISOString() : null,
      progress:
        a.threshold > 0
          ? Math.min(100, Math.round((currentValue / a.threshold) * 100))
          : 0,
      currentValue: Math.round(currentValue * 10) / 10,
    }
  })

  const achievementByCategory: Record<string, typeof enrichedAchievements> = {}
  for (const a of enrichedAchievements) {
    if (!achievementByCategory[a.category]) achievementByCategory[a.category] = []
    achievementByCategory[a.category]!.push(a)
  }

  const achievementsPayload = {
    summary: {
      total: achievements.length,
      unlocked: unlocked.length,
      progress:
        achievements.length > 0
          ? Math.round((unlocked.length / achievements.length) * 100)
          : 0,
    },
    byCategory: achievementByCategory,
    achievements: enrichedAchievements,
  }

  // ---- Rewards ----
  const redemptions = await db.rewardRedemption.findMany({
    where: { userId: employee.id },
    orderBy: { redeemedAt: 'desc' },
    include: {
      reward: {
        select: {
          id: true,
          name: true,
          description: true,
          type: true,
          value: true,
          provider: true,
          imageColor: true,
        },
      },
    },
  })

  const rewardsPayload = {
    summary: {
      total: redemptions.length,
      pending: redemptions.filter((r) => r.status === 'PENDING').length,
      approved: redemptions.filter((r) => r.status === 'APPROVED').length,
      fulfilled: redemptions.filter((r) => r.status === 'FULFILLED').length,
      declined: redemptions.filter((r) => r.status === 'DECLINED').length,
      totalValue: redemptions
        .filter((r) => r.status === 'FULFILLED')
        .reduce((sum, r) => sum + r.reward.value, 0),
    },
    redemptions: redemptions.map((r) => ({
      id: r.id,
      rewardId: r.rewardId,
      challengeId: r.challengeId,
      tier: r.tier,
      position: r.position,
      status: r.status,
      code: r.code,
      notes: r.notes,
      redeemedAt: r.redeemedAt,
      fulfilledAt: r.fulfilledAt,
      expiresAt: r.expiresAt,
      reward: r.reward,
    })),
  }

  // ---- Stats summary (top-level) ----
  const stats = {
    streak: employee.streak,
    bestStreak: employee.bestStreak,
    totalFocusHours: employee.totalFocusHours,
    totalPoints: employee.totalPoints,
    totalSessions: employee.totalSessions,
    lastFocusDate: employee.lastFocusDate,
  }

  return NextResponse.json({
    user: {
      id: employee.id,
      name: employee.name,
      email: employee.email,
      title: employee.title,
      avatarColor: employee.avatarColor,
      streak: employee.streak,
      bestStreak: employee.bestStreak,
      totalFocusHours: employee.totalFocusHours,
      totalPoints: employee.totalPoints,
      totalSessions: employee.totalSessions,
      lastFocusDate: employee.lastFocusDate,
    },
    company: employee.company,
    team: employee.team,
    activeChallenge: activeChallenge
      ? {
          id: activeChallenge.id,
          name: activeChallenge.name,
          description: activeChallenge.description,
          startDate: activeChallenge.startDate,
          endDate: activeChallenge.endDate,
          prize: activeChallenge.prize,
          giftCardValue: activeChallenge.giftCardValue,
          status: activeChallenge.status,
        }
      : null,
    lastCompleted: lastCompleted
      ? {
          id: lastCompleted.id,
          name: lastCompleted.name,
          prize: lastCompleted.prize,
          giftCardValue: lastCompleted.giftCardValue,
          winnerTeam: lastCompleted.winnerTeam,
          isWinner: lastCompleted.winnerTeamId === employee.teamId,
          giftCardCode:
            lastCompleted.winnerTeamId === employee.teamId
              ? lastCompleted.giftCardCode
              : '',
        }
      : null,
    recentSessions: recentSessions.map((s) => ({
      id: s.id,
      startTime: s.startTime,
      durationMinutes: s.durationMinutes,
      points: s.points,
    })),
    todaySessionCount: todaySessions.length,
    todayFocusMinutes: todaySessions.reduce(
      (sum, s) => sum + s.durationMinutes,
      0
    ),
    leaderboard,
    achievements: achievementsPayload,
    rewards: rewardsPayload,
    stats,
  })
}

// POST /api/admin/mobile-preview/[employeeId]
// Creates a focus session on behalf of the previewed employee (admin testing
// tool). Body: { durationMinutes, points, challengeId? }
export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ employeeId: string }> }
) {
  const admin = await requireAdmin()
  if (!admin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }

  const { employeeId } = await ctx.params
  const { durationMinutes, points, challengeId } = await req.json()

  if (
    typeof durationMinutes !== 'number' ||
    durationMinutes <= 0 ||
    typeof points !== 'number' ||
    points < 0
  ) {
    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 })
  }

  const employee = await db.user.findUnique({
    where: { id: employeeId },
    select: {
      id: true,
      name: true,
      role: true,
      active: true,
      companyId: true,
      teamId: true,
      streak: true,
      bestStreak: true,
      lastFocusDate: true,
      totalFocusHours: true,
      totalPoints: true,
      totalSessions: true,
    },
  })

  if (!employee || employee.role !== 'EMPLOYEE' || !employee.active) {
    return NextResponse.json({ error: 'Employee not found' }, { status: 404 })
  }
  if (admin.role === 'COMPANY_ADMIN' && employee.companyId !== admin.companyId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }
  if (!employee.companyId || !employee.teamId) {
    return NextResponse.json(
      { error: 'Employee profile is incomplete' },
      { status: 400 }
    )
  }

  const now = new Date()
  const todayStr = now.toISOString().split('T')[0]
  const yesterday = new Date(now)
  yesterday.setDate(yesterday.getDate() - 1)
  const yesterdayStr = yesterday.toISOString().split('T')[0]

  // Compute streak
  let newStreak = employee.streak
  if (employee.lastFocusDate !== todayStr) {
    if (employee.lastFocusDate === yesterdayStr) {
      newStreak = employee.streak + 1
    } else {
      newStreak = 1
    }
  }
  const newBestStreak = Math.max(employee.bestStreak, newStreak)
  const newTotalFocusHours =
    Math.round((employee.totalFocusHours + durationMinutes / 60) * 10) / 10
  const newTotalPoints = employee.totalPoints + points

  const [focusSession] = await db.$transaction([
    db.focusSession.create({
      data: {
        userId: employee.id,
        teamId: employee.teamId,
        companyId: employee.companyId,
        challengeId: challengeId || null,
        startTime: new Date(now.getTime() - durationMinutes * 60000),
        durationMinutes,
        points,
        completed: true,
      },
    }),
    db.user.update({
      where: { id: employee.id },
      data: {
        totalFocusHours: newTotalFocusHours,
        totalPoints: newTotalPoints,
        totalSessions: { increment: 1 },
        streak: newStreak,
        bestStreak: newBestStreak,
        lastFocusDate: todayStr,
      },
    }),
  ])

  // Refresh materialized stats (async, non-blocking)
  refreshEmployeeStats(employee.id, todayStr).catch(() => {})
  refreshTeamStats(employee.teamId, todayStr).catch(() => {})
  refreshCompanyStats(employee.companyId, todayStr).catch(() => {})

  // Check for newly unlocked achievements
  const newAchievements = await checkAchievements(employee.id).catch(() => [])

  await auditLog({
    userId: admin.id,
    action: 'MOBILE_PREVIEW_SESSION',
    entityType: 'FocusSession',
    entityId: focusSession.id,
    companyId: admin.companyId || undefined,
    metadata: {
      employeeId: employee.id,
      employeeName: employee.name,
      durationMinutes,
      points,
      challengeId: challengeId || null,
    },
  })

  return NextResponse.json({
    session: {
      id: focusSession.id,
      durationMinutes: focusSession.durationMinutes,
      points: focusSession.points,
    },
    updatedStats: {
      streak: newStreak,
      bestStreak: newBestStreak,
      totalFocusHours: newTotalFocusHours,
      totalPoints: newTotalPoints,
      streakIncreased: newStreak > employee.streak,
    },
    newAchievements: newAchievements.map((a) => ({
      id: a.id,
      key: a.key,
      name: a.name,
      description: a.description,
      icon: a.icon,
      color: a.color,
    })),
  })
}
