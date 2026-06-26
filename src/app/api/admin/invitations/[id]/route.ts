import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession } from '@/lib/auth'
import { auditLog } from '@/lib/audit'
import { errorResponse } from '@/lib/query'
import { z } from 'zod'

const updateSchema = z.object({
  action: z.enum(['revoke', 'expire']).default('revoke'),
})

// PATCH /api/admin/invitations/[id]
// Revoke (status = REVOKED) or expire an invitation. Auth: COMPANY_ADMIN. Audit logged.
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session || session.role !== 'COMPANY_ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }

  const { id } = await params
  const body = await req.json().catch(() => ({}))
  const parsed = updateSchema.safeParse(body)
  if (!parsed.success) {
    return errorResponse(parsed.error.issues[0]?.message || 'Invalid input', 400)
  }

  const admin = await db.user.findUnique({ where: { id: session.id }, select: { companyId: true } })
  if (!admin?.companyId) {
    return errorResponse('No company assigned', 400)
  }

  const invitation = await db.invitation.findFirst({
    where: { id, companyId: admin.companyId },
  })
  if (!invitation) {
    return errorResponse('Invitation not found', 404)
  }

  if (invitation.status === 'ACCEPTED') {
    return errorResponse('Cannot revoke an invitation that has already been accepted', 409)
  }

  const newStatus = parsed.data.action === 'expire' ? 'EXPIRED' : 'REVOKED'
  const updated = await db.invitation.update({
    where: { id },
    data: { status: newStatus },
  })

  await auditLog({
    userId: session.id,
    action: 'INVITATION_REVOKED',
    entityType: 'Invitation',
    entityId: id,
    companyId: admin.companyId,
    metadata: {
      email: invitation.email,
      previousStatus: invitation.status,
      newStatus,
    },
  })

  return NextResponse.json({ invitation: updated })
}
