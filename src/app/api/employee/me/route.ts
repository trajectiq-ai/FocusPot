import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession } from '@/lib/auth'

// GET /api/employee/me
// Returns everything an employee needs: profile, company, team, active challenge,
// personal stats, recent sessions, notifications, and the winner announcement.
export async function GET() {
  const session = await getSession()
  if (!session || session.role !== 'EMPLOYEE') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }

  const user = await db.user.findUnique({
    where: { id: session.id },
    include: {
      company: { select: { id: true, name: true, domain: true } },
      team: { select: { id: true, name: true, color: true } },
    },
  })

  if (!user || !user.companyId || !user.teamId) {
    return NextResponse.json({ error: 'Incomplete profile' }, { status: 400 })
  }

  // Active challenge for this company
  const activeChallenge = await db.challenge.findFirst({
    where: { companyId: user.companyId, status: 'ACTIVE' },
    orderBy: { startDate: 'desc' },
  })

  // Last completed challenge (for winner announcement / confetti)
  const lastCompleted = await db.challenge.findFirst({
    where: { companyId: user.companyId, status: 'COMPLETED' },
    orderBy: { endDate: 'desc' },
    include: { winnerTeam: { select: { id: true, name: true, color: true } } },
  })

  // Recent sessions (last 10)
  const recentSessions = await db.focusSession.findMany({
    where: { userId: user.id },
    orderBy: { startTime: 'desc' },
    take: 10,
  })

  // Notifications
  const notifications = await db.notification.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: 'desc' },
    take: 8,
  })

  // Determine if user already completed a session today
  const todayStart = new Date()
  todayStart.setHours(0, 0, 0, 0)
  const todaySessions = await db.focusSession.findMany({
    where: { userId: user.id, startTime: { gte: todayStart }, completed: true },
  })

  return NextResponse.json({
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      avatarColor: user.avatarColor,
      streak: user.streak,
      bestStreak: user.bestStreak,
      totalFocusHours: user.totalFocusHours,
      totalPoints: user.totalPoints,
      lastFocusDate: user.lastFocusDate,
    },
    company: user.company,
    team: user.team,
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
          isWinner: lastCompleted.winnerTeamId === user.teamId,
          giftCardCode: lastCompleted.winnerTeamId === user.teamId ? lastCompleted.giftCardCode : '',
        }
      : null,
    recentSessions: recentSessions.map((s) => ({
      id: s.id,
      startTime: s.startTime,
      durationMinutes: s.durationMinutes,
      points: s.points,
    })),
    todaySessionCount: todaySessions.length,
    todayFocusMinutes: todaySessions.reduce((sum, s) => sum + s.durationMinutes, 0),
    notifications: notifications.map((n) => ({
      id: n.id,
      title: n.title,
      message: n.message,
      type: n.type,
      read: n.read,
      createdAt: n.createdAt,
    })),
  })
}
