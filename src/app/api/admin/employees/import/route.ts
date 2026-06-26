import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession } from '@/lib/auth'
import { auditLog } from '@/lib/audit'
import { hashPassword, generateTempPassword } from '@/lib/password'
import { errorResponse } from '@/lib/query'
import { z } from 'zod'

const bodySchema = z.object({
  csv: z.string().min(1, 'CSV content is required'),
})

type ParsedRow = {
  rowIndex: number
  name: string
  email: string
  title: string
  teamId: string
  teamName: string
  tempPassword: string
}

/**
 * Parses a CSV string with header row: name,email,title,teamId
 * Supports quoted fields and commas inside quotes (minimal RFC 4180).
 */
function parseCsv(csv: string): { header: string[]; rows: string[][] } {
  const lines = csv.replace(/\r\n/g, '\n').split('\n').filter((l) => l.trim().length > 0)
  if (lines.length === 0) return { header: [], rows: [] }

  const splitLine = (line: string): string[] => {
    const out: string[] = []
    let cur = ''
    let inQuotes = false
    for (let i = 0; i < line.length; i++) {
      const ch = line[i]
      if (inQuotes) {
        if (ch === '"') {
          if (line[i + 1] === '"') {
            cur += '"'
            i++
          } else {
            inQuotes = false
          }
        } else {
          cur += ch
        }
      } else {
        if (ch === ',') {
          out.push(cur)
          cur = ''
        } else if (ch === '"') {
          inQuotes = true
        } else {
          cur += ch
        }
      }
    }
    out.push(cur)
    return out.map((s) => s.trim())
  }

  const header = splitLine(lines[0]).map((h) => h.toLowerCase())
  const rows = lines.slice(1).map(splitLine)
  return { header, rows }
}

