import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession } from '@/lib/auth'

// PATCH /api/super/companies/[id]
// Simulates a Stripe webhook updating subscription status.
// Body: { subscriptionStatus, plan?, monthlyRevenue? }
export async function GET() {
  const session = await getSession()
  if (!session || session.role !== 'SUPER_ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }

  const companies = await db.company.findMany({
    orderBy: { createdAt: 'desc' },
    include: {
      _count: { select: { users: { where: { role: 'EMPLOYEE' } }, teams: true } },
      challenges: { where: { status: 'ACTIVE' }, take: 1, select: { id: true, name: true } },
    },
  })

  return NextResponse.json({
    companies: companies.map((c) => ({
      id: c.id,
      name: c.name,
      domain: c.domain,
      plan: c.plan,
      seats: c.seats,
      employeeCount: c._count.users,
      teamCount: c._count.teams,
      subscriptionStatus: c.subscriptionStatus,
      monthlyRevenue: c.monthlyRevenue,
      utilization: c.seats > 0 ? Math.round((c._count.users / c.seats) * 100) : 0,
      activeChallenge: c.challenges[0] || null,
      createdAt: c.createdAt,
    })),
  })
}
