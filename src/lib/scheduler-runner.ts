/**
 * Scheduler runner — shared logic used by both the scheduler mini-service
 * and the Vercel Cron API endpoint.
 *
 * This module is imported by:
 * 1. mini-services/scheduler/index.ts (long-running background process)
 * 2. src/app/api/scheduler/run/route.ts (Vercel Cron endpoint)
 */

import { PrismaClient } from '@prisma/client'

let dbInstance: PrismaClient | null = null

function getDb(): PrismaClient {
  if (!dbInstance) {
    dbInstance = new PrismaClient({ log: ['error', 'warn'] })
  }
  return dbInstance
}

const MAX_ATTEMPTS = 3

export async function processChallengeActivate(entityId: string) {
  const db = getDb()
  const challenge = await db.challenge.findUnique({ where: { id: entityId } })
  if (!challenge) return
  if (challenge.status === 'DRAFT' || challenge.status === 'SCHEDULED') {
    if (new Date() >= challenge.startDate) {
      await db.challenge.update({ where: { id: entityId }, data: { status: 'ACTIVE' } })
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

export async function processChallengeClose(entityId: string) {
  const db = getDb()
  const challenge = await db.challenge.findUnique({
    where: { id: entityId },
    include: { rewards: { include: { reward: true } } },
  })
  if (!challenge) return
  if (challenge.status !== 'ACTIVE') return

  const teamAggregates = await db.focusSession.groupBy({
    by: ['teamId'],
    where: { challengeId: entityId, completed: true },
    _sum: { durationMinutes: true, points: true },
    _count: true,
  })

  let winnerTeamId: string | null = null
  if (teamAggregates.length > 0) {
    const sorted = teamAggregates.sort((a, b) => (b._sum.durationMinutes || 0) - (a._sum.durationMinutes || 0))
    winnerTeamId = sorted[0].teamId
  }

  const winnerTeam = winnerTeamId ? await db.team.findUnique({ where: { id: winnerTeamId } }) : null

  await db.challenge.update({
    where: { id: entityId },
    data: { status: 'COMPLETED', winnerTeamId },
  })

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

export async function processStatsRefresh() {
  const db = getDb()
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
  }
  console.log(`[Stats Refresh] Updated stats for ${companies.length} companies`)
}

export async function processStreakReset() {
  const db = getDb()
  const now = new Date()
  const todayStr = now.toISOString().split('T')[0]
  const yesterday = new Date(now)
  yesterday.setDate(yesterday.getDate() - 1)
  const yesterdayStr = yesterday.toISOString().split('T')[0]

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

export async function processDueJobs() {
  const db = getDb()
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

export async function adhocChecks() {
  const db = getDb()
  const now = new Date()

  // Activate scheduled challenges whose startDate has passed
  const toActivate = await db.challenge.findMany({
    where: { status: 'SCHEDULED', startDate: { lte: now } },
    select: { id: true },
  })
  for (const c of toActivate) {
    await processChallengeActivate(c.id)
  }

  // Close active challenges whose endDate has passed
  const toClose = await db.challenge.findMany({
    where: { status: 'ACTIVE', endDate: { lte: now } },
    select: { id: true },
  })
  for (const c of toClose) {
    await processChallengeClose(c.id)
  }
}
