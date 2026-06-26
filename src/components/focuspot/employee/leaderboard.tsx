'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Trophy, Crown, Users, Medal } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Skeleton } from '@/components/ui/skeleton'
import { getColor, getInitials } from '@/lib/colors'

type PersonEntry = {
  userId: string
  name: string
  avatarColor: string
  hours: number
  points: number
  streak: number
  isMe: boolean
  isTeammate: boolean
}

type TeamEntry = {
  teamId: string
  teamName: string
  teamColor: string
  totalHours: number
  totalPoints: number
  sessionCount: number
  avgHoursPerMember: number
  memberCount: number
  isMyTeam: boolean
}

type LeaderboardData = {
  teamLeaderboard: TeamEntry[]
  myTeamRank: number
  personalRank: number | null
  myStats: { hours: number; points: number; streak: number; isMe: boolean }
  totalParticipants: number
  topOverall: PersonEntry[]
  myTeamLeaderboard: PersonEntry[]
}

type Props = {
  activeChallengeId: string | null
}

const RANK_TINT = [
  'text-amber-500',
  'text-zinc-400',
  'text-orange-600',
]

export function EmployeeLeaderboard({ activeChallengeId }: Props) {
  const [data, setData] = useState<LeaderboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Fetch once per mount. The parent remounts this component (via `key`)
  // whenever the challenge or a refresh token changes, so we don't need to
  // reset state synchronously here.
  useEffect(() => {
    let cancelled = false
    const url = activeChallengeId
      ? `/api/employee/leaderboard?challengeId=${encodeURIComponent(activeChallengeId)}`
      : '/api/employee/leaderboard'
    fetch(url, { cache: 'no-store' })
      .then((r) => {
        if (!r.ok) throw new Error('Failed to load leaderboard')
        return r.json()
      })
      .then((d) => {
        if (!cancelled) setData(d)
      })
      .catch((e) => {
        if (!cancelled) setError(e.message || 'Failed to load')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [activeChallengeId])

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-28 w-full rounded-2xl" />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Skeleton className="h-96 w-full rounded-2xl" />
          <Skeleton className="h-96 w-full rounded-2xl" />
        </div>
      </div>
    )
  }

  if (error || !data) {
    return (
      <Card className="p-8 text-center">
        <p className="text-sm text-muted-foreground">{error || 'No leaderboard data.'}</p>
      </Card>
    )
  }

  const maxTeamHours = Math.max(...data.teamLeaderboard.map((t) => t.totalHours), 1)

  return (
    <div className="space-y-6">
      {/* Personal rank banner */}
      <Card className="p-6 brand-gradient text-white relative overflow-hidden">
        <div className="absolute top-0 right-0 w-48 h-48 bg-white/10 rounded-full blur-3xl -mr-12 -mt-12" />
        <div className="relative flex items-center justify-between flex-wrap gap-4">
          <div>
            <div className="text-white/80 text-sm">Your personal rank</div>
            <div className="text-4xl sm:text-5xl font-bold mt-1">
              {data.personalRank ? `#${data.personalRank}` : '—'}
              <span className="text-lg font-normal text-white/80 ml-2">
                of {data.totalParticipants}
              </span>
            </div>
          </div>
          <div className="text-right">
            <div className="text-white/80 text-sm">Your stats</div>
            <div className="flex items-center gap-5 mt-1">
              <div>
                <div className="text-2xl font-bold">{data.myStats.hours}h</div>
                <div className="text-xs text-white/70">focused</div>
              </div>
              <div>
                <div className="text-2xl font-bold">{data.myStats.points}</div>
                <div className="text-xs text-white/70">points</div>
              </div>
              <div>
                <div className="text-2xl font-bold">
                  {data.myStats.streak}
                  {data.myStats.streak >= 2 ? '🔥' : ''}
                </div>
                <div className="text-xs text-white/70">streak</div>
              </div>
            </div>
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Team leaderboard */}
        <Card className="p-5">
          <div className="flex items-center gap-2 mb-4">
            <Users className="w-5 h-5 text-emerald-600" />
            <h3 className="font-semibold">Team Leaderboard</h3>
            {data.myTeamRank > 0 && (
              <Badge variant="secondary" className="ml-auto">
                Your team: #{data.myTeamRank}
              </Badge>
            )}
          </div>
          <div className="space-y-2 max-h-[28rem] overflow-y-auto scrollbar-thin pr-1">
            {data.teamLeaderboard.length === 0 ? (
              <div className="p-8 text-center text-sm text-muted-foreground">
                No team sessions yet. Be the first to focus!
              </div>
            ) : (
              data.teamLeaderboard.map((team, idx) => {
                const c = getColor(team.teamColor)
                const pct = (team.totalHours / maxTeamHours) * 100
                return (
                  <motion.div
                    key={team.teamId}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.04 }}
                    className={`p-3 rounded-xl border ${
                      team.isMyTeam
                        ? 'border-emerald-300 bg-emerald-50 dark:bg-emerald-950/30 dark:border-emerald-800'
                        : 'border-border bg-card'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-7 text-center font-bold ${
                          idx < 3 ? RANK_TINT[idx] : 'text-muted-foreground'
                        }`}
                      >
                        {idx < 3 ? (
                          <Medal className="w-5 h-5 mx-auto" />
                        ) : (
                          idx + 1
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <div
                            className={`w-2.5 h-2.5 rounded-full ${c.dot}`}
                          />
                          <span className="font-medium text-sm truncate">
                            {team.teamName}
                          </span>
                          {team.isMyTeam && (
                            <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400 text-[10px]">
                              Your Team
                            </Badge>
                          )}
                        </div>
                        <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                          <motion.div
                            className={`h-full ${c.bg} rounded-full`}
                            initial={{ width: 0 }}
                            animate={{ width: `${pct}%` }}
                            transition={{ duration: 0.6, delay: idx * 0.04 }}
                          />
                        </div>
                        <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground flex-wrap">
                          <span className="font-semibold text-foreground">
                            {team.totalHours}h
                          </span>
                          <span>·</span>
                          <span>{team.sessionCount} sessions</span>
                          <span>·</span>
                          <span>{team.avgHoursPerMember}h/member</span>
                          <span className="hidden sm:inline">·</span>
                          <span className="hidden sm:inline">
                            {team.memberCount} members
                          </span>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )
              })
            )}
          </div>
        </Card>

        {/* Personal leaderboard with tabs */}
        <Card className="p-5">
          <div className="flex items-center gap-2 mb-4">
            <Trophy className="w-5 h-5 text-amber-500" />
            <h3 className="font-semibold">Personal Leaderboard</h3>
          </div>
          <Tabs defaultValue="company">
            <TabsList className="w-full mb-3">
              <TabsTrigger value="company" className="flex-1">
                Top in Company
              </TabsTrigger>
              <TabsTrigger value="team" className="flex-1">
                My Team
              </TabsTrigger>
            </TabsList>
            <TabsContent value="company">
              <PersonalList
                entries={data.topOverall}
                maxHours={Math.max(...data.topOverall.map((e) => e.hours), 1)}
              />
            </TabsContent>
            <TabsContent value="team">
              <PersonalList
                entries={data.myTeamLeaderboard}
                maxHours={Math.max(...data.myTeamLeaderboard.map((e) => e.hours), 1)}
              />
            </TabsContent>
          </Tabs>
        </Card>
      </div>
    </div>
  )
}

