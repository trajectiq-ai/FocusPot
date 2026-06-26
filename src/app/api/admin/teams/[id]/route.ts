import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession } from '@/lib/auth'
import { z } from 'zod'

const updateSchema = z.object({
  name: z.string().min(2).max(50).optional(),
  color: z.enum(['emerald', 'amber', 'rose', 'sky', 'violet', 'orange']).optional(),
})

// PATCH /api/admin/teams/[id]
// Update a team's name or color
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session || session.role !== 'COMPANY_ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }

  const { id } = await params
  const body = await req.json().catch(() => null)
  const parsed = updateSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message || 'Invalid input' }, { status: 400 })
  }

  const admin = await db.user.findUnique({ where: { id: session.id }, select: { companyId: true } })
  if (!admin?.companyId) {
    return NextResponse.json({ error: 'No company assigned' }, { status: 400 })
  }

  const team = await db.team.findFirst({ where: { id, companyId: admin.companyId } })
  if (!team) {
    return NextResponse.json({ error: 'Team not found' }, { status: 404 })
  }

  // Check name uniqueness if changing
  if (parsed.data.name && parsed.data.name !== team.name) {
    const existing = await db.team.findFirst({ where: { name: parsed.data.name.trim(), companyId: admin.companyId, NOT: { id } } })
    if (existing) {
      return NextResponse.json({ error: 'A team with this name already exists' }, { status: 409 })
    }
  }

  const updateData: any = {}
  if (parsed.data.name !== undefined) updateData.name = parsed.data.name.trim()
  if (parsed.data.color !== undefined) updateData.color = parsed.data.color

  const updated = await db.team.update({ where: { id }, data: updateData })
  return NextResponse.json({ team: updated })
}

// DELETE /api/admin/teams/[id]
// Delete a team. Members are reassigned to the oldest remaining team.
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session || session.role !== 'COMPANY_ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }

  const { id } = await params
  const admin = await db.user.findUnique({ where: { id: session.id }, select: { companyId: true } })
  if (!admin?.companyId) {
    return NextResponse.json({ error: 'No company assigned' }, { status: 400 })
  }

  const team = await db.team.findFirst({ where: { id, companyId: admin.companyId } })
  if (!team) {
    return NextResponse.json({ error: 'Team not found' }, { status: 404 })
  }

  // Don't allow deleting if it's the only team
  const teamCount = await db.team.count({ where: { companyId: admin.companyId } })
  if (teamCount <= 1) {
    return NextResponse.json({ error: 'Cannot delete the last team. Create another team first.' }, { status: 400 })
  }

  // Reassign members to the oldest other team
  const fallbackTeam = await db.team.findFirst({
    where: { companyId: admin.companyId, NOT: { id } },
    orderBy: { createdAt: 'asc' },
  })

  await db.$transaction([
    db.user.updateMany({ where: { teamId: id }, data: { teamId: fallbackTeam!.id } }),
    db.team.delete({ where: { id } }),
  ])

  return NextResponse.json({ success: true, reassignedTo: fallbackTeam!.name })
}
