'use client'

import { useMemo } from 'react'
import { motion } from 'framer-motion'
import { format, parseISO } from 'date-fns'
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { Shield, Lock, Clock, Zap, Users, TrendingUp, Trophy, Calendar, Sparkles } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import type { DashboardData } from './types'

function useCountdown(endDate: string) {
  return useMemo(() => {
    const end = new Date(endDate).getTime()
    const now = Date.now()
    const diff = Math.max(0, end - now)
    const days = Math.floor(diff / 86400000)
    const hours = Math.floor((diff % 86400000) / 3600000)
    const minutes = Math.floor((diff % 3600000) / 60000)
    const seconds = Math.floor((diff % 60000) / 1000)
    return { diff, days, hours, minutes, seconds, ended: diff === 0 }
  }, [endDate])
}

function subscriptionStyle(status: string) {
  switch (status) {
    case 'ACTIVE':
      return {
        badge: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300',
        dot: 'bg-emerald-500',
        label: 'Active',
      }
    case 'PAST_DUE':
      return {
        badge: 'bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300',
        dot: 'bg-amber-500',
        label: 'Past Due',
      }
    case 'CANCELED':
      return {
        badge: 'bg-rose-100 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300',
        dot: 'bg-rose-500',
        label: 'Canceled',
      }
    default:
      return {
        badge: 'bg-muted text-muted-foreground',
        dot: 'bg-muted-foreground',
        label: status || 'Unknown',
      }
  }
}

function StatCard({
  icon: Icon,
  label,
  value,
  sub,
  accent,
  delay,
  children,
}: {
  icon: React.ElementType
  label: string
  value: React.ReactNode
  sub?: string
  accent: string
  delay: number
  children?: React.ReactNode
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay }}
    >
      <Card className="overflow-hidden">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardDescription className="text-xs uppercase tracking-wide font-medium">
              {label}
            </CardDescription>
            <span
              className={`w-8 h-8 rounded-lg flex items-center justify-center ${accent}`}
            >
              <Icon className="w-4 h-4" />
            </span>
          </div>
          <CardTitle className="text-2xl sm:text-3xl font-bold tabular-nums">{value}</CardTitle>
        </CardHeader>
        {sub && <CardContent className="pt-0 pb-4 text-xs text-muted-foreground">{sub}</CardContent>}
        {children && <CardContent className="pt-0 pb-4">{children}</CardContent>}
      </Card>
    </motion.div>
  )
}

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload || !payload.length) return null
  return (
    <div className="rounded-lg border border-border/60 bg-popover px-3 py-2 shadow-md text-xs">
      <p className="font-medium mb-0.5">{label}</p>
      <p className="text-emerald-600 dark:text-emerald-400 font-semibold tabular-nums">
        {payload[0].value} focus hrs
      </p>
    </div>
  )
}

