import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { setSession } from '@/lib/auth'
import { hashPassword, generateJoinCode } from '@/lib/password'
import { sendWelcomeEmail, sendVerificationEmail } from '@/lib/email'
import { randomBytes } from 'crypto'
import { z } from 'zod'

const registerSchema = z.object({
  companyName: z.string().min(2, 'Company name must be at least 2 characters').max(100),
  domain: z.string().min(3, 'Domain must be at least 3 characters').max(100).regex(/^[a-z0-9.-]+\.[a-z]{2,}$/i, 'Enter a valid domain like acme.com'),
  adminName: z.string().min(2, 'Name must be at least 2 characters').max(100),
  adminEmail: z.string().email('Enter a valid email').max(200),
  password: z.string().min(6, 'Password must be at least 6 characters').max(200),
  plan: z.enum(['STARTER', 'GROWTH']).default('STARTER'),
})

// POST /api/auth/register-company
// Full company onboarding: creates company + company admin + a default team,
// activates the subscription (Stripe checkout is initiated separately), logs the admin in.
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null)
  const parsed = registerSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message || 'Invalid input' }, { status: 400 })
  }

  const { companyName, domain, adminName, adminEmail, password, plan } = parsed.data
  const normalizedDomain = domain.toLowerCase().trim()
  const normalizedEmail = adminEmail.toLowerCase().trim()

  // Check for existing company domain or email
  const [existingDomain, existingEmail] = await Promise.all([
    db.company.findUnique({ where: { domain: normalizedDomain } }),
    db.user.findUnique({ where: { email: normalizedEmail } }),
  ])
  if (existingDomain) {
    return NextResponse.json({ error: 'A company with this domain already exists' }, { status: 409 })
  }
  if (existingEmail) {
    return NextResponse.json({ error: 'An account with this email already exists' }, { status: 409 })
  }

  const seats = plan === 'GROWTH' ? 200 : 50
  const monthlyRevenue = plan === 'GROWTH' ? 199 : 99

  // Create company + admin + default team in a transaction
  const result = await db.$transaction(async (tx) => {
    const company = await tx.company.create({
      data: {
        name: companyName.trim(),
        domain: normalizedDomain,
        joinCode: generateJoinCode(companyName),
        plan,
        seats,
        subscriptionStatus: 'ACTIVE',
        monthlyRevenue,
      },
    })

    const defaultTeam = await tx.team.create({
      data: {
        name: 'General',
        color: 'emerald',
        companyId: company.id,
      },
    })

    const admin = await tx.user.create({
      data: {
        email: normalizedEmail,
        name: adminName.trim(),
        password: hashPassword(password),
        title: 'Administrator',
        role: 'COMPANY_ADMIN',
        companyId: company.id,
        avatarColor: 'amber',
      },
    })

    // Welcome notification
    await tx.notification.create({
      data: {
        userId: admin.id,
        title: 'Welcome to FocusPot! 🌿',
        message: `Your company "${company.name}" is all set on the ${plan === 'GROWTH' ? 'Growth' : 'Starter'} plan. Share the join code ${company.joinCode} with your team to invite employees.`,
        type: 'SUCCESS',
      },
    })

    return { company, admin, defaultTeam }
  })

  // Send welcome email to the new company admin (non-blocking)
  sendWelcomeEmail({
    to: result.admin.email,
    userName: result.admin.name,
    companyName: result.company.name,
    joinCode: result.company.joinCode,
  }).catch(() => {})

  // Generate an email verification token and send the verification email.
  // Fire-and-forget — registration response is never blocked on email delivery.
  const verifyToken = randomBytes(32).toString('hex')
  const verifyExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours
  db.emailVerifyToken
    .create({
      data: { userId: result.admin.id, token: verifyToken, expiresAt: verifyExpiresAt },
    })
    .then(() =>
      sendVerificationEmail({
        to: result.admin.email,
        userName: result.admin.name,
        verifyToken,
      })
    )
    .catch(() => {})

  await setSession(result.admin.id)

  return NextResponse.json({
    id: result.admin.id,
    email: result.admin.email,
    name: result.admin.name,
    role: result.admin.role,
    companyId: result.admin.companyId,
    teamId: result.admin.teamId,
    avatarColor: result.admin.avatarColor,
    emailVerified: result.admin.emailVerified,
    company: {
      id: result.company.id,
      name: result.company.name,
      joinCode: result.company.joinCode,
      plan: result.company.plan,
    },
  })
}
