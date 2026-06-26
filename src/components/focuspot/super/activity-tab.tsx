'use client'

import { motion } from 'framer-motion'
import {
  Timer,
  Trophy,
  Gift,
  Calendar,
  Building2,
  Flag,
  Crown,
  Clock,
} from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import { getColor } from '@/lib/colors'
import type { DashboardData } from './types'
import {
  ChallengeStatusBadge,
  formatCurrency,
  formatNumber,
  formatDate,
} from './helpers'

export function ActivityTab({ data }: { data: DashboardData }) {
  const { recentChallenges, stats } = data

  return (
    <div className="space-y-6">
      {/* Headline stat */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
      >
        <Card className="overflow-hidden border-border/60 bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/30 dark:to-orange-950/20">
          <CardContent className="p-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center text-white shadow-lg shadow-amber-500/30">
                  <Clock className="w-7 h-7" />
                </div>
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Total Focus Hours Across Platform
                  </p>
                  <p className="text-4xl sm:text-5xl font-extrabold tracking-tight tabular-nums text-amber-700 dark:text-amber-300">
                    {formatNumber(stats.totalFocusHours)}
                    <span className="text-xl font-semibold text-amber-600/70 ml-1">hrs</span>
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3 sm:gap-4">
                <div className="rounded-xl bg-white/60 dark:bg-white/5 px-4 py-3 text-center">
                  <p className="text-2xl font-bold tabular-nums">
                    {formatNumber(stats.totalSessions)}
                  </p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">Focus sessions</p>
                </div>
                <div className="rounded-xl bg-white/60 dark:bg-white/5 px-4 py-3 text-center">
                  <p className="text-2xl font-bold tabular-nums">
                    {formatNumber(stats.totalEmployees)}
                  </p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">Employees</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Section heading */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Trophy className="w-5 h-5 text-violet-600 dark:text-violet-400" />
            Recent Challenges
          </h2>
          <p className="text-sm text-muted-foreground">
            Across all companies on the platform
          </p>
        </div>
        <span className="text-xs text-muted-foreground">
          {recentChallenges.length} most recent
        </span>
      </div>

      {/* Timeline */}
      <div className="relative">
        {/* Vertical line */}
        <div className="absolute left-[19px] sm:left-[27px] top-2 bottom-2 w-px bg-border" />

        <div className="space-y-3">
          {recentChallenges.map((ch, i) => {
            const isCompleted = ch.status === 'COMPLETED'
            const isWinner = !!ch.winnerTeam
            const c = ch.winnerTeam ? getColor(ch.winnerTeam.color) : getColor('emerald')
            return (
              <motion.div
                key={ch.id}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.04, duration: 0.3 }}
                className="relative pl-12 sm:pl-16"
              >
                {/* Node */}
                <div
                  className={cn(
                    'absolute left-0 top-3 w-10 h-10 sm:w-14 sm:h-14 rounded-full flex items-center justify-center border-2 bg-background',
                    isCompleted
                      ? 'border-violet-300 dark:border-violet-700'
                      : 'border-emerald-300 dark:border-emerald-700',
                  )}
                >
                  {isCompleted ? (
                    <Trophy className="w-4 h-4 sm:w-5 sm:h-5 text-violet-600 dark:text-violet-400" />
                  ) : (
                    <Flag className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-600 dark:text-emerald-400" />
                  )}
                </div>

                <Card className="border-border/60">
                  <CardContent className="p-4">
                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-semibold text-sm">{ch.name}</h3>
                          <ChallengeStatusBadge status={ch.status} />
                        </div>
                        <div className="flex items-center gap-1.5 mt-1 text-xs text-muted-foreground">
                          <Building2 className="w-3 h-3" />
                          {ch.companyName}
                        </div>
                      </div>
                      {ch.giftCardValue > 0 && (
                        <div className="flex items-center gap-1.5 text-xs font-medium px-2 py-1 rounded-md bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300 shrink-0">
                          <Gift className="w-3.5 h-3.5" />
                          {ch.prize || `${formatCurrency(ch.giftCardValue)} gift card`}
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground flex-wrap">
                      <span className="flex items-center gap-1.5">
                        <Calendar className="w-3 h-3" />
                        {formatDate(ch.startDate)} → {formatDate(ch.endDate)}
                      </span>
                    </div>

                    {isCompleted && isWinner && ch.winnerTeam && (
                      <div
                        className={cn(
                          'mt-3 flex items-center gap-2 rounded-lg px-3 py-2',
                          c.bgSoft,
                        )}
                      >
                        <Crown className={cn('w-4 h-4', c.text)} />
                        <span className="text-xs font-medium">
                          Winner:{' '}
                          <span className={cn('font-semibold', c.text)}>
                            {ch.winnerTeam.name} team
                          </span>
                        </span>
                        {ch.giftCardValue > 0 && (
                          <span className="ml-auto text-xs text-muted-foreground">
                            {formatCurrency(ch.giftCardValue)} prize
                          </span>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            )
          })}

          {recentChallenges.length === 0 && (
            <Card className="border-border/60">
              <CardContent className="p-10 text-center text-sm text-muted-foreground">
                <Timer className="w-6 h-6 mx-auto mb-2 opacity-50" />
                No recent challenges across the platform.
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
