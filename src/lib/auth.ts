import { createHmac, timingSafeEqual } from 'crypto'
import { cookies } from 'next/headers'
import { db } from './db'

/**
 * Secure session management.
 *
 * Cookies are signed with HMAC using SESSION_SECRET to prevent tampering.
 * Format: "userId.signature"
 */

export const SESSION_COOKIE = 'focuspot_session'
const SECRET = process.env.SESSION_SECRET || 'dev-only-fallback-secret-change-in-production'

function sign(value: string): string {
  return createHmac('sha256', SECRET).update(value).digest('hex')
}

function verifySignature(value: string, signature: string): boolean {
  const expected = sign(value)
  try {
    return timingSafeEqual(Buffer.from(expected), Buffer.from(signature))
  } catch {
    return false
  }
}

export type SessionUser = {
  id: string
  email: string
  name: string
  role: 'SUPER_ADMIN' | 'COMPANY_ADMIN' | 'EMPLOYEE'
  companyId: string | null
  teamId: string | null
  avatarColor: string
  emailVerified: boolean
}

export async function getSession(): Promise<SessionUser | null> {
  const cookieStore = await cookies()
  const raw = cookieStore.get(SESSION_COOKIE)?.value
  if (!raw) return null

  // Parse "userId.signature"
  const dotIndex = raw.lastIndexOf('.')
  if (dotIndex === -1) return null

  const userId = raw.substring(0, dotIndex)
  const signature = raw.substring(dotIndex + 1)

  // Verify signature to prevent cookie tampering
  if (!verifySignature(userId, signature)) {
    return null
  }

  const user = await db.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      companyId: true,
      teamId: true,
      avatarColor: true,
      emailVerified: true,
    },
  })

  if (!user) return null
  return user as SessionUser
}

export async function setSession(userId: string) {
  const cookieStore = await cookies()
  const signature = sign(userId)
  const cookieValue = `${userId}.${signature}`
  cookieStore.set(SESSION_COOKIE, cookieValue, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 60 * 60 * 24 * 7, // 7 days
    path: '/',
  })
}

export async function clearSession() {
  const cookieStore = await cookies()
  cookieStore.delete(SESSION_COOKIE)
}
