import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession } from '@/lib/auth'

// DELETE /api/admin/challenges/[id]
// Permanently delete a challenge and its sessions (admin only)
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

  const challenge = await db.challenge.findFirst({ where: { id, companyId: admin.companyId } })
  if (!challenge) {
    return NextResponse.json({ error: 'Challenge not found' }, { status: 404 })
  }

  await db.$transaction([
    db.focusSession.deleteMany({ where: { challengeId: id } }),
    db.challenge.delete({ where: { id } }),
  ])

  return NextResponse.json({ success: true })
}
