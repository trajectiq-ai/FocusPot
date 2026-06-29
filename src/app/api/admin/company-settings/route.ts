import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession } from '@/lib/auth'
import { auditLog } from '@/lib/audit'
import { errorResponse } from '@/lib/query'
import { z } from 'zod'

const updateSchema = z.object({
  timezone: z.string().max(80).optional(),
  workingHoursStart: z
    .string()
    .regex(/^\d{2}:\d{2}$/, 'Use HH:MM format (e.g. 09:00)')
    .optional(),
  workingHoursEnd: z
    .string()
    .regex(/^\d{2}:\d{2}$/, 'Use HH:MM format (e.g. 17:00)')
    .optional(),
  workingDays: z
    .string()
    .regex(/^(\d,)*\d$/, 'Use comma-separated day numbers (1-7)')
    .optional(),
  primaryColor: z.string().max(40).optional(),
  logoText: z.string().max(120).optional(),
  holidayCalendar: z.array(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)).max(200).optional(),
})

// GET /api/admin/company-settings
// Returns the company's settings. Creates defaults if not present.
export async function GET() {
  const session = await getSession()
  if (!session || session.role !== 'COMPANY_ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }

  const admin = await db.user.findUnique({ where: { id: session.id }, select: { companyId: true } })
  if (!admin?.companyId) {
    return errorResponse('No company assigned', 400)
  }

  const settings = await db.companySettings.upsert({
    where: { companyId: admin.companyId },
    create: { companyId: admin.companyId },
    update: {},
  })

  return NextResponse.json({
    settings: {
      id: settings.id,
      companyId: settings.companyId,
      timezone: settings.timezone,
      workingHoursStart: settings.workingHoursStart,
      workingHoursEnd: settings.workingHoursEnd,
      workingDays: settings.workingDays,
      primaryColor: settings.primaryColor,
      logoText: settings.logoText,
      holidayCalendar: JSON.parse(settings.holidayCalendar || '[]'),
      createdAt: settings.createdAt,
      updatedAt: settings.updatedAt,
    },
  })
}

// PATCH /api/admin/company-settings
// Update timezone, workingHours, workingDays, primaryColor, logoText, holidayCalendar.
export async function PATCH(req: NextRequest) {
  const session = await getSession()
  if (!session || session.role !== 'COMPANY_ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }

  const body = await req.json().catch(() => null)
  const parsed = updateSchema.safeParse(body)
  if (!parsed.success) {
    return errorResponse(parsed.error.issues[0]?.message || 'Invalid input', 400)
  }

  const admin = await db.user.findUnique({ where: { id: session.id }, select: { companyId: true } })
  if (!admin?.companyId) {
    return errorResponse('No company assigned', 400)
  }

  const { holidayCalendar, ...rest } = parsed.data
  const updateData: any = { ...rest }
  if (holidayCalendar !== undefined) {
    updateData.holidayCalendar = JSON.stringify(holidayCalendar)
  }

  const updated = await db.companySettings.upsert({
    where: { companyId: admin.companyId },
    create: {
      companyId: admin.companyId,
      ...updateData,
    },
    update: updateData,
  })

  await auditLog({
    userId: session.id,
    action: 'COMPANY_SETTINGS_UPDATED',
    entityType: 'CompanySettings',
    entityId: updated.id,
    companyId: admin.companyId,
    metadata: { fields: Object.keys(parsed.data) },
  })

  return NextResponse.json({
    settings: {
      id: updated.id,
      companyId: updated.companyId,
      timezone: updated.timezone,
      workingHoursStart: updated.workingHoursStart,
      workingHoursEnd: updated.workingHoursEnd,
      workingDays: updated.workingDays,
      primaryColor: updated.primaryColor,
      logoText: updated.logoText,
      holidayCalendar: JSON.parse(updated.holidayCalendar || '[]'),
      createdAt: updated.createdAt,
      updatedAt: updated.updatedAt,
    },
  })
}
