/**
 * FocusPot Scheduler Mini-Service
 *
 * Runs as a background process that polls the database every 30 seconds for
 * due ScheduledJob records and executes them.
 *
 * Job types:
 * - CHALLENGE_ACTIVATE: Move a DRAFT/SCHEDULED challenge to ACTIVE when startDate is reached
 * - CHALLENGE_CLOSE: Close an ACTIVE challenge when endDate is reached, compute winner, distribute rewards
 * - STATS_REFRESH: Recompute materialized statistics aggregates
 * - STREAK_RESET: Reset streaks for users who didn't focus yesterday
 * - NOTIF_CLEANUP: Delete old read notifications (>30 days)
 * - SESSION_ARCHIVE: Archive sessions older than 90 days
 *
 * Also runs ad-hoc checks every 5 minutes for:
 * - Challenges that need activation/closure (without explicit ScheduledJob records)
 * - Creating the next recurring challenge instance
 */

// Use the main project's generated Prisma client
import { PrismaClient } from '../../node_modules/@prisma/client'

const db = new PrismaClient({
  log: ['error', 'warn'],
})

const POLL_INTERVAL_MS = 30_000 // 30 seconds
const ADHOC_INTERVAL_MS = 5 * 60_000 // 5 minutes
const MAX_ATTEMPTS = 3

// ============================================================
// JOB PROCESSORS
// ============================================================

async function processChallengeActivate(entityId: string) {
  const challenge = await db.challenge.findUnique({ where: { id: entityId } })
  if (!challenge) return
  if (challenge.status === 'DRAFT' || challenge.status === 'SCHEDULED') {
    if (new Date() >= challenge.startDate) {
      await db.challenge.update({ where: { id: entityId }, data: { status: 'ACTIVE' } })
      // Notify employees
      const employees = await db.user.findMany({
        where: { companyId: challenge.companyId, role: 'EMPLOYEE', active: true },
        select: { id: true },
      })
      await db.notification.createMany({
        data: employees.map((e) => ({
          userId: e.id,
          title: 'Weekly Focus Challenge is Live!',
          message: `The "${challenge.name}" challenge has started. Open the app to start tracking your deep work hours. Prize: ${challenge.prize}.`,
          type: 'CHALLENGE',
          channel: 'IN_APP',
          status: 'DELIVERED',
        })),
      })
      console.log(`[Challenge Activate] ${challenge.name} → ACTIVE, notified ${employees.length} employees`)
    }
  }
}

async function processChallengeClose(entityId: string) {
  const challenge = await db.challenge.findUnique({
    where: { id: entityId },
    include: { rewards: { include: { reward: true } } },
  })
  if (!challenge) return
  if (challenge.status !== 'ACTIVE') return

  // Compute winner using scoring model
  const teamAggregates = await db.focusSession.groupBy({
    by: ['teamId'],
    where: { challengeId: entityId, completed: true },
    _sum: { durationMinutes: true, points: true },
    _count: true,
  })

  let winnerTeamId: string | null = null
  let runnerUpTeamId: string | null = null

  if (teamAggregates.length > 0) {
    // Sort based on scoring model
    const sorted = teamAggregates.sort((a, b) => {
      const aScore = computeScore(a, challenge.scoringModel)
      const bScore = computeScore(b, challenge.scoringModel)
      return bScore - aScore
    })
    winnerTeamId = sorted[0].teamId
    if (sorted.length > 1) runnerUpTeamId = sorted[1].teamId
  }

  const winnerTeam = winnerTeamId ? await db.team.findUnique({ where: { id: winnerTeamId } }) : null

  await db.challenge.update({
    where: { id: entityId },
    data: { status: 'COMPLETED', winnerTeamId },
  })

  // Create reward redemptions for winners
  if (winnerTeamId) {
    const winnerMembers = await db.user.findMany({
      where: { teamId: winnerTeamId, role: 'EMPLOYEE', active: true },
      select: { id: true },
    })
    for (const cr of challenge.rewards) {
      if (cr.tier === 'WINNER') {
        for (const m of winnerMembers) {
          await db.rewardRedemption.create({
            data: {
              rewardId: cr.rewardId,
              userId: m.id,
              challengeId: challenge.id,
              companyId: challenge.companyId,
              tier: 'WINNER',
              position: 1,
              status: 'APPROVED',
              code: challenge.giftCardCode || '',
              fulfilledAt: challenge.giftCardCode ? new Date() : null,
            },
          }).catch(() => {})
        }
      }
    }
  }

  // Notify all employees
  const employees = await db.user.findMany({
    where: { companyId: challenge.companyId, role: 'EMPLOYEE', active: true },
    select: { id: true, teamId: true },
  })
  await db.notification.createMany({
    data: employees.map((e) => ({
      userId: e.id,
      title: 'Challenge Over! See the winners',
      message:
        e.teamId === winnerTeamId
          ? `Congratulations! Your team won "${challenge.name}"! ${challenge.giftCardCode ? `Your gift card code: ${challenge.giftCardCode}` : 'Check your rewards.'}`
          : `"${challenge.name}" has ended. ${winnerTeam ? `The winning team is ${winnerTeam.name}.` : ''} Better luck next time!`,
      type: e.teamId === winnerTeamId ? 'SUCCESS' : 'INFO',
      channel: 'IN_APP',
      status: 'DELIVERED',
    })),
  })

  console.log(`[Challenge Close] ${challenge.name} → COMPLETED, winner: ${winnerTeam?.name || 'none'}`)
}

