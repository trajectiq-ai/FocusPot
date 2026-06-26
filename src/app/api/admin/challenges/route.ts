import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession } from '@/lib/auth'
import { auditLog } from '@/lib/audit'
import { sendNotification } from '@/lib/notifications'
import { z } from 'zod'

const createSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(100),
  description: z.string().max(500).default(''),
  startDate: z.string(),
  endDate: z.string(),
  prize: z.string().min(1, 'Prize is required').max(200),
  giftCardValue: z.number().min(0).default(0),
  giftCardCode: z.string().max(500).default(''),
  scoringModel: z.enum(['TOTAL_HOURS', 'AVG_PER_MEMBER', 'PARTICIPATION_RATE', 'WEIGHTED']).default('TOTAL_HOURS'),
  scoringWeights: z.string().default(''),
  scope: z.enum(['COMPANY', 'TEAM']).default('COMPANY'),
  targetTeamId: z.string().nullable().default(null),
  status: z.enum(['DRAFT', 'SCHEDULED', 'ACTIVE']).default('ACTIVE'),
  isRecurring: z.boolean().default(false),
  recurrencePattern: z.string().default(''),
  rewardIds: z.array(z.object({ rewardId: z.string(), tier: z.enum(['WINNER', 'RUNNER_UP', 'PARTICIPATION']), position: z.number() })).optional(),
})

// POST /api/admin/challenges
// Create a new challenge with full enterprise features.
export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session || session.role !== 'COMPANY_ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }

  const body = await req.json().catch(() => null)
  const parsed = createSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message || 'Invalid input' }, { status: 400 })
  }

  const data = parsed.data
  const admin = await db.user.findUnique({
    where: { id: session.id },
    select: { companyId: true, company: { select: { name: true } } },
  })
  if (!admin?.companyId) {
    return NextResponse.json({ error: 'No company assigned' }, { status: 400 })
  }

  // Validate team scope
  if (data.scope === 'TEAM' && data.targetTeamId) {
    const team = await db.team.findFirst({ where: { id: data.targetTeamId, companyId: admin.companyId } })
    if (!team) {
      return NextResponse.json({ error: 'Selected team does not exist' }, { status: 400 })
    }
  }

  // If status is ACTIVE, end existing active challenges for this company
  if (data.status === 'ACTIVE') {
    await db.challenge.updateMany({
      where: { companyId: admin.companyId, status: 'ACTIVE' },
      data: { status: 'COMPLETED' },
    })
  }

  const startDate = new Date(data.startDate)
  const endDate = new Date(data.endDate)

  // Auto-determine status if not explicitly set
  let status = data.status
  if (status === 'ACTIVE' && startDate > new Date()) {
    status = 'SCHEDULED'
  }

  const challenge = await db.challenge.create({
    data: {
      name: data.name,
      description: data.description,
      companyId: admin.companyId,
      startDate,
      endDate,
      prize: data.prize,
      giftCardValue: data.giftCardValue,
      giftCardCode: data.giftCardCode,
      status,
      scoringModel: data.scoringModel,
      scoringWeights: data.scoringWeights,
      scope: data.scope,
      targetTeamId: data.scope === 'TEAM' ? data.targetTeamId : null,
      isRecurring: data.isRecurring,
      recurrencePattern: data.recurrencePattern,
    },
  })

  // Link rewards
  if (data.rewardIds && data.rewardIds.length > 0) {
    await db.challengeReward.createMany({
      data: data.rewardIds.map((r) => ({
        challengeId: challenge.id,
        rewardId: r.rewardId,
        tier: r.tier,
        position: r.position,
      })),
    })
  }

  // Schedule activation + closure jobs
  if (status === 'SCHEDULED') {
    await db.scheduledJob.create({
      data: { type: 'CHALLENGE_ACTIVATE', entityId: challenge.id, scheduledFor: startDate, status: 'PENDING' },
    })
  }
  await db.scheduledJob.create({
    data: { type: 'CHALLENGE_CLOSE', entityId: challenge.id, scheduledFor: endDate, status: 'PENDING' },
  })

  // Notify employees only if challenge is ACTIVE (not draft/scheduled)
  if (status === 'ACTIVE') {
    const employeeWhere = data.scope === 'TEAM' && data.targetTeamId
      ? { companyId: admin.companyId, role: 'EMPLOYEE' as const, active: true, teamId: data.targetTeamId }
      : { companyId: admin.companyId, role: 'EMPLOYEE' as const, active: true }
    const employees = await db.user.findMany({ where: employeeWhere, select: { id: true } })
    for (const e of employees) {
      await sendNotification({
        userId: e.id,
        title: 'Weekly Focus Challenge is Live!',
        message: `The "${data.name}" challenge has started. Open the app to start tracking your deep work hours. Prize: ${data.prize}.`,
        type: 'CHALLENGE',
        prefKey: 'challengeStart',
      })
    }
  }

  // Notify the admin
  await sendNotification({
    userId: session.id,
    title: 'Challenge Created',
    message: `"${data.name}" is ${status === 'ACTIVE' ? 'now active' : status === 'SCHEDULED' ? 'scheduled' : 'saved as draft'}.`,
    type: 'SUCCESS',
  })

  await auditLog({
    userId: session.id,
    action: 'CHALLENGE_CREATED',
    entityType: 'Challenge',
    entityId: challenge.id,
    companyId: admin.companyId,
    metadata: { name: challenge.name, status, scoringModel: data.scoringModel, scope: data.scope },
  })

  return NextResponse.json({ challenge })
}

// GET /api/admin/challenges - list all challenges for the company
export async function GET(req: NextRequest) {
  const session = await getSession()
  if (!session || session.role !== 'COMPANY_ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }

  const admin = await db.user.findUnique({
    where: { id: session.id },
    select: { companyId: true },
  })
  if (!admin?.companyId) {
    return NextResponse.json({ error: 'No company assigned' }, { status: 400 })
  }

  const { searchParams } = new URL(req.url)
  const includeArchived = searchParams.get('includeArchived') === 'true'

  const challenges = await db.challenge.findMany({
    where: { companyId: admin.companyId, archived: includeArchived ? undefined : false },
    orderBy: { startDate: 'desc' },
    include: {
      winnerTeam: { select: { id: true, name: true, color: true } },
      rewards: { include: { reward: { select: { id: true, name: true, type: true, value: true, imageColor: true } } } },
    },
  })

  return NextResponse.json({ challenges })
}
