import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession } from '@/lib/auth'
import { auditLog } from '@/lib/audit'

// GET /api/super/companies/[id]
// Returns detailed info about a single company for the Super Admin.
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session || session.role !== 'SUPER_ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }

  const { id } = await params
  const company = await db.company.findUnique({
    where: { id },
    include: {
      teams: { select: { id: true, name: true, color: true }, orderBy: { name: 'asc' } },
      _count: { select: { users: { where: { role: 'EMPLOYEE' } }, challenges: true } },
    },
  })
  if (!company) {
    return NextResponse.json({ error: 'Company not found' }, { status: 404 })
  }

  const challenges = await db.challenge.findMany({
    where: { companyId: id },
    orderBy: { createdAt: 'desc' },
    take: 10,
    include: { winnerTeam: { select: { name: true, color: true } } },
  })

  const admin = await db.user.findFirst({
    where: { companyId: id, role: 'COMPANY_ADMIN' },
    select: { id: true, name: true, email: true, avatarColor: true },
  })

  const focusAgg = await db.focusSession.aggregate({
    where: { companyId: id },
    _sum: { durationMinutes: true, points: true },
    _count: true,
  })

  return NextResponse.json({
    company: {
      id: company.id,
      name: company.name,
      domain: company.domain,
      joinCode: company.joinCode,
      plan: company.plan,
      seats: company.seats,
      subscriptionStatus: company.subscriptionStatus,
      monthlyRevenue: company.monthlyRevenue,
      createdAt: company.createdAt,
      teamCount: company.teams.length,
      employeeCount: company._count.users,
      challengeCount: company._count.challenges,
      teams: company.teams,
      admin,
      totalFocusHours: Math.round(((focusAgg._sum.durationMinutes || 0) / 60) * 10) / 10,
      totalSessions: focusAgg._count,
      totalPoints: focusAgg._sum.points || 0,
    },
    challenges: challenges.map((c) => ({
      id: c.id,
      name: c.name,
      status: c.status,
      prize: c.prize,
      giftCardValue: c.giftCardValue,
      startDate: c.startDate,
      endDate: c.endDate,
      winnerTeam: c.winnerTeam,
    })),
  })
}

// PATCH /api/super/companies/[id]
// Admin override for subscription status & plan.
// In production, subscription changes are normally driven by Stripe webhooks
// (POST /api/stripe/webhook). This endpoint allows Super Admins to manually
// correct subscription state (e.g. for offline payments, support cases).
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session || session.role !== 'SUPER_ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }

  const { id } = await params
  const { subscriptionStatus, plan } = await req.json()

  const company = await db.company.findUnique({ where: { id } })
  if (!company) {
    return NextResponse.json({ error: 'Company not found' }, { status: 404 })
  }

  const newPlan = plan || company.plan
  const newRevenue = newPlan === 'GROWTH' ? 199 : newPlan === 'STARTER' ? 99 : 0

  const updated = await db.company.update({
    where: { id },
    data: {
      subscriptionStatus: subscriptionStatus || company.subscriptionStatus,
      plan: newPlan,
      monthlyRevenue: subscriptionStatus === 'CANCELED' ? 0 : newRevenue,
      seats: newPlan === 'GROWTH' ? 200 : 50,
    },
  })

  await auditLog({
    userId: session.id,
    action: 'SUBSCRIPTION_OVERRIDE',
    entityType: 'Company',
    entityId: id,
    companyId: id,
    metadata: { subscriptionStatus, plan, previousStatus: company.subscriptionStatus, previousPlan: company.plan },
  })

  return NextResponse.json({ company: updated })
}
