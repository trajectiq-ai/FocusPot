import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession } from '@/lib/auth'
import { auditLog } from '@/lib/audit'
import { getQueryParams, paginatedResponse, errorResponse } from '@/lib/query'
import { z } from 'zod'

const createSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(120),
  description: z.string().max(2000).default(''),
  type: z.enum(['GIFT_CARD', 'MERCH', 'EXPERIENCE', 'CUSTOM']).default('GIFT_CARD'),
  value: z.number().int().min(0).default(0),
  provider: z.string().max(120).default(''),
  inventory: z.number().int().default(-1),
  imageColor: z.string().max(40).default('emerald'),
  expiresAt: z.string().datetime().optional().or(z.literal('').optional()),
})

// GET /api/admin/rewards
// List rewards for the company (paginated, filterable by type/active).
export async function GET(req: NextRequest) {
  const session = await getSession()
  if (!session || session.role !== 'COMPANY_ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }

  const admin = await db.user.findUnique({ where: { id: session.id }, select: { companyId: true } })
  if (!admin?.companyId) {
    return errorResponse('No company assigned', 400)
  }

  const params = getQueryParams(req, { sortBy: 'createdAt', sortOrder: 'desc' })

  const where: any = { companyId: admin.companyId }
  if (params.filters.type) where.type = params.filters.type
  if (params.filters.active !== undefined) {
    if (params.filters.active === 'true') where.active = true
    else if (params.filters.active === 'false') where.active = false
  }
  if (params.search) {
    where.OR = [
      { name: { contains: params.search } },
      { description: { contains: params.search } },
      { provider: { contains: params.search } },
    ]
  }

  const [rewards, total] = await Promise.all([
    db.reward.findMany({
      where,
      orderBy: { [params.sortBy]: params.sortOrder },
      skip: params.skip,
      take: params.take,
      include: {
        _count: { select: { redemptions: true, challengeRewards: true } },
      },
    }),
    db.reward.count({ where }),
  ])

  return paginatedResponse(
    rewards.map((r) => ({
      id: r.id,
      name: r.name,
      description: r.description,
      type: r.type,
      value: r.value,
      provider: r.provider,
      inventory: r.inventory,
      imageColor: r.imageColor,
      active: r.active,
      expiresAt: r.expiresAt,
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
      redemptionCount: r._count.redemptions,
      linkedChallengeCount: r._count.challengeRewards,
    })),
    total,
    params,
  )
}

// POST /api/admin/rewards
// Create a new reward for the company. Auth: COMPANY_ADMIN. Audit logged.
export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session || session.role !== 'COMPANY_ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }

  const body = await req.json().catch(() => null)
  const parsed = createSchema.safeParse(body)
  if (!parsed.success) {
    return errorResponse(parsed.error.issues[0]?.message || 'Invalid input', 400)
  }

  const admin = await db.user.findUnique({ where: { id: session.id }, select: { companyId: true } })
  if (!admin?.companyId) {
    return errorResponse('No company assigned', 400)
  }

  const { expiresAt, ...rest } = parsed.data
  const reward = await db.reward.create({
    data: {
      ...rest,
      companyId: admin.companyId,
      expiresAt: expiresAt ? new Date(expiresAt) : null,
    },
  })

  await auditLog({
    userId: session.id,
    action: 'REWARD_CREATED',
    entityType: 'Reward',
    entityId: reward.id,
    companyId: admin.companyId,
    metadata: { name: reward.name, type: reward.type, value: reward.value },
  })

  return NextResponse.json({ reward }, { status: 201 })
}
