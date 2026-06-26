import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession } from '@/lib/auth'
import { auditLog } from '@/lib/audit'
import { getQueryParams, paginatedResponse, errorResponse } from '@/lib/query'
import { z } from 'zod'

const createSchema = z.object({
  title: z.string().min(2, 'Title must be at least 2 characters').max(200),
  message: z.string().min(1, 'Message is required').max(2000),
  type: z.enum(['INFO', 'WARNING', 'MAINTENANCE']).default('INFO'),
  active: z.boolean().default(true),
  dismissible: z.boolean().default(true),
  startsAt: z.string().datetime().optional(),
  endsAt: z.string().datetime().nullable().optional(),
})

// GET /api/super/announcements
// List all platform announcements (paginated, filterable by type/active).
export async function GET(req: NextRequest) {
  const session = await getSession()
  if (!session || session.role !== 'SUPER_ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }

  const params = getQueryParams(req, { sortBy: 'createdAt', sortOrder: 'desc' })

  const where: any = {}
  if (params.filters.type) where.type = params.filters.type
  if (params.filters.active !== undefined) {
    where.active = params.filters.active === 'true'
  }
  if (params.search) {
    where.OR = [
      { title: { contains: params.search } },
      { message: { contains: params.search } },
    ]
  }

  const [announcements, total] = await Promise.all([
    db.platformAnnouncement.findMany({
      where,
      orderBy: { [params.sortBy]: params.sortOrder },
      skip: params.skip,
      take: params.take,
    }),
    db.platformAnnouncement.count({ where }),
  ])

  return paginatedResponse(announcements, total, params)
}

// POST /api/super/announcements
export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session || session.role !== 'SUPER_ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }

  const body = await req.json().catch(() => null)
  const parsed = createSchema.safeParse(body)
  if (!parsed.success) {
    return errorResponse(parsed.error.issues[0]?.message || 'Invalid input', 400)
  }

  if (parsed.data.endsAt && parsed.data.startsAt) {
    if (new Date(parsed.data.endsAt) < new Date(parsed.data.startsAt)) {
      return errorResponse('endsAt cannot be before startsAt', 400)
    }
  }

  const { startsAt, endsAt, ...rest } = parsed.data
  const announcement = await db.platformAnnouncement.create({
    data: {
      ...rest,
      startsAt: startsAt ? new Date(startsAt) : new Date(),
      endsAt: endsAt ? new Date(endsAt) : null,
    },
  })

  await auditLog({
    userId: session.id,
    action: 'ANNOUNCEMENT_CREATED',
    entityType: 'PlatformAnnouncement',
    entityId: announcement.id,
    metadata: { title: announcement.title, type: announcement.type, active: announcement.active },
  })

  return NextResponse.json({ announcement }, { status: 201 })
}
