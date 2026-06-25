import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET /api/quick-login
// Returns curated demo accounts for the login screen quick-pick.
export async function GET() {
  const [superAdmin, companyAdmin, employee] = await Promise.all([
    db.user.findFirst({
      where: { role: 'SUPER_ADMIN' },
      select: { id: true, email: true, name: true, role: true, avatarColor: true },
    }),
    db.user.findFirst({
      where: { role: 'COMPANY_ADMIN' },
      select: { id: true, email: true, name: true, role: true, avatarColor: true, company: { select: { name: true } } },
    }),
    db.user.findFirst({
      where: { role: 'EMPLOYEE' },
      select: { id: true, email: true, name: true, role: true, avatarColor: true, company: { select: { name: true } }, team: { select: { name: true } } },
    }),
  ])

  return NextResponse.json({ superAdmin, companyAdmin, employee })
}
