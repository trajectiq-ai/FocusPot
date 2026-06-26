import { db } from './db'

/**
 * Competition scoring engine.
 * Supports configurable scoring models for challenge ranking.
 */

export type ScoringModel = 'TOTAL_HOURS' | 'AVG_PER_MEMBER' | 'PARTICIPATION_RATE' | 'WEIGHTED'

export type TeamScore = {
  teamId: string
  teamName: string
  teamColor: string
  totalHours: number
  avgHoursPerMember: number
  participationRate: number
  sessionCount: number
  memberCount: number
  score: number
  rank: number
}

/**
 * Computes team scores for a challenge based on the configured scoring model.
 * Returns teams sorted by score (descending).
 */
export async function computeChallengeScores(challengeId: string): Promise<TeamScore[]> {
  const challenge = await db.challenge.findUnique({
    where: { id: challengeId },
    select: { id: true, companyId: true, scoringModel: true, scoringWeights: true, scope: true, targetTeamId: true },
  })
  if (!challenge) return []

  const sessionWhere = challenge.scope === 'TEAM' && challenge.targetTeamId
    ? { challengeId, teamId: challenge.targetTeamId }
    : { challengeId }

  // Aggregate sessions by team
  const teamAggregates = await db.focusSession.groupBy({
    by: ['teamId'],
    where: sessionWhere,
    _sum: { durationMinutes: true, points: true },
    _count: true,
  })

  // Get team info + member counts
  const teamWhere = challenge.scope === 'TEAM' && challenge.targetTeamId
    ? { id: challenge.targetTeamId, companyId: challenge.companyId }
    : { companyId: challenge.companyId }

  const teams = await db.team.findMany({
    where: teamWhere,
    select: { id: true, name: true, color: true },
  })

  const memberCounts = await db.user.groupBy({
    by: ['teamId'],
    where: { companyId: challenge.companyId, role: 'EMPLOYEE', teamId: { not: null }, active: true },
    _count: true,
  })
  const memberMap = new Map(memberCounts.map((m) => [m.teamId, m._count]))

  // Get distinct participants per team
  const participants = await db.focusSession.findMany({
    where: sessionWhere,
    select: { teamId: true, userId: true },
    distinct: ['teamId', 'userId'],
  })
  const participantMap = new Map<string, Set<string>>()
  for (const p of participants) {
    if (!participantMap.has(p.teamId)) participantMap.set(p.teamId, new Set())
    participantMap.get(p.teamId)!.add(p.userId)
  }

  // Build score objects
  const scores: Omit<TeamScore, 'rank'>[] = teams.map((team) => {
    const agg = teamAggregates.find((a) => a.teamId === team.id)
    const members = memberMap.get(team.id) || 1
    const hours = (agg?._sum.durationMinutes || 0) / 60
    const participantCount = participantMap.get(team.id)?.size || 0
    const participationRate = members > 0 ? (participantCount / members) * 100 : 0

    return {
      teamId: team.id,
      teamName: team.name,
      teamColor: team.color,
      totalHours: Math.round(hours * 10) / 10,
      avgHoursPerMember: Math.round((hours / members) * 10) / 10,
      participationRate: Math.round(participationRate),
      sessionCount: agg?._count || 0,
      memberCount: members,
      score: 0, // computed below
    }
  })

  // Apply scoring model
  const weights = challenge.scoringWeights ? JSON.parse(challenge.scoringWeights) : {}
  for (const s of scores) {
    switch (challenge.scoringModel as ScoringModel) {
      case 'AVG_PER_MEMBER':
        s.score = s.avgHoursPerMember
        break
      case 'PARTICIPATION_RATE':
        s.score = s.participationRate
        break
      case 'WEIGHTED':
        // Weighted: e.g. { hours: 0.5, participation: 0.3, avg: 0.2 }
        s.score =
          s.totalHours * (weights.hours || 0.5) +
          s.participationRate * (weights.participation || 0.3) +
          s.avgHoursPerMember * (weights.avg || 0.2)
        break
      case 'TOTAL_HOURS':
      default:
        s.score = s.totalHours
        break
    }
    s.score = Math.round(s.score * 100) / 100
  }

  // Sort by score descending and assign ranks
  const sorted = scores.sort((a, b) => b.score - a.score)
  return sorted.map((s, i) => ({ ...s, rank: i + 1 }))
}

/**
 * Determines the winning team for a challenge.
 * Returns null if no sessions were logged.
 */
export async function getChallengeWinner(challengeId: string) {
  const scores = await computeChallengeScores(challengeId)
  if (scores.length === 0 || scores[0].sessionCount === 0) return null
  return scores[0]
}

/**
 * Gets runner-up teams (rank 2+).
 */
export async function getChallengeRunnerUps(challengeId: string, count: number = 1) {
  const scores = await computeChallengeScores(challengeId)
  return scores.slice(1, 1 + count).filter((s) => s.sessionCount > 0)
}
