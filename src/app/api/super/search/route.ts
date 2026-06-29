import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession } from '@/lib/auth'

// GET /api/super/search?q=...
// Global search across companies, users, and challenges. Auth: SUPER_ADMIN.
// Returns grouped results, capped to a sensible per-group limit.
export async function GET(req: NextRequest) {
  const session = await getSession()
  if (!session || session.role !== 'SUPER_ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }

  const { searchParams } = new URL(req.url)
  const q = (searchParams.get('q') || '').trim()
  const limit = Math.min(50, Math.max(1, parseInt(searchParams.get('limit') || '10', 10)))

  if (!q) {
    return NextResponse.json({ companies: [], users: [], challenges: [], query: '' })
  }

  const [companies, users, challenges] = await Promise.all([
    db.company.findMany({
      where: {
        OR: [
          { name: { contains: q } },
          { domain: { contains: q } },
          { joinCode: { contains: q } },
        ],
      },
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: { _count: { select: { users: { where: { role: 'EMPLOYEE' } }, teams: true } } },
    }),
    db.user.findMany({
      where: {
        OR: [{ name: { contains: q } }, { email: { contains: q } }],
      },
      take: limit,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        active: true,
        avatarColor: true,
        companyId: true,
        teamId: true,
        createdAt: true,
        company: { select: { id: true, name: true, domain: true } },
        team: { select: { id: true, name: true, color: true } },
      },
    }),
    db.challenge.findMany({
      where: {
        OR: [{ name: { contains: q } }, { description: { contains: q } }, { prize: { contains: q } }],
      },
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        company: { select: { id: true, name: true, domain: true } },
        winnerTeam: { select: { id: true, name: true, color: true } },
      },
    }),
  ])

  return NextResponse.json({
    query: q,
    counts: {
      companies: companies.length,
      users: users.length,
      challenges: challenges.length,
    },
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
      joinCode: c.joinCode,
      createdAt: c.createdAt,
    })),
    users: users.map((u) => ({
      id: u.id,
      name: u.name,
      email: u.email,
      role: u.role,
      active: u.active,
      avatarColor: u.avatarColor,
      company: u.company,
      team: u.team,
      createdAt: u.createdAt,
    })),
    challenges: challenges.map((c) => ({
      id: c.id,
      name: c.name,
      description: c.description,
      status: c.status,
      scope: c.scope,
      prize: c.prize,
      giftCardValue: c.giftCardValue,
      startDate: c.startDate,
      endDate: c.endDate,
      company: c.company,
      winnerTeam: c.winnerTeam,
    })),
  })
}
