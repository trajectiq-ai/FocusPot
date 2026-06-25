'use client'

import { motion } from 'framer-motion'
import { format } from 'date-fns'
import { Trophy, History, Gift, Crown, CalendarRange } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { getColor } from '@/lib/colors'
import type { CompletedChallenge } from './types'

export function HistoryTab({ challenges }: { challenges: CompletedChallenge[] }) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold tracking-tight">Challenge History</h2>
        <p className="text-sm text-muted-foreground mt-0.5">
          Past completed challenges and their winning teams.
        </p>
      </div>

      {challenges.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-12 text-center">
            <div className="mx-auto w-14 h-14 rounded-2xl bg-muted/60 flex items-center justify-center mb-3">
              <History className="w-7 h-7 text-muted-foreground" />
            </div>
            <h3 className="text-base font-semibold">No past challenges yet</h3>
            <p className="text-sm text-muted-foreground mt-1 max-w-sm mx-auto">
              Once you end your first challenge, it will appear here as a record of past winners and
              prizes.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {challenges.map((ch, idx) => (
            <motion.div
              key={ch.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, delay: idx * 0.06 }}
            >
              <HistoryCard challenge={ch} />
            </motion.div>
          ))}
        </div>
      )}
    </div>
  )
}

function HistoryCard({ challenge }: { challenge: CompletedChallenge }) {
  const winner = challenge.winnerTeam
  const winnerColor = winner ? getColor(winner.color) : null
  const start = new Date(challenge.startDate)
  const end = new Date(challenge.endDate)

  return (
    <Card className="overflow-hidden">
      <div className="h-1 bg-gradient-to-r from-emerald-400 via-emerald-500 to-teal-500" />
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="shrink-0 w-9 h-9 rounded-lg bg-muted/60 flex items-center justify-center">
              <Trophy className="w-4 h-4 text-amber-600 dark:text-amber-400" />
            </span>
            <div className="min-w-0">
              <CardTitle className="text-base leading-tight truncate">{challenge.name}</CardTitle>
              <CardDescription className="flex items-center gap-1 mt-0.5">
                <CalendarRange className="w-3 h-3" />
                {format(start, 'MMM d')} → {format(end, 'MMM d, yyyy')}
              </CardDescription>
            </div>
          </div>
          <Badge variant="secondary" className="shrink-0">
            Completed
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3 pt-0">
        {/* Prize */}
        <div className="flex items-start gap-2 p-2.5 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200/60 dark:border-amber-800/40">
          <Gift className="w-4 h-4 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
          <div className="min-w-0">
            <p className="text-[10px] uppercase tracking-wide text-amber-700 dark:text-amber-400 font-medium">
              Prize
            </p>
            <p className="text-sm font-semibold text-amber-900 dark:text-amber-200 leading-tight">
              {challenge.prize}
            </p>
          </div>
        </div>

        {/* Winner */}
        {winner ? (
          <div className="flex items-center gap-2 p-2.5 rounded-lg bg-muted/40 border border-border/60">
            <span className="shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-white shadow-sm">
              <Crown className="w-4 h-4" />
            </span>
            <div className="min-w-0">
              <p className="text-[10px] uppercase tracking-wide text-muted-foreground font-medium">
                Winning team
              </p>
              <div className="flex items-center gap-1.5 mt-0.5">
                {winnerColor && (
                  <span className={`w-2.5 h-2.5 rounded-full ${winnerColor.dot}`} />
                )}
                <p className="text-sm font-semibold truncate">{winner.name}</p>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-2 p-2.5 rounded-lg bg-muted/40 border border-border/60">
            <span className="shrink-0 w-8 h-8 rounded-full bg-muted flex items-center justify-center text-muted-foreground">
              <Trophy className="w-4 h-4" />
            </span>
            <div>
              <p className="text-[10px] uppercase tracking-wide text-muted-foreground font-medium">
                Winner
              </p>
              <p className="text-sm font-medium text-muted-foreground">No winner determined</p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
