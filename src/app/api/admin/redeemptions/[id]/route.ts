import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession } from '@/lib/auth'
import { auditLog } from '@/lib/audit'
import { errorResponse } from '@/lib/query'
import { z } from 'zod'

const updateSchema = z.object({
  status: z.enum(['APPROVED', 'FULFILLED', 'DECLINED', 'PENDING']).optional(),
  code: z.string().max(200).optional(),
  notes: z.string().max(2000).optional(),
})

// PATCH /api/admin/redeemptions/[id]
// Update redemption status, code, notes. Auth: COMPANY_ADMIN. Audit logged.
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session || session.role !== 'COMPANY_ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }

  const { id } = await params
  const body = await req.json().catch(() => null)
  const parsed = updateSchema.safeParse(body)
  if (!parsed.success) {
    return errorResponse(parsed.error.issues[0]?.message || 'Invalid input', 400)
  }

  const admin = await db.user.findUnique({ where: { id: session.id }, select: { companyId: true } })
  if (!admin?.companyId) {
    return errorResponse('No company assigned', 400)
  }

  const redemption = await db.rewardRedemption.findFirst({
    where: { id, companyId: admin.companyId },
  })
  if (!redemption) {
    return errorResponse('Redemption not found', 404)
  }

  const updateData: any = {}
  if (parsed.data.status !== undefined) {
    updateData.status = parsed.data.status
    if (parsed.data.status === 'FULFILLED') updateData.fulfilledAt = new Date()
    if (parsed.data.status !== 'FULFILLED') updateData.fulfilledAt = null
  }
  if (parsed.data.code !== undefined) updateData.code = parsed.data.code
  if (parsed.data.notes !== undefined) updateData.notes = parsed.data.notes

  const updated = await db.rewardRedemption.update({ where: { id }, data: updateData })

  await auditLog({
    userId: session.id,
    action: 'REDEMPTION_UPDATED',
    entityType: 'RewardRedemption',
    entityId: id,
    companyId: admin.companyId,
    metadata: {
      previousStatus: redemption.status,
      newStatus: parsed.data.status,
      rewardId: redemption.rewardId,
      userId: redemption.userId,
    },
  })

  return NextResponse.json({ redemption: updated })
}
