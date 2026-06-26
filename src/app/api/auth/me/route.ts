import { NextResponse } from 'next/server'
import { getSession, clearSession } from '@/lib/auth'

// GET /api/auth/me
// Returns the current session user.
// ARCHITECTURE ENFORCEMENT: Employees are never allowed web sessions.
// If an employee somehow has a session cookie, clear it and return null.
export async function GET() {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ user: null })
  }

  // Employees must never access the web application
  if (session.role === 'EMPLOYEE') {
    await clearSession()
    return NextResponse.json({ user: null, error: 'EMPLOYEE_WEB_ACCESS_DENIED' })
  }

  return NextResponse.json({ user: session })
}

// POST /api/auth/me — logout
export async function POST() {
  await clearSession()
  return NextResponse.json({ success: true })
}
