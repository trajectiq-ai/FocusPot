import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession } from '@/lib/auth'
import { verifyPassword, hashPassword } from '@/lib/password'
import { z } from 'zod'

const profileSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  title: z.string().max(100).optional(),
  avatarColor: z.enum(['emerald', 'amber', 'rose', 'sky', 'violet', 'orange']).optional(),
  currentPassword: z.string().optional(),
  newPassword: z.string().min(6).max(200).optional(),
})

// PATCH /api/employee/profile
// Update the current user's profile (name, title, avatar color, password)
export async function PATCH(req: NextRequest) {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json().catch(() => null)
  const parsed = profileSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message || 'Invalid input' }, { status: 400 })
  }

  const { name, title, avatarColor, currentPassword, newPassword } = parsed.data

  const user = await db.user.findUnique({ where: { id: session.id } })
  if (!user) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 })
  }

  const updateData: any = {}
  if (name !== undefined) updateData.name = name.trim()
  if (title !== undefined) updateData.title = title.trim()
  if (avatarColor !== undefined) updateData.avatarColor = avatarColor

  // Password change requires current password verification
  if (newPassword) {
    if (!currentPassword) {
      return NextResponse.json({ error: 'Current password is required to change password' }, { status: 400 })
    }
    if (!verifyPassword(currentPassword, user.password)) {
      return NextResponse.json({ error: 'Current password is incorrect' }, { status: 403 })
    }
    updateData.password = hashPassword(newPassword)
  }

  const updated = await db.user.update({
    where: { id: session.id },
    data: updateData,
    select: { id: true, name: true, email: true, title: true, avatarColor: true, role: true },
  })

  return NextResponse.json({ user: updated })
}
