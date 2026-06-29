import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession } from '@/lib/auth'
import { auditLog } from '@/lib/audit'
import { errorResponse } from '@/lib/query'
import { z } from 'zod'

const updateSchema = z.object({
  name: z.string().min(2).max(120).optional(),
  description: z.string().max(2000).optional(),
  type: z.enum(['GIFT_CARD', 'MERCH', 'EXPERIENCE', 'CUSTOM']).optional(),
  value: z.number().int().min(0).optional(),
  provider: z.string().max(120).optional(),
  providerSku: z.string().max(120).optional(),
  inventory: z.number().int().optional(),
  imageColor: z.string().max(40).optional(),
  active: z.boolean().optional(),
  expiresAt: z.string().datetime().nullable().optional(),
})

// PATCH /api/admin/rewards/[id]
// Update reward fields. Auth: COMPANY_ADMIN. Audit logged.
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

  const reward = await db.reward.findFirst({ where: { id, companyId: admin.companyId } })
  if (!reward) {
    return errorResponse('Reward not found', 404)
  }

  const { expiresAt, ...rest } = parsed.data
  const updateData: any = { ...rest }
  if (expiresAt !== undefined) {
    updateData.expiresAt = expiresAt ? new Date(expiresAt) : null
  }

  const updated = await db.reward.update({ where: { id }, data: updateData })

  await auditLog({
    userId: session.id,
    action: 'REWARD_UPDATED',
    entityType: 'Reward',
    entityId: id,
    companyId: admin.companyId,
    metadata: { fields: Object.keys(parsed.data) },
  })

  return NextResponse.json({ reward: updated })
}

// DELETE /api/admin/rewards/[id]
// Remove reward. Blocked if it has any redemptions or is linked to a challenge reward.
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session || session.role !== 'COMPANY_ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }

  const { id } = await params
  const admin = await db.user.findUnique({ where: { id: session.id }, select: { companyId: true } })
  if (!admin?.companyId) {
    return errorResponse('No company assigned', 400)
  }

  const reward = await db.reward.findFirst({
    where: { id, companyId: admin.companyId },
    include: {
      _count: { select: { redemptions: true, challengeRewards: true } },
    },
  })
  if (!reward) {
    return errorResponse('Reward not found', 404)
  }

  if (reward._count.redemptions > 0) {
    return errorResponse(
      `Cannot delete a reward with ${reward._count.redemptions} redemption(s). Deactivate it instead.`,
      409,
    )
  }
  if (reward._count.challengeRewards > 0) {
    return errorResponse(
      'Cannot delete a reward currently linked to a challenge. Remove the link first.',
      409,
    )
  }

  await db.reward.delete({ where: { id } })

  await auditLog({
    userId: session.id,
    action: 'REWARD_DELETED',
    entityType: 'Reward',
    entityId: id,
    companyId: admin.companyId,
    metadata: { name: reward.name },
  })

  return NextResponse.json({ success: true })
}