function computeScore(agg: { _sum: { durationMinutes: number | null }; _count: number }, model: string): number {
  const hours = (agg._sum.durationMinutes || 0) / 60
  switch (model) {
    case 'AVG_PER_MEMBER':
      return hours // simplified; full impl in scoring.ts
    case 'PARTICIPATION_RATE':
      return agg._count
    case 'WEIGHTED':
      return hours * 0.7 + agg._count * 0.3
    case 'TOTAL_HOURS':
    default:
      return hours
  }
}

async function processStatsRefresh() {
  const companies = await db.company.findMany({ select: { id: true } })
  for (const c of companies) {
    const date = new Date().toISOString().split('T')[0]
    const dayStart = new Date(date + 'T00:00:00.000Z')
    const dayEnd = new Date(date + 'T23:59:59.999Z')

    const sessions = await db.focusSession.findMany({
      where: { companyId: c.id, startTime: { gte: dayStart, lte: dayEnd }, completed: true, archived: false },
      select: { durationMinutes: true, points: true, userId: true, teamId: true },
    })

    const focusMinutes = sessions.reduce((s, sess) => s + sess.durationMinutes, 0)
    const points = sessions.reduce((s, sess) => s + sess.points, 0)
    const activeEmployees = new Set(sessions.map((s) => s.userId)).size

    await db.companyStatistics.upsert({
      where: { companyId_date: { companyId: c.id, date } },
      create: { companyId: c.id, date, focusMinutes, sessionCount: sessions.length, points, activeEmployees },
      update: { focusMinutes, sessionCount: sessions.length, points, activeEmployees, updatedAt: new Date() },
    })

    // Team stats
    const teams = await db.team.findMany({ where: { companyId: c.id }, select: { id: true } })
    for (const t of teams) {
      const teamSessions = sessions.filter((s) => s.teamId === t.id)
      const teamFocus = teamSessions.reduce((s, sess) => s + sess.durationMinutes, 0)
      const teamPoints = teamSessions.reduce((s, sess) => s + sess.points, 0)
      const teamActive = new Set(teamSessions.map((s) => s.userId)).size
      await db.teamStatistics.upsert({
        where: { teamId_date: { teamId: t.id, date } },
        create: { teamId: t.id, date, focusMinutes: teamFocus, sessionCount: teamSessions.length, points: teamPoints, activeMembers: teamActive },
        update: { focusMinutes: teamFocus, sessionCount: teamSessions.length, points: teamPoints, activeMembers: teamActive, updatedAt: new Date() },
      })
    }

    // Employee stats
    const employees = await db.user.findMany({ where: { companyId: c.id, role: 'EMPLOYEE', active: true }, select: { id: true } })
    for (const e of employees) {
      const empSessions = sessions.filter((s) => s.userId === e.id)
      const empFocus = empSessions.reduce((s, sess) => s + sess.durationMinutes, 0)
      const empPoints = empSessions.reduce((s, sess) => s + sess.points, 0)
      const longest = empSessions.reduce((m, sess) => Math.max(m, sess.durationMinutes), 0)
      await db.employeeStatistics.upsert({
        where: { userId_date: { userId: e.id, date } },
        create: { userId: e.id, date, focusMinutes: empFocus, sessionCount: empSessions.length, points: empPoints, longestSession: longest },
        update: { focusMinutes: empFocus, sessionCount: empSessions.length, points: empPoints, longestSession: longest, updatedAt: new Date() },
      })
    }
  }
  console.log(`[Stats Refresh] Updated stats for ${companies.length} companies`)
}

async function processStreakReset() {
  const now = new Date()
  const todayStr = now.toISOString().split('T')[0]
  const yesterday = new Date(now)
  yesterday.setDate(yesterday.getDate() - 1)
  const yesterdayStr = yesterday.toISOString().split('T')[0]

  // Reset streak for users whose lastFocusDate is before yesterday
  const result = await db.user.updateMany({
    where: {
      role: 'EMPLOYEE',
      active: true,
      streak: { gt: 0 },
      OR: [
        { lastFocusDate: null },
        { lastFocusDate: { not: todayStr, notIn: [todayStr, yesterdayStr] } },
      ],
    },
    data: { streak: 0 },
  })
  if (result.count > 0) {
    console.log(`[Streak Reset] Reset ${result.count} stale streaks`)
  }
}

async function processNotifCleanup() {
  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() - 30)
  const result = await db.notification.deleteMany({
    where: { read: true, createdAt: { lt: cutoff } },
  })
  if (result.count > 0) {
    console.log(`[Notif Cleanup] Deleted ${result.count} old read notifications`)
  }
}

