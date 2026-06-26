'use client'

import { useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { Lock, Trophy, Sparkles, Calendar, Target } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { getColor } from '@/lib/colors'
import { cn } from '@/lib/utils'

type Achievement = {
  id: string
  key: string
  name: string
  description: string
  icon: string
  category: string // FOCUS | STREAK | SOCIAL | MILESTONE
  threshold: number
  metric: string
  color: string
  unlocked: boolean
  unlockedAt: string | null
  progress: number
  currentValue: number
}

type Summary = {
  total: number
  unlocked: number
  progress: number
}

type Response = {
  summary: Summary
  byCategory: Record<string, Achievement[]>
  achievements: Achievement[]
}

const CATEGORY_META: Record<
  string,
  { label: string; icon: typeof Trophy; tint: string; description: string }
> = {
  FOCUS: {
    label: 'Focus',
    icon: Target,
    tint: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300',
    description: 'Earned through dedicated focus sessions and hours.',
  },
  STREAK: {
    label: 'Streaks',
    icon: Sparkles,
    tint: 'bg-orange-100 text-orange-700 dark:bg-orange-950/50 dark:text-orange-300',
    description: 'Keep your momentum going, day after day.',
  },
  SOCIAL: {
    label: 'Social',
    icon: Trophy,
    tint: 'bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300',
    description: 'Compete and contribute to your team.',
  },
  MILESTONE: {
    label: 'Milestones',
    icon: Trophy,
    tint: 'bg-violet-100 text-violet-700 dark:bg-violet-950/50 dark:text-violet-300',
    description: 'Major lifetime focus accomplishments.',
  },
}

const CATEGORY_ORDER = ['FOCUS', 'STREAK', 'SOCIAL', 'MILESTONE']

function metricLabel(metric: string): string {
  switch (metric) {
    case 'totalSessions':
      return 'sessions'
    case 'totalFocusHours':
      return 'hours'
    case 'bestStreak':
    case 'streak':
      return 'days'
    default:
      return metric
  }
}

function formatValue(metric: string, value: number): string {
  if (metric === 'totalFocusHours') return value.toFixed(1)
  return String(Math.round(value))
}

function formatUnlockedDate(iso: string | null): string {
  if (!iso) return ''
  try {
    return new Date(iso).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  } catch {
    return ''
  }
}

// Circular progress indicator (SVG, lightweight)
function CircularProgress({
  value,
  size = 88,
  stroke = 8,
}: {
  value: number
  size?: number
  stroke?: number
}) {
  const radius = (size - stroke) / 2
  const circumference = 2 * Math.PI * radius
  const clamped = Math.max(0, Math.min(100, value))
  const offset = circumference - (clamped / 100) * circumference

  return (
    <div
      className="relative shrink-0"
      style={{ width: size, height: size }}
      role="img"
      aria-label={`${clamped}% complete`}
    >
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={stroke}
          className="stroke-muted"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={stroke}
          strokeLinecap="round"
          stroke="url(#achievementGradient)"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="transition-all duration-700 ease-out"
        />
        <defs>
          <linearGradient id="achievementGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#10b981" />
            <stop offset="100%" stopColor="#14b8a6" />
          </linearGradient>
        </defs>
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-xl font-bold tabular-nums">{clamped}%</span>
      </div>
    </div>
  )
}

export function AchievementsTab() {
  const [data, setData] = useState<Response | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    fetch('/api/employee/achievements', { cache: 'no-store' })
      .then(async (r) => {
        if (!r.ok) throw new Error('Failed to load achievements')
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

  const grouped = useMemo(() => {
    if (!data) return []
    return CATEGORY_ORDER.filter((c) => data.byCategory[c]?.length).map((c) => ({
      category: c,
      items: data.byCategory[c] ?? [],
    }))
  }, [data])

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-40 rounded-2xl" />
        <Skeleton className="h-32 rounded-2xl" />
        <Skeleton className="h-32 rounded-2xl" />
      </div>
    )
  }

  if (error || !data) {
    return (
      <Card className="p-10 text-center">
        <div className="text-5xl mb-3">🍃</div>
        <h3 className="font-semibold text-lg">Could not load achievements</h3>
        <p className="text-sm text-muted-foreground mt-1">{error || 'Please try again.'}</p>
      </Card>
    )
  }

  const { summary } = data

  return (
    <div className="space-y-6">
      {/* Top summary */}
      <Card className="p-6 border-emerald-200/60 dark:border-emerald-900/40 overflow-hidden relative">
        <div className="absolute -top-16 -right-16 w-48 h-48 rounded-full bg-emerald-100/60 dark:bg-emerald-950/40 blur-3xl pointer-events-none" />
        <div className="relative flex flex-col sm:flex-row items-center gap-6">
          <CircularProgress value={summary.progress} />
          <div className="flex-1 text-center sm:text-left">
            <div className="flex items-center justify-center sm:justify-start gap-2 mb-1">
              <Trophy className="w-5 h-5 text-amber-500" />
              <h2 className="text-xl font-bold tracking-tight">Your Achievements</h2>
            </div>
            <p className="text-2xl font-bold tabular-nums">
              {summary.unlocked}
              <span className="text-muted-foreground text-base font-normal">
                {' '}
                / {summary.total} unlocked
              </span>
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              {summary.progress >= 100
                ? 'Incredible — you’ve unlocked every achievement! 🌟'
                : summary.progress >= 50
                  ? 'You’re past the halfway mark. Keep going!'
                  : 'Complete more focus sessions to unlock new badges.'}
            </p>
          </div>
        </div>
      </Card>

      {/* Categories */}
      {grouped.length === 0 ? (
        <Card className="p-10 text-center">
          <div className="text-5xl mb-3">🌱</div>
          <h3 className="font-semibold text-lg">No achievements yet</h3>
          <p className="text-sm text-muted-foreground mt-1">
            Start a focus session to begin earning your first badge.
          </p>
        </Card>
      ) : (
        grouped.map(({ category, items }) => {
          const meta = CATEGORY_META[category] ?? CATEGORY_META.FOCUS
          const Icon = meta.icon
          const unlockedCount = items.filter((i) => i.unlocked).length
          return (
            <section key={category} className="space-y-3">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <span
                    className={cn(
                      'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold',
                      meta.tint,
                    )}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    {meta.label}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {unlockedCount}/{items.length} unlocked
                  </span>
                </div>
              </div>
              <p className="text-xs text-muted-foreground -mt-1">{meta.description}</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {items.map((a, i) => (
                  <AchievementCard key={a.id} achievement={a} index={i} />
                ))}
              </div>
            </section>
          )
        })
      )}
    </div>
  )
}

function AchievementCard({
  achievement,
  index,
}: {
  achievement: Achievement
  index: number
}) {
  const c = getColor(achievement.color || 'emerald')
  const unlocked = achievement.unlocked
  const progressPct = unlocked ? 100 : Math.min(100, achievement.progress)
  const unlockedDate = formatUnlockedDate(achievement.unlockedAt)

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04, duration: 0.3 }}
    >
      <Card
        className={cn(
          'p-4 h-full relative overflow-hidden transition-all',
          unlocked
            ? cn('border-2', c.border, 'shadow-lg shadow-emerald-500/10')
            : 'opacity-70 grayscale border-border/60',
        )}
      >
        {unlocked && (
          <div
            className={cn(
              'absolute -top-10 -right-10 w-28 h-28 rounded-full blur-3xl pointer-events-none',
              c.bgSoft,
            )}
          />
        )}
        <div className="relative flex items-start gap-3">
          <div
            className={cn(
              'w-14 h-14 rounded-2xl flex items-center justify-center text-3xl shrink-0',
              unlocked ? c.bgSoft : 'bg-muted',
            )}
            aria-hidden
          >
            {unlocked ? (
              <span>{achievement.icon}</span>
            ) : (
              <Lock className="w-5 h-5 text-muted-foreground" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h4 className="font-semibold text-sm leading-tight">{achievement.name}</h4>
              {unlocked ? (
                <Badge
                  variant="outline"
                  className={cn('text-[10px] py-0 h-5 gap-1', c.text, c.border)}
                >
                  <Sparkles className="w-2.5 h-2.5" />
                  Unlocked
                </Badge>
              ) : (
                <Badge variant="outline" className="text-[10px] py-0 h-5 text-muted-foreground">
                  <Lock className="w-2.5 h-2.5" />
                  Locked
                </Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-1 line-clamp-2 leading-snug">
              {achievement.description}
            </p>
          </div>
        </div>

        {/* Progress */}
        <div className="mt-4">
          <div className="flex items-center justify-between text-[11px] text-muted-foreground mb-1.5">
            <span className="font-medium">
              {formatValue(achievement.metric, achievement.currentValue)}
              <span className="text-muted-foreground/70">
                {' '}
                / {achievement.threshold} {metricLabel(achievement.metric)}
              </span>
            </span>
            <span className="tabular-nums">{progressPct}%</span>
          </div>
          <Progress
            value={progressPct}
            className={cn('h-1.5', unlocked && c.bg)}
          />
        </div>

        {/* Footer */}
        {unlocked && unlockedDate && (
          <div className="mt-3 flex items-center gap-1.5 text-[11px] text-muted-foreground">
            <Calendar className="w-3 h-3" />
            <span>Earned on {unlockedDate}</span>
          </div>
        )}
        {!unlocked && achievement.threshold > 0 && (
          <div className="mt-3 flex items-center gap-1.5 text-[11px] text-muted-foreground">
            <Target className="w-3 h-3" />
            <span>
              {Math.max(0, achievement.threshold - achievement.currentValue).toFixed(
                achievement.metric === 'totalFocusHours' ? 1 : 0,
              )}{' '}
              {metricLabel(achievement.metric)} to go
            </span>
          </div>
        )}
      </Card>
    </motion.div>
  )
}
