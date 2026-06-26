import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession } from '@/lib/auth'

// GET /api/employee/leaderboard?challengeId=xxx
// Returns:
//  - teamLeaderboard: each team's total focus hours (sorted), aggregated from sessions
//  - personalRank: current user's rank among all company employees (by total focus hours in challenge)
//  - myTeam: the user's team stats
// IMPORTANT (Privacy Shield): This endpoint is for EMPLOYEE role only and shows
// personal/team aggregate data. Company Admins use a separate anonymous endpoint.
export async function GET(req: Request) {
  const session = await getSession()
  if (!session || session.role !== 'EMPLOYEE') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }

  const { searchParams } = new URL(req.url)
  const challengeId = searchParams.get('challengeId')

  const user = await db.user.findUnique({
    where: { id: session.id },
    select: { id: true, companyId: true, teamId: true, name: true, avatarColor: true, streak: true },
  })
  if (!user || !user.companyId || !user.teamId) {
    return NextResponse.json({ error: 'Incomplete profile' }, { status: 400 })
  }

  const sessionWhere = challengeId
    ? { companyId: user.companyId, challengeId }
    : { companyId: user.companyId }

  // Team leaderboard (aggregate hours per team)
  const teamSessions = await db.focusSession.groupBy({
    by: ['teamId'],
    where: sessionWhere,
    _sum: { durationMinutes: true, points: true },
    _count: true,
  })

  const teams = await db.team.findMany({
    where: { companyId: user.companyId },
    select: { id: true, name: true, color: true },
  })
  const teamMap = new Map(teams.map((t) => [t.id, t]))
  const teamMemberCounts = await db.user.groupBy({
    by: ['teamId'],
    where: { companyId: user.companyId, role: 'EMPLOYEE', teamId: { not: null } },
    _count: true,
  })
  const memberCountMap = new Map(teamMemberCounts.map((t) => [t.teamId, t._count]))

  const teamLeaderboard = teamSessions
    .map((ts) => {
      const team = teamMap.get(ts.teamId)
      const members = memberCountMap.get(ts.teamId) || 1
      const hours = (ts._sum.durationMinutes || 0) / 60
      return {
        teamId: ts.teamId,
        teamName: team?.name || 'Unknown',
        teamColor: team?.color || 'emerald',
        totalHours: Math.round(hours * 10) / 10,
        totalPoints: ts._sum.points || 0,
        sessionCount: ts._count,
        avgHoursPerMember: Math.round((hours / members) * 10) / 10,
        memberCount: members,
        isMyTeam: ts.teamId === user.teamId,
      }
    })
    .sort((a, b) => b.totalHours - a.totalHours)

  // Personal rank among all employees in company (by challenge focus hours)
  const employeeSessions = await db.focusSession.groupBy({
    by: ['userId'],
    where: sessionWhere,
    _sum: { durationMinutes: true, points: true },
  })

  const allEmployees = await db.user.findMany({
    where: { companyId: user.companyId, role: 'EMPLOYEE' },
    select: { id: true, name: true, avatarColor: true, teamId: true, streak: true, totalFocusHours: true },
  })
  const empMap = new Map(allEmployees.map((e) => [e.id, e]))
  const myTeamMembers = allEmployees.filter((e) => e.teamId === user.teamId)
  const myTeamIds = new Set(myTeamMembers.map((e) => e.id))

  const ranked = employeeSessions
    .map((es) => {
      const emp = empMap.get(es.userId)
      return {
        userId: es.userId,
        name: emp?.name || 'Unknown',
        avatarColor: emp?.avatarColor || 'emerald',
        hours: Math.round(((es._sum.durationMinutes || 0) / 60) * 10) / 10,
        points: es._sum.points || 0,
        streak: emp?.streak || 0,
        isMe: es.userId === user.id,
        isTeammate: myTeamIds.has(es.userId),
      }
    })
    .sort((a, b) => b.hours - a.hours)

  const myRank = ranked.findIndex((r) => r.isMe) + 1
  const myEntry = ranked.find((r) => r.isMe)

  // Team leaderboard with my rank
  const myTeamRank = teamLeaderboard.findIndex((t) => t.isMyTeam) + 1

  // Top 10 overall + my team's top members
  const topOverall = ranked.slice(0, 10)
  const myTeamLeaderboard = ranked
    .filter((r) => r.isTeammate)
    .slice(0, 10)

  return NextResponse.json({
    teamLeaderboard,
    myTeamRank,
    personalRank: myRank || null,
    myStats: myEntry || { hours: 0, points: 0, streak: user.streak || 0, isMe: true },
    totalParticipants: ranked.length,
    topOverall,
    myTeamLeaderboard,
  })
}
