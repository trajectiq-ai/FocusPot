import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { auditLog } from '@/lib/audit'

// GET /api/auth/verify-email?token=xxx
// Verifies a user's email address using the token from the email link.
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const token = searchParams.get('token')

  if (!token) {
    return NextResponse.json({ error: 'Verification token is required' }, { status: 400 })
  }

  const verifyToken = await db.emailVerifyToken.findUnique({
    where: { token },
    include: { user: { select: { id: true, email: true, companyId: true } } },
  })

  if (!verifyToken || verifyToken.usedAt || verifyToken.expiresAt < new Date()) {
    return NextResponse.redirect(new URL('/?verify=invalid', req.url))
  }

  await db.$transaction([
    db.user.update({
      where: { id: verifyToken.userId },
      data: { emailVerified: true },
    }),
    db.emailVerifyToken.update({
      where: { id: verifyToken.id },
      data: { usedAt: new Date() },
    }),
  ])

  await auditLog({
    userId: verifyToken.userId,
    action: 'EMAIL_VERIFIED',
    entityType: 'User',
    entityId: verifyToken.userId,
    companyId: verifyToken.user.companyId || undefined,
  })

  return NextResponse.redirect(new URL('/?verify=success', req.url))
}
