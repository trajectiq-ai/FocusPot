'use client'

// Company Admin → Analytics tab
// Reads persisted statistics from /api/admin/analytics?days=30
// Charts: daily focus hours (Area), weekly summary (Bar),
// monthly summary (stat cards), team trends (multi-line).

import { useCallback, useEffect, useMemo, useState } from 'react'
import { format, parseISO } from 'date-fns'
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts'
import {
  BarChart3,
  Clock,
  Sparkles,
  Users,
  TrendingUp,
  CalendarDays,
  Loader2,
  Info,
  RefreshCw,
} from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs'
import { getColor } from '@/lib/colors'
import type { AnalyticsData } from './types'

type Period = 7 | 30 | 90

// ============================================================
// Color palette for chart lines/areas — no blue/indigo
// ============================================================
const TEAM_LINE_COLORS = [
  '#10b981', // emerald-500
  '#f59e0b', // amber-500
  '#f43f5e', // rose-500
  '#0ea5e9', // sky-500
  '#8b5cf6', // violet-500
  '#f97316', // orange-500
  '#14b8a6', // teal-500
  '#ec4899', // pink-500
]

// ============================================================
// Main AnalyticsTab
// ============================================================

export function AnalyticsTab() {
  const [period, setPeriod] = useState<Period>(30)
  const [data, setData] = useState<AnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchAnalytics = useCallback(
    async (silent = false) => {
      if (silent) setRefreshing(true)
      else setLoading(true)
      setError(null)
      try {
        const res = await fetch(`/api/admin/analytics?days=${period}`, { cache: 'no-store' })
        const j = await res.json().catch(() => ({}))
        if (!res.ok) throw new Error(j.error || 'Failed to load analytics')
        setData(j as AnalyticsData)
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to load analytics')
      } finally {
        setLoading(false)
        setRefreshing(false)
      }
    },
    [period],
  )

  useEffect(() => {
    fetchAnalytics()
  }, [fetchAnalytics])

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold tracking-tight flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-violet-500" /> Analytics
          </h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            Persisted company-wide statistics — refreshed every hour by the scheduler.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <PeriodSelector value={period} onChange={setPeriod} disabled={loading} />
          <Button
            variant="outline"
            size="icon"
            onClick={() => fetchAnalytics(true)}
            disabled={refreshing}
            aria-label="Refresh analytics"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      {/* Scheduler note */}
      <div className="flex items-start gap-2.5 p-3 rounded-xl border border-violet-200/70 dark:border-violet-800/50 bg-violet-50/60 dark:bg-violet-950/20">
        <Info className="w-4 h-4 text-violet-600 dark:text-violet-400 mt-0.5 shrink-0" />
        <p className="text-xs text-violet-900 dark:text-violet-200">
          <span className="font-semibold">Persisted statistics:</span> these aggregates are
          refreshed every hour by the scheduler. Numbers may lag live sessions by up to 60
          minutes. Switching the period selector re-fetches immediately.
        </p>
      </div>

      {loading ? (
        <Card>
          <CardContent className="py-16 flex items-center justify-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="w-4 h-4 animate-spin" /> Loading analytics…
          </CardContent>
        </Card>
      ) : error ? (
        <Card className="border-rose-200 dark:border-rose-800/50">
          <CardContent className="py-10 text-center">
            <p className="text-sm text-rose-600 dark:text-rose-400">{error}</p>
            <Button
              variant="outline"
              size="sm"
              className="mt-3"
              onClick={() => fetchAnalytics(false)}
            >
              Try again
            </Button>
          </CardContent>
        </Card>
      ) : data ? (
        <>
          {/* Totals — summary stat cards */}
          <TotalsCards data={data} period={period} />

          {/* Charts */}
          <Tabs defaultValue="daily" className="w-full">
            <TabsList className="grid w-full sm:w-auto grid-cols-3 sm:inline-flex">
              <TabsTrigger value="daily">Daily</TabsTrigger>
              <TabsTrigger value="weekly">Weekly</TabsTrigger>
              <TabsTrigger value="teams">Teams</TabsTrigger>
            </TabsList>

            <TabsContent value="daily" className="mt-4">
              <DailyFocusChart data={data} />
            </TabsContent>
            <TabsContent value="weekly" className="mt-4">
              <WeeklySummaryChart data={data} />
            </TabsContent>
            <TabsContent value="teams" className="mt-4">
              <TeamTrendsChart data={data} />
            </TabsContent>
          </Tabs>

          {/* Monthly summary cards */}
          <MonthlySummary data={data} />
        </>
      ) : null}
    </div>
  )
}

