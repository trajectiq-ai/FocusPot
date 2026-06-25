import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession } from '@/lib/auth'

// GET /api/admin/teams
// Returns teams for the company admin (anonymous member counts only)
export async function GET() {
  const session = await getSession()
  if (!session || session.role !== 'COMPANY_ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }

  const admin = await db.user.findUnique({
    where: { id: session.id },
    select: { companyId: true },
  })
  if (!admin?.companyId) {
    return NextResponse.json({ error: 'No company assigned' }, { status: 400 })
  }

  const teams = await db.team.findMany({
    where: { companyId: admin.companyId },
    orderBy: { name: 'asc' },
    select: { id: true, name: true, color: true, createdAt: true },
  })

  const memberCounts = await db.user.groupBy({
    by: ['teamId'],
    where: { companyId: admin.companyId, role: 'EMPLOYEE', teamId: { not: null } },
    _count: true,
  })
  const countMap = new Map(memberCounts.map((m) => [m.teamId, m._count]))

  return NextResponse.json({
    teams: teams.map((t) => ({
      ...t,
      memberCount: countMap.get(t.id) || 0,
    })),
  })
}
