import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET /api/health
// Deep health check — verifies database connectivity and reports system status.
// Used for monitoring and alerting.
export async function GET() {
  const checks: Record<string, { status: string; latency?: number; error?: string }> = {}
  let allHealthy = true

  // Database check
  try {
    const start = Date.now()
    await db.$queryRaw`SELECT 1`
    checks.database = { status: 'ok', latency: Date.now() - start }
  } catch (e: any) {
    checks.database = { status: 'error', error: e.message }
    allHealthy = false
  }

  // SMTP check (just verifies env vars are set, doesn't actually connect)
  const smtpConfigured = !!(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS)
  checks.smtp = { status: smtpConfigured ? 'configured' : 'not_configured' }

  // Stripe check
  const stripeConfigured = !!(process.env.STRIPE_SECRET_KEY && process.env.STRIPE_WEBHOOK_SECRET)
  checks.stripe = { status: stripeConfigured ? 'configured' : 'not_configured' }

  // Session secret check
  const sessionSecretSet = !!process.env.SESSION_SECRET && process.env.SESSION_SECRET !== 'dev-only-fallback-secret-change-in-production'
  checks.session = { status: sessionSecretSet ? 'configured' : 'using_dev_fallback' }
  if (!sessionSecretSet) allHealthy = false

  return NextResponse.json(
    {
      status: allHealthy ? 'healthy' : 'degraded',
      timestamp: new Date().toISOString(),
      checks,
      version: process.env.npm_package_version || '1.0.0',
      environment: process.env.NODE_ENV || 'development',
    },
    { status: allHealthy ? 200 : 503 }
  )
}
