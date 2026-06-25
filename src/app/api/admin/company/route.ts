import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession } from '@/lib/auth'
import { generateJoinCode } from '@/lib/password'
import { z } from 'zod'

const updateSchema = z.object({
  name: z.string().min(2).max(100).optional(),
})

// GET /api/admin/company
// Returns the admin's company settings
export async function GET() {
  const session = await getSession()
  if (!session || session.role !== 'COMPANY_ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }

  const admin = await db.user.findUnique({
    where: { id: session.id },
    select: { companyId: true, company: true },
  })
  if (!admin?.company) {
    return NextResponse.json({ error: 'No company assigned' }, { status: 400 })
  }

  return NextResponse.json({ company: admin.company })
}

// PATCH /api/admin/company
// Update company name
export async function PATCH(req: NextRequest) {
  const session = await getSession()
  if (!session || session.role !== 'COMPANY_ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }

  const body = await req.json().catch(() => null)
  const parsed = updateSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message || 'Invalid input' }, { status: 400 })
  }

  const admin = await db.user.findUnique({ where: { id: session.id }, select: { companyId: true } })
  if (!admin?.companyId) {
    return NextResponse.json({ error: 'No company assigned' }, { status: 400 })
  }

  const updated = await db.company.update({
    where: { id: admin.companyId },
    data: parsed.data.name ? { name: parsed.data.name.trim() } : {},
  })

  return NextResponse.json({ company: updated })
}

// POST /api/admin/company?action=regenerate-code
// Regenerate the join code (employees will need the new code to join)
export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session || session.role !== 'COMPANY_ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }

  const admin = await db.user.findUnique({
    where: { id: session.id },
    select: { companyId: true, company: { select: { name: true } } },
  })
  if (!admin?.companyId || !admin.company) {
    return NextResponse.json({ error: 'No company assigned' }, { status: 400 })
  }

  const newCode = generateJoinCode(admin.company.name)
  const updated = await db.company.update({
    where: { id: admin.companyId },
    data: { joinCode: newCode },
  })

  return NextResponse.json({ joinCode: updated.joinCode })
}
