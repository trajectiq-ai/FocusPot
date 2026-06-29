import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession } from '@/lib/auth'
import { errorResponse } from '@/lib/query'
import { z } from 'zod'

const updateSchema = z.object({
  challengeStart: z.boolean().optional(),
  challengeEnd: z.boolean().optional(),
  challengeWin: z.boolean().optional(),
  weeklyDigest: z.boolean().optional(),
  streakReminder: z.boolean().optional(),
  rewardReady: z.boolean().optional(),
})

// GET /api/employee/notification-preferences
// Returns the user's notification preferences (creates defaults if missing). Auth: EMPLOYEE.
export async function GET() {
  const session = await getSession()
  if (!session || session.role !== 'EMPLOYEE') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }

  const pref = await db.notificationPreference.upsert({
    where: { userId: session.id },
    create: { userId: session.id },
    update: {},
  })

  return NextResponse.json({ preferences: pref })
}

// PATCH /api/employee/notification-preferences
// Update preference flags. Auth: EMPLOYEE.
export async function PATCH(req: NextRequest) {
  const session = await getSession()
  if (!session || session.role !== 'EMPLOYEE') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }

  const body = await req.json().catch(() => null)
  const parsed = updateSchema.safeParse(body)
  if (!parsed.success) {
    return errorResponse(parsed.error.issues[0]?.message || 'Invalid input', 400)
  }

  if (Object.keys(parsed.data).length === 0) {
    return errorResponse('No preference fields provided', 400)
  }

  const updated = await db.notificationPreference.upsert({
    where: { userId: session.id },
    create: { userId: session.id, ...parsed.data },
    update: parsed.data,
  })

  return NextResponse.json({ preferences: updated })
}
