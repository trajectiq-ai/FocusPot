import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession } from '@/lib/auth'
import { auditLog } from '@/lib/audit'
import { getQueryParams, paginatedResponse, errorResponse } from '@/lib/query'
import { z } from 'zod'
import { randomBytes } from 'crypto'

const createSchema = z.object({
  email: z.string().email('Enter a valid email').max(200),
  teamId: z.string().optional().nullable(),
  role: z.enum(['EMPLOYEE', 'COMPANY_ADMIN']).default('EMPLOYEE'),
})

// GET /api/admin/invitations
// List invitations for the company (paginated, filterable by status).
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
  if (params.filters.status) where.status = params.filters.status
  if (params.search) {
    where.OR = [{ email: { contains: params.search } }]
  }

  // Resolve teams for the company in one query (Invitation has no team relation)
  const teams = await db.team.findMany({
    where: { companyId: admin.companyId },
    select: { id: true, name: true, color: true },
  })
  const teamMap = new Map(teams.map((t) => [t.id, t]))

  const [invitations, total] = await Promise.all([
    db.invitation.findMany({
      where,
      orderBy: { [params.sortBy]: params.sortOrder },
      skip: params.skip,
      take: params.take,
    }),
    db.invitation.count({ where }),
  ])

  return paginatedResponse(
    invitations.map((inv) => ({
      id: inv.id,
      email: inv.email,
      companyId: inv.companyId,
      teamId: inv.teamId,
      role: inv.role,
      token: inv.token,
      status: inv.status,
      invitedBy: inv.invitedBy,
      expiresAt: inv.expiresAt,
      acceptedAt: inv.acceptedAt,
      createdAt: inv.createdAt,
      team: inv.teamId ? teamMap.get(inv.teamId) || null : null,
      isExpired: inv.status === 'PENDING' && inv.expiresAt < new Date(),
    })),
    total,
    params,
  )
}

// POST /api/admin/invitations
// Create an invitation (email, teamId, role). Generates a unique token, expires in 7 days.
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

  const admin = await db.user.findUnique({
    where: { id: session.id },
    select: { companyId: true, company: { select: { seats: true } } },
  })
  if (!admin?.companyId || !admin.company) {
    return errorResponse('No company assigned', 400)
  }

  const normalizedEmail = parsed.data.email.toLowerCase().trim()

  // Block if email already a user or has a pending invitation
  const existingUser = await db.user.findUnique({ where: { email: normalizedEmail } })
  if (existingUser) {
    return errorResponse('A user with this email already exists', 409)
  }

  const pending = await db.invitation.findFirst({
    where: { email: normalizedEmail, companyId: admin.companyId, status: 'PENDING' },
  })
  if (pending) {
    return errorResponse('A pending invitation already exists for this email', 409)
  }

  // Validate team belongs to the company
  if (parsed.data.teamId) {
    const team = await db.team.findFirst({
      where: { id: parsed.data.teamId, companyId: admin.companyId },
    })
    if (!team) {
      return errorResponse('Selected team does not exist', 400)
    }
  }

  // Generate a unique token (URL-safe)
  let token = randomBytes(12).toString('base64url')
  // Ensure uniqueness (extremely unlikely collision but be safe)
  while (await db.invitation.findUnique({ where: { token } })) {
    token = randomBytes(12).toString('base64url')
  }

  const expiresAt = new Date()
  expiresAt.setDate(expiresAt.getDate() + 7)

  const invitation = await db.invitation.create({
    data: {
      email: normalizedEmail,
      companyId: admin.companyId,
      teamId: parsed.data.teamId || null,
      role: parsed.data.role,
      token,
      status: 'PENDING',
      invitedBy: session.id,
      expiresAt,
    },
  })

  await auditLog({
    userId: session.id,
    action: 'INVITATION_CREATED',
    entityType: 'Invitation',
    entityId: invitation.id,
    companyId: admin.companyId,
    metadata: {
      email: normalizedEmail,
      role: invitation.role,
      teamId: invitation.teamId,
      expiresAt: invitation.expiresAt.toISOString(),
    },
  })

  return NextResponse.json(
    {
      invitation: {
        id: invitation.id,
        email: invitation.email,
        companyId: invitation.companyId,
        teamId: invitation.teamId,
        role: invitation.role,
        token: invitation.token,
        status: invitation.status,
        invitedBy: invitation.invitedBy,
        expiresAt: invitation.expiresAt,
        createdAt: invitation.createdAt,
      },
      // Admin can share this link with the invitee
      inviteUrl: `/?invite=${invitation.token}`,
    },
    { status: 201 },
  )
}
