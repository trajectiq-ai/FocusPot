import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession } from '@/lib/auth'
import { z } from 'zod'

const createSchema = z.object({
  name: z.string().min(2, 'Team name must be at least 2 characters').max(50),
  color: z.enum(['emerald', 'amber', 'rose', 'sky', 'violet', 'orange']).default('emerald'),
})

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
    where: { companyId: admin.companyId, role: 'EMPLOYEE', teamId: { not: null }, active: true },
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

// POST /api/admin/teams
// Create a new team
export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session || session.role !== 'COMPANY_ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }

  const body = await req.json().catch(() => null)
  const parsed = createSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message || 'Invalid input' }, { status: 400 })
  }

  const admin = await db.user.findUnique({ where: { id: session.id }, select: { companyId: true } })
  if (!admin?.companyId) {
    return NextResponse.json({ error: 'No company assigned' }, { status: 400 })
  }

  const existing = await db.team.findFirst({ where: { name: parsed.data.name.trim(), companyId: admin.companyId } })
  if (existing) {
    return NextResponse.json({ error: 'A team with this name already exists' }, { status: 409 })
  }

  const team = await db.team.create({
    data: { name: parsed.data.name.trim(), color: parsed.data.color, companyId: admin.companyId },
  })

  return NextResponse.json({ team })
}
