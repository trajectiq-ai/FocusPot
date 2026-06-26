import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession } from '@/lib/auth'
import { auditLog } from '@/lib/audit'
import { sendNotification } from '@/lib/notifications'
import { sendChallengeWinnerEmail } from '@/lib/email'

// POST /api/admin/challenges/[id]/end
// Ends a challenge: computes the winning team using the challenge's scoring model,
// sets status to COMPLETED, notifies all employees (in-app + email), and emails
// the gift card code to winning team members.
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session || session.role !== 'COMPANY_ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }

  const { id } = await params
  const { giftCardCode } = await req.json().catch(() => ({}))

  const challenge = await db.challenge.findUnique({
    where: { id },
    include: { company: { select: { name: true } } },
  })
  if (!challenge) {
    return NextResponse.json({ error: 'Challenge not found' }, { status: 404 })
  }

  const admin = await db.user.findUnique({
    where: { id: session.id },
    select: { companyId: true },
  })
  if (!admin?.companyId || challenge.companyId !== admin.companyId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // Compute winning team by total focus hours
  const teamAggregates = await db.focusSession.groupBy({
    by: ['teamId'],
    where: { challengeId: id, completed: true },
    _sum: { durationMinutes: true, points: true },
    _count: true,
  })

  let winnerTeamId: string | null = null
  if (teamAggregates.length > 0) {
    const sorted = teamAggregates.sort((a, b) => (b._sum.durationMinutes || 0) - (a._sum.durationMinutes || 0))
    winnerTeamId = sorted[0].teamId
  }

  const winnerTeam = winnerTeamId ? await db.team.findUnique({ where: { id: winnerTeamId } }) : null

  // Update challenge
  await db.challenge.update({
    where: { id },
    data: {
      status: 'COMPLETED',
      winnerTeamId,
      giftCardCode: giftCardCode || challenge.giftCardCode,
    },
  })

  // Notify all employees (in-app + email for winners)
  const employees = await db.user.findMany({
    where: { companyId: challenge.companyId, role: 'EMPLOYEE', active: true },
    select: { id: true, teamId: true, email: true, name: true },
  })

  const finalCode = giftCardCode || challenge.giftCardCode

  for (const emp of employees) {
    const isWinner = emp.teamId === winnerTeamId
    await sendNotification({
      userId: emp.id,
      title: isWinner ? '🎉 You won the challenge!' : 'Challenge Over! See the winners',
      message: isWinner
        ? `Congratulations! Your team won "${challenge.name}"! ${finalCode ? `Your gift card code: ${finalCode}` : 'Check your rewards.'}`
        : `"${challenge.name}" has ended. ${winnerTeam ? `The winning team is ${winnerTeam.name}.` : 'No winner was determined.'} Better luck next time!`,
      type: isWinner ? 'SUCCESS' : 'INFO',
      prefKey: 'challengeEnd',
    })

    // Send winner email with gift card code
    if (isWinner && finalCode && emp.email) {
      sendChallengeWinnerEmail({
        to: emp.email,
        userName: emp.name,
        challengeName: challenge.name,
        prize: challenge.prize,
        giftCardCode: finalCode,
        companyName: challenge.company.name,
      }).catch(() => {
        // Email delivery failure is non-fatal — in-app notification already sent
      })
    }
  }

  await auditLog({
    userId: session.id,
    action: 'CHALLENGE_ENDED',
    entityType: 'Challenge',
    entityId: id,
    companyId: challenge.companyId,
    metadata: { winnerTeamId, winnerTeamName: winnerTeam?.name, notifiedEmployees: employees.length },
  })

  return NextResponse.json({
    success: true,
    winnerTeam: winnerTeam
      ? { id: winnerTeam.id, name: winnerTeam.name, color: winnerTeam.color }
      : null,
    notifiedEmployees: employees.length,
  })
}
