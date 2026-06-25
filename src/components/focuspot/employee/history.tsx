'use client'

import { useMemo } from 'react'
import { motion } from 'framer-motion'
import { Clock, Calendar } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

export type SessionEntry = {
  id: string
  startTime: string
  durationMinutes: number
  points: number
  completed?: boolean
}

function formatHM(mins: number) {
  const h = Math.floor(mins / 60)
  const m = mins % 60
  if (h === 0) return `${m}m`
  return m === 0 ? `${h}h` : `${h}h ${m}m`
}

export function EmployeeHistory({ sessions }: { sessions: SessionEntry[] }) {
  const grouped = useMemo(() => {
    const g: Record<string, SessionEntry[]> = {}
    sessions.forEach((s) => {
      const d = new Date(s.startTime)
      const key = d.toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
      })
      if (!g[key]) g[key] = []
      g[key].push(s)
    })
    return Object.entries(g)
  }, [sessions])

  const totalMinutes = sessions.reduce((sum, s) => sum + s.durationMinutes, 0)
  const totalPoints = sessions.reduce((sum, s) => sum + s.points, 0)

  if (sessions.length === 0) {
    return (
      <Card className="p-10 text-center">
        <div className="text-5xl mb-3">🌱</div>
        <h3 className="font-semibold text-lg">No sessions yet</h3>
        <p className="text-sm text-muted-foreground mt-1">
          Start your first deep work session to see it here.
        </p>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        <Card className="p-4">
          <div className="text-xs text-muted-foreground">Sessions</div>
          <div className="text-2xl font-bold">{sessions.length}</div>
        </Card>
        <Card className="p-4">
          <div className="text-xs text-muted-foreground">Total focus</div>
          <div className="text-2xl font-bold">{formatHM(totalMinutes)}</div>
        </Card>
        <Card className="p-4 col-span-2 sm:col-span-1">
          <div className="text-xs text-muted-foreground">Points earned</div>
          <div className="text-2xl font-bold text-amber-600">{totalPoints}</div>
        </Card>
      </div>

      {/* Timeline */}
      <Card className="p-5">
        <div className="flex items-center gap-2 mb-4">
          <Calendar className="w-5 h-5 text-emerald-600" />
          <h3 className="font-semibold">Recent Sessions</h3>
        </div>
        <div className="space-y-5 max-h-[34rem] overflow-y-auto scrollbar-thin pr-2">
          {grouped.map(([dayKey, daySessions]) => {
            const dayMinutes = daySessions.reduce(
              (sum, s) => sum + s.durationMinutes,
              0
            )
            return (
              <div key={dayKey}>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-sm font-semibold text-muted-foreground">
                    {dayKey}
                  </h4>
                  <span className="text-xs text-muted-foreground">
                    {formatHM(dayMinutes)} total
                  </span>
                </div>
                <div className="space-y-2 pl-4 border-l-2 border-border relative">
                  {daySessions.map((s, i) => (
                    <motion.div
                      key={s.id}
                      initial={{ opacity: 0, y: 5 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.05 }}
                      className="relative"
                    >
                      <div className="absolute -left-[21px] top-3 w-3 h-3 rounded-full bg-emerald-500 ring-4 ring-background" />
                      <div className="flex items-center justify-between p-3 rounded-lg hover:bg-muted/50 transition-colors">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-9 h-9 rounded-lg bg-emerald-100 dark:bg-emerald-950/50 flex items-center justify-center shrink-0">
                            <Clock className="w-4 h-4 text-emerald-600" />
                          </div>
                          <div className="min-w-0">
                            <div className="text-sm font-medium">
                              {new Date(s.startTime).toLocaleTimeString('en-US', {
                                hour: 'numeric',
                                minute: '2-digit',
                              })}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {s.durationMinutes} min deep work
                              {s.completed === false && ' · incomplete'}
                            </div>
                          </div>
                        </div>
                        <Badge className="bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-400 shrink-0">
                          +{s.points} pts
                        </Badge>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      </Card>
    </div>
  )
}
