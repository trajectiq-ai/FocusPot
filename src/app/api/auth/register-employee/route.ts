import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { setSession } from '@/lib/auth'
import { hashPassword } from '@/lib/password'
import { sendWelcomeEmail, sendVerificationEmail } from '@/lib/email'
import { randomBytes } from 'crypto'
import { z } from 'zod'

const registerSchema = z.object({
  joinCode: z.string().min(4, 'Join code is required').max(50),
  name: z.string().min(2, 'Name must be at least 2 characters').max(100),
  email: z.string().email('Enter a valid email').max(200),
  password: z.string().min(6, 'Password must be at least 6 characters').max(200),
  teamId: z.string().optional(),
})

// POST /api/auth/register-employee
// Employee joins a company workspace using the company's join code.
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null)
  const parsed = registerSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message || 'Invalid input' }, { status: 400 })
  }

  const { joinCode, name, email, password, teamId } = parsed.data
  const normalizedEmail = email.toLowerCase().trim()
  const normalizedCode = joinCode.trim().toUpperCase()

  const company = await db.company.findUnique({ where: { joinCode: normalizedCode } })
  if (!company) {
    return NextResponse.json({ error: 'Invalid join code. Check with your administrator.' }, { status: 404 })
  }
  if (company.subscriptionStatus === 'CANCELED') {
    return NextResponse.json({ error: 'This company workspace is no longer active.' }, { status: 403 })
  }

  const existingUser = await db.user.findUnique({ where: { email: normalizedEmail } })
  if (existingUser) {
    return NextResponse.json({ error: 'An account with this email already exists' }, { status: 409 })
  }

  // Seat limit check
  const employeeCount = await db.user.count({ where: { companyId: company.id, role: 'EMPLOYEE' } })
  if (employeeCount >= company.seats) {
    return NextResponse.json({ error: `Seat limit reached (${company.seats}). Contact your admin to upgrade.` }, { status: 403 })
  }

  // Validate team belongs to company if provided
  let resolvedTeamId = teamId
  if (!resolvedTeamId) {
    // Assign to first team (default "General")
    const defaultTeam = await db.team.findFirst({ where: { companyId: company.id }, orderBy: { createdAt: 'asc' } })
    resolvedTeamId = defaultTeam?.id
  } else {
    const team = await db.team.findFirst({ where: { id: resolvedTeamId, companyId: company.id } })
    if (!team) {
      return NextResponse.json({ error: 'Selected team does not belong to this company' }, { status: 400 })
    }
  }

  const colors = ['emerald', 'amber', 'rose', 'sky', 'violet', 'orange']
  const user = await db.user.create({
    data: {
      email: normalizedEmail,
      name: name.trim(),
      password: hashPassword(password),
      role: 'EMPLOYEE',
      companyId: company.id,
      teamId: resolvedTeamId,
      avatarColor: colors[Math.floor(Math.random() * colors.length)],
    },
  })

  await db.notification.create({
    data: {
      userId: user.id,
      title: `Welcome to ${company.name}! 🎯`,
      message: 'You are all set. Head to the Focus Timer to start your first deep work session and earn points for your team.',
      type: 'SUCCESS',
    },
  })

  // Send welcome email (non-blocking, graceful fallback)
  sendWelcomeEmail({
    to: user.email,
    userName: user.name,
    companyName: company.name,
    joinCode: company.joinCode,
  }).catch(() => {})

  // Generate an email verification token and send the verification email.
  // Fire-and-forget — registration response is never blocked on email delivery.
  const verifyToken = randomBytes(32).toString('hex')
  const verifyExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours
  db.emailVerifyToken
    .create({
      data: { userId: user.id, token: verifyToken, expiresAt: verifyExpiresAt },
    })
    .then(() =>
      sendVerificationEmail({
        to: user.email,
        userName: user.name,
        verifyToken,
      })
    )
    .catch(() => {})

  await setSession(user.id)

  return NextResponse.json({
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    companyId: user.companyId,
    teamId: user.teamId,
    avatarColor: user.avatarColor,
    emailVerified: user.emailVerified,
  })
}
