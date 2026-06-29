import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession } from '@/lib/auth'
import { getQueryParams, paginatedResponse } from '@/lib/query'

// GET /api/admin/analytics?period=daily|weekly|monthly&days=30
// Returns persisted statistics aggregates (no expensive runtime computation)
export async function GET(req: NextRequest) {
  const session = await getSession()
  if (!session || session.role !== 'COMPANY_ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }

  const admin = await db.user.findUnique({ where: { id: session.id }, select: { companyId: true } })
  if (!admin?.companyId) return NextResponse.json({ error: 'No company' }, { status: 400 })

  const { searchParams } = new URL(req.url)
  const days = Math.min(90, Math.max(7, parseInt(searchParams.get('days') || '30', 10)))

  // Fetch persisted company statistics for the last N days
  const stats = await db.companyStatistics.findMany({
    where: {
      companyId: admin.companyId,
      date: { gte: new Date(Date.now() - days * 86400000).toISOString().split('T')[0] },
    },
    orderBy: { date: 'asc' },
  })

  // Team stats for the same period
  const teams = await db.team.findMany({
    where: { companyId: admin.companyId },
    select: { id: true, name: true, color: true },
  })
  const teamStats = await db.teamStatistics.findMany({
    where: {
      teamId: { in: teams.map((t) => t.id) },
      date: { gte: new Date(Date.now() - days * 86400000).toISOString().split('T')[0] },
    },
    orderBy: { date: 'asc' },
  })

  // Aggregate weekly + monthly from daily
  const weeklyMap = new Map<string, { focusMinutes: number; sessions: number; points: number }>()
  const monthlyMap = new Map<string, { focusMinutes: number; sessions: number; points: number }>()
  for (const s of stats) {
    const d = new Date(s.date)
    const weekStart = new Date(d)
    weekStart.setDate(d.getDate() - d.getDay())
    const weekKey = weekStart.toISOString().split('T')[0]
    const monthKey = s.date.substring(0, 7)
    const w = weeklyMap.get(weekKey) || { focusMinutes: 0, sessions: 0, points: 0 }
    w.focusMinutes += s.focusMinutes
    w.sessions += s.sessionCount
    w.points += s.points
    weeklyMap.set(weekKey, w)
    const m = monthlyMap.get(monthKey) || { focusMinutes: 0, sessions: 0, points: 0 }
    m.focusMinutes += s.focusMinutes
    m.sessions += s.sessionCount
    m.points += s.points
    monthlyMap.set(monthKey, m)
  }

  return NextResponse.json({
    daily: stats.map((s) => ({
      date: s.date,
      focusHours: Math.round((s.focusMinutes / 60) * 10) / 10,
      sessions: s.sessionCount,
      points: s.points,
      activeEmployees: s.activeEmployees,
    })),
    weekly: Array.from(weeklyMap.entries()).map(([week, v]) => ({
      week,
      focusHours: Math.round((v.focusMinutes / 60) * 10) / 10,
      sessions: v.sessions,
      points: v.points,
    })),
    monthly: Array.from(monthlyMap.entries()).map(([month, v]) => ({
      month,
      focusHours: Math.round((v.focusMinutes / 60) * 10) / 10,
      sessions: v.sessions,
      points: v.points,
    })),
    teamTrends: teams.map((t) => ({
      teamId: t.id,
      teamName: t.name,
      teamColor: t.color,
      data: teamStats.filter((ts) => ts.teamId === t.id).map((ts) => ({
        date: ts.date,
        focusHours: Math.round((ts.focusMinutes / 60) * 10) / 10,
        sessions: ts.sessionCount,
        activeMembers: ts.activeMembers,
      })),
    })),
    totals: {
      totalHours: Math.round(stats.reduce((s, st) => s + st.focusMinutes, 0) / 60 * 10) / 10,
      totalSessions: stats.reduce((s, st) => s + st.sessionCount, 0),
      totalPoints: stats.reduce((s, st) => s + st.points, 0),
      avgActiveEmployees: stats.length > 0 ? Math.round(stats.reduce((s, st) => s + st.activeEmployees, 0) / stats.length) : 0,
    },
  })
}
