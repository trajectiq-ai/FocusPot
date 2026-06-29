import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession } from '@/lib/auth'

function csvEscape(value: string): string {
  if (value == null) return ''
  const needsQuoting = /[",\n\r]/.test(value)
  const escaped = value.replace(/"/g, '""')
  return needsQuoting ? `"${escaped}"` : escaped
}

// GET /api/admin/employees/export
// Returns a CSV of all employees for the company (DIRECTORY ONLY — NO focus data).
// Filename: focuspot-employees.csv. Content-Type: text/csv.
export async function GET() {
  const session = await getSession()
  if (!session || session.role !== 'COMPANY_ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }

  const admin = await db.user.findUnique({ where: { id: session.id }, select: { companyId: true } })
  if (!admin?.companyId) {
    return NextResponse.json({ error: 'No company assigned' }, { status: 400 })
  }

  const users = await db.user.findMany({
    where: { companyId: admin.companyId, role: { in: ['EMPLOYEE', 'COMPANY_ADMIN'] } },
    orderBy: [{ active: 'desc' }, { name: 'asc' }],
    select: {
      name: true,
      email: true,
      title: true,
      role: true,
      active: true,
      createdAt: true,
      team: { select: { name: true } },
    },
  })

  const header = ['Name', 'Email', 'Title', 'Role', 'Team', 'Status', 'Joined']
  const rows = users.map((u) => [
    u.name,
    u.email,
    u.title,
    u.role === 'COMPANY_ADMIN' ? 'Admin' : 'Employee',
    u.team?.name || '',
    u.active ? 'Active' : 'Inactive',
    u.createdAt.toISOString().split('T')[0],
  ])

  const csv = [header, ...rows]
    .map((r) => r.map(csvEscape).join(','))
    .join('\n')

  return new NextResponse(csv, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': 'attachment; filename="focuspot-employees.csv"',
      'Cache-Control': 'no-store',
    },
  })
}