function PersonalList({
  entries,
  maxHours,
}: {
  entries: PersonEntry[]
  maxHours: number
}) {
  if (entries.length === 0) {
    return (
      <div className="p-8 text-center text-sm text-muted-foreground">
        No sessions yet — be the first!
      </div>
    )
  }
  return (
    <div className="space-y-1.5 max-h-[24rem] overflow-y-auto scrollbar-thin pr-1">
      {entries.map((entry, idx) => {
        const c = getColor(entry.avatarColor)
        const pct = (entry.hours / maxHours) * 100
        return (
          <motion.div
            key={entry.userId}
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: idx * 0.04 }}
            className={`p-2.5 rounded-xl flex items-center gap-3 ${
              entry.isMe
                ? 'bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-300 dark:border-emerald-800'
                : 'hover:bg-muted/50'
            }`}
          >
            <div
              className={`w-6 text-center font-bold text-sm ${
                idx < 3 ? RANK_TINT[idx] : 'text-muted-foreground'
              }`}
            >
              {idx === 0 ? (
                <Crown className="w-5 h-5 mx-auto" />
              ) : (
                idx + 1
              )}
            </div>
            <div
              className={`w-8 h-8 rounded-full bg-gradient-to-br ${c.gradient} flex items-center justify-center text-white text-xs font-semibold shrink-0`}
            >
              {getInitials(entry.name)}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium truncate">{entry.name}</span>
                {entry.isMe && (
                  <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400 text-[10px]">
                    You
                  </Badge>
                )}
                {entry.isTeammate && !entry.isMe && (
                  <Badge variant="outline" className="text-[10px]">
                    teammate
                  </Badge>
                )}
              </div>
              <div className="h-1 bg-muted rounded-full overflow-hidden mt-1">
                <motion.div
                  className={`h-full ${c.bg} rounded-full`}
                  initial={{ width: 0 }}
                  animate={{ width: `${pct}%` }}
                  transition={{ duration: 0.5, delay: idx * 0.04 }}
                />
              </div>
            </div>
            <div className="text-right shrink-0">
              <div className="text-sm font-semibold">{entry.hours}h</div>
              <div className="text-xs text-muted-foreground">
                {entry.streak >= 2 ? `${entry.streak}🔥` : `${entry.streak}d`}
              </div>
            </div>
          </motion.div>
        )
      })}
    </div>
  )
}
