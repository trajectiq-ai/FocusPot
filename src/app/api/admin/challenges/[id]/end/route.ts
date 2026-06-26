import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession } from '@/lib/auth'

// POST /api/admin/challenges/[id]/end
// Ends a challenge: computes the winning team (most focus hours), sets status to COMPLETED,
// and notifies all employees. If a gift card code is present, "emails" it to winning team members.
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
    where: { challengeId: id },
    _sum: { durationMinutes: true },
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

  // Notify all employees
  const employees = await db.user.findMany({
    where: { companyId: challenge.companyId, role: 'EMPLOYEE' },
    select: { id: true, teamId: true },
  })
  await db.notification.createMany({
    data: employees.map((e) => ({
      userId: e.id,
      title: 'Challenge Over! See the winners',
      message:
        e.teamId === winnerTeamId
          ? `Congratulations! Your team won "${challenge.name}"! Check your email for the ${challenge.prize}.`
          : `"${challenge.name}" has ended. ${winnerTeam ? `The winning team is ${winnerTeam.name}.` : 'No winner was determined.'} Better luck next time!`,
      type: e.teamId === winnerTeamId ? 'SUCCESS' : 'INFO',
    })),
  })

  return NextResponse.json({
    success: true,
    winnerTeam: winnerTeam
      ? { id: winnerTeam.id, name: winnerTeam.name, color: winnerTeam.color }
      : null,
    notifiedEmployees: employees.length,
  })
}
