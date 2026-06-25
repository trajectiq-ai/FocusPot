import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession } from '@/lib/auth'
import { z } from 'zod'

const updateSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  title: z.string().max(100).optional(),
  teamId: z.string().optional(),
  active: z.boolean().optional(),
})

// PATCH /api/admin/employees/[id]
// Update an employee's profile (name, title, team assignment, active status).
// PRIVACY SHIELD: admin can manage directory info but CANNOT touch focus stats.
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

  const employee = await db.user.findFirst({
    where: { id, companyId: admin.companyId, role: 'EMPLOYEE' },
  })
  if (!employee) {
    return NextResponse.json({ error: 'Employee not found' }, { status: 404 })
  }

  const updateData: any = {}
  if (parsed.data.name !== undefined) updateData.name = parsed.data.name.trim()
  if (parsed.data.title !== undefined) updateData.title = parsed.data.title.trim()
  if (parsed.data.active !== undefined) updateData.active = parsed.data.active
  if (parsed.data.teamId !== undefined) {
    const team = await db.team.findFirst({ where: { id: parsed.data.teamId, companyId: admin.companyId } })
    if (!team) {
      return NextResponse.json({ error: 'Selected team does not exist' }, { status: 400 })
    }
    updateData.teamId = parsed.data.teamId
  }

  const updated = await db.user.update({
    where: { id },
    data: updateData,
    select: { id: true, name: true, email: true, title: true, role: true, avatarColor: true, active: true, teamId: true, team: { select: { id: true, name: true, color: true } } },
  })

  return NextResponse.json({ employee: updated })
}

// DELETE /api/admin/employees/[id]
// Permanently remove an employee from the company.
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

  const employee = await db.user.findFirst({
    where: { id, companyId: admin.companyId, role: 'EMPLOYEE' },
  })
  if (!employee) {
    return NextResponse.json({ error: 'Employee not found' }, { status: 404 })
  }

  // Delete the employee and their sessions/notifications
  await db.$transaction([
    db.focusSession.deleteMany({ where: { userId: id } }),
    db.notification.deleteMany({ where: { userId: id } }),
    db.user.delete({ where: { id } }),
  ])

  return NextResponse.json({ success: true })
}
