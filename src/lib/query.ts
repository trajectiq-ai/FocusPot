import { NextRequest, NextResponse } from 'next/server'

/**
 * Standard pagination parameters extracted from query string.
 */
export type PaginationParams = {
  page: number
  pageSize: number
  skip: number
  take: number
}

export type SortParams = {
  sortBy: string
  sortOrder: 'asc' | 'desc'
}

export type QueryParams = PaginationParams & SortParams & {
  search: string
  filters: Record<string, string>
}

/**
 * Extracts pagination, sorting, search, and filter params from a request URL.
 * Defaults: page=1, pageSize=20, sortBy=createdAt, sortOrder=desc
 */
export function getQueryParams(req: NextRequest, defaults?: Partial<QueryParams>): QueryParams {
  const { searchParams } = new URL(req.url)
  const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10))
  const pageSize = Math.min(100, Math.max(1, parseInt(searchParams.get('pageSize') || '20', 10)))
  const sortBy = searchParams.get('sortBy') || defaults?.sortBy || 'createdAt'
  const sortOrder = (searchParams.get('sortOrder') || defaults?.sortOrder || 'desc') as 'asc' | 'desc'
  const search = searchParams.get('search') || ''

  const filters: Record<string, string> = {}
  for (const [key, value] of searchParams.entries()) {
    if (!['page', 'pageSize', 'sortBy', 'sortOrder', 'search'].includes(key)) {
      filters[key] = value
    }
  }

  return {
    page,
    pageSize,
    skip: (page - 1) * pageSize,
    take: pageSize,
    sortBy,
    sortOrder,
    search,
    filters,
  }
}

/**
 * Wraps a paginated result in a standard envelope.
 */
export function paginatedResponse<T>(data: T[], total: number, params: QueryParams) {
  return NextResponse.json({
    data,
    pagination: {
      page: params.page,
      pageSize: params.pageSize,
      total,
      totalPages: Math.ceil(total / params.pageSize),
      hasNext: params.page * params.pageSize < total,
      hasPrev: params.page > 1,
    },
  })
}

/**
 * Standard error response format.
 */
export function errorResponse(error: string, status: number = 400, details?: Record<string, unknown>) {
  return NextResponse.json({ error, details }, { status })
}

/**
 * Builds a Prisma `where` clause for search across multiple string fields.
 */
export function searchClause(search: string, fields: string[]) {
  if (!search) return {}
  return {
    OR: fields.map((field) => ({
      [field]: { contains: search },
    })),
  }
}
