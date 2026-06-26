import { NextRequest, NextResponse } from 'next/server'
import { processDueJobs, adhocChecks } from '@/lib/scheduler-runner'

/**
 * GET /api/scheduler/run
 *
 * Vercel Cron endpoint — called every 30 minutes by Vercel's cron system.
 * Processes due scheduled jobs and runs ad-hoc checks (challenge activation/closure).
 *
 * Security: requires CRON_SECRET in the Authorization header to prevent
 * unauthorized triggering.
 *
 * Configure in vercel.json:
 *   "crons": [{ "path": "/api/scheduler/run", "schedule": "every 30 minutes" }]
 *
 * Vercel automatically sends the Authorization header with CRON_SECRET.
 */
export async function GET(req: NextRequest) {
  // Verify the request is from Vercel Cron
  const authHeader = req.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET

  if (cronSecret) {
    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
  }

  const results = {
    timestamp: new Date().toISOString(),
    jobsProcessed: 0,
    challengesActivated: 0,
    challengesClosed: 0,
    errors: [] as string[],
  }

  try {
    // Process due scheduled jobs
    await processDueJobs()

    // Run ad-hoc checks (challenge activation/closure without explicit jobs)
    await adhocChecks()

    return NextResponse.json({
      success: true,
      ...results,
    })
  } catch (e: any) {
    results.errors.push(e.message)
    return NextResponse.json(
      { success: false, ...results },
      { status: 500 }
    )
  }
}
