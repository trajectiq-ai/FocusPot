import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession } from '@/lib/auth'

// GET /api/employee/rewards
// Returns the user's reward redemptions (history of rewards won). Auth: EMPLOYEE.
export async function GET() {
  const session = await getSession()
  if (!session || session.role !== 'EMPLOYEE') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }

  const redemptions = await db.rewardRedemption.findMany({
    where: { userId: session.id },
    orderBy: { redeemedAt: 'desc' },
    include: {
      reward: {
        select: {
          id: true,
          name: true,
          description: true,
          type: true,
          value: true,
          provider: true,
          imageColor: true,
        },
      },
      user: {
        select: { id: true, name: true, avatarColor: true, team: { select: { id: true, name: true, color: true } } },
      },
    },
  })

  const summary = {
    total: redemptions.length,
    pending: redemptions.filter((r) => r.status === 'PENDING').length,
    approved: redemptions.filter((r) => r.status === 'APPROVED').length,
    fulfilled: redemptions.filter((r) => r.status === 'FULFILLED').length,
    declined: redemptions.filter((r) => r.status === 'DECLINED').length,
    totalValue: redemptions
      .filter((r) => r.status === 'FULFILLED')
      .reduce((sum, r) => sum + r.reward.value, 0),
  }

  return NextResponse.json({
    summary,
    redemptions: redemptions.map((r) => ({
      id: r.id,
      rewardId: r.rewardId,
      challengeId: r.challengeId,
      tier: r.tier,
      position: r.position,
      status: r.status,
      code: r.code,
      notes: r.notes,
      redeemedAt: r.redeemedAt,
      fulfilledAt: r.fulfilledAt,
      expiresAt: r.expiresAt,
      reward: r.reward,
    })),
  })
}
