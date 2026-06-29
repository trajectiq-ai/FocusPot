import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession } from '@/lib/auth'
import { getQueryParams, paginatedResponse, errorResponse } from '@/lib/query'

// GET /api/admin/redeemptions
// List reward redemptions for the company (paginated, filterable by status).
// Includes reward + user info. Auth: COMPANY_ADMIN.
export async function GET(req: NextRequest) {
  const session = await getSession()
  if (!session || session.role !== 'COMPANY_ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }

  const admin = await db.user.findUnique({ where: { id: session.id }, select: { companyId: true } })
  if (!admin?.companyId) {
    return errorResponse('No company assigned', 400)
  }

  const params = getQueryParams(req, { sortBy: 'redeemedAt', sortOrder: 'desc' })

  const where: any = { companyId: admin.companyId }
  if (params.filters.status) {
    where.status = params.filters.status
  }
  if (params.filters.tier) {
    where.tier = params.filters.tier
  }
  if (params.filters.rewardId) {
    where.rewardId = params.filters.rewardId
  }
  if (params.filters.challengeId) {
    where.challengeId = params.filters.challengeId
  }
  if (params.search) {
    where.OR = [
      { reward: { name: { contains: params.search } } },
      { user: { name: { contains: params.search } } },
      { user: { email: { contains: params.search } } },
      { code: { contains: params.search } },
    ]
  }

  // Map sortBy to relation-aware orderBy
  const sortField = params.sortBy
  const orderBy: any =
    sortField === 'rewardName'
      ? { reward: { name: params.sortOrder } }
      : sortField === 'userName'
        ? { user: { name: params.sortOrder } }
        : { [sortField]: params.sortOrder }

  const [redemptions, total] = await Promise.all([
    db.rewardRedemption.findMany({
      where,
      orderBy,
      skip: params.skip,
      take: params.take,
      include: {
        reward: {
          select: { id: true, name: true, type: true, value: true, provider: true, imageColor: true },
        },
        user: {
          select: { id: true, name: true, email: true, avatarColor: true, teamId: true, team: { select: { id: true, name: true, color: true } } },
        },
      },
    }),
    db.rewardRedemption.count({ where }),
  ])

  return paginatedResponse(
    redemptions.map((r) => ({
      id: r.id,
      rewardId: r.rewardId,
      userId: r.userId,
      challengeId: r.challengeId,
      companyId: r.companyId,
      tier: r.tier,
      position: r.position,
      status: r.status,
      code: r.code,
      notes: r.notes,
      redeemedAt: r.redeemedAt,
      fulfilledAt: r.fulfilledAt,
      expiresAt: r.expiresAt,
      reward: r.reward,
      user: r.user,
    })),
    total,
    params,
  )
}
