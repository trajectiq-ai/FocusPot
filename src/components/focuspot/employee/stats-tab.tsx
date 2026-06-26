'use client'

import { useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts'
import {
  CalendarDays,
  Flame,
  Timer,
  TrendingUp,
  Award,
  Activity,
  Clock,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'

type DailyEntry = {
  date: string
  focusMinutes: number
  sessionCount: number
  points: number
  longestSession: number
}

type HeatmapEntry = {
  day: number // 0=Sun..6=Sat
  hour: number // 0..23
  minutes: number
  sessionCount: number
}

type WeeklySummary = {
  totalHours: number
  totalSessions: number
  totalPoints: number
  avgMinutesPerActiveDay: number
  activeDays: number
  bestDay: {
    date: string
    focusMinutes: number
    focusHours: number
    sessionCount: number
  } | null
  thisWeek: {
    startDate: string
    endDate: string
    totalMinutes: number
    totalHours: number
    totalSessions: number
  }
}

type Response = {
  user: {
    streak: number
    bestStreak: number
    totalFocusHours: number
    totalPoints: number
    totalSessions: number
  }
  window: { startDate: string; endDate: string; days: number }
  dailyFocusMinutes: DailyEntry[]
  sessionCalendar: string[]
  heatmap: HeatmapEntry[]
  weeklySummary: WeeklySummary
}

const DAYS_OF_WEEK = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

function formatHM(mins: number): string {
  if (mins <= 0) return '0m'
  const h = Math.floor(mins / 60)
  const m = Math.round(mins % 60)
  if (h === 0) return `${m}m`
  return m === 0 ? `${h}h` : `${h}h ${m}m`
}

function formatHours(h: number): string {
  if (h <= 0) return '0h'
  return `${h.toFixed(1)}h`
}

// Pick an emerald intensity class based on focus minutes.
function intensityClass(minutes: number, max: number): string {
  if (minutes <= 0 || max <= 0) return 'bg-muted/50'
  const ratio = minutes / max
  if (ratio < 0.2) return 'bg-emerald-200 dark:bg-emerald-900/60'
  if (ratio < 0.4) return 'bg-emerald-400 dark:bg-emerald-700'
  if (ratio < 0.7) return 'bg-emerald-600 dark:bg-emerald-500'
  return 'bg-emerald-800 dark:bg-emerald-400'
}

// Heatmap intensity 0..4 from session minutes (logarithmic-ish bucketing).
function heatLevel(minutes: number): number {
  if (minutes <= 0) return 0
  if (minutes < 15) return 1
  if (minutes < 45) return 2
  if (minutes < 120) return 3
  return 4
}

const HEAT_COLORS: Record<number, string> = {
  0: 'bg-muted/40',
  1: 'bg-emerald-200 dark:bg-emerald-900/60',
  2: 'bg-emerald-400 dark:bg-emerald-700',
  3: 'bg-emerald-600 dark:bg-emerald-500',
  4: 'bg-emerald-800 dark:bg-emerald-400',
}

const HEAT_LABELS: Record<number, string> = {
  0: 'No activity',
  1: 'Light (<15m)',
  2: 'Moderate (15–45m)',
  3: 'High (45–120m)',
  4: 'Intense (120m+)',
}

export function StatsTab() {
  const [data, setData] = useState<Response | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    fetch('/api/employee/stats', { cache: 'no-store' })
      .then(async (r) => {
        if (!r.ok) throw new Error('Failed to load stats')
        return r.json() as Promise<Response>
      })
      .then((d) => {
        if (!cancelled) setData(d)
      })
      .catch((e) => {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Failed to load')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-xl" />
          ))}
        </div>
        <Skeleton className="h-64 rounded-xl" />
        <Skeleton className="h-72 rounded-xl" />
      </div>
    )
  }

  if (error || !data) {
    return (
      <Card className="p-10 text-center">
        <div className="text-5xl mb-3">📊</div>
        <h3 className="font-semibold text-lg">Could not load your stats</h3>
        <p className="text-sm text-muted-foreground mt-1">{error || 'Please try again.'}</p>
      </Card>
    )
  }

  const { weeklySummary: w, dailyFocusMinutes, heatmap } = data
  const maxDailyMinutes = Math.max(1, ...dailyFocusMinutes.map((d) => d.focusMinutes))

  const dailyChartData = dailyFocusMinutes.map((d) => ({
    date: d.date.slice(5), // MM-DD
    minutes: d.focusMinutes,
    sessions: d.sessionCount,
  }))

  return (
    <div className="space-y-6">
      {/* Weekly summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <SummaryCard
          icon={Timer}
          label="Total focus"
          value={formatHours(w.totalHours)}
          sub="last 30 days"
          tint="bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300"
          index={0}
        />
        <SummaryCard
          icon={Activity}
          label="Sessions"
          value={String(w.totalSessions)}
          sub={`${w.activeDays} active days`}
          tint="bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300"
          index={1}
        />
        <SummaryCard
          icon={TrendingUp}
          label="Avg / active day"
          value={formatHM(w.avgMinutesPerActiveDay)}
          sub={w.activeDays > 0 ? 'across active days' : 'no active days yet'}
          tint="bg-violet-100 text-violet-700 dark:bg-violet-950/50 dark:text-violet-300"
          index={2}
        />
        <SummaryCard
          icon={Flame}
          label="Current streak"
          value={`${data.user.streak}d`}
          sub={`Best: ${data.user.bestStreak}d`}
          tint="bg-orange-100 text-orange-700 dark:bg-orange-950/50 dark:text-orange-300"
          index={3}
        />
      </div>

      {/* Daily trend chart */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            Daily focus minutes
            <span className="text-xs font-normal text-muted-foreground">
              (last {data.window.days} days)
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={dailyChartData} margin={{ top: 4, right: 8, bottom: 0, left: -16 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.5} vertical={false} />
                <XAxis
                  dataKey="date"
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={10}
                  tickLine={false}
                  axisLine={false}
                  interval={4}
                />
                <YAxis
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={10}
                  tickLine={false}
                  axisLine={false}
                  width={36}
                />
                <Tooltip
                  contentStyle={{
                    borderRadius: 8,
                    border: '1px solid hsl(var(--border))',
                    fontSize: 12,
                  }}
                  formatter={(v: number, name: string) =>
                    name === 'minutes' ? [formatHM(v), 'Focus'] : [v, name]
                  }
                  labelFormatter={(l) => `Date: ${l}`}
                />
                <Line
                  type="monotone"
                  dataKey="minutes"
                  stroke="#10b981"
                  strokeWidth={2.5}
                  dot={false}
                  activeDot={{ r: 4, fill: '#10b981' }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Session calendar + best day */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <CalendarDays className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              Session calendar
              <span className="text-xs font-normal text-muted-foreground">
                (last 30 days)
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <SessionCalendar daily={dailyFocusMinutes} max={maxDailyMinutes} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Award className="w-4 h-4 text-amber-600 dark:text-amber-400" />
              Best day
            </CardTitle>
          </CardHeader>
          <CardContent>
            {w.bestDay ? (
              <div className="space-y-3">
                <div className="text-3xl font-bold tabular-nums">
                  {formatHours(w.bestDay.focusHours)}
                </div>
                <div className="text-sm text-muted-foreground">
                  {new Date(w.bestDay.date).toLocaleDateString('en-US', {
                    weekday: 'long',
                    month: 'short',
                    day: 'numeric',
                  })}
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Clock className="w-3.5 h-3.5" />
                  <span>
                    {w.bestDay.sessionCount} session
                    {w.bestDay.sessionCount === 1 ? '' : 's'}
                  </span>
                </div>
                <div className="pt-3 border-t border-border/60 space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">This week</span>
                    <span className="font-semibold">
                      {formatHours(w.thisWeek.totalHours)} · {w.thisWeek.totalSessions} sessions
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="py-8 text-center text-sm text-muted-foreground">
                <div className="text-3xl mb-2">🌱</div>
                No focus sessions in the last 30 days yet.
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Heatmap */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Activity className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            Focus heatmap
            <span className="text-xs font-normal text-muted-foreground">
              (day of week × hour of day)
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <FocusHeatmap heatmap={heatmap} />
        </CardContent>
      </Card>
    </div>
  )
}

function SummaryCard({
  icon: Icon,
  label,
  value,
  sub,
  tint,
  index,
}: {
  icon: typeof Timer
  label: string
  value: string
  sub: string
  tint: string
  index: number
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05, duration: 0.3 }}
    >
      <Card className="p-4 h-full">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              {label}
            </p>
            <p className="text-2xl font-bold tabular-nums mt-1">{value}</p>
            <p className="text-[11px] text-muted-foreground mt-0.5 truncate">{sub}</p>
          </div>
          <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center shrink-0', tint)}>
            <Icon className="w-4 h-4" />
          </div>
        </div>
      </Card>
    </motion.div>
  )
}

function SessionCalendar({
  daily,
  max,
}: {
  daily: DailyEntry[]
  max: number
}) {
  // Group days into weeks (columns) — show as a grid with weekday rows
  // to mimic a GitHub-style contribution graph for the last 30 days.
  // We align by weekday so partial weeks make sense.
  if (daily.length === 0) {
    return (
      <div className="py-8 text-center text-sm text-muted-foreground">No data</div>
    )
  }

  const first = new Date(daily[0]!.date + 'T00:00:00')
  const firstDow = first.getDay() // 0..6
  const cells: (DailyEntry | null)[] = []
  // Pad before first entry to align weekday
  for (let i = 0; i < firstDow; i++) cells.push(null)
  for (const d of daily) cells.push(d)

  // Group into week columns of 7
  const weeks: (DailyEntry | null)[][] = []
  for (let i = 0; i < cells.length; i += 7) {
    weeks.push(cells.slice(i, i + 7))
  }

  return (
    <div className="space-y-3">
      <div className="flex gap-1 overflow-x-auto scrollbar-thin pb-1">
        {weeks.map((week, wi) => (
          <div key={wi} className="flex flex-col gap-1">
            {Array.from({ length: 7 }).map((_, di) => {
              const entry = week[di] ?? null
              if (!entry) {
                return (
                  <div
                    key={di}
                    className="w-3.5 h-3.5 rounded-sm bg-transparent"
                    aria-hidden
                  />
                )
              }
              const cls = intensityClass(entry.focusMinutes, max)
              const dateLabel = new Date(entry.date + 'T00:00:00').toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
              })
              return (
                <div
                  key={di}
                  title={`${dateLabel} — ${formatHM(entry.focusMinutes)} · ${entry.sessionCount} session${entry.sessionCount === 1 ? '' : 's'}`}
                  className={cn('w-3.5 h-3.5 rounded-sm transition-colors', cls)}
                />
              )
            })}
          </div>
        ))}
      </div>
      <div className="flex items-center justify-between text-[11px] text-muted-foreground">
        <span>Less</span>
        <div className="flex items-center gap-1">
          <span className="w-3 h-3 rounded-sm bg-muted/50" />
          <span className={cn('w-3 h-3 rounded-sm', HEAT_COLORS[1]!)} />
          <span className={cn('w-3 h-3 rounded-sm', HEAT_COLORS[2]!)} />
          <span className={cn('w-3 h-3 rounded-sm', HEAT_COLORS[3]!)} />
          <span className={cn('w-3 h-3 rounded-sm', HEAT_COLORS[4]!)} />
        </div>
        <span>More</span>
      </div>
    </div>
  )
}

