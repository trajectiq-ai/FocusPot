import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { authRateLimit } from '@/lib/rate-limit'
import { sendPasswordResetEmail } from '@/lib/email'
import { randomBytes } from 'crypto'
import { z } from 'zod'

const schema = z.object({
  email: z.string().email().max(200),
})

// POST /api/auth/forgot-password
// Generates a password reset token and emails a reset link.
export async function POST(req: NextRequest) {
  const limited = authRateLimit(req)
  if (limited) return limited

  const body = await req.json().catch(() => null)
  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Valid email is required' }, { status: 400 })
  }

  const email = parsed.data.email.toLowerCase().trim()
  const user = await db.user.findUnique({ where: { email } })

  // Always return success — don't reveal whether the email exists
  if (!user) {
    return NextResponse.json({ success: true, message: 'If an account exists with that email, a reset link has been sent.' })
  }

  // Invalidate any existing tokens for this user
  await db.passwordResetToken.updateMany({
    where: { userId: user.id, usedAt: null },
    data: { usedAt: new Date() },
  })

  // Generate a secure token
  const token = randomBytes(32).toString('hex')
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000) // 1 hour

  await db.passwordResetToken.create({
    data: { userId: user.id, token, expiresAt },
  })

  // Send the reset email (non-blocking)
  sendPasswordResetEmail({
    to: user.email,
    userName: user.name,
    resetToken: token,
  }).catch(() => {
    // Email delivery failure is non-fatal — token is still valid
  })

  return NextResponse.json({ success: true, message: 'If an account exists with that email, a reset link has been sent.' })
}
