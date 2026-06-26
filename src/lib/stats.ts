import { db } from './db'

/**
 * Statistics refresh — recomputes materialized aggregates from raw FocusSession data.
 * Called by the scheduler and after session creation.
 *
 * This avoids expensive GROUP BY queries on every page load.
 */

/**
 * Refreshes EmployeeStatistics for a given user + date.
 * If no date is provided, uses today.
 */
export async function refreshEmployeeStats(userId: string, dateStr?: string) {
  const date = dateStr || new Date().toISOString().split('T')[0]
  const dayStart = new Date(date + 'T00:00:00.000Z')
  const dayEnd = new Date(date + 'T23:59:59.999Z')

  const sessions = await db.focusSession.findMany({
    where: {
      userId,
      startTime: { gte: dayStart, lte: dayEnd },
      completed: true,
      archived: false,
    },
    select: { durationMinutes: true, points: true },
  })

  const focusMinutes = sessions.reduce((s, sess) => s + sess.durationMinutes, 0)
  const sessionCount = sessions.length
  const points = sessions.reduce((s, sess) => s + sess.points, 0)
  const longestSession = sessions.reduce((m, sess) => Math.max(m, sess.durationMinutes), 0)

  await db.employeeStatistics.upsert({
    where: { userId_date: { userId, date } },
    create: { userId, date, focusMinutes, sessionCount, points, longestSession },
    update: { focusMinutes, sessionCount, points, longestSession, updatedAt: new Date() },
  })
}

/**
 * Refreshes TeamStatistics for a given team + date.
 */
export async function refreshTeamStats(teamId: string, dateStr?: string) {
  const date = dateStr || new Date().toISOString().split('T')[0]
  const dayStart = new Date(date + 'T00:00:00.000Z')
  const dayEnd = new Date(date + 'T23:59:59.999Z')

  const sessions = await db.focusSession.findMany({
    where: {
      teamId,
      startTime: { gte: dayStart, lte: dayEnd },
      completed: true,
      archived: false,
    },
    select: { durationMinutes: true, points: true, userId: true },
  })

  const focusMinutes = sessions.reduce((s, sess) => s + sess.durationMinutes, 0)
  const sessionCount = sessions.length
  const points = sessions.reduce((s, sess) => s + sess.points, 0)
  const activeMembers = new Set(sessions.map((s) => s.userId)).size

  await db.teamStatistics.upsert({
    where: { teamId_date: { teamId, date } },
    create: { teamId, date, focusMinutes, sessionCount, points, activeMembers },
    update: { focusMinutes, sessionCount, points, activeMembers, updatedAt: new Date() },
  })
}

/**
 * Refreshes CompanyStatistics for a given company + date.
 */
export async function refreshCompanyStats(companyId: string, dateStr?: string) {
  const date = dateStr || new Date().toISOString().split('T')[0]
  const dayStart = new Date(date + 'T00:00:00.000Z')
  const dayEnd = new Date(date + 'T23:59:59.999Z')

  const sessions = await db.focusSession.findMany({
    where: {
      companyId,
      startTime: { gte: dayStart, lte: dayEnd },
      completed: true,
      archived: false,
    },
    select: { durationMinutes: true, points: true, userId: true },
  })

  const focusMinutes = sessions.reduce((s, sess) => s + sess.durationMinutes, 0)
  const sessionCount = sessions.length
  const points = sessions.reduce((s, sess) => s + sess.points, 0)
  const activeEmployees = new Set(sessions.map((s) => s.userId)).size

  await db.companyStatistics.upsert({
    where: { companyId_date: { companyId, date } },
    create: { companyId, date, focusMinutes, sessionCount, points, activeEmployees },
    update: { focusMinutes, sessionCount, points, activeEmployees, updatedAt: new Date() },
  })
}

/**
 * Refreshes stats for the last N days for a company (all teams + employees).
 * Used by the scheduler's periodic refresh job.
 */
export async function refreshCompanyStatsRange(companyId: string, days: number = 7) {
  for (let i = 0; i < days; i++) {
    const d = new Date()
    d.setDate(d.getDate() - i)
    const dateStr = d.toISOString().split('T')[0]
    await refreshCompanyStats(companyId, dateStr)

    const teams = await db.team.findMany({ where: { companyId }, select: { id: true } })
    for (const t of teams) {
      await refreshTeamStats(t.id, dateStr)
    }

    const employees = await db.user.findMany({
      where: { companyId, role: 'EMPLOYEE', active: true },
      select: { id: true },
    })
    for (const e of employees) {
      await refreshEmployeeStats(e.id, dateStr)
    }
  }
}

/**
 * Checks and awards achievements for a user based on their current stats.
 * Returns newly unlocked achievements.
 */
export async function checkAchievements(userId: string) {
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { totalSessions: true, totalFocusHours: true, streak: true, bestStreak: true },
  })
  if (!user) return []

  const achievements = await db.achievement.findMany()
  const existing = await db.userAchievement.findMany({
    where: { userId },
    select: { achievementId: true },
  })
  const existingIds = new Set(existing.map((e) => e.achievementId))

  const newlyUnlocked: typeof achievements = []
  for (const achievement of achievements) {
    if (existingIds.has(achievement.id)) continue

    const value = (user as any)[achievement.metric] || 0
    if (value >= achievement.threshold) {
      await db.userAchievement.create({
        data: { userId, achievementId: achievement.id },
      })
      newlyUnlocked.push(achievement)

      // Notify the user
      await db.notification.create({
        data: {
          userId,
          title: `Achievement Unlocked: ${achievement.name} ${achievement.icon}`,
          message: achievement.description,
          type: 'ACHIEVEMENT',
        },
      })
    }
  }

  return newlyUnlocked
}
