import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession } from '@/lib/auth'

function monthKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

// GET /api/super/platform-stats
// Platform-wide statistics: companies by status, MRR trend (last 6 months),
// total focus hours, active users trend. Auth: SUPER_ADMIN.
export async function GET() {
  const session = await getSession()
  if (!session || session.role !== 'SUPER_ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }

  const [companies, totalUsers, totalSessionsAgg, focusSessions] = await Promise.all([
    db.company.findMany({
      include: { _count: { select: { users: { where: { role: 'EMPLOYEE' } } } } },
    }),
    db.user.count({ where: { role: 'EMPLOYEE', active: true } }),
    db.focusSession.aggregate({ _sum: { durationMinutes: true }, _count: true }),
    db.focusSession.findMany({
      where: { completed: true, archived: false },
      select: { startTime: true, durationMinutes: true, userId: true },
    }),
  ])

  const totalCompanies = companies.length
  const statusCounts = {
    ACTIVE: companies.filter((c) => c.subscriptionStatus === 'ACTIVE').length,
    PAST_DUE: companies.filter((c) => c.subscriptionStatus === 'PAST_DUE').length,
    CANCELED: companies.filter((c) => c.subscriptionStatus === 'CANCELED').length,
    TRIALING: companies.filter((c) => c.subscriptionStatus === 'TRIALING').length,
  }
  const planCounts = {
    STARTER: companies.filter((c) => c.plan === 'STARTER').length,
    GROWTH: companies.filter((c) => c.plan === 'GROWTH').length,
    ENTERPRISE: companies.filter((c) => c.plan === 'ENTERPRISE').length,
  }
  const mrr = companies
    .filter((c) => c.subscriptionStatus === 'ACTIVE')
    .reduce((sum, c) => sum + c.monthlyRevenue, 0)
  const arr = mrr * 12
  const totalSeats = companies.reduce((s, c) => s + c.seats, 0)
  const totalEmployees = companies.reduce((s, c) => s + c._count.users, 0)
  const totalFocusHours = Math.round(((totalSessionsAgg._sum.durationMinutes || 0) / 60) * 10) / 10

  // MRR trend: last 6 months (current month + 5 prior).
  // Since we don't track historical MRR explicitly, we approximate the trend
  // by counting companies whose createdAt falls in or before each month bucket
  // and that are ACTIVE — at the time of query (best-effort proxy).
  const now = new Date()
  const months: { key: string; label: string; mrr: number; companies: number }[] = []
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const key = monthKey(d)
    const cutoff = new Date(d.getFullYear(), d.getMonth() + 1, 1) // first day of next month
    const activeCompaniesInMonth = companies.filter(
      (c) => c.subscriptionStatus === 'ACTIVE' && c.createdAt < cutoff,
    )
    months.push({
      key,
      label: d.toLocaleString('en-US', { month: 'short', year: '2-digit' }),
      mrr: activeCompaniesInMonth.reduce((s, c) => s + c.monthlyRevenue, 0),
      companies: activeCompaniesInMonth.length,
    })
  }

  // Active users trend: distinct users with at least one session per month for the last 6 months.
  const activeUsersTrend = months.map((m) => {
    const [yearStr, monthStr] = m.key.split('-')
    const year = parseInt(yearStr!, 10)
    const month = parseInt(monthStr!, 10) - 1
    const start = new Date(year, month, 1)
    const end = new Date(year, month + 1, 1)
    const distinctUsers = new Set(
      focusSessions.filter((s) => s.startTime >= start && s.startTime < end).map((s) => s.userId),
    )
    return { key: m.key, label: m.label, activeUsers: distinctUsers.size }
  })

  // Companies created trend (last 6 months)
  const companiesCreatedTrend = months.map((m) => {
    const [yearStr, monthStr] = m.key.split('-')
    const year = parseInt(yearStr!, 10)
    const month = parseInt(monthStr!, 10) - 1
    const start = new Date(year, month, 1)
    const end = new Date(year, month + 1, 1)
    return {
      key: m.key,
      label: m.label,
      created: companies.filter((c) => c.createdAt >= start && c.createdAt < end).length,
    }
  })

  // Top companies by focus hours (proxy: aggregate focus minutes per companyId)
  const focusByCompany = new Map<string, number>()
  // We didn't pull companyId on sessions — fetch a quick aggregate per company
  const perCompanyAgg = await db.focusSession.groupBy({
    by: ['companyId'],
    where: { completed: true, archived: false },
    _sum: { durationMinutes: true },
    _count: true,
  })
  for (const a of perCompanyAgg) {
    if (a.companyId) focusByCompany.set(a.companyId, a._sum.durationMinutes || 0)
  }
  const topCompanies = companies
    .map((c) => ({
      id: c.id,
      name: c.name,
      domain: c.domain,
      plan: c.plan,
      subscriptionStatus: c.subscriptionStatus,
      monthlyRevenue: c.monthlyRevenue,
      employeeCount: c._count.users,
      focusMinutes: focusByCompany.get(c.id) || 0,
      focusHours: Math.round(((focusByCompany.get(c.id) || 0) / 60) * 10) / 10,
    }))
    .sort((a, b) => b.focusMinutes - a.focusMinutes)
    .slice(0, 10)

  return NextResponse.json({
    totals: {
      totalCompanies,
      statusCounts,
      planCounts,
      totalSeats,
      totalEmployees,
      activeEmployees: totalUsers,
      totalSessions: totalSessionsAgg._count,
      totalFocusHours,
      mrr,
      arr,
      avgSeatsUtilization: totalSeats > 0 ? Math.round((totalEmployees / totalSeats) * 100) : 0,
    },
    mrrTrend: months.map((m) => ({ key: m.key, label: m.label, mrr: m.mrr, companies: m.companies })),
    companiesCreatedTrend,
    activeUsersTrend,
    topCompanies,
    generatedAt: new Date().toISOString(),
  })
}
