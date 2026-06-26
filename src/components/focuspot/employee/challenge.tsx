'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Gift, Clock, Target, Sparkles, PartyPopper, Frown } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { getColor } from '@/lib/colors'
import { toast } from 'sonner'
import { Confetti } from './confetti'

type ActiveChallenge = {
  id: string
  name: string
  description: string
  startDate: string
  endDate: string
  prize: string
  giftCardValue: number
  status: string
}

type LastCompleted = {
  id: string
  name: string
  prize: string
  giftCardValue: number
  winnerTeam: { id: string; name: string; color: string } | null
  isWinner: boolean
  giftCardCode: string
}

type Props = {
  activeChallenge: ActiveChallenge | null
  lastCompleted: LastCompleted | null
}

function useCountdown(target: number) {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(id)
  }, [])
  const remaining = Math.max(0, target - now)
  return {
    days: Math.floor(remaining / (1000 * 60 * 60 * 24)),
    hours: Math.floor((remaining % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
    minutes: Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60)),
    seconds: Math.floor((remaining % (1000 * 60)) / 1000),
    ended: remaining <= 0,
  }
}

export function EmployeeChallenge({ activeChallenge, lastCompleted }: Props) {
  // Fire confetti on mount if the user won the most recent completed challenge.
  // Lazy-initialized so we don't call setState synchronously inside an effect.
  const [showConfetti, setShowConfetti] = useState(() =>
    Boolean(lastCompleted?.isWinner)
  )
  const countdown = useCountdown(
    activeChallenge ? new Date(activeChallenge.endDate).getTime() : 0
  )

  useEffect(() => {
    if (!showConfetti) return
    const t = setTimeout(() => setShowConfetti(false), 6000)
    return () => clearTimeout(t)
  }, [showConfetti])

  const copyCode = (code: string) => {
    navigator.clipboard?.writeText(code).then(
      () => toast.success('Gift card code copied!'),
      () => toast.error('Could not copy code')
    )
  }

  return (
    <div className="space-y-6">
      <Confetti key={`confetti-${showConfetti}`} run={showConfetti} />

      {/* Winner / "better luck next time" announcement */}
      {lastCompleted &&
        (lastCompleted.isWinner ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
          >
            <Card className="p-6 bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/30 dark:to-orange-950/30 border-amber-300 dark:border-amber-800">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-2xl bg-amber-400 flex items-center justify-center shrink-0 shadow-md shadow-amber-400/30">
                  <PartyPopper className="w-6 h-6 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <Badge className="bg-amber-200 text-amber-900 hover:bg-amber-200 mb-2">
                    🏆 You Won!
                  </Badge>
                  <h3 className="text-xl font-bold">
                    Congratulations! Your team won &ldquo;{lastCompleted.name}&rdquo;
                  </h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    Prize: <span className="font-semibold text-foreground">{lastCompleted.prize}</span>
                  </p>
                  {lastCompleted.giftCardCode && (
                    <div className="mt-4 p-3 rounded-xl bg-white dark:bg-card border-2 border-dashed border-amber-300 dark:border-amber-700">
                      <div className="text-xs text-muted-foreground mb-1">
                        Your gift card code:
                      </div>
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <code className="text-lg font-mono font-bold tracking-wider text-amber-700 dark:text-amber-400">
                          {lastCompleted.giftCardCode}
                        </code>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => copyCode(lastCompleted.giftCardCode)}
                        >
                          Copy
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </Card>
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
          >
            <Card className="p-6">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-2xl bg-muted flex items-center justify-center shrink-0">
                  <Frown className="w-6 h-6 text-muted-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-lg font-bold">Better luck next time!</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    &ldquo;{lastCompleted.name}&rdquo; has ended. The winning team was{' '}
                    {lastCompleted.winnerTeam ? (
                      <span
                        className={`font-semibold ${getColor(lastCompleted.winnerTeam.color).text}`}
                      >
                        {lastCompleted.winnerTeam.name}
                      </span>
                    ) : (
                      '—'
                    )}
                    .
                  </p>
                  <p className="text-xs text-muted-foreground mt-2">
                    Prize: {lastCompleted.prize}. Keep focusing — your team can win the next one!
                  </p>
                </div>
              </div>
            </Card>
          </motion.div>
        ))}

      {/* Active challenge */}
      {activeChallenge ? (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Card className="p-6 sm:p-8 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-48 h-48 bg-emerald-500/10 rounded-full blur-3xl -mr-12 -mt-12" />
            <div className="absolute bottom-0 left-0 w-40 h-40 bg-amber-500/10 rounded-full blur-3xl -ml-12 -mb-12" />
            <div className="relative">
              <div className="flex items-center gap-2 mb-2 flex-wrap">
                <Sparkles className="w-4 h-4 text-amber-500" />
                <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400 hover:bg-emerald-200">
                  Active Challenge
                </Badge>
              </div>
              <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">
                {activeChallenge.name}
              </h2>
              <p className="text-muted-foreground mt-2 max-w-2xl">
                {activeChallenge.description}
              </p>

              {/* Prize */}
              <div className="mt-4 p-4 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900">
                <div className="flex items-center gap-2">
                  <Gift className="w-5 h-5 text-amber-600" />
                  <span className="text-sm font-medium text-amber-700 dark:text-amber-400">
                    Prize
                  </span>
                </div>
                <div className="text-lg font-bold mt-1">{activeChallenge.prize}</div>
                {activeChallenge.giftCardValue > 0 && (
                  <div className="text-xs text-muted-foreground">
                    ${activeChallenge.giftCardValue} gift card per winning team member
                  </div>
                )}
              </div>

              {/* Countdown */}
              <div className="mt-6">
                <div className="flex items-center gap-2 mb-3">
                  <Clock className="w-4 h-4 text-emerald-600" />
                  <span className="text-sm font-medium">
                    {countdown.ended ? 'Challenge ended' : 'Time remaining'}
                  </span>
                </div>
                <div className="grid grid-cols-4 gap-2 sm:gap-3">
                  {[
                    { label: 'Days', value: countdown.days },
                    { label: 'Hours', value: countdown.hours },
                    { label: 'Min', value: countdown.minutes },
                    { label: 'Sec', value: countdown.seconds },
                  ].map((t) => (
                    <div
                      key={t.label}
                      className="p-3 rounded-xl bg-muted text-center"
                    >
                      <div className="text-2xl sm:text-3xl font-bold tabular-nums">
                        {t.value.toString().padStart(2, '0')}
                      </div>
                      <div className="text-xs text-muted-foreground">{t.label}</div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-6 flex items-start gap-2 p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 text-sm">
                <Target className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <p className="text-emerald-800 dark:text-emerald-300">
                  The team with the most focus hours wins. Every deep work session
                  counts — start focusing now!
                </p>
              </div>
            </div>
          </Card>
        </motion.div>
      ) : (
        !lastCompleted && (
          <Card className="p-10 text-center">
            <div className="text-5xl mb-3">🎯</div>
            <h3 className="font-semibold text-lg">No active challenge</h3>
            <p className="text-sm text-muted-foreground mt-1">
              Your company admin hasn&apos;t started a challenge yet. Stay focused on
              your daily streak!
            </p>
          </Card>
        )
      )}
    </div>
  )
}
