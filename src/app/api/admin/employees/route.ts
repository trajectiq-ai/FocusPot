import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession } from '@/lib/auth'
import { hashPassword, generateTempPassword } from '@/lib/password'
import { z } from 'zod'

const addSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(100),
  email: z.string().email('Enter a valid email').max(200),
  title: z.string().max(100).default(''),
  teamId: z.string().min(1, 'Team is required'),
})

// GET /api/admin/employees
// Returns the company's employee directory.
// PRIVACY SHIELD: Returns ONLY directory info (name, email, team, role, joined date).
// NEVER returns focus hours, sessions, streaks, or points — those stay private.
export async function GET() {
  const session = await getSession()
  if (!session || session.role !== 'COMPANY_ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }

  const admin = await db.user.findUnique({
    where: { id: session.id },
    select: { companyId: true, company: { select: { seats: true } } },
  })
  if (!admin?.companyId || !admin.company) {
    return NextResponse.json({ error: 'No company assigned' }, { status: 400 })
  }

  const users = await db.user.findMany({
    where: { companyId: admin.companyId, role: { in: ['EMPLOYEE', 'COMPANY_ADMIN'] } },
    orderBy: [{ active: 'desc' }, { name: 'asc' }],
    select: {
      id: true,
      name: true,
      email: true,
      title: true,
      role: true,
      avatarColor: true,
      active: true,
      teamId: true,
      createdAt: true,
      team: { select: { id: true, name: true, color: true } },
    },
  })

  const employeeCount = users.filter((u) => u.role === 'EMPLOYEE' && u.active).length

  return NextResponse.json({
    employees: users,
    seats: admin.company.seats,
    employeeCount,
  })
}

// POST /api/admin/employees
// Add a new employee to the company (admin-invited).
export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session || session.role !== 'COMPANY_ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }

  const body = await req.json().catch(() => null)
  const parsed = addSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message || 'Invalid input' }, { status: 400 })
  }

  const admin = await db.user.findUnique({
    where: { id: session.id },
    select: { companyId: true, company: { select: { seats: true, name: true, subscriptionStatus: true } } },
  })
  if (!admin?.companyId || !admin.company) {
    return NextResponse.json({ error: 'No company assigned' }, { status: 400 })
  }

  const normalizedEmail = parsed.data.email.toLowerCase().trim()
  const existing = await db.user.findUnique({ where: { email: normalizedEmail } })
  if (existing) {
    return NextResponse.json({ error: 'An account with this email already exists' }, { status: 409 })
  }

  // Validate team
  const team = await db.team.findFirst({ where: { id: parsed.data.teamId, companyId: admin.companyId } })
  if (!team) {
    return NextResponse.json({ error: 'Selected team does not exist' }, { status: 400 })
  }

  // Seat limit
  const employeeCount = await db.user.count({ where: { companyId: admin.companyId, role: 'EMPLOYEE', active: true } })
  if (employeeCount >= admin.company.seats) {
    return NextResponse.json({ error: `Seat limit reached (${admin.company.seats}). Upgrade your plan to add more employees.` }, { status: 403 })
  }

  const tempPassword = generateTempPassword()
  const colors = ['emerald', 'amber', 'rose', 'sky', 'violet', 'orange']
  const user = await db.user.create({
    data: {
      email: normalizedEmail,
      name: parsed.data.name.trim(),
      password: hashPassword(tempPassword),
      title: parsed.data.title,
      role: 'EMPLOYEE',
      companyId: admin.companyId,
      teamId: parsed.data.teamId,
      avatarColor: colors[Math.floor(Math.random() * colors.length)],
    },
  })

  await db.notification.create({
    data: {
      userId: user.id,
      title: `Welcome to ${admin.company.name}! 🎯`,
      message: 'You have been added to FocusPot. Head to the Focus Timer to start your first deep work session.',
      type: 'SUCCESS',
    },
  })

  return NextResponse.json({
    employee: {
      id: user.id,
      name: user.name,
      email: user.email,
      title: user.title,
      role: user.role,
      avatarColor: user.avatarColor,
      teamId: user.teamId,
      tempPassword, // returned once so admin can share it; not stored in plaintext anywhere visible
    },
  })
}