export function OverviewTab({
  data,
  onGoToChallenge,
}: {
  data: DashboardData
  onGoToChallenge: () => void
}) {
  const { company, companyTotals, totalEmployees, totalSeats, dailyHours, activeChallenge } = data
  const seatsUsed = Math.min(100, totalSeats > 0 ? Math.round((totalEmployees / totalSeats) * 100) : 0)
  const countdown = useCountdown(activeChallenge?.endDate || new Date().toISOString())

  // Challenge duration progress
  const challengeProgress = useMemo(() => {
    if (!activeChallenge) return 0
    const start = new Date(activeChallenge.startDate).getTime()
    const end = new Date(activeChallenge.endDate).getTime()
    const now = Date.now()
    if (end <= start) return 100
    return Math.min(100, Math.max(0, ((now - start) / (end - start)) * 100))
  }, [activeChallenge])

  const sub = subscriptionStyle(company.subscriptionStatus)

  const chartData = useMemo(
    () =>
      dailyHours.map((d) => ({
        label: format(parseISO(d.date), 'MMM d'),
        hours: d.hours,
      })),
    [dailyHours]
  )

  return (
    <div className="space-y-6">
      {/* PRIVACY SHIELD BANNER */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="relative overflow-hidden rounded-2xl border border-emerald-200/70 dark:border-emerald-800/50 bg-gradient-to-br from-emerald-50 via-emerald-50/60 to-amber-50/40 dark:from-emerald-950/40 dark:via-emerald-950/30 dark:to-amber-950/20 p-4 sm:p-6"
      >
        <div className="absolute -right-6 -top-6 w-32 h-32 rounded-full bg-emerald-500/10 blur-2xl" />
        <div className="absolute -left-6 -bottom-6 w-32 h-32 rounded-full bg-amber-500/10 blur-2xl" />
        <div className="relative flex items-start gap-3 sm:gap-4">
          <div className="shrink-0 w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white flex items-center justify-center shadow-lg shadow-emerald-500/20">
            <Shield className="w-6 h-6" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-base sm:text-lg font-bold text-emerald-900 dark:text-emerald-100">
                Privacy Shield Active
              </h2>
              <Badge className="bg-emerald-600 hover:bg-emerald-600 text-white">
                <Lock className="w-3 h-3" /> Anonymous & Aggregated
              </Badge>
            </div>
            <p className="mt-1.5 text-sm text-emerald-800/90 dark:text-emerald-200/80 leading-relaxed">
              {data.privacyNote}
            </p>
            <p className="mt-1 text-xs text-emerald-700/70 dark:text-emerald-300/60">
              You cannot see individual employee focus data — only team-level rollups.
            </p>
          </div>
        </div>
      </motion.div>

      {/* TOP STAT CARDS */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={Clock}
          label="Company Focus Hours"
          value={companyTotals.totalHours.toLocaleString()}
          sub="Across all teams (this challenge)"
          accent="bg-emerald-100 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-400"
          delay={0}
        />
        <StatCard
          icon={Zap}
          label="Focus Sessions"
          value={companyTotals.totalSessions.toLocaleString()}
          sub={`${companyTotals.totalPoints.toLocaleString()} total points earned`}
          accent="bg-amber-100 text-amber-600 dark:bg-amber-950/50 dark:text-amber-400"
          delay={0.05}
        />
        <StatCard
          icon={Users}
          label="Active Employees"
          value={totalEmployees}
          sub={`Across ${data.teamStats.length} team${data.teamStats.length === 1 ? '' : 's'}`}
          accent="bg-violet-100 text-violet-600 dark:bg-violet-950/50 dark:text-violet-400"
          delay={0.1}
        />
        <StatCard
          icon={TrendingUp}
          label="Seats Used"
          value={`${totalEmployees} / ${totalSeats}`}
          sub={`${seatsUsed}% of subscription seats`}
          accent="bg-sky-100 text-sky-600 dark:bg-sky-950/50 dark:text-sky-400"
          delay={0.15}
        >
          <div className="space-y-1.5">
            <Progress value={seatsUsed} className="h-2" />
            <p className="text-xs text-muted-foreground">
              {totalSeats - totalEmployees} seat{totalSeats - totalEmployees === 1 ? '' : 's'} available
            </p>
          </div>
        </StatCard>
      </div>

      {/* ACTIVE CHALLENGE + DAILY CHART */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Active challenge */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardDescription className="flex items-center gap-1.5 text-xs uppercase tracking-wide font-medium">
                <Trophy className="w-3.5 h-3.5" /> Active Challenge
              </CardDescription>
              <Badge className="bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300">
                Live
              </Badge>
            </div>
            {activeChallenge ? (
              <>
                <CardTitle className="text-lg leading-tight">{activeChallenge.name}</CardTitle>
                <CardDescription className="line-clamp-2">{activeChallenge.description}</CardDescription>
              </>
            ) : (
              <CardTitle className="text-base text-muted-foreground">No active challenge</CardTitle>
            )}
          </CardHeader>
          {activeChallenge ? (
            <CardContent className="space-y-4">
              {/* Countdown */}
              <div className="grid grid-cols-4 gap-1.5 text-center">
                {[
                  { v: countdown.days, l: 'Days' },
                  { v: countdown.hours, l: 'Hrs' },
                  { v: countdown.minutes, l: 'Min' },
                  { v: countdown.seconds, l: 'Sec' },
                ].map((u) => (
                  <div
                    key={u.l}
                    className="rounded-lg bg-muted/60 py-2 px-1 border border-border/40"
                  >
                    <div className="text-xl font-bold tabular-nums text-emerald-600 dark:text-emerald-400">
                      {String(u.v).padStart(2, '0')}
                    </div>
                    <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{u.l}</div>
                  </div>
                ))}
              </div>

              {/* Duration progress */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground flex items-center gap-1">
                    <Calendar className="w-3 h-3" /> Duration elapsed
                  </span>
                  <span className="font-semibold tabular-nums">{Math.round(challengeProgress)}%</span>
                </div>
                <Progress value={challengeProgress} className="h-2" />
              </div>

              {/* Prize */}
              <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200/60 dark:border-amber-800/40">
                <Sparkles className="w-4 h-4 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
                <div className="min-w-0">
                  <p className="text-xs font-medium text-amber-900 dark:text-amber-200">Prize</p>
                  <p className="text-sm font-semibold text-amber-800 dark:text-amber-300">
                    {activeChallenge.prize}
                    {activeChallenge.giftCardValue > 0 && (
                      <span className="ml-1 text-amber-600 dark:text-amber-400">
                        (${activeChallenge.giftCardValue})
                      </span>
                    )}
                  </p>
                </div>
              </div>

              <button
                onClick={onGoToChallenge}
                className="w-full text-xs text-emerald-600 dark:text-emerald-400 hover:underline text-center font-medium"
              >
                Manage challenge →
              </button>
            </CardContent>
          ) : (
            <CardContent>
              <button
                onClick={onGoToChallenge}
                className="w-full text-sm text-emerald-600 dark:text-emerald-400 hover:underline font-medium"
              >
                Create a new challenge →
              </button>
            </CardContent>
          )}
        </Card>

        {/* Daily focus hours chart */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardDescription className="text-xs uppercase tracking-wide font-medium">
              Daily Focus Hours · Company-wide
            </CardDescription>
            <CardTitle className="text-lg">Deep work trend</CardTitle>
          </CardHeader>
          <CardContent>
            {chartData.length === 0 ? (
              <div className="h-[260px] flex flex-col items-center justify-center text-sm text-muted-foreground gap-2">
                <Clock className="w-8 h-8 opacity-40" />
                <p>No focus sessions logged yet during this challenge.</p>
              </div>
            ) : (
              <div className="h-[260px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData} margin={{ top: 8, right: 12, bottom: 0, left: -12 }}>
                    <defs>
                      <linearGradient id="dailyHoursGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.35} />
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0.02} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                    <XAxis
                      dataKey="label"
                      tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }}
                      tickLine={false}
                      axisLine={false}
                    />
                    <YAxis
                      tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }}
                      tickLine={false}
                      axisLine={false}
                      width={40}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Area
                      type="monotone"
                      dataKey="hours"
                      stroke="#10b981"
                      strokeWidth={2.5}
                      fill="url(#dailyHoursGrad)"
                      dot={{ r: 3, fill: '#10b981', strokeWidth: 0 }}
                      activeDot={{ r: 5, fill: '#10b981' }}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* SUBSCRIPTION STATUS */}
      <Card>
        <CardHeader>
          <CardDescription className="text-xs uppercase tracking-wide font-medium">
            Subscription
          </CardDescription>
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-3">
              <span
                className={`shrink-0 w-2.5 h-2.5 rounded-full ${sub.dot} ${
                  company.subscriptionStatus === 'ACTIVE' ? 'animate-pulse' : ''
                }`}
              />
              <CardTitle className="text-lg">{company.name}</CardTitle>
              <Badge variant="outline" className="font-mono text-xs">
                {company.plan}
              </Badge>
            </div>
            <Badge className={sub.badge}>{sub.label}</Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div>
              <p className="text-xs text-muted-foreground">Monthly Revenue</p>
              <p className="text-lg font-bold tabular-nums">${company.monthlyRevenue}/mo</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Seats</p>
              <p className="text-lg font-bold tabular-nums">
                {totalEmployees}/{totalSeats}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Domain</p>
              <p className="text-sm font-medium truncate">{company.domain}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Status</p>
              <p className="text-sm font-semibold">{sub.label}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
