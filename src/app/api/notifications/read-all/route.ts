import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession } from '@/lib/auth'

// POST /api/notifications/read-all
// Mark all of the current user's notifications as read
export async function POST() {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const result = await db.notification.updateMany({
    where: { userId: session.id, read: false },
    data: { read: true },
  })

  return NextResponse.json({ success: true, updated: result.count })
}