// ============================================================
// Period selector
// ============================================================

function PeriodSelector({
  value,
  onChange,
  disabled,
}: {
  value: Period
  onChange: (v: Period) => void
  disabled?: boolean
}) {
  return (
    <div className="inline-flex items-center rounded-lg border border-border bg-card p-0.5">
      {([7, 30, 90] as Period[]).map((p) => (
        <button
          key={p}
          type="button"
          disabled={disabled}
          onClick={() => onChange(p)}
          className={`px-3 py-1.5 text-xs font-medium rounded-md transition ${
            value === p
              ? 'bg-emerald-600 text-white shadow-sm'
              : 'text-muted-foreground hover:text-foreground hover:bg-muted/60'
          } disabled:opacity-50`}
        >
          {p}d
        </button>
      ))}
    </div>
  )
}

// ============================================================
// Totals stat cards
// ============================================================

function TotalsCards({ data, period }: { data: AnalyticsData; period: Period }) {
  const stats = [
    {
      label: 'Total focus hours',
      value: data.totals.totalHours.toLocaleString(),
      icon: Clock,
      gradient: 'from-emerald-500 to-teal-600',
      sub: `over the last ${period} days`,
    },
    {
      label: 'Total sessions',
      value: data.totals.totalSessions.toLocaleString(),
      icon: BarChart3,
      gradient: 'from-amber-500 to-orange-600',
      sub: 'completed focus sessions',
    },
    {
      label: 'Total points',
      value: data.totals.totalPoints.toLocaleString(),
      icon: Sparkles,
      gradient: 'from-violet-500 to-purple-600',
      sub: 'earned by employees',
    },
    {
      label: 'Avg active employees',
      value: data.totals.avgActiveEmployees.toLocaleString(),
      icon: Users,
      gradient: 'from-sky-500 to-cyan-600',
      sub: 'per day, on average',
    },
  ]
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {stats.map((s) => {
        const Icon = s.icon
        return (
          <Card key={s.label}>
            <CardContent className="p-4 sm:p-6">
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs text-muted-foreground">{s.label}</p>
                <span
                  className={`shrink-0 w-8 h-8 rounded-lg bg-gradient-to-br ${s.gradient} text-white flex items-center justify-center`}
                >
                  <Icon className="w-4 h-4" />
                </span>
              </div>
              <p className="text-2xl sm:text-3xl font-bold tabular-nums mt-2">{s.value}</p>
              <p className="text-xs text-muted-foreground mt-1">{s.sub}</p>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}

// ============================================================
// Daily focus hours — AreaChart
// ============================================================

function DailyFocusChart({ data }: { data: AnalyticsData }) {
  const chartData = useMemo(
    () =>
      data.daily.map((d) => ({
        date: format(parseISO(d.date), 'MMM d'),
        hours: d.focusHours,
        sessions: d.sessions,
      })),
    [data.daily],
  )

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-emerald-500" /> Daily focus hours
        </CardTitle>
        <CardDescription>
          Company-wide focus hours logged per day. Hover for sessions and exact values.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {chartData.length === 0 ? (
          <EmptyChart label="No daily data for this period yet." />
        ) : (
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 8, right: 12, bottom: 0, left: -12 }}>
                <defs>
                  <linearGradient id="focusHoursGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.5} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" vertical={false} />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 11 }}
                  className="text-muted-foreground"
                  interval="preserveStartEnd"
                  minTickGap={16}
                />
                <YAxis
                  tick={{ fontSize: 11 }}
                  className="text-muted-foreground"
                  allowDecimals={false}
                />
                <RechartsTooltip
                  contentStyle={{
                    borderRadius: 12,
                    border: '1px solid hsl(var(--border))',
                    background: 'hsl(var(--card))',
                    fontSize: 12,
                  }}
                  formatter={(value: number, name: string) => [
                    name === 'hours' ? `${value}h` : value,
                    name === 'hours' ? 'Focus hours' : 'Sessions',
                  ]}
                />
                <Area
                  type="monotone"
                  dataKey="hours"
                  stroke="#10b981"
                  strokeWidth={2}
                  fill="url(#focusHoursGradient)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// ============================================================
// Weekly summary — BarChart
// ============================================================

function WeeklySummaryChart({ data }: { data: AnalyticsData }) {
  const chartData = useMemo(
    () =>
      data.weekly.map((w) => ({
        week: format(parseISO(w.week), 'MMM d'),
        hours: w.focusHours,
        sessions: w.sessions,
        points: w.points,
      })),
    [data.weekly],
  )

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <CalendarDays className="w-4 h-4 text-amber-500" /> Weekly summary
        </CardTitle>
        <CardDescription>
          Aggregated weekly focus hours, sessions, and points earned.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {chartData.length === 0 ? (
          <EmptyChart label="No weekly data for this period yet." />
        ) : (
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 8, right: 12, bottom: 0, left: -12 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" vertical={false} />
                <XAxis
                  dataKey="week"
                  tick={{ fontSize: 11 }}
                  className="text-muted-foreground"
                  interval="preserveStartEnd"
                  minTickGap={8}
                />
                <YAxis
                  yAxisId="left"
                  tick={{ fontSize: 11 }}
                  className="text-muted-foreground"
                  allowDecimals={false}
                />
                <YAxis
                  yAxisId="right"
                  orientation="right"
                  tick={{ fontSize: 11 }}
                  className="text-muted-foreground"
                  allowDecimals={false}
                />
                <RechartsTooltip
                  contentStyle={{
                    borderRadius: 12,
                    border: '1px solid hsl(var(--border))',
                    background: 'hsl(var(--card))',
                    fontSize: 12,
                  }}
                  formatter={(value: number, name: string) => {
                    if (name === 'hours') return [`${value}h`, 'Focus hours']
                    if (name === 'sessions') return [value, 'Sessions']
                    return [value, 'Points']
                  }}
                />
                <Legend
                  wrapperStyle={{ fontSize: 11 }}
                  formatter={(value) => {
                    if (value === 'hours') return 'Focus hours'
                    if (value === 'sessions') return 'Sessions'
                    return 'Points'
                  }}
                />
                <Bar yAxisId="left" dataKey="hours" fill="#10b981" radius={[4, 4, 0, 0]} maxBarSize={36} />
                <Bar yAxisId="left" dataKey="sessions" fill="#f59e0b" radius={[4, 4, 0, 0]} maxBarSize={36} />
                <Bar yAxisId="right" dataKey="points" fill="#8b5cf6" radius={[4, 4, 0, 0]} maxBarSize={36} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// ============================================================
// Team trends — multi-line chart
// ============================================================

function TeamTrendsChart({ data }: { data: AnalyticsData }) {
  // Build merged data: { date: 'MMM d', [teamName]: hours, ... }
  const { chartData, teams } = useMemo(() => {
    const teamsWithColor = data.teamTrends.map((t, idx) => ({
      teamId: t.teamId,
      teamName: t.teamName,
      teamColor: t.teamColor,
      color: TEAM_LINE_COLORS[idx % TEAM_LINE_COLORS.length],
    }))

    // Collect all unique dates across teams, then merge per-date rows
    // into a single chart row keyed by formatted date.
    const allDates = new Set<string>()
    for (const t of data.teamTrends) for (const p of t.data) allDates.add(p.date)
    const sortedDates = Array.from(allDates).sort()
    const merged: Record<string, number | string>[] = sortedDates.map((d) => {
      const key = format(parseISO(d), 'MMM d')
      const entry: Record<string, number | string> = { date: key }
      for (const t of data.teamTrends) {
        const pt = t.data.find((p) => p.date === d)
        if (pt) entry[t.teamName] = pt.focusHours
      }
      return entry
    })
    return { chartData: merged, teams: teamsWithColor }
  }, [data])

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Users className="w-4 h-4 text-sky-500" /> Team focus trends
        </CardTitle>
        <CardDescription>
          Daily focus hours per team. Toggle teams in the legend to focus on specific ones.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {chartData.length === 0 || teams.length === 0 ? (
          <EmptyChart label="No team trends for this period yet." />
        ) : (
          <>
            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 8, right: 12, bottom: 0, left: -12 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" vertical={false} />
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 11 }}
                    className="text-muted-foreground"
                    interval="preserveStartEnd"
                    minTickGap={16}
                  />
                  <YAxis
                    tick={{ fontSize: 11 }}
                    className="text-muted-foreground"
                    allowDecimals={false}
                  />
                  <RechartsTooltip
                    contentStyle={{
                      borderRadius: 12,
                      border: '1px solid hsl(var(--border))',
                      background: 'hsl(var(--card))',
                      fontSize: 12,
                    }}
                    formatter={(value: number, name: string) => [`${value}h`, name]}
                  />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  {teams.map((t) => (
                    <Line
                      key={t.teamId}
                      type="monotone"
                      dataKey={t.teamName}
                      stroke={t.color}
                      strokeWidth={2}
                      dot={false}
                      activeDot={{ r: 4 }}
                      connectNulls
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </div>
            {/* Team legend chips */}
            <div className="flex flex-wrap gap-2 mt-3">
              {teams.map((t) => {
                const cc = getColor(t.teamColor)
                return (
                  <Badge key={t.teamId} variant="outline" className="gap-1.5">
                    <span className={`w-2 h-2 rounded-full ${cc.dot}`} />
                    {t.teamName}
                  </Badge>
                )
              })}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}

// ============================================================
// Monthly summary — stat cards
// ============================================================

function MonthlySummary({ data }: { data: AnalyticsData }) {
  if (data.monthly.length === 0) return null

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <CalendarDays className="w-4 h-4 text-muted-foreground" />
        <h3 className="text-sm font-semibold">Monthly summary</h3>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {data.monthly.map((m) => {
          const date = parseISO(`${m.month}-01`)
          const monthLabel = format(date, 'MMMM yyyy')
          return (
            <Card key={m.month}>
              <CardContent className="p-4 sm:p-6">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-semibold">{monthLabel}</p>
                  <Badge variant="outline" className="text-[10px]">
                    {m.month}
                  </Badge>
                </div>
                <div className="grid grid-cols-3 gap-3 mt-3">
                  <div>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Hours</p>
                    <p className="text-lg font-bold tabular-nums">{m.focusHours.toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Sessions</p>
                    <p className="text-lg font-bold tabular-nums">{m.sessions.toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Points</p>
                    <p className="text-lg font-bold tabular-nums">{m.points.toLocaleString()}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}

function EmptyChart({ label }: { label: string }) {
  return (
    <div className="h-72 w-full flex items-center justify-center text-sm text-muted-foreground">
      <div className="text-center">
        <BarChart3 className="w-10 h-10 mx-auto text-muted-foreground/40 mb-2" />
        <p>{label}</p>
      </div>
    </div>
  )
}
