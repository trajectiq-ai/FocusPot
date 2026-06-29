import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { hashPassword } from '@/lib/password'
import { auditLog } from '@/lib/audit'
import { authRateLimit } from '@/lib/rate-limit'
import { z } from 'zod'

const schema = z.object({
  token: z.string().min(10, 'Valid token is required'),
  password: z.string().min(6, 'Password must be at least 6 characters').max(200),
})

// POST /api/auth/reset-password
// Resets a password using a valid token.
export async function POST(req: NextRequest) {
  const limited = authRateLimit(req)
  if (limited) return limited

  const body = await req.json().catch(() => null)
  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message || 'Invalid input' }, { status: 400 })
  }

  const { token, password } = parsed.data

  const resetToken = await db.passwordResetToken.findUnique({
    where: { token },
    include: { user: { select: { id: true, email: true, companyId: true } } },
  })

  if (!resetToken || resetToken.usedAt || resetToken.expiresAt < new Date()) {
    return NextResponse.json({ error: 'This reset link is invalid or has expired. Please request a new one.' }, { status: 400 })
  }

  // Update password and mark token as used
  await db.$transaction([
    db.user.update({
      where: { id: resetToken.userId },
      data: {
        password: hashPassword(password),
        passwordChangedAt: new Date(),
        failedLoginAttempts: 0,
        lockedUntil: null,
      },
    }),
    db.passwordResetToken.update({
      where: { id: resetToken.id },
      data: { usedAt: new Date() },
    }),
  ])

  await auditLog({
    userId: resetToken.userId,
    action: 'PASSWORD_RESET',
    entityType: 'User',
    entityId: resetToken.userId,
    companyId: resetToken.user.companyId || undefined,
  })

  return NextResponse.json({ success: true, message: 'Password reset successfully. You can now log in with your new password.' })
}
