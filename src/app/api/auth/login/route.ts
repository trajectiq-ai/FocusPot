import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { setSession } from '@/lib/auth'
import { verifyPassword } from '@/lib/password'
import { z } from 'zod'

const loginSchema = z.object({
  email: z.string().email().max(200),
  password: z.string().min(1).max(200),
})

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null)
  const parsed = loginSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Valid email and password are required' }, { status: 400 })
  }

  const { email, password } = parsed.data
  const user = await db.user.findFirst({
    where: { email: { equals: email.toLowerCase() } },
  })

  if (!user || !verifyPassword(password, user.password)) {
    return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 })
  }

  if (!user.active) {
    return NextResponse.json({ error: 'This account has been deactivated. Contact your administrator.' }, { status: 403 })
  }

  // Block login for employees of canceled companies
  if (user.role === 'EMPLOYEE' && user.companyId) {
    const company = await db.company.findUnique({ where: { id: user.companyId }, select: { subscriptionStatus: true } })
    if (company?.subscriptionStatus === 'CANCELED') {
      return NextResponse.json({ error: 'Your company subscription has been canceled.' }, { status: 403 })
    }
  }

  await setSession(user.id)

  return NextResponse.json({
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    companyId: user.companyId,
    teamId: user.teamId,
    avatarColor: user.avatarColor,
  })
}
