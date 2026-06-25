'use client'

import { motion, type Variants } from 'framer-motion'
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts'
import {
  TrendingUp,
  Building2,
  Users,
  DollarSign,
  Calendar,
  Timer,
  Activity,
  Sparkles,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import type { DashboardData } from './types'
import {
  formatCurrency,
  formatNumber,
} from './helpers'

const PIE_COLORS = ['#f59e0b', '#8b5cf6'] // amber=Starter, violet=Growth

const fade: Variants = {
  hidden: { opacity: 0, y: 12 },
  show: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.06, duration: 0.35, ease: 'easeOut' },
  }),
}

function KpiCard({
  index,
  icon: Icon,
  label,
  value,
  sub,
  accent,
}: {
  index: number
  icon: typeof DollarSign
  label: string
  value: string
  sub?: string
  accent: string
}) {
  return (
    <motion.div
      variants={fade}
      initial="hidden"
      animate="show"
      custom={index}
    >
      <Card className="overflow-hidden border-border/60 h-full">
        <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
          <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            {label}
          </CardTitle>
          <div
            className={cn(
              'w-8 h-8 rounded-lg flex items-center justify-center',
              accent,
            )}
          >
            <Icon className="w-4 h-4" />
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="text-2xl sm:text-3xl font-bold tracking-tight tabular-nums">
            {value}
          </div>
          {sub && (
            <p className="text-xs text-muted-foreground mt-1">{sub}</p>
          )}
        </CardContent>
      </Card>
    </motion.div>
  )
}

