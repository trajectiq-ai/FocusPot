import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession } from '@/lib/auth'
import { refreshEmployeeStats, refreshTeamStats, refreshCompanyStats, checkAchievements } from '@/lib/stats'

// POST /api/employee/sessions
// Called when a focus timer completes. Awards points and updates streak.
// Body: { durationMinutes, points, challengeId? }
export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session || session.role !== 'EMPLOYEE') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }

  const { durationMinutes, points, challengeId } = await req.json()

  const user = await db.user.findUnique({
    where: { id: session.id },
    select: { id: true, companyId: true, teamId: true, streak: true, bestStreak: true, lastFocusDate: true, totalFocusHours: true, totalPoints: true },
  })

  if (!user || !user.companyId || !user.teamId) {
    return NextResponse.json({ error: 'Incomplete profile' }, { status: 400 })
  }

  const now = new Date()
  const todayStr = now.toISOString().split('T')[0]
  const yesterday = new Date(now)
  yesterday.setDate(yesterday.getDate() - 1)
  const yesterdayStr = yesterday.toISOString().split('T')[0]

  // Compute streak
  let newStreak = user.streak
  if (user.lastFocusDate !== todayStr) {
    if (user.lastFocusDate === yesterdayStr) {
      newStreak = user.streak + 1
    } else {
      newStreak = 1
    }
  }
  const newBestStreak = Math.max(user.bestStreak, newStreak)

  // Create session + update user stats in a transaction
  const [focusSession] = await db.$transaction([
    db.focusSession.create({
      data: {
        userId: user.id,
        teamId: user.teamId,
        companyId: user.companyId,
        challengeId: challengeId || null,
        startTime: new Date(now.getTime() - durationMinutes * 60000),
        durationMinutes,
        points,
        completed: true,
      },
    }),
    db.user.update({
      where: { id: user.id },
      data: {
        totalFocusHours: Math.round((user.totalFocusHours + durationMinutes / 60) * 10) / 10,
        totalPoints: user.totalPoints + points,
        totalSessions: { increment: 1 },
        streak: newStreak,
        bestStreak: newBestStreak,
        lastFocusDate: todayStr,
      },
    }),
  ])

  // Refresh materialized statistics (async, non-blocking)
  refreshEmployeeStats(user.id, todayStr).catch(() => {})
  if (user.teamId) refreshTeamStats(user.teamId, todayStr).catch(() => {})
  refreshCompanyStats(user.companyId, todayStr).catch(() => {})

  // Check for newly unlocked achievements
  const newAchievements = await checkAchievements(user.id).catch(() => [])

  return NextResponse.json({
    session: {
      id: focusSession.id,
      durationMinutes: focusSession.durationMinutes,
      points: focusSession.points,
    },
    updatedStats: {
      streak: newStreak,
      bestStreak: newBestStreak,
      totalFocusHours: Math.round((user.totalFocusHours + durationMinutes / 60) * 10) / 10,
      totalPoints: user.totalPoints + points,
      streakIncreased: newStreak > user.streak,
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

// GET /api/employee/sessions
// Returns the user's session history (paginated)
export async function GET() {
  const session = await getSession()
  if (!session || session.role !== 'EMPLOYEE') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }

  const sessions = await db.focusSession.findMany({
    where: { userId: session.id },
    orderBy: { startTime: 'desc' },
    take: 50,
  })

  return NextResponse.json({
    sessions: sessions.map((s) => ({
      id: s.id,
      startTime: s.startTime,
      durationMinutes: s.durationMinutes,
      points: s.points,
      completed: s.completed,
    })),
  })
}