function FocusHeatmap({ heatmap }: { heatmap: HeatmapEntry[] }) {
  // 7 rows (days) × 24 columns (hours)
  const matrix = useMemo(() => {
    const m: HeatmapEntry[][] = Array.from({ length: 7 }, () => Array(24).fill(null as unknown as HeatmapEntry))
    for (const cell of heatmap) {
      if (cell.day >= 0 && cell.day < 7 && cell.hour >= 0 && cell.hour < 24) {
        m[cell.day]![cell.hour] = cell
      }
    }
    return m
  }, [heatmap])

  return (
    <div className="space-y-3">
      <div className="overflow-x-auto scrollbar-thin pb-1">
        <div className="min-w-[640px]">
          {/* Hour labels (top) */}
          <div className="flex pl-10 mb-1">
            {Array.from({ length: 24 }).map((_, h) => (
              <div
                key={h}
                className="flex-1 text-center text-[9px] text-muted-foreground tabular-nums"
              >
                {h % 3 === 0 ? h : ''}
              </div>
            ))}
          </div>
          {/* Rows */}
          {matrix.map((row, dayIdx) => (
            <div key={dayIdx} className="flex items-center mb-1">
              <div className="w-10 text-[10px] font-medium text-muted-foreground shrink-0">
                {DAYS_OF_WEEK[dayIdx]}
              </div>
              <div className="flex flex-1 gap-0.5">
                {row.map((cell, h) => {
                  const level = cell ? heatLevel(cell.minutes) : 0
                  const label = cell
                    ? `${DAYS_OF_WEEK[dayIdx]} ${h}:00 — ${HEAT_LABELS[level]} (${formatHM(cell.minutes)})`
                    : `${DAYS_OF_WEEK[dayIdx]} ${h}:00 — No activity`
                  return (
                    <div
                      key={h}
                      title={label}
                      className={cn(
                        'flex-1 h-5 rounded-sm transition-colors',
                        HEAT_COLORS[level],
                      )}
                    />
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
      {/* Legend */}
      <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-2 border-t border-border/60">
        <span>Intensity</span>
        <div className="flex items-center gap-2 flex-wrap">
          {([0, 1, 2, 3, 4] as const).map((lvl) => (
            <div key={lvl} className="flex items-center gap-1">
              <span className={cn('w-3 h-3 rounded-sm', HEAT_COLORS[lvl])} />
              <span>{HEAT_LABELS[lvl]}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
