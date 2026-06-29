import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession } from '@/lib/auth'
import { sendVerificationEmail } from '@/lib/email'
import { randomBytes } from 'crypto'

// POST /api/auth/resend-verification
// Resends the email verification link to the logged-in user.
export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const user = await db.user.findUnique({
    where: { id: session.id },
    select: { email: true, name: true, emailVerified: true },
  })

  if (!user) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 })
  }

  if (user.emailVerified) {
    return NextResponse.json({ error: 'Email is already verified' }, { status: 400 })
  }

  // Invalidate existing tokens
  await db.emailVerifyToken.updateMany({
    where: { userId: session.id, usedAt: null },
    data: { usedAt: new Date() },
  })

  const token = randomBytes(32).toString('hex')
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours

  await db.emailVerifyToken.create({
    data: { userId: session.id, token, expiresAt },
  })

  // Fire-and-forget — email delivery failures are non-fatal
  sendVerificationEmail({
    to: user.email,
    userName: user.name,
    verifyToken: token,
  }).catch(() => {})

  return NextResponse.json({ success: true, message: 'Verification email sent' })
}
