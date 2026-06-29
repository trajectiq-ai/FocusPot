import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession } from '@/lib/auth'
import { auditLog } from '@/lib/audit'

// GET /api/admin/mobile-preview
// Returns a list of employees the admin can preview in the mobile app simulator.
// This is an admin testing tool — employees never access the web app directly.
export async function GET() {
  const session = await getSession()
  if (!session || (session.role !== 'COMPANY_ADMIN' && session.role !== 'SUPER_ADMIN')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }

  // Company admins can preview employees in their company
  // Super admins can preview employees in any company
  const where = session.role === 'SUPER_ADMIN'
    ? { role: 'EMPLOYEE' as const, active: true }
    : { role: 'EMPLOYEE' as const, active: true, companyId: session.companyId! }

  const employees = await db.user.findMany({
    where,
    select: {
      id: true,
      name: true,
      email: true,
      title: true,
      avatarColor: true,
      companyId: true,
      teamId: true,
      team: { select: { id: true, name: true, color: true } },
      company: { select: { id: true, name: true } },
      streak: true,
      bestStreak: true,
      totalFocusHours: true,
      totalPoints: true,
      totalSessions: true,
    },
    orderBy: { name: 'asc' },
    take: 50,
  })

  return NextResponse.json({ employees })
}
