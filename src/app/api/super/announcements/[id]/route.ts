import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession } from '@/lib/auth'
import { auditLog } from '@/lib/audit'
import { errorResponse } from '@/lib/query'
import { z } from 'zod'

const updateSchema = z.object({
  title: z.string().min(2).max(200).optional(),
  message: z.string().max(2000).optional(),
  type: z.enum(['INFO', 'WARNING', 'MAINTENANCE']).optional(),
  active: z.boolean().optional(),
  dismissible: z.boolean().optional(),
  startsAt: z.string().datetime().optional(),
  endsAt: z.string().datetime().nullable().optional(),
})

// PATCH /api/super/announcements/[id]
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session || session.role !== 'SUPER_ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }

  const { id } = await params
  const body = await req.json().catch(() => null)
  const parsed = updateSchema.safeParse(body)
  if (!parsed.success) {
    return errorResponse(parsed.error.issues[0]?.message || 'Invalid input', 400)
  }

  const announcement = await db.platformAnnouncement.findUnique({ where: { id } })
  if (!announcement) {
    return errorResponse('Announcement not found', 404)
  }

  const startsAtDate = parsed.data.startsAt ? new Date(parsed.data.startsAt) : announcement.startsAt
  const endsAtDate =
    parsed.data.endsAt === null
      ? null
      : parsed.data.endsAt
        ? new Date(parsed.data.endsAt)
        : announcement.endsAt

  if (endsAtDate && endsAtDate < startsAtDate) {
    return errorResponse('endsAt cannot be before startsAt', 400)
  }

  const updateData: any = {}
  if (parsed.data.title !== undefined) updateData.title = parsed.data.title
  if (parsed.data.message !== undefined) updateData.message = parsed.data.message
  if (parsed.data.type !== undefined) updateData.type = parsed.data.type
  if (parsed.data.active !== undefined) updateData.active = parsed.data.active
  if (parsed.data.dismissible !== undefined) updateData.dismissible = parsed.data.dismissible
  if (parsed.data.startsAt !== undefined) updateData.startsAt = new Date(parsed.data.startsAt)
  if (parsed.data.endsAt !== undefined) {
    updateData.endsAt = parsed.data.endsAt ? new Date(parsed.data.endsAt) : null
  }

  const updated = await db.platformAnnouncement.update({ where: { id }, data: updateData })

  await auditLog({
    userId: session.id,
    action: 'ANNOUNCEMENT_UPDATED',
    entityType: 'PlatformAnnouncement',
    entityId: id,
    metadata: { fields: Object.keys(parsed.data) },
  })

  return NextResponse.json({ announcement: updated })
}

// DELETE /api/super/announcements/[id]
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session || session.role !== 'SUPER_ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }

  const { id } = await params
  const announcement = await db.platformAnnouncement.findUnique({ where: { id } })
  if (!announcement) {
    return errorResponse('Announcement not found', 404)
  }

  await db.platformAnnouncement.delete({ where: { id } })

  await auditLog({
    userId: session.id,
    action: 'ANNOUNCEMENT_DELETED',
    entityType: 'PlatformAnnouncement',
    entityId: id,
    metadata: { title: announcement.title },
  })

  return NextResponse.json({ success: true })
}
