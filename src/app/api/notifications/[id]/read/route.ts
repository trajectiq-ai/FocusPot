import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession } from '@/lib/auth'

// PATCH /api/notifications/[id]/read
// Mark a single notification as read
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params
  const notification = await db.notification.findUnique({ where: { id } })
  if (!notification || notification.userId !== session.id) {
    return NextResponse.json({ error: 'Notification not found' }, { status: 404 })
  }

  await db.notification.update({ where: { id }, data: { read: true } })
  return NextResponse.json({ success: true })
}
