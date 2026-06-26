import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession } from '@/lib/auth'
import { auditLog } from '@/lib/audit'
import { z } from 'zod'

const updateSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  description: z.string().max(500).optional(),
  prize: z.string().max(200).optional(),
  giftCardValue: z.number().min(0).optional(),
  giftCardCode: z.string().max(500).optional(),
  scoringModel: z.enum(['TOTAL_HOURS', 'AVG_PER_MEMBER', 'PARTICIPATION_RATE', 'WEIGHTED']).optional(),
  scoringWeights: z.string().optional(),
})

// PATCH /api/admin/challenges/[id]
// Update challenge details (only allowed when DRAFT or SCHEDULED)
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
  if (!admin?.companyId) return NextResponse.json({ error: 'No company' }, { status: 400 })

  const challenge = await db.challenge.findFirst({ where: { id, companyId: admin.companyId } })
  if (!challenge) return NextResponse.json({ error: 'Challenge not found' }, { status: 404 })

  if (challenge.status === 'ACTIVE' || challenge.status === 'COMPLETED') {
    return NextResponse.json({ error: 'Cannot edit an active or completed challenge' }, { status: 400 })
  }

  const updated = await db.challenge.update({ where: { id }, data: parsed.data })
  await auditLog({ userId: session.id, action: 'CHALLENGE_UPDATED', entityType: 'Challenge', entityId: id, companyId: admin.companyId, metadata: parsed.data })
  return NextResponse.json({ challenge: updated })
}

// DELETE /api/admin/challenges/[id]
// Permanently delete a challenge (draft/cancelled only) — or archive if completed
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session || session.role !== 'COMPANY_ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }

  const { id } = await params
  const admin = await db.user.findUnique({ where: { id: session.id }, select: { companyId: true } })
  if (!admin?.companyId) return NextResponse.json({ error: 'No company' }, { status: 400 })

  const challenge = await db.challenge.findFirst({ where: { id, companyId: admin.companyId } })
  if (!challenge) return NextResponse.json({ error: 'Challenge not found' }, { status: 404 })

  const { searchParams } = new URL(req.url)
  const action = searchParams.get('action') // 'cancel' | 'duplicate' | 'archive' | undefined (delete)

  if (action === 'cancel') {
    if (challenge.status !== 'ACTIVE' && challenge.status !== 'SCHEDULED') {
      return NextResponse.json({ error: 'Can only cancel active or scheduled challenges' }, { status: 400 })
    }
    const { reason } = await req.json().catch(() => ({}))
    const updated = await db.challenge.update({
      where: { id },
      data: { status: 'CANCELLED', cancelledReason: reason || '', cancelledAt: new Date() },
    })
    // Cancel scheduled jobs
    await db.scheduledJob.updateMany({
      where: { entityId: id, status: 'PENDING' },
      data: { status: 'COMPLETED', completedAt: new Date() },
    })
    await auditLog({ userId: session.id, action: 'CHALLENGE_CANCELLED', entityType: 'Challenge', entityId: id, companyId: admin.companyId, metadata: { reason } })
    return NextResponse.json({ challenge: updated })
  }

  if (action === 'duplicate') {
    const newChallenge = await db.challenge.create({
      data: {
        name: `${challenge.name} (Copy)`,
        description: challenge.description,
        companyId: challenge.companyId,
        startDate: new Date(Date.now() + 7 * 86400000),
        endDate: new Date(Date.now() + 11 * 86400000),
        prize: challenge.prize,
        giftCardValue: challenge.giftCardValue,
        giftCardCode: '',
        status: 'DRAFT',
        scoringModel: challenge.scoringModel,
        scoringWeights: challenge.scoringWeights,
        scope: challenge.scope,
        targetTeamId: challenge.targetTeamId,
      },
    })
    await auditLog({ userId: session.id, action: 'CHALLENGE_DUPLICATED', entityType: 'Challenge', entityId: newChallenge.id, companyId: admin.companyId, metadata: { sourceId: id } })
    return NextResponse.json({ challenge: newChallenge })
  }

  if (action === 'archive') {
    const updated = await db.challenge.update({ where: { id }, data: { archived: true } })
    await auditLog({ userId: session.id, action: 'CHALLENGE_ARCHIVED', entityType: 'Challenge', entityId: id, companyId: admin.companyId })
    return NextResponse.json({ challenge: updated })
  }

  // Default: permanent delete (only for DRAFT or CANCELLED)
  if (challenge.status === 'ACTIVE' || challenge.status === 'COMPLETED') {
    return NextResponse.json({ error: 'Cannot delete active or completed challenges. Archive instead.' }, { status: 400 })
  }

  await db.$transaction([
    db.challengeReward.deleteMany({ where: { challengeId: id } }),
    db.focusSession.deleteMany({ where: { challengeId: id } }),
    db.scheduledJob.deleteMany({ where: { entityId: id } }),
    db.challenge.delete({ where: { id } }),
  ])
  await auditLog({ userId: session.id, action: 'CHALLENGE_DELETED', entityType: 'Challenge', entityId: id, companyId: admin.companyId })
  return NextResponse.json({ success: true })
}