export function OverviewTab({ data }: { data: DashboardData }) {
  const { stats, revenueBreakdown } = data

  // Build status dot row
  const statusRow = [
    {
      label: 'Active',
      count: stats.activeCompanies,
      dot: 'bg-emerald-500',
      text: 'text-emerald-600 dark:text-emerald-400',
    },
    {
      label: 'Past Due',
      count: stats.pastDueCompanies,
      dot: 'bg-amber-500',
      text: 'text-amber-600 dark:text-amber-400',
    },
    {
      label: 'Canceled',
      count: stats.canceledCompanies,
      dot: 'bg-rose-500',
      text: 'text-rose-600 dark:text-rose-400',
    },
  ]

  // Bar chart data — revenue + count per plan
  const barData = revenueBreakdown.map((r) => ({
    name: r.plan.split(' ')[0],
    Revenue: r.revenue,
    Companies: r.count,
  }))

  return (
    <div className="space-y-6">
      {/* MRR hero + ARR */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: 'easeOut' as const }}
          className="lg:col-span-2 relative overflow-hidden rounded-xl bg-gradient-to-br from-emerald-500 via-emerald-600 to-teal-700 text-white p-6 shadow-lg shadow-emerald-500/20"
        >
          <div className="absolute -top-12 -right-12 w-48 h-48 rounded-full bg-white/10 blur-2xl" />
          <div className="absolute bottom-0 right-0 w-32 h-32 rounded-full bg-amber-400/20 blur-2xl" />
          <div className="relative">
            <div className="flex items-center gap-2 mb-2">
              <span className="inline-flex items-center gap-1.5 text-xs font-medium px-2 py-1 rounded-full bg-white/15 backdrop-blur-sm">
                <Sparkles className="w-3 h-3" />
                Monthly Recurring Revenue
              </span>
            </div>
            <div className="flex items-end gap-2">
              <span className="text-5xl sm:text-6xl font-extrabold tracking-tight tabular-nums">
                {formatCurrency(stats.mrr)}
              </span>
              <span className="text-xl font-semibold text-white/80 mb-2">/mo</span>
            </div>
            <p className="text-sm text-white/80 mt-2">
              Across {stats.activeCompanies} active companies ·{' '}
              <span className="font-semibold text-amber-200">
                Starter {formatCurrency(stats.starterRevenue)}
              </span>{' '}
              ·{' '}
              <span className="font-semibold text-violet-200">
                Growth {formatCurrency(stats.growthRevenue)}
              </span>
            </p>
          </div>
        </motion.div>

        <KpiCard
          index={1}
          icon={Calendar}
          label="Annual Recurring Revenue"
          value={`${formatCurrency(stats.arr)}/yr`}
          sub="Projected from active MRR"
          accent="bg-amber-100 text-amber-600 dark:bg-amber-950/50 dark:text-amber-400"
        />
      </div>

      {/* Secondary KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          index={2}
          icon={Building2}
          label="Active Companies"
          value={formatNumber(stats.activeCompanies)}
          sub={`of ${stats.totalCompanies} total`}
          accent="bg-emerald-100 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-400"
        />
        <KpiCard
          index={3}
          icon={Users}
          label="Total Employees"
          value={formatNumber(stats.totalEmployees)}
          sub={`of ${formatNumber(stats.totalSeats)} seats`}
          accent="bg-violet-100 text-violet-600 dark:bg-violet-950/50 dark:text-violet-400"
        />
        <KpiCard
          index={4}
          icon={Activity}
          label="Focus Sessions"
          value={formatNumber(stats.totalSessions)}
          sub="Platform-wide, anonymous"
          accent="bg-amber-100 text-amber-600 dark:bg-amber-950/50 dark:text-amber-400"
        />
        <KpiCard
          index={5}
          icon={Timer}
          label="Focus Hours"
          value={formatNumber(stats.totalFocusHours)}
          sub="Across all companies"
          accent="bg-rose-100 text-rose-600 dark:bg-rose-950/50 dark:text-rose-400"
        />
      </div>

      {/* Charts + status row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Pie chart */}
        <motion.div
          variants={fade}
          initial="hidden"
          animate="show"
          custom={6}
        >
          <Card className="border-border/60 h-full">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                Revenue by Plan
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={revenueBreakdown}
                      dataKey="revenue"
                      nameKey="plan"
                      cx="50%"
                      cy="50%"
                      innerRadius={48}
                      outerRadius={80}
                      paddingAngle={3}
                      stroke="none"
                    >
                      {revenueBreakdown.map((_, i) => (
                        <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(v: number) => formatCurrency(v)}
                      contentStyle={{
                        borderRadius: 8,
                        border: '1px solid hsl(var(--border))',
                        fontSize: 12,
                      }}
                    />
                    <Legend
                      verticalAlign="bottom"
                      iconType="circle"
                      wrapperStyle={{ fontSize: 11 }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="grid grid-cols-2 gap-2 mt-2">
                {revenueBreakdown.map((r, i) => (
                  <div
                    key={r.plan}
                    className="rounded-lg bg-muted/50 px-3 py-2"
                  >
                    <div className="flex items-center gap-1.5">
                      <span
                        className="w-2 h-2 rounded-full"
                        style={{ background: PIE_COLORS[i] }}
                      />
                      <span className="text-[11px] font-medium text-muted-foreground">
                        {r.plan.split(' ')[0]}
                      </span>
                    </div>
                    <p className="text-sm font-bold tabular-nums mt-0.5">
                      {formatCurrency(r.revenue)}
                    </p>
                    <p className="text-[10px] text-muted-foreground">
                      {r.count} {r.count === 1 ? 'company' : 'companies'}
                    </p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Bar chart */}
        <motion.div
          variants={fade}
          initial="hidden"
          animate="show"
          custom={7}
          className="lg:col-span-2"
        >
          <Card className="border-border/60 h-full">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                Revenue vs Company Count by Plan
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={barData} barGap={6}>
                    <XAxis
                      dataKey="name"
                      stroke="hsl(var(--muted-foreground))"
                      fontSize={11}
                      tickLine={false}
                      axisLine={false}
                    />
                    <YAxis
                      stroke="hsl(var(--muted-foreground))"
                      fontSize={11}
                      tickLine={false}
                      axisLine={false}
                      width={36}
                    />
                    <Tooltip
                      cursor={{ fill: 'hsl(var(--muted))', opacity: 0.4 }}
                      contentStyle={{
                        borderRadius: 8,
                        border: '1px solid hsl(var(--border))',
                        fontSize: 12,
                      }}
                      formatter={(v: number, name: string) =>
                        name === 'Revenue'
                          ? [formatCurrency(v), name]
                          : [v, name]
                      }
                    />
                    <Legend
                      verticalAlign="top"
                      iconType="circle"
                      wrapperStyle={{ fontSize: 11, paddingBottom: 8 }}
                    />
                    <Bar dataKey="Revenue" fill="#10b981" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="Companies" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Status breakdown */}
              <div className="mt-4 pt-4 border-t border-border/60">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
                  Subscription Status Breakdown
                </p>
                <div className="grid grid-cols-3 gap-2">
                  {statusRow.map((s) => (
                    <div
                      key={s.label}
                      className="rounded-lg border border-border/60 px-3 py-2"
                    >
                      <div className="flex items-center gap-1.5">
                        <span className={cn('w-2 h-2 rounded-full', s.dot)} />
                        <span className="text-[11px] font-medium text-muted-foreground">
                          {s.label}
                        </span>
                      </div>
                      <p className={cn('text-xl font-bold tabular-nums mt-0.5', s.text)}>
                        {s.count}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  )
}
