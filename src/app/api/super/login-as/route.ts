import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession, setSession } from '@/lib/auth'

// POST /api/super/login-as
// Super Admin can impersonate a Company Admin to preview their dashboard.
// Body: { companyId } -> logs in as that company's admin.
export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session || session.role !== 'SUPER_ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }

  const { companyId } = await req.json()
  const companyAdmin = await db.user.findFirst({
    where: { companyId, role: 'COMPANY_ADMIN' },
    select: { id: true, email: true, name: true, role: true, companyId: true, teamId: true, avatarColor: true },
  })

  if (!companyAdmin) {
    return NextResponse.json({ error: 'No admin found for this company' }, { status: 404 })
  }

  await setSession(companyAdmin.id)
  return NextResponse.json({ user: companyAdmin, message: `Now viewing as ${companyAdmin.name}` })
}