async function processSessionArchive() {
  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() - 90)
  const result = await db.focusSession.updateMany({
    where: { createdAt: { lt: cutoff }, archived: false },
    data: { archived: true },
  })
  if (result.count > 0) {
    console.log(`[Session Archive] Archived ${result.count} old sessions`)
  }
}

// ============================================================
// AD-HOC CHECKS (run every 5 minutes, independent of ScheduledJob)
// ============================================================

async function adhocChecks() {
  const now = new Date()

  // 1. Activate scheduled challenges whose startDate has passed
  const toActivate = await db.challenge.findMany({
    where: {
      status: 'SCHEDULED',
      startDate: { lte: now },
    },
    select: { id: true },
  })
  for (const c of toActivate) {
    await processChallengeActivate(c.id)
  }

  // 2. Close active challenges whose endDate has passed
  const toClose = await db.challenge.findMany({
    where: {
      status: 'ACTIVE',
      endDate: { lte: now },
    },
    select: { id: true },
  })
  for (const c of toClose) {
    await processChallengeClose(c.id)
  }

  // 3. Create next recurring challenge instance
  const recurring = await db.challenge.findMany({
    where: { isRecurring: true, status: 'COMPLETED', recurrencePattern: 'weekly' },
  })
  for (const ch of recurring) {
    // Check if a next instance already exists
    const next = await db.challenge.findFirst({
      where: { parentChallengeId: ch.id, status: { in: ['SCHEDULED', 'ACTIVE'] } },
    })
    if (!next) {
      const newStart = new Date(ch.endDate)
      newStart.setDate(newStart.getDate() + 1)
      const newEnd = new Date(newStart)
      newEnd.setDate(newEnd.getDate() + 4)
      await db.challenge.create({
        data: {
          name: ch.name,
          description: ch.description,
          companyId: ch.companyId,
          startDate: newStart,
          endDate: newEnd,
          prize: ch.prize,
          giftCardValue: ch.giftCardValue,
          status: newStart <= now ? 'ACTIVE' : 'SCHEDULED',
          scoringModel: ch.scoringModel,
          scoringWeights: ch.scoringWeights,
          scope: ch.scope,
          targetTeamId: ch.targetTeamId,
          isRecurring: true,
          recurrencePattern: ch.recurrencePattern,
          parentChallengeId: ch.id,
        },
      })
      console.log(`[Recurring] Created next instance of "${ch.name}"`)
    }
  }
}

// ============================================================
// MAIN LOOP
// ============================================================

async function processDueJobs() {
  const now = new Date()
  const dueJobs = await db.scheduledJob.findMany({
    where: {
      status: 'PENDING',
      scheduledFor: { lte: now },
    },
    orderBy: { scheduledFor: 'asc' },
    take: 20,
  })

  for (const job of dueJobs) {
    if (job.attempts >= MAX_ATTEMPTS) {
      await db.scheduledJob.update({ where: { id: job.id }, data: { status: 'FAILED' } })
      continue
    }

    // Mark as running
    await db.scheduledJob.update({
      where: { id: job.id },
      data: { status: 'RUNNING', attempts: { increment: 1 } },
    })

    try {
      switch (job.type) {
        case 'CHALLENGE_ACTIVATE':
          await processChallengeActivate(job.entityId)
          break
        case 'CHALLENGE_CLOSE':
          await processChallengeClose(job.entityId)
          break
        case 'STATS_REFRESH':
          await processStatsRefresh()
          break
        case 'STREAK_RESET':
          await processStreakReset()
          break
        case 'NOTIF_CLEANUP':
          await processNotifCleanup()
          break
        case 'SESSION_ARCHIVE':
          await processSessionArchive()
          break
      }
      await db.scheduledJob.update({
        where: { id: job.id },
        data: { status: 'COMPLETED', completedAt: new Date() },
      })
    } catch (e: any) {
      await db.scheduledJob.update({
        where: { id: job.id },
        data: { status: 'PENDING', lastError: e.message?.slice(0, 500) || 'Unknown error' },
      })
      console.error(`[Job ${job.id}] ${job.type} failed:`, e.message)
    }
  }
}

async function mainLoop() {
  console.log('[Scheduler] Main loop started')
  while (true) {
    try {
      await processDueJobs()
    } catch (e) {
      console.error('[Scheduler] Error in main loop:', e)
    }
    await Bun.sleep(POLL_INTERVAL_MS)
  }
}

async function adhocLoop() {
  console.log('[Scheduler] Ad-hoc loop started')
  // Run once at startup
  try {
    await adhocChecks()
  } catch (e) {
    console.error('[Scheduler] Error in ad-hoc checks:', e)
  }
  while (true) {
    await Bun.sleep(ADHOC_INTERVAL_MS)
    try {
      await adhocChecks()
    } catch (e) {
      console.error('[Scheduler] Error in ad-hoc checks:', e)
    }
  }
}

console.log('╔══════════════════════════════════════╗')
console.log('║  FocusPot Scheduler — Started        ║')
console.log('║  Poll interval: 30s                  ║')
console.log('║  Ad-hoc interval: 5m                 ║')
console.log('╚══════════════════════════════════════╝')

// Run both loops concurrently
Promise.all([mainLoop(), adhocLoop()]).catch(console.error)
