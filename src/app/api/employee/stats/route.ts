import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession } from '@/lib/auth'

// GET /api/employee/stats
// Personal statistics for the last 30 days from EmployeeStatistics table.
// Returns:
//   - daily focus minutes (one entry per day in the window)
//   - session calendar (dates with at least one session)
//   - focus heatmap data (day-of-week x hour-of-day intensity from FocusSession startTimes)
//   - weekly summary (total hours, sessions, avg per day, best day)
// Auth: EMPLOYEE.
export async function GET() {
  const session = await getSession()
  if (!session || session.role !== 'EMPLOYEE') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }

  const user = await db.user.findUnique({
    where: { id: session.id },
    select: {
      id: true,
      streak: true,
      bestStreak: true,
      totalFocusHours: true,
      totalPoints: true,
      totalSessions: true,
    },
  })
  if (!user) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 })
  }

  // Build the last 30 days window (YYYY-MM-DD strings, oldest first)
  const days: string[] = []
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  for (let i = 29; i >= 0; i--) {
    const d = new Date(today)
    d.setDate(d.getDate() - i)
    days.push(d.toISOString().split('T')[0])
  }

  const startDate = days[0]!
  const endDate = days[days.length - 1]!

  // Pull materialized daily stats for the window
  const dailyStats = await db.employeeStatistics.findMany({
    where: {
      userId: user.id,
      date: { gte: startDate, lte: endDate },
    },
    orderBy: { date: 'asc' },
  })
  const dailyMap = new Map(dailyStats.map((s) => [s.date, s]))

  const dailyFocusMinutes = days.map((d) => ({
    date: d,
    focusMinutes: dailyMap.get(d)?.focusMinutes || 0,
    sessionCount: dailyMap.get(d)?.sessionCount || 0,
    points: dailyMap.get(d)?.points || 0,
    longestSession: dailyMap.get(d)?.longestSession || 0,
  }))

  const sessionCalendar = dailyFocusMinutes
    .filter((d) => d.sessionCount > 0)
    .map((d) => d.date)

  // Heatmap: 7 days x 24 hours of session start time intensity over the window
  const windowStart = new Date(startDate + 'T00:00:00.000Z')
  const windowEnd = new Date(endDate + 'T23:59:59.999Z')
  const sessionsInWindow = await db.focusSession.findMany({
    where: {
      userId: user.id,
      startTime: { gte: windowStart, lte: windowEnd },
      completed: true,
      archived: false,
    },
    select: { startTime: true, durationMinutes: true },
  })

  // 7 rows (Sun..Sat) x 24 cols (0..23) intensity = sum of durationMinutes
  const heatmap: { day: number; hour: number; minutes: number; sessionCount: number }[] = []
  const heatmapMatrix: number[][] = Array.from({ length: 7 }, () => Array(24).fill(0))
  const heatmapCount: number[][] = Array.from({ length: 7 }, () => Array(24).fill(0))
  for (const s of sessionsInWindow) {
    const day = s.startTime.getDay()
    const hour = s.startTime.getHours()
    heatmapMatrix[day]![hour]! += s.durationMinutes
    heatmapCount[day]![hour]! += 1
  }
  for (let day = 0; day < 7; day++) {
    for (let hour = 0; hour < 24; hour++) {
      heatmap.push({
        day,
        hour,
        minutes: heatmapMatrix[day]![hour]!,
        sessionCount: heatmapCount[day]![hour]!,
      })
    }
  }

  // Weekly summary across the window
  const totalMinutes = dailyStats.reduce((sum, s) => sum + s.focusMinutes, 0)
  const totalSessions = dailyStats.reduce((sum, s) => sum + s.sessionCount, 0)
  const totalPoints = dailyStats.reduce((sum, s) => sum + s.points, 0)
  const activeDays = dailyStats.filter((s) => s.sessionCount > 0).length
  const avgPerActiveDay = activeDays > 0 ? Math.round(totalMinutes / activeDays) : 0

  // Best day in the window
  let bestDay: { date: string; focusMinutes: number; sessionCount: number } | null = null
  for (const s of dailyStats) {
    if (!bestDay || s.focusMinutes > bestDay.focusMinutes) {
      bestDay = { date: s.date, focusMinutes: s.focusMinutes, sessionCount: s.sessionCount }
    }
  }

  // Current week (Mon-Sun containing today) summary
  const dayOfWeek = today.getDay() // 0=Sun..6=Sat
  const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek
  const monday = new Date(today)
  monday.setDate(today.getDate() + mondayOffset)
  const sunday = new Date(monday)
  sunday.setDate(monday.getDate() + 6)

  const weekDayStrings: string[] = []
  for (let i = 0; i < 7; i++) {
    const d = new Date(monday)
    d.setDate(monday.getDate() + i)
    weekDayStrings.push(d.toISOString().split('T')[0])
  }
  const weekStats = dailyStats.filter((s) => weekDayStrings.includes(s.date))
  const weekMinutes = weekStats.reduce((sum, s) => sum + s.focusMinutes, 0)
  const weekSessions = weekStats.reduce((sum, s) => sum + s.sessionCount, 0)

  return NextResponse.json({
    user: {
      streak: user.streak,
      bestStreak: user.bestStreak,
      totalFocusHours: user.totalFocusHours,
      totalPoints: user.totalPoints,
      totalSessions: user.totalSessions,
    },
    window: { startDate, endDate, days: 30 },
    dailyFocusMinutes,
    sessionCalendar,
    heatmap,
    weeklySummary: {
      totalHours: Math.round((totalMinutes / 60) * 10) / 10,
      totalSessions,
      totalPoints,
      avgMinutesPerActiveDay: avgPerActiveDay,
      activeDays,
      bestDay: bestDay
        ? {
            date: bestDay.date,
            focusMinutes: bestDay.focusMinutes,
            focusHours: Math.round((bestDay.focusMinutes / 60) * 10) / 10,
            sessionCount: bestDay.sessionCount,
          }
        : null,
      thisWeek: {
        startDate: weekDayStrings[0]!,
        endDate: weekDayStrings[6]!,
        totalMinutes: weekMinutes,
        totalHours: Math.round((weekMinutes / 60) * 10) / 10,
        totalSessions: weekSessions,
      },
    },
  })
}
