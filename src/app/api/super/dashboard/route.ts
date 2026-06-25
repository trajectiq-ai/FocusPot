import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession } from '@/lib/auth'

// GET /api/super/dashboard
// Returns platform-wide stats for the Super Admin.
export async function GET() {
  const session = await getSession()
  if (!session || session.role !== 'SUPER_ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }

  const companies = await db.company.findMany({
    orderBy: { createdAt: 'desc' },
    include: {
      _count: { select: { users: { where: { role: 'EMPLOYEE' } } } },
    },
  })

  const totalCompanies = companies.length
  const activeCompanies = companies.filter((c) => c.subscriptionStatus === 'ACTIVE').length
  const pastDueCompanies = companies.filter((c) => c.subscriptionStatus === 'PAST_DUE').length
  const canceledCompanies = companies.filter((c) => c.subscriptionStatus === 'CANCELED').length

  const mrr = companies
    .filter((c) => c.subscriptionStatus === 'ACTIVE')
    .reduce((sum, c) => sum + c.monthlyRevenue, 0)
  const arr = mrr * 12

  const totalSeats = companies.reduce((s, c) => s + c.seats, 0)
  const totalEmployees = companies.reduce((s, c) => s + c._count.users, 0)

  // Revenue by plan
  const starterRevenue = companies
    .filter((c) => c.plan === 'STARTER' && c.subscriptionStatus === 'ACTIVE')
    .reduce((s, c) => s + c.monthlyRevenue, 0)
  const growthRevenue = companies
    .filter((c) => c.plan === 'GROWTH' && c.subscriptionStatus === 'ACTIVE')
    .reduce((s, c) => s + c.monthlyRevenue, 0)

  // Recent activity: latest challenges across all companies
  const recentChallenges = await db.challenge.findMany({
    orderBy: { createdAt: 'desc' },
    take: 8,
    include: {
      company: { select: { name: true } },
      winnerTeam: { select: { name: true, color: true } },
    },
  })

  // Total focus hours across platform (anonymous)
  const totalSessions = await db.focusSession.count()
  const totalFocusAgg = await db.focusSession.aggregate({ _sum: { durationMinutes: true } })
  const totalFocusHours = (totalFocusAgg._sum.durationMinutes || 0) / 60

  const notifications = await db.notification.findMany({
    where: { userId: session.id },
    orderBy: { createdAt: 'desc' },
    take: 8,
  })

  return NextResponse.json({
    superAdmin: {
      id: session.id,
      name: session.name,
      email: session.email,
    },
    stats: {
      totalCompanies,
      activeCompanies,
      pastDueCompanies,
      canceledCompanies,
      mrr,
      arr,
      totalSeats,
      totalEmployees,
      totalSessions,
      totalFocusHours: Math.round(totalFocusHours * 10) / 10,
      starterRevenue,
      growthRevenue,
    },
    companies: companies.map((c) => ({
      id: c.id,
      name: c.name,
      domain: c.domain,
      plan: c.plan,
      seats: c.seats,
      employeeCount: c._count.users,
      subscriptionStatus: c.subscriptionStatus,
      monthlyRevenue: c.monthlyRevenue,
      utilization: c.seats > 0 ? Math.round((c._count.users / c.seats) * 100) : 0,
      createdAt: c.createdAt,
    })),
    recentChallenges: recentChallenges.map((c) => ({
      id: c.id,
      name: c.name,
      companyName: c.company.name,
      status: c.status,
      prize: c.prize,
      giftCardValue: c.giftCardValue,
      startDate: c.startDate,
      endDate: c.endDate,
      winnerTeam: c.winnerTeam,
    })),
    revenueBreakdown: [
      { plan: 'Starter ($99/mo)', revenue: starterRevenue, count: companies.filter((c) => c.plan === 'STARTER' && c.subscriptionStatus === 'ACTIVE').length },
      { plan: 'Growth ($199/mo)', revenue: growthRevenue, count: companies.filter((c) => c.plan === 'GROWTH' && c.subscriptionStatus === 'ACTIVE').length },
    ],
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
