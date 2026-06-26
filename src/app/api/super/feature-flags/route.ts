import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession } from '@/lib/auth'
import { auditLog } from '@/lib/audit'
import { getQueryParams, paginatedResponse, errorResponse } from '@/lib/query'
import { z } from 'zod'

const createSchema = z.object({
  key: z
    .string()
    .min(2, 'Key must be at least 2 characters')
    .max(80)
    .regex(/^[A-Z0-9_]+$/, 'Key must be UPPERCASE_SNAKE_CASE'),
  name: z.string().min(2).max(120),
  description: z.string().max(500).default(''),
  enabled: z.boolean().default(false),
  scope: z.enum(['GLOBAL', 'COMPANY']).default('GLOBAL'),
  companyId: z.string().optional().nullable(),
})

// GET /api/super/feature-flags
// List all feature flags (paginated, filterable by scope/enabled/key).
export async function GET(req: NextRequest) {
  const session = await getSession()
  if (!session || session.role !== 'SUPER_ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }

  const params = getQueryParams(req, { sortBy: 'createdAt', sortOrder: 'desc' })

  const where: any = {}
  if (params.filters.scope) where.scope = params.filters.scope
  if (params.filters.enabled !== undefined) {
    where.enabled = params.filters.enabled === 'true'
  }
  if (params.filters.companyId) where.companyId = params.filters.companyId
  if (params.search) {
    where.OR = [
      { key: { contains: params.search } },
      { name: { contains: params.search } },
      { description: { contains: params.search } },
    ]
  }

  // Resolve company info separately (FeatureFlag has no company relation in schema)
  const companyIds = Array.from(
    new Set(
      (await db.featureFlag.findMany({
        where,
        select: { companyId: true },
      }))
        .map((f) => f.companyId)
        .filter((id): id is string => !!id),
    ),
  )
  const companies = companyIds.length
    ? await db.company.findMany({
        where: { id: { in: companyIds } },
        select: { id: true, name: true, domain: true },
      })
    : []
  const companyMap = new Map(companies.map((c) => [c.id, c]))

  const [flags, total] = await Promise.all([
    db.featureFlag.findMany({
      where,
      orderBy: { [params.sortBy]: params.sortOrder },
      skip: params.skip,
      take: params.take,
    }),
    db.featureFlag.count({ where }),
  ])

  return paginatedResponse(
    flags.map((f) => ({
      ...f,
      company: f.companyId ? companyMap.get(f.companyId) || null : null,
    })),
    total,
    params,
  )
}

// POST /api/super/feature-flags
// Create a feature flag. Auth: SUPER_ADMIN.
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

  if (parsed.data.scope === 'COMPANY' && !parsed.data.companyId) {
    return errorResponse('companyId is required when scope is COMPANY', 400)
  }
  if (parsed.data.scope === 'GLOBAL' && parsed.data.companyId) {
    return errorResponse('companyId must be null when scope is GLOBAL', 400)
  }

  // Validate company exists when scoped
  if (parsed.data.companyId) {
    const company = await db.company.findUnique({ where: { id: parsed.data.companyId } })
    if (!company) {
      return errorResponse('Selected company does not exist', 400)
    }
  }

  const existing = await db.featureFlag.findUnique({ where: { key: parsed.data.key } })
  if (existing) {
    return errorResponse('A flag with this key already exists', 409)
  }

  const flag = await db.featureFlag.create({
    data: {
      key: parsed.data.key,
      name: parsed.data.name,
      description: parsed.data.description,
      enabled: parsed.data.enabled,
      scope: parsed.data.scope,
      companyId: parsed.data.scope === 'COMPANY' ? parsed.data.companyId : null,
    },
  })

  await auditLog({
    userId: session.id,
    action: 'FEATURE_FLAG_CREATED',
    entityType: 'FeatureFlag',
    entityId: flag.id,
    metadata: { key: flag.key, scope: flag.scope, enabled: flag.enabled },
  })

  return NextResponse.json({ flag }, { status: 201 })
}