// POST /api/admin/employees/import
// Bulk import employees via CSV. Body: { csv: "name,email,title,teamId\n..." }
// - Validates each row (email format, team exists, email uniqueness, seat limit).
// - Creates employees with hashed temp passwords (a random per-user password).
// - Returns { successCount, errors: [{ row, email, error }] }.
export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session || session.role !== 'COMPANY_ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }

  const body = await req.json().catch(() => null)
  const parsed = bodySchema.safeParse(body)
  if (!parsed.success) {
    return errorResponse(parsed.error.issues[0]?.message || 'Invalid input', 400)
  }

  const admin = await db.user.findUnique({
    where: { id: session.id },
    select: {
      companyId: true,
      company: { select: { seats: true, name: true } },
    },
  })
  if (!admin?.companyId || !admin.company) {
    return errorResponse('No company assigned', 400)
  }

  const { header, rows } = parseCsv(parsed.data.csv)
  if (header.length === 0) {
    return errorResponse('CSV is empty or missing a header row', 400)
  }

  const nameIdx = header.indexOf('name')
  const emailIdx = header.indexOf('email')
  const titleIdx = header.indexOf('title')
  const teamIdIdx = header.indexOf('teamid')

  if (nameIdx === -1 || emailIdx === -1) {
    return errorResponse(
      'CSV header must include at least "name" and "email" columns (also accepts "title" and "teamId")',
      400,
    )
  }

  // Preload teams for this company for validation
  const teams = await db.team.findMany({
    where: { companyId: admin.companyId },
    select: { id: true, name: true },
  })
  const teamById = new Map(teams.map((t) => [t.id, t]))
  const teamByName = new Map(teams.map((t) => [t.name.toLowerCase(), t]))

  // Current active employee count for seat-limit enforcement
  const startingCount = await db.user.count({
    where: { companyId: admin.companyId, role: 'EMPLOYEE', active: true },
  })

  // Pre-collect existing emails to avoid DB round trips per row
  const candidateEmails = rows
    .map((r) => (r[emailIdx] || '').toLowerCase().trim())
    .filter((e) => e.length > 0)
  const existingUsers =
    candidateEmails.length > 0
      ? await db.user.findMany({
          where: { email: { in: candidateEmails } },
          select: { email: true },
        })
      : []
  const existingEmails = new Set(existingUsers.map((u) => u.email))

  const errors: { row: number; email?: string; error: string }[] = []
  const valid: ParsedRow[] = []
  const seenEmails = new Set<string>()
  let runningSeatCount = startingCount

  rows.forEach((row, idx) => {
    const rowIndex = idx + 2 // +2 because line 1 is the header
    const rawName = (row[nameIdx] || '').trim()
    const rawEmail = (row[emailIdx] || '').trim().toLowerCase()
    const rawTitle = titleIdx >= 0 ? (row[titleIdx] || '').trim() : ''
    const rawTeamId = teamIdIdx >= 0 ? (row[teamIdIdx] || '').trim() : ''

    if (!rawName) {
      errors.push({ row: rowIndex, error: 'Missing name' })
      return
    }
    if (!rawEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(rawEmail)) {
      errors.push({ row: rowIndex, email: rawEmail, error: 'Invalid or missing email' })
      return
    }
    if (existingEmails.has(rawEmail) || seenEmails.has(rawEmail)) {
      errors.push({ row: rowIndex, email: rawEmail, error: 'Email already in use' })
      return
    }

    // Resolve team — accept either teamId or team name
    let resolvedTeam = rawTeamId ? teamById.get(rawTeamId) : teams[0]
    if (!resolvedTeam && rawTeamId) {
      resolvedTeam = teamByName.get(rawTeamId.toLowerCase())
    }
    if (!resolvedTeam) {
      resolvedTeam = teams[0]
    }
    if (!resolvedTeam) {
      errors.push({ row: rowIndex, email: rawEmail, error: 'No teams available in the company' })
      return
    }

    if (runningSeatCount >= admin.company!.seats) {
      errors.push({
        row: rowIndex,
        email: rawEmail,
        error: `Seat limit reached (${admin.company!.seats}). Upgrade your plan to add more employees.`,
      })
      return
    }

    seenEmails.add(rawEmail)
    runningSeatCount += 1
    valid.push({
      rowIndex,
      name: rawName,
      email: rawEmail,
      title: rawTitle,
      teamId: resolvedTeam.id,
      teamName: resolvedTeam.name,
      tempPassword: generateTempPassword(),
    })
  })

  let successCount = 0
  const created: { name: string; email: string; teamName: string; tempPassword: string }[] = []
  const colors = ['emerald', 'amber', 'rose', 'sky', 'violet', 'orange']

  // Create employees in a sequential transaction to keep temp passwords visible
  for (const v of valid) {
    try {
      await db.user.create({
        data: {
          email: v.email,
          name: v.name,
          password: hashPassword(v.tempPassword),
          title: v.title,
          role: 'EMPLOYEE',
          companyId: admin.companyId,
          teamId: v.teamId,
          avatarColor: colors[Math.floor(Math.random() * colors.length)],
        },
      })
      await db.notification.create({
        data: {
          userId: (await db.user.findUnique({ where: { email: v.email }, select: { id: true } }))!.id,
          title: `Welcome to ${admin.company.name}! 🎯`,
          message:
            'You have been added to FocusPot via CSV import. Ask your administrator for your temporary password, then sign in to start your first deep work session.',
          type: 'SUCCESS',
        },
      })
      successCount += 1
      created.push({
        name: v.name,
        email: v.email,
        teamName: v.teamName,
        tempPassword: v.tempPassword,
      })
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : 'Unknown error'
      errors.push({ row: v.rowIndex, email: v.email, error: `Create failed: ${message}` })
    }
  }

  await auditLog({
    userId: session.id,
    action: 'EMPLOYEES_IMPORTED',
    entityType: 'User',
    companyId: admin.companyId,
    metadata: {
      attempted: rows.length,
      succeeded: successCount,
      failed: errors.length,
    },
  })

  return NextResponse.json({
    successCount,
    errors,
    created,
    seats: admin.company.seats,
    employeeCount: startingCount + successCount,
  })
}
