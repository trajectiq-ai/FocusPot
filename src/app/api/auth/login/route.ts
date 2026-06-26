import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { setSession } from '@/lib/auth'
import { verifyPassword } from '@/lib/password'
import { recordLoginAttempt, auditLog } from '@/lib/audit'
import { authRateLimit } from '@/lib/rate-limit'
import { z } from 'zod'

const loginSchema = z.object({
  email: z.string().email().max(200),
  password: z.string().min(1).max(200),
})

const MAX_FAILED_ATTEMPTS = 5
const LOCKOUT_DURATION_MS = 15 * 60 * 1000 // 15 minutes

export async function POST(req: NextRequest) {
  // Rate limit: 10 attempts per 15 minutes per IP
  const limited = authRateLimit(req)
  if (limited) return limited

  const body = await req.json().catch(() => null)
  const parsed = loginSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Valid email and password are required' }, { status: 400 })
  }

  const { email, password } = parsed.data
  const user = await db.user.findFirst({
    where: { email: { equals: email.toLowerCase() } },
  })

  // If user doesn't exist, return generic error (don't reveal which)
  if (!user) {
    return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 })
  }

  // Check account lockout
  if (user.lockedUntil && user.lockedUntil > new Date()) {
    const remainingMs = user.lockedUntil.getTime() - Date.now()
    const remainingMin = Math.ceil(remainingMs / 60000)
    return NextResponse.json(
      { error: `Account locked due to too many failed attempts. Try again in ${remainingMin} minute${remainingMin > 1 ? 's' : ''}.` },
      { status: 429 }
    )
  }

  // Verify password
  if (!verifyPassword(password, user.password)) {
    const newFailedCount = user.failedLoginAttempts + 1
    const shouldLock = newFailedCount >= MAX_FAILED_ATTEMPTS
    await db.user.update({
      where: { id: user.id },
      data: {
        failedLoginAttempts: newFailedCount,
        lockedUntil: shouldLock ? new Date(Date.now() + LOCKOUT_DURATION_MS) : (user.lockedUntil || undefined),
      },
    })
    await recordLoginAttempt({ userId: user.id, success: false, failureReason: 'Invalid password' })
    if (shouldLock) {
      await auditLog({ userId: user.id, action: 'ACCOUNT_LOCKED', entityType: 'User', entityId: user.id, companyId: user.companyId || undefined, metadata: { attempts: newFailedCount } })
    }
    return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 })
  }

  if (!user.active) {
    await recordLoginAttempt({ userId: user.id, success: false, failureReason: 'Account deactivated' })
    return NextResponse.json({ error: 'This account has been deactivated. Contact your administrator.' }, { status: 403 })
  }

  // ARCHITECTURE ENFORCEMENT: The web application is for Super Admins and Company Admins only.
  // Employees must use the FocusPot mobile app (Android/iOS). Deny web access.
  if (user.role === 'EMPLOYEE') {
    await recordLoginAttempt({ userId: user.id, success: false, failureReason: 'Employee web access denied' })
    await auditLog({ userId: user.id, action: 'WEB_ACCESS_DENIED', entityType: 'User', entityId: user.id, companyId: user.companyId || undefined, metadata: { reason: 'Employee attempted web login' } })
    return NextResponse.json(
      {
        error: 'EMPLOYEE_WEB_ACCESS_DENIED',
        message: 'Employees must use the FocusPot mobile app (Android & iOS). The web portal is for administrators only.',
      },
      { status: 403 }
    )
  }

  // Block login for employees of canceled companies
  if (user.role === 'EMPLOYEE' && user.companyId) {
    const company = await db.company.findUnique({ where: { id: user.companyId }, select: { subscriptionStatus: true, maintenanceMode: true } })
    if (company?.subscriptionStatus === 'CANCELED') {
      return NextResponse.json({ error: 'Your company subscription has been canceled.' }, { status: 403 })
    }
  }

  // Successful login — reset failed attempts, update lastLoginAt
  await db.user.update({
    where: { id: user.id },
    data: {
      failedLoginAttempts: 0,
      lockedUntil: null,
      lastLoginAt: new Date(),
    },
  })
  await recordLoginAttempt({ userId: user.id, success: true })
  await auditLog({ userId: user.id, action: 'LOGIN', entityType: 'User', entityId: user.id, companyId: user.companyId || undefined })

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
