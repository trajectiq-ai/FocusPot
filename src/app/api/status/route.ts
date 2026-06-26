import { NextResponse } from 'next/server'

// GET /api/status
// Lightweight health-check endpoint for platform monitoring.
export async function GET() {
  return NextResponse.json({ status: 'ok', service: 'focuspot', timestamp: new Date().toISOString() })
}
