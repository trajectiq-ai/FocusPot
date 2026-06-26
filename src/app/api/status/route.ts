import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET /api/status
// Liveness probe — confirms the process is running and responding.
export async function GET() {
  return NextResponse.json({
    status: 'ok',
    service: 'focuspot',
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || '1.0.0',
    environment: process.env.NODE_ENV || 'development',
  })
}

// GET /api/status?deep=true
// Readiness probe — confirms the database is connected and the app is ready to serve traffic.
// Used by Docker healthcheck and load balancers.
export async function HEAD() {
  try {
    // Simple database ping
    await db.$queryRaw`SELECT 1`
    return new NextResponse(null, { status: 200 })
  } catch {
    return new NextResponse(null, { status: 503 })
  }
}
