import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession } from '@/lib/auth'
import { getQueryParams, paginatedResponse } from '@/lib/query'

// GET /api/super/audit-log
// Platform-wide audit log (paginated, filterable). Auth: SUPER_ADMIN.
export async function GET(req: NextRequest) {
  const session = await getSession()
  if (!session || session.role !== 'SUPER_ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }

  const params = getQueryParams(req, { sortBy: 'createdAt', sortOrder: 'desc' })

  const where: any = {}
  if (params.filters.action) where.action = { contains: params.filters.action }
  if (params.filters.entityType) where.entityType = params.filters.entityType
  if (params.filters.userId) where.userId = params.filters.userId
  if (params.filters.companyId) where.companyId = params.filters.companyId
  if (params.search) {
    where.OR = [
      { action: { contains: params.search } },
      { entityType: { contains: params.search } },
    ]
  }

  const [logs, total] = await Promise.all([
    db.auditLog.findMany({
      where,
      orderBy: { [params.sortBy]: params.sortOrder },
      skip: params.skip,
      take: params.take,
      include: {
        user: { select: { id: true, name: true, email: true, role: true } },
        company: { select: { id: true, name: true, domain: true } },
      },
    }),
    db.auditLog.count({ where }),
  ])

  return paginatedResponse(
    logs.map((l) => ({
      id: l.id,
      userId: l.userId,
      action: l.action,
      entityType: l.entityType,
      entityId: l.entityId,
      companyId: l.companyId,
      metadata: (() => {
        try {
          return JSON.parse(l.metadata)
        } catch {
          return {}
        }
      })(),
      ipAddress: l.ipAddress,
      createdAt: l.createdAt,
      user: l.user,
      company: l.company,
    })),
    total,
    params,
  )
}
