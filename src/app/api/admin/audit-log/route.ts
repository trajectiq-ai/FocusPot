import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession } from '@/lib/auth'
import { getQueryParams, paginatedResponse } from '@/lib/query'

// GET /api/admin/audit-log
// Returns audit log entries for the company (paginated, filterable)
export async function GET(req: NextRequest) {
  const session = await getSession()
  if (!session || session.role !== 'COMPANY_ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }

  const admin = await db.user.findUnique({ where: { id: session.id }, select: { companyId: true } })
  if (!admin?.companyId) return NextResponse.json({ error: 'No company' }, { status: 400 })

  const params = getQueryParams(req, { sortBy: 'createdAt', sortOrder: 'desc' })
  const where: any = { companyId: admin.companyId }
  if (params.filters.action) where.action = { contains: params.filters.action }
  if (params.filters.entityType) where.entityType = params.filters.entityType
  if (params.search) {
    where.OR = [{ action: { contains: params.search } }, { entityType: { contains: params.search } }]
  }

  const [logs, total] = await Promise.all([
    db.auditLog.findMany({
      where,
      orderBy: { [params.sortBy]: params.sortOrder },
      skip: params.skip,
      take: params.take,
      include: { user: { select: { name: true, email: true } } },
    }),
    db.auditLog.count({ where }),
  ])

  return paginatedResponse(logs, total, params)
}
