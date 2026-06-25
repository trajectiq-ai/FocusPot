import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { setSession } from '@/lib/auth'

export async function POST(req: NextRequest) {
  const { email, password } = await req.json()

  if (!email) {
    return NextResponse.json({ error: 'Email is required' }, { status: 400 })
  }

  const user = await db.user.findFirst({
    where: { email: { equals: email.toLowerCase() } },
  })

  if (!user || user.password !== (password || 'demo')) {
    return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 })
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
