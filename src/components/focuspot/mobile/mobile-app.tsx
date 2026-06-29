'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Timer as TimerIcon,
  Trophy,
  Gift,
  User as UserIcon,
  Play,
  RotateCcw,
  AlertTriangle,
  Flame,
  Clock,
  Target,
  Crown,
  Medal,
  Users,
  Lock,
  Sparkles,
  PartyPopper,
  Frown,
  Bell,
  ChevronRight,
  Award,
  Calendar,
  Check,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Skeleton } from '@/components/ui/skeleton'
import { getColor, getInitials } from '@/lib/colors'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import { PlantAnimation } from '@/components/focuspot/employee/plant-animation'

// ============================================================
// Types — mirror the shape returned by GET /api/admin/mobile-preview/[id]
// ============================================================

type MobileUser = {
  id: string
  name: string
  email: string
  title: string
  avatarColor: string
  streak: number
  bestStreak: number
  totalFocusHours: number
  totalPoints: number
  totalSessions: number
  lastFocusDate: string | null
}

type Company = { id: string; name: string; domain: string }
type Team = { id: string; name: string; color: string }

type ActiveChallenge = {
  id: string
  name: string
  description: string
  startDate: string
  endDate: string
  prize: string
  giftCardValue: number
  status: string
} | null

type LastCompleted = {
  id: string
  name: string
  prize: string
  giftCardValue: number
  winnerTeam: { id: string; name: string; color: string } | null
  isWinner: boolean
  giftCardCode: string
} | null

type SessionEntry = {
  id: string
  startTime: string
  durationMinutes: number
  points: number
}

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

type Achievement = {
  id: string
  key: string
  name: string
  description: string
  icon: string
  category: string
  threshold: number
  metric: string
  color: string
  unlocked: boolean
  unlockedAt: string | null
  progress: number
  currentValue: number
}

type RewardsSummary = {
  total: number
  pending: number
  approved: number
  fulfilled: number
  declined: number
  totalValue: number
}

type Redemption = {
  id: string
  rewardId: string
  tier: string
  position: number
  status: string
  code: string
  notes: string
  redeemedAt: string
  fulfilledAt: string | null
  expiresAt: string | null
  reward: {
    id: string
    name: string
    description: string
    type: string
    value: number
    provider: string
    imageColor: string
  }
}

type MobileData = {
  user: MobileUser
  company: Company | null
  team: Team | null
  activeChallenge: ActiveChallenge
  lastCompleted: LastCompleted
  recentSessions: SessionEntry[]
  todaySessionCount: number
  todayFocusMinutes: number
  leaderboard: LeaderboardData
  achievements: {
    summary: { total: number; unlocked: number; progress: number }
    byCategory: Record<string, Achievement[]>
    achievements: Achievement[]
  }
  rewards: {
    summary: RewardsSummary
    redemptions: Redemption[]
  }
}

// ============================================================
// Helpers
// ============================================================

const DURATIONS = [
  { minutes: 30, points: 5 },
  { minutes: 60, points: 10 },
] as const

const RANK_TINT = ['text-amber-500', 'text-zinc-400', 'text-orange-600']

const TIER_META: Record<string, { label: string; tint: string }> = {
  WINNER: {
    label: 'Winner',
    tint: 'bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300 border-amber-200/60',
  },
  RUNNER_UP: {
    label: 'Runner-up',
    tint: 'bg-violet-100 text-violet-700 dark:bg-violet-950/50 dark:text-violet-300 border-violet-200/60',
  },
  PARTICIPATION: {
    label: 'Participation',
    tint: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300 border-emerald-200/60',
  },
}

const STATUS_META: Record<string, { label: string; dot: string; tint: string }> = {
  PENDING: {
    label: 'Pending',
    dot: 'bg-amber-500',
    tint: 'bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300 border-amber-200/60',
  },
  APPROVED: {
    label: 'Approved',
    dot: 'bg-sky-500',
    tint: 'bg-sky-100 text-sky-700 dark:bg-sky-950/50 dark:text-sky-300 border-sky-200/60',
  },
  FULFILLED: {
    label: 'Fulfilled',
    dot: 'bg-emerald-500',
    tint: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300 border-emerald-200/60',
  },
  DECLINED: {
    label: 'Declined',
    dot: 'bg-rose-500',
    tint: 'bg-rose-100 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300 border-rose-200/60',
  },
  EXPIRED: {
    label: 'Expired',
    dot: 'bg-zinc-400',
    tint: 'bg-muted text-muted-foreground border-border',
  },
}

const CATEGORY_LABEL: Record<string, string> = {
  FOCUS: 'Focus',
  STREAK: 'Streaks',
  SOCIAL: 'Social',
  MILESTONE: 'Milestones',
}

function formatHM(mins: number) {
  const h = Math.floor(mins / 60)
  const m = mins % 60
  if (h === 0) return `${m}m`
  return m === 0 ? `${h}h` : `${h}h ${m}m`
}

function formatDate(iso: string | null): string {
  if (!iso) return ''
  try {
    return new Date(iso).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    })
  } catch {
    return ''
  }
}

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

// ============================================================
// Main component
// ============================================================

type TabKey = 'timer' | 'leaderboard' | 'rewards' | 'profile'

export function MobileApp({
  employeeId,
  onExit,
}: {
  employeeId: string
  onExit?: () => void
}) {
  const [tab, setTab] = useState<TabKey>('timer')
  const [data, setData] = useState<MobileData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Fetch everything via the admin preview API.
  // `fetchData` is invoked from the mount effect AND from `handleRefresh`.
  // We do NOT call setLoading(true) synchronously in the effect body — the
  // initial load uses useState(true), and refreshes keep the existing data
  // visible until the new data arrives (no flash of loading state). For
  // non-silent fetches we only flip loading back to false in the .finally
  // (no synchronous setState during the effect).
  const fetchData = useCallback(
    (opts?: { silent?: boolean }) => {
      let cancelled = false
      fetch(`/api/admin/mobile-preview/${employeeId}`, { cache: 'no-store' })
        .then(async (r) => {
          if (!r.ok) throw new Error('Failed to load preview data')
          return r.json() as Promise<MobileData>
        })
        .then((d) => {
          if (!cancelled) {
            setData(d)
            setError(null)
          }
        })
        .catch((e) => {
          if (!cancelled) setError(e instanceof Error ? e.message : 'Load failed')
        })
        .finally(() => {
          // Silent refreshes (e.g. after completing a session) keep the
          // existing loading state untouched so the UI doesn't flash.
          if (!cancelled && !opts?.silent) setLoading(false)
        })
      return () => {
        cancelled = true
      }
    },
    [employeeId]
  )

  useEffect(() => {
    const cleanup = fetchData()
    return cleanup
  }, [fetchData])

  const handleRefresh = useCallback(() => {
    fetchData({ silent: true })
  }, [fetchData])

  if (loading && !data) {
    return <MobileLoading />
  }
  if (error || !data) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-6 text-center bg-background">
        <div className="text-4xl mb-2">🍃</div>
        <p className="text-sm font-semibold">Could not load preview</p>
        <p className="text-xs text-muted-foreground mt-1 mb-3">{error}</p>
        <Button size="sm" onClick={handleRefresh}>
          Retry
        </Button>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col bg-background overflow-hidden">
      {/* Scrollable content area */}
      <div className="flex-1 overflow-y-auto mobile-scroll pb-2">
        <AnimatePresence mode="wait">
          <motion.div
            key={tab}
            initial={{ opacity: 0, x: 16 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -16 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="px-3 pt-3"
          >
            {tab === 'timer' && (
              <TimerTab data={data} employeeId={employeeId} onRefresh={handleRefresh} />
            )}
            {tab === 'leaderboard' && <LeaderboardTab data={data} />}
            {tab === 'rewards' && <RewardsTab data={data} />}
            {tab === 'profile' && <ProfileTab data={data} onExit={onExit} />}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Bottom tab bar */}
      <BottomTabBar tab={tab} setTab={setTab} />
    </div>
  )
}

// ============================================================
// Loading state
// ============================================================

function MobileLoading() {
  return (
    <div className="h-full bg-background p-4 space-y-4">
      <Skeleton className="h-20 w-full rounded-2xl" />
      <Skeleton className="h-64 w-full rounded-3xl" />
      <Skeleton className="h-12 w-3/4 rounded-xl" />
      <Skeleton className="h-12 w-2/3 rounded-xl" />
    </div>
  )
}

// ============================================================
// Timer tab — mobile-optimized circular focus timer
// ============================================================

function TimerTab({
  data,
  employeeId,
  onRefresh,
}: {
  data: MobileData
  employeeId: string
  onRefresh: () => void
}) {
  const [durationIdx, setDurationIdx] = useState(1)
  const duration = DURATIONS[durationIdx].minutes
  const points = DURATIONS[durationIdx].points

  const [secondsLeft, setSecondsLeft] = useState(duration * 60)
  const [isRunning, setIsRunning] = useState(false)
  const [isPaused, setIsPaused] = useState(false)
  const [interruptions, setInterruptions] = useState(0)
  const [showPlant, setShowPlant] = useState(false)
  const [showFlame, setShowFlame] = useState(false)
  const [isCompleting, setIsCompleting] = useState(false)

  // Keep a live copy of the user's stats so completion reflects updated values
  const [liveStats, setLiveStats] = useState({
    streak: data.user.streak,
    bestStreak: data.user.bestStreak,
    totalFocusHours: data.user.totalFocusHours,
    totalPoints: data.user.totalPoints,
    todayFocusMinutes: data.todayFocusMinutes,
  })

  // Sync from props when data changes
  useEffect(() => {
    setLiveStats({
      streak: data.user.streak,
      bestStreak: data.user.bestStreak,
      totalFocusHours: data.user.totalFocusHours,
      totalPoints: data.user.totalPoints,
      todayFocusMinutes: data.todayFocusMinutes,
    })
  }, [data])

  const totalSeconds = duration * 60

  // Reset seconds when duration changes (and not running)
  useEffect(() => {
    if (!isRunning) setSecondsLeft(duration * 60)
  }, [duration, isRunning])

  // Tick
  useEffect(() => {
    if (!isRunning || isPaused) return
    const id = setInterval(() => {
      setSecondsLeft((s) => Math.max(0, s - 1))
    }, 1000)
    return () => clearInterval(id)
  }, [isRunning, isPaused])

  // Anti-cheat — pause when tab/window loses focus
  useEffect(() => {
    const handleVisibility = () => {
      if (!isRunning) return
      if (document.hidden) {
        if (!isPaused) {
          setIsPaused(true)
          setInterruptions((c) => c + 1)
          toast.error('Stay focused! Timer paused.', { duration: 3000 })
        }
      } else if (isPaused) {
        setIsPaused(false)
        toast.success('Welcome back! Timer resumed.', { duration: 2000 })
      }
    }
    document.addEventListener('visibilitychange', handleVisibility)
    return () => document.removeEventListener('visibilitychange', handleVisibility)
  }, [isRunning, isPaused])

  const completionRef = useRef<() => void>(() => {})
  completionRef.current = async () => {
    if (isCompleting) return
    setIsCompleting(true)
    setIsRunning(false)
    try {
      const res = await fetch(
        `/api/admin/mobile-preview/${employeeId}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            durationMinutes: duration,
            points,
            challengeId: data.activeChallenge?.id || null,
          }),
        }
      )
      if (!res.ok) throw new Error('Failed')
      const json = (await res.json()) as {
        updatedStats: {
          streak: number
          bestStreak: number
          totalFocusHours: number
          totalPoints: number
          streakIncreased: boolean
        }
        newAchievements: Array<{
          id: string
          key: string
          name: string
          description: string
          icon: string
          color: string
        }>
      }
      setShowPlant(true)
      window.setTimeout(() => setShowPlant(false), 4500)
      toast.success(`+${points} points! Great deep work 🌱`, { duration: 4000 })

      if (json.updatedStats.streakIncreased && json.updatedStats.streak >= 2) {
        setShowFlame(true)
        window.setTimeout(() => setShowFlame(false), 4000)
        toast(`🔥 Streak extended to ${json.updatedStats.streak} days!`, {
          duration: 4000,
        })
      }

      json.newAchievements.forEach((a) => {
        toast(`🏆 ${a.name} unlocked!`, { duration: 4000 })
      })

      setLiveStats((s) => ({
        ...s,
        streak: json.updatedStats.streak,
        bestStreak: json.updatedStats.bestStreak,
        totalFocusHours: json.updatedStats.totalFocusHours,
        totalPoints: json.updatedStats.totalPoints,
        todayFocusMinutes: s.todayFocusMinutes + duration,
      }))

      // Refresh the underlying data so the leaderboard/rewards/profile tabs update
      onRefresh()
    } catch {
      toast.error('Could not save your session. Please try again.')
    } finally {
      setIsCompleting(false)
      setSecondsLeft(duration * 60)
    }
  }

  useEffect(() => {
    if (isRunning && secondsLeft === 0 && !isCompleting) {
      completionRef.current()
    }
  }, [secondsLeft, isRunning, isCompleting])

  const handleStart = useCallback(() => {
    setSecondsLeft(duration * 60)
    setIsRunning(true)
    setIsPaused(false)
    setInterruptions(0)
    toast.success('Deep work started! Stay focused 🌱', { duration: 2500 })
  }, [duration])

  const handleEndEarly = useCallback(() => {
    setIsRunning(false)
    setIsPaused(false)
    setSecondsLeft(duration * 60)
    toast('Session ended early — no points awarded.', { duration: 3000 })
  }, [duration])

  const mm = Math.floor(secondsLeft / 60)
    .toString()
    .padStart(2, '0')
  const ss = (secondsLeft % 60).toString().padStart(2, '0')
  const progress = (totalSeconds - secondsLeft) / totalSeconds

  // Mobile-sized circle (~ 220px)
  const R = 96
  const CIRC = 2 * Math.PI * R
  const offset = CIRC * (1 - progress)

  const isActive = isRunning && !isPaused

  return (
    <div className="space-y-3">
      {/* Top greeting / streak row */}
      <div className="flex items-center justify-between gap-2">
        <div>
          <div className="text-[11px] text-muted-foreground">Hi, {data.user.name.split(' ')[0]}</div>
          <div className="font-bold text-lg leading-tight">Focus Time</div>
        </div>
        <div className="flex items-center gap-1.5 bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 px-2.5 py-1.5 rounded-full">
          {liveStats.streak >= 2 ? (
            <span className="text-base flame" aria-label="streak">🔥</span>
          ) : (
            <Flame className="w-4 h-4" />
          )}
          <span className="text-xs font-bold tabular-nums">{liveStats.streak}d</span>
        </div>
      </div>

      {/* Mini stats row */}
      <div className="grid grid-cols-3 gap-2">
        <MiniStat
          icon={<Clock className="w-3.5 h-3.5" />}
          tint="bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300"
          label="Today"
          value={formatHM(liveStats.todayFocusMinutes)}
        />
        <MiniStat
          icon={<Target className="w-3.5 h-3.5" />}
          tint="bg-violet-100 text-violet-700 dark:bg-violet-950/50 dark:text-violet-300"
          label="Total"
          value={`${liveStats.totalFocusHours}h`}
        />
        <MiniStat
          icon={<Sparkles className="w-3.5 h-3.5" />}
          tint="bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300"
          label="Points"
          value={`${liveStats.totalPoints}`}
        />
      </div>

      {/* Active challenge banner */}
      {data.activeChallenge && (
        <div className="rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white p-3 shadow-md shadow-emerald-500/20">
          <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider opacity-80 mb-0.5">
            <Trophy className="w-3 h-3" />
            Active Challenge
          </div>
          <div className="font-bold text-sm leading-tight">{data.activeChallenge.name}</div>
          <div className="text-[11px] opacity-90 mt-0.5 line-clamp-1">
            🎁 {data.activeChallenge.prize}
          </div>
        </div>
      )}

      {/* Timer card */}
      <Card className="p-4 relative overflow-hidden">
        {data.activeChallenge && (
          <Badge className="absolute top-2.5 right-2.5 bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-400 hover:bg-amber-200 text-[10px] h-5">
            🏆 Challenge
          </Badge>
        )}

        <div className="flex flex-col items-center pt-1">
          {/* Duration picker */}
          {!isRunning && (
            <motion.div
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex gap-1.5 mb-4"
              role="radiogroup"
              aria-label="Select focus duration"
            >
              {DURATIONS.map((d, i) => (
                <button
                  key={d.minutes}
                  onClick={() => setDurationIdx(i)}
                  role="radio"
                  aria-checked={durationIdx === i}
                  className={cn(
                    'px-3 py-1.5 rounded-lg text-xs font-medium transition-all',
                    durationIdx === i
                      ? 'bg-emerald-600 text-white shadow-sm'
                      : 'bg-muted text-muted-foreground hover:bg-muted/70'
                  )}
                >
                  {d.minutes}m · +{d.points}
                </button>
              ))}
            </motion.div>
          )}

          {/* Timer circle */}
          <div className={cn('relative rounded-full', isActive && 'timer-active')}>
            <svg
              width="220"
              height="220"
              viewBox="0 0 220 220"
              className="transform -rotate-90 max-w-full h-auto"
              aria-hidden="true"
            >
              <circle
                cx="110"
                cy="110"
                r={R}
                fill="none"
                stroke="currentColor"
                strokeWidth="10"
                className="text-muted/30"
              />
              <motion.circle
                cx="110"
                cy="110"
                r={R}
                fill="none"
                stroke="url(#mobileTimerGradient)"
                strokeWidth="10"
                strokeLinecap="round"
                strokeDasharray={CIRC}
                initial={false}
                animate={{ strokeDashoffset: offset }}
                transition={{ ease: 'linear', duration: 0.4 }}
              />
              <defs>
                <linearGradient id="mobileTimerGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="oklch(0.55 0.14 155)" />
                  <stop offset="100%" stopColor="oklch(0.6 0.16 170)" />
                </linearGradient>
              </defs>
            </svg>

            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <AnimatePresence mode="wait">
                {showPlant ? (
                  <motion.div
                    key="plant"
                    initial={{ opacity: 0, scale: 0.6 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.6 }}
                  >
                    <PlantAnimation />
                  </motion.div>
                ) : showFlame ? (
                  <motion.div
                    key="flame"
                    initial={{ opacity: 0, scale: 0.5 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.5 }}
                    className="text-center"
                  >
                    <div className="text-5xl flame">🔥</div>
                    <div className="text-[11px] font-semibold text-amber-600 mt-1">
                      Streak extended!
                    </div>
                  </motion.div>
                ) : (
                  <motion.div
                    key="time"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="text-center"
                  >
                    <div className="text-5xl font-bold tabular-nums tracking-tight">
                      {mm}:{ss}
                    </div>
                    <div className="text-[11px] text-muted-foreground mt-1 h-4">
                      {isPaused ? (
                        <span className="text-rose-600 font-medium inline-flex items-center gap-1">
                          <AlertTriangle className="w-3 h-3" /> Paused
                        </span>
                      ) : isRunning ? (
                        <span className="text-emerald-600 font-medium">
                          Deep work in progress
                        </span>
                      ) : (
                        <span>Ready to focus</span>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* Paused banner */}
          <AnimatePresence>
            {isPaused && (
              <motion.div
                initial={{ opacity: 0, y: 6, height: 0 }}
                animate={{ opacity: 1, y: 0, height: 'auto' }}
                exit={{ opacity: 0, y: 6, height: 0 }}
                className="mt-4 w-full"
              >
                <div className="p-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 text-center">
                  <div className="flex items-center justify-center gap-1.5 font-semibold text-xs">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    Stay focused!
                  </div>
                  <p className="text-[11px] mt-0.5">Tap back into the app to resume.</p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Controls */}
          <div className="mt-5 flex flex-col items-center gap-2 w-full">
            {!isRunning ? (
              <Button
                onClick={handleStart}
                disabled={isCompleting}
                className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 h-12 text-base rounded-2xl shadow-lg shadow-emerald-600/20 w-full max-w-[260px]"
              >
                <Play className="w-4 h-4 mr-1.5" fill="currentColor" />
                Start Deep Work
              </Button>
            ) : (
              <div className="flex items-center gap-3 w-full">
                <Button
                  variant="outline"
                  onClick={handleEndEarly}
                  className="h-11 px-4 rounded-2xl flex-1"
                >
                  <RotateCcw className="w-4 h-4 mr-1.5" />
                  End Early
                </Button>
                <div className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
                  <span
                    className={cn(
                      'font-semibold',
                      interruptions > 0 ? 'text-rose-600' : 'text-foreground'
                    )}
                  >
                    {interruptions}
                  </span>
                </div>
              </div>
            )}
          </div>

          {!isRunning && (
            <p className="mt-3 text-[10px] text-muted-foreground text-center max-w-[260px]">
              Switching tabs or minimizing the window will pause the timer. Only
              completed sessions count toward your streak.
            </p>
          )}
        </div>
      </Card>

      {/* Recent sessions (last 3) */}
      {data.recentSessions.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              Recent Sessions
            </h3>
            <span className="text-[10px] text-muted-foreground">
              {data.recentSessions.length} recent
            </span>
          </div>
          <div className="space-y-1.5">
            {data.recentSessions.slice(0, 3).map((s) => (
              <div
                key={s.id}
                className="flex items-center gap-2.5 p-2.5 rounded-xl bg-muted/40"
              >
                <div className="w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-950/50 flex items-center justify-center shrink-0">
                  <Clock className="w-3.5 h-3.5 text-emerald-600" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-medium">
                    {new Date(s.startTime).toLocaleTimeString('en-US', {
                      hour: 'numeric',
                      minute: '2-digit',
                    })}
                  </div>
                  <div className="text-[10px] text-muted-foreground">
                    {s.durationMinutes}m deep work
                  </div>
                </div>
                <Badge className="bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-400 text-[10px] h-5">
                  +{s.points}
                </Badge>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function MiniStat({
  icon,
  tint,
  label,
  value,
}: {
  icon: React.ReactNode
  tint: string
  label: string
  value: string
}) {
  return (
    <Card className="p-2.5">
      <div className="flex items-center gap-1.5 mb-1">
        <div className={cn('w-5 h-5 rounded-md flex items-center justify-center', tint)}>
          {icon}
        </div>
        <span className="text-[10px] text-muted-foreground">{label}</span>
      </div>
      <div className="text-sm font-bold tabular-nums">{value}</div>
    </Card>
  )
}

// ============================================================
// Leaderboard tab
// ============================================================

function LeaderboardTab({ data }: { data: MobileData }) {
  const { leaderboard } = data
  const [scope, setScope] = useState<'team' | 'company'>('team')

  const maxTeamHours = Math.max(
    ...leaderboard.teamLeaderboard.map((t) => t.totalHours),
    1
  )

  const personList =
    scope === 'team' ? leaderboard.myTeamLeaderboard : leaderboard.topOverall
  const maxPersonHours = Math.max(...personList.map((e) => e.hours), 1)

  return (
    <div className="space-y-3">
      {/* Personal rank banner */}
      <div className="rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white p-4 relative overflow-hidden">
        <div className="absolute -top-8 -right-8 w-32 h-32 bg-white/10 rounded-full blur-2xl" />
        <div className="relative">
          <div className="text-[11px] opacity-80">Your rank</div>
          <div className="text-3xl font-bold mt-0.5">
            {leaderboard.personalRank ? `#${leaderboard.personalRank}` : '—'}
            <span className="text-xs font-normal opacity-80 ml-1.5">
              of {leaderboard.totalParticipants}
            </span>
          </div>
          <div className="flex items-center gap-4 mt-3">
            <div>
              <div className="text-lg font-bold">{leaderboard.myStats.hours}h</div>
              <div className="text-[10px] opacity-80">focused</div>
            </div>
            <div>
              <div className="text-lg font-bold">{leaderboard.myStats.points}</div>
              <div className="text-[10px] opacity-80">points</div>
            </div>
            <div>
              <div className="text-lg font-bold">
                {leaderboard.myStats.streak}
                {leaderboard.myStats.streak >= 2 ? '🔥' : ''}
              </div>
              <div className="text-[10px] opacity-80">streak</div>
            </div>
          </div>
        </div>
      </div>

      {/* Scope toggle */}
      <div className="grid grid-cols-2 gap-1 p-1 bg-muted rounded-xl">
        <button
          onClick={() => setScope('team')}
          className={cn(
            'py-1.5 rounded-lg text-xs font-medium transition-all flex items-center justify-center gap-1.5',
            scope === 'team'
              ? 'bg-background shadow-sm text-emerald-700 dark:text-emerald-300'
              : 'text-muted-foreground'
          )}
        >
          <Users className="w-3.5 h-3.5" />
          My Team
        </button>
        <button
          onClick={() => setScope('company')}
          className={cn(
            'py-1.5 rounded-lg text-xs font-medium transition-all flex items-center justify-center gap-1.5',
            scope === 'company'
              ? 'bg-background shadow-sm text-emerald-700 dark:text-emerald-300'
              : 'text-muted-foreground'
          )}
        >
          <Trophy className="w-3.5 h-3.5" />
          Company
        </button>
      </div>

      {/* Team leaderboard */}
      <Card className="p-3">
        <div className="flex items-center gap-1.5 mb-2">
          <Users className="w-3.5 h-3.5 text-emerald-600" />
          <h3 className="text-xs font-semibold">Teams</h3>
          {leaderboard.myTeamRank > 0 && (
            <Badge
              variant="secondary"
              className="ml-auto text-[10px] h-5"
            >
              Yours: #{leaderboard.myTeamRank}
            </Badge>
          )}
        </div>
        <div className="space-y-1.5 max-h-48 overflow-y-auto mobile-scroll pr-1">
          {leaderboard.teamLeaderboard.length === 0 ? (
            <div className="p-4 text-center text-xs text-muted-foreground">
              No team sessions yet.
            </div>
          ) : (
            leaderboard.teamLeaderboard.slice(0, 6).map((team, idx) => {
              const c = getColor(team.teamColor)
              const pct = (team.totalHours / maxTeamHours) * 100
              return (
                <motion.div
                  key={team.teamId}
                  initial={{ opacity: 0, x: -6 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.03 }}
                  className={cn(
                    'p-2 rounded-lg border',
                    team.isMyTeam
                      ? 'border-emerald-300 bg-emerald-50 dark:bg-emerald-950/30 dark:border-emerald-800'
                      : 'border-border bg-card'
                  )}
                >
                  <div className="flex items-center gap-2">
                    <div
                      className={cn(
                        'w-5 text-center font-bold',
                        idx < 3 ? RANK_TINT[idx] : 'text-muted-foreground'
                      )}
                    >
                      {idx < 3 ? <Medal className="w-3.5 h-3.5 mx-auto" /> : idx + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <div className={cn('w-2 h-2 rounded-full', c.dot)} />
                        <span className="text-[11px] font-medium truncate">
                          {team.teamName}
                        </span>
                      </div>
                      <div className="h-1 bg-muted rounded-full overflow-hidden">
                        <motion.div
                          className={cn('h-full', c.bg)}
                          initial={{ width: 0 }}
                          animate={{ width: `${pct}%` }}
                          transition={{ duration: 0.5, delay: idx * 0.03 }}
                        />
                      </div>
                    </div>
                    <div className="text-[11px] font-semibold shrink-0">
                      {team.totalHours}h
                    </div>
                  </div>
                </motion.div>
              )
            })
          )}
        </div>
      </Card>

      {/* Personal leaderboard */}
      <Card className="p-3">
        <div className="flex items-center gap-1.5 mb-2">
          <Trophy className="w-3.5 h-3.5 text-amber-500" />
          <h3 className="text-xs font-semibold">
            {scope === 'team' ? 'My Team' : 'Top in Company'}
          </h3>
        </div>
        <div className="space-y-1 max-h-72 overflow-y-auto mobile-scroll pr-1">
          {personList.length === 0 ? (
            <div className="p-4 text-center text-xs text-muted-foreground">
              No sessions yet — be the first!
            </div>
          ) : (
            personList.map((entry, idx) => {
              const c = getColor(entry.avatarColor)
              const pct = (entry.hours / maxPersonHours) * 100
              return (
                <motion.div
                  key={entry.userId}
                  initial={{ opacity: 0, x: 6 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.03 }}
                  className={cn(
                    'p-1.5 rounded-lg flex items-center gap-2',
                    entry.isMe
                      ? 'bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-300 dark:border-emerald-800'
                      : 'hover:bg-muted/40'
                  )}
                >
                  <div
                    className={cn(
                      'w-5 text-center font-bold text-[11px]',
                      idx < 3 ? RANK_TINT[idx] : 'text-muted-foreground'
                    )}
                  >
                    {idx === 0 ? (
                      <Crown className="w-3.5 h-3.5 mx-auto" />
                    ) : (
                      idx + 1
                    )}
                  </div>
                  <div
                    className={cn(
                      'w-7 h-7 rounded-full bg-gradient-to-br flex items-center justify-center text-white text-[10px] font-semibold shrink-0',
                      c.gradient
                    )}
                  >
                    {getInitials(entry.name)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1">
                      <span className="text-[11px] font-medium truncate">
                        {entry.name}
                      </span>
                      {entry.isMe && (
                        <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400 text-[9px] h-4 px-1">
                          You
                        </Badge>
                      )}
                    </div>
                    <div className="h-1 bg-muted rounded-full overflow-hidden mt-0.5">
                      <motion.div
                        className={cn('h-full', c.bg)}
                        initial={{ width: 0 }}
                        animate={{ width: `${pct}%` }}
                        transition={{ duration: 0.4, delay: idx * 0.03 }}
                      />
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-[11px] font-semibold">{entry.hours}h</div>
                    <div className="text-[9px] text-muted-foreground">
                      {entry.streak >= 2 ? `${entry.streak}🔥` : `${entry.streak}d`}
                    </div>
                  </div>
                </motion.div>
              )
            })
          )}
        </div>
      </Card>
    </div>
  )
}

// ============================================================
// Rewards tab
// ============================================================

function RewardsTab({ data }: { data: MobileData }) {
  const { summary, redemptions } = data.rewards

  return (
    <div className="space-y-3">
      {/* Top summary card with circular progress */}
      <Card className="p-4 relative overflow-hidden">
        <div className="absolute -top-12 -right-12 w-32 h-32 rounded-full bg-emerald-100/60 dark:bg-emerald-950/40 blur-3xl" />
        <div className="relative flex items-center gap-4">
          <CircularProgress value={summary.total > 0 ? (summary.fulfilled / summary.total) * 100 : 0} />
          <div className="flex-1">
            <div className="flex items-center gap-1.5 mb-0.5">
              <Gift className="w-4 h-4 text-emerald-600" />
              <h2 className="font-bold text-sm">Your Rewards</h2>
            </div>
            <p className="text-lg font-bold tabular-nums">
              {summary.fulfilled}
              <span className="text-muted-foreground text-xs font-normal">
                {' '}
                / {summary.total} fulfilled
              </span>
            </p>
            {summary.totalValue > 0 && (
              <p className="text-[11px] text-amber-600 dark:text-amber-400 mt-0.5">
                ${summary.totalValue} total value
              </p>
            )}
          </div>
        </div>
      </Card>

      {/* Summary mini-stats */}
      <div className="grid grid-cols-3 gap-2">
        <MiniStat
          icon={<Gift className="w-3.5 h-3.5" />}
          tint="bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300"
          label="Total"
          value={`${summary.total}`}
        />
        <MiniStat
          icon={<Check className="w-3.5 h-3.5" />}
          tint="bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300"
          label="Fulfilled"
          value={`${summary.fulfilled}`}
        />
        <MiniStat
          icon={<Clock className="w-3.5 h-3.5" />}
          tint="bg-violet-100 text-violet-700 dark:bg-violet-950/50 dark:text-violet-300"
          label="Pending"
          value={`${summary.pending}`}
        />
      </div>

      {/* Achievements quick summary */}
      <Card className="p-3">
        <div className="flex items-center gap-1.5 mb-2">
          <Trophy className="w-3.5 h-3.5 text-amber-500" />
          <h3 className="text-xs font-semibold">Achievements</h3>
        </div>
        <div className="grid grid-cols-4 gap-1.5">
          {data.achievements.achievements
            .filter((a) => a.unlocked)
            .slice(0, 8)
            .map((a) => {
              const c = getColor(a.color || 'emerald')
              return (
                <div
                  key={a.id}
                  className={cn(
                    'aspect-square rounded-xl flex items-center justify-center text-xl',
                    c.bgSoft
                  )}
                  title={a.name}
                >
                  {a.icon}
                </div>
              )
            })}
          {data.achievements.achievements.filter((a) => a.unlocked).length === 0 && (
            <div className="col-span-4 p-3 text-center text-xs text-muted-foreground">
              No achievements unlocked yet. Start a focus session!
            </div>
          )}
        </div>
      </Card>

      {/* Reward history */}
      {redemptions.length === 0 ? (
        <Card className="p-6 text-center">
          <div className="text-4xl mb-1">🌱</div>
          <h3 className="font-semibold text-sm">No rewards yet</h3>
          <p className="text-[11px] text-muted-foreground mt-1">
            Win challenges to earn rewards!
          </p>
        </Card>
      ) : (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              Reward History
            </h3>
            <span className="text-[10px] text-muted-foreground">
              {redemptions.length} item{redemptions.length === 1 ? '' : 's'}
            </span>
          </div>
          {redemptions.map((r, i) => (
            <RewardCardMobile key={r.id} redemption={r} index={i} />
          ))}
        </div>
      )}
    </div>
  )
}

function RewardCardMobile({
  redemption,
  index,
}: {
  redemption: Redemption
  index: number
}) {
  const tierMeta = TIER_META[redemption.tier] ?? TIER_META.PARTICIPATION
  const statusMeta = STATUS_META[redemption.status] ?? STATUS_META.PENDING
  const c = getColor(redemption.reward.imageColor || 'emerald')
  const isFulfilled = redemption.status === 'FULFILLED' && !!redemption.code
  const isDeclined = redemption.status === 'DECLINED' || redemption.status === 'EXPIRED'

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04, duration: 0.25 }}
    >
      <Card className={cn('p-3 relative overflow-hidden', isDeclined && 'opacity-60')}>
        <div
          className={cn(
            'absolute -top-8 -right-8 w-24 h-24 rounded-full blur-2xl pointer-events-none',
            c.bgSoft
          )}
        />
        <div className="relative flex items-start gap-2.5">
          <div
            className={cn(
              'w-10 h-10 rounded-xl flex items-center justify-center shrink-0',
              c.bgSoft
            )}
          >
            <Gift className={cn('w-4 h-4', c.text)} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-1">
              <h4 className="font-semibold text-xs leading-tight truncate">
                {redemption.reward.name}
              </h4>
              {redemption.reward.value > 0 && (
                <span className={cn('text-xs font-bold shrink-0', c.text)}>
                  ${redemption.reward.value}
                </span>
              )}
            </div>
            <div className="flex items-center flex-wrap gap-1 mt-1">
              <Badge variant="outline" className={cn('text-[9px] py-0 h-4', tierMeta.tint)}>
                {tierMeta.label}
                {redemption.position > 0 && redemption.position <= 3 && (
                  <span className="ml-0.5">#{redemption.position}</span>
                )}
              </Badge>
              <Badge variant="outline" className={cn('text-[9px] py-0 h-4', statusMeta.tint)}>
                <span className={cn('w-1 h-1 rounded-full', statusMeta.dot)} />
                {statusMeta.label}
              </Badge>
            </div>
          </div>
        </div>
        {isFulfilled && (
          <div className="mt-2 p-2 rounded-lg border border-dashed border-emerald-300 dark:border-emerald-700 bg-emerald-50/50 dark:bg-emerald-950/20">
            <div className="text-[9px] font-medium text-emerald-700 dark:text-emerald-300 mb-0.5">
              Code
            </div>
            <code className="text-xs font-mono font-semibold tracking-wide break-all">
              {redemption.code}
            </code>
          </div>
        )}
        <div className="mt-2 flex items-center gap-2 text-[10px] text-muted-foreground">
          <Calendar className="w-2.5 h-2.5" />
          <span>Earned {formatDate(redemption.redeemedAt)}</span>
        </div>
      </Card>
    </motion.div>
  )
}

// ============================================================
// Profile tab
// ============================================================

function ProfileTab({
  data,
  onExit,
}: {
  data: MobileData
  onExit?: () => void
}) {
  const c = getColor(data.user.avatarColor || 'emerald')
  const unlocked = data.achievements.achievements.filter((a) => a.unlocked)

  return (
    <div className="space-y-3">
      {/* Profile header */}
      <Card className="p-4 relative overflow-hidden">
        <div className="absolute -top-8 -right-8 w-24 h-24 rounded-full bg-emerald-100/60 dark:bg-emerald-950/40 blur-2xl" />
        <div className="relative flex items-center gap-3">
          <div
            className={cn(
              'w-16 h-16 rounded-2xl bg-gradient-to-br flex items-center justify-center text-white text-xl font-bold shrink-0',
              c.gradient
            )}
          >
            {getInitials(data.user.name)}
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="font-bold text-base leading-tight truncate">
              {data.user.name}
            </h2>
            {data.user.title && (
              <p className="text-[11px] text-muted-foreground truncate">
                {data.user.title}
              </p>
            )}
            <div className="flex items-center flex-wrap gap-1 mt-1.5">
              {data.team && (
                <Badge
                  variant="outline"
                  className={cn('text-[9px] py-0 h-4', c.text, c.border)}
                >
                  <div className={cn('w-1.5 h-1.5 rounded-full', c.dot)} />
                  {data.team.name}
                </Badge>
              )}
              {data.company && (
                <Badge variant="outline" className="text-[9px] py-0 h-4 text-muted-foreground">
                  {data.company.name}
                </Badge>
              )}
            </div>
          </div>
        </div>
      </Card>

      {/* Stats grid */}
      <div className="grid grid-cols-2 gap-2">
        <StatTile
          icon={<Clock className="w-4 h-4" />}
          tint="bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300"
          label="Total Hours"
          value={`${data.user.totalFocusHours}h`}
        />
        <StatTile
          icon={<Target className="w-4 h-4" />}
          tint="bg-violet-100 text-violet-700 dark:bg-violet-950/50 dark:text-violet-300"
          label="Sessions"
          value={`${data.user.totalSessions}`}
        />
        <StatTile
          icon={<Flame className="w-4 h-4" />}
          tint="bg-orange-100 text-orange-700 dark:bg-orange-950/50 dark:text-orange-300"
          label="Current Streak"
          value={`${data.user.streak}d`}
        />
        <StatTile
          icon={<Award className="w-4 h-4" />}
          tint="bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300"
          label="Best Streak"
          value={`${data.user.bestStreak}d`}
        />
      </div>

      {/* Points summary */}
      <Card className="p-3 flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-950/50 flex items-center justify-center shrink-0">
          <Sparkles className="w-4 h-4 text-amber-600" />
        </div>
        <div className="flex-1">
          <div className="text-[11px] text-muted-foreground">Total Points</div>
          <div className="text-lg font-bold text-amber-600 dark:text-amber-400 tabular-nums">
            {data.user.totalPoints}
          </div>
        </div>
        <ChevronRight className="w-4 h-4 text-muted-foreground" />
      </Card>

      {/* Achievements */}
      <Card className="p-3">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-1.5">
            <Trophy className="w-3.5 h-3.5 text-amber-500" />
            <h3 className="text-xs font-semibold">Achievements</h3>
          </div>
          <Badge variant="secondary" className="text-[10px] h-5">
            {data.achievements.summary.unlocked}/{data.achievements.summary.total}
          </Badge>
        </div>
        {unlocked.length === 0 ? (
          <div className="p-3 text-center text-xs text-muted-foreground">
            <Lock className="w-5 h-5 mx-auto mb-1 opacity-50" />
            No badges yet. Complete a session to start unlocking!
          </div>
        ) : (
          <div className="grid grid-cols-4 gap-1.5">
            {unlocked.map((a) => {
              const ac = getColor(a.color || 'emerald')
              return (
                <div
                  key={a.id}
                  className={cn(
                    'aspect-square rounded-xl flex flex-col items-center justify-center p-1 text-center',
                    ac.bgSoft
                  )}
                  title={a.name}
                >
                  <div className="text-lg">{a.icon}</div>
                  <div className="text-[8px] font-medium leading-tight line-clamp-1 mt-0.5">
                    {a.name}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </Card>

      {/* Last completed challenge result */}
      {data.lastCompleted && (
        <Card
          className={cn(
            'p-3',
            data.lastCompleted.isWinner
              ? 'bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/30 dark:to-orange-950/30 border-amber-300 dark:border-amber-800'
              : ''
          )}
        >
          <div className="flex items-start gap-2.5">
            <div
              className={cn(
                'w-9 h-9 rounded-xl flex items-center justify-center shrink-0',
                data.lastCompleted.isWinner
                  ? 'bg-amber-400'
                  : 'bg-muted'
              )}
            >
              {data.lastCompleted.isWinner ? (
                <PartyPopper className="w-4 h-4 text-white" />
              ) : (
                <Frown className="w-4 h-4 text-muted-foreground" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              {data.lastCompleted.isWinner ? (
                <Badge className="bg-amber-200 text-amber-900 hover:bg-amber-200 mb-1 text-[9px] h-4">
                  🏆 You Won!
                </Badge>
              ) : null}
              <h4 className="text-xs font-semibold leading-tight">
                {data.lastCompleted.isWinner
                  ? `Won "${data.lastCompleted.name}"`
                  : `"${data.lastCompleted.name}" ended`}
              </h4>
              <p className="text-[10px] text-muted-foreground mt-0.5 line-clamp-2">
                {data.lastCompleted.isWinner
                  ? `Prize: ${data.lastCompleted.prize}`
                  : `Winner: ${data.lastCompleted.winnerTeam?.name || '—'}. Better luck next time!`}
              </p>
            </div>
          </div>
        </Card>
      )}

      {/* Settings (static in preview) */}
      <Card className="p-0 overflow-hidden">
        <button
          className="w-full flex items-center gap-2.5 p-3 hover:bg-muted/40 transition-colors text-left"
          type="button"
        >
          <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center shrink-0">
            <Bell className="w-4 h-4 text-muted-foreground" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-xs font-medium">Notification Preferences</div>
            <div className="text-[10px] text-muted-foreground">
              Static in preview
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-muted-foreground" />
        </button>
      </Card>

      {/* Exit preview */}
      {onExit && (
        <Button
          variant="outline"
          onClick={onExit}
          className="w-full h-11 rounded-2xl"
        >
          Exit Preview
        </Button>
      )}

      <div className="text-center text-[10px] text-muted-foreground pt-1 pb-2">
        FocusPot Mobile · v1.0
        <br />
        Preview Mode
      </div>
    </div>
  )
}

function StatTile({
  icon,
  tint,
  label,
  value,
}: {
  icon: React.ReactNode
  tint: string
  label: string
  value: string
}) {
  return (
    <Card className="p-3">
      <div className="flex items-center gap-1.5 mb-1">
        <div className={cn('w-6 h-6 rounded-md flex items-center justify-center', tint)}>
          {icon}
        </div>
      </div>
      <div className="text-[10px] text-muted-foreground">{label}</div>
      <div className="text-base font-bold tabular-nums">{value}</div>
    </Card>
  )
}

// ============================================================
// Circular progress (small, mobile-friendly)
// ============================================================

function CircularProgress({ value, size = 72, stroke = 7 }: { value: number; size?: number; stroke?: number }) {
  const radius = (size - stroke) / 2
  const circumference = 2 * Math.PI * radius
  const clamped = Math.max(0, Math.min(100, value))
  const offset = circumference - (clamped / 100) * circumference
  return (
    <div
      className="relative shrink-0"
      style={{ width: size, height: size }}
      role="img"
      aria-label={`${clamped}% fulfilled`}
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
          stroke="url(#mobileRewardGradient)"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="transition-all duration-700 ease-out"
        />
        <defs>
          <linearGradient id="mobileRewardGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#10b981" />
            <stop offset="100%" stopColor="#14b8a6" />
          </linearGradient>
        </defs>
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-sm font-bold tabular-nums">{clamped}%</span>
      </div>
    </div>
  )
}

// ============================================================
// Bottom tab bar — iOS/Android style
// ============================================================

function BottomTabBar({
  tab,
  setTab,
}: {
  tab: TabKey
  setTab: (t: TabKey) => void
}) {
  const tabs: Array<{ key: TabKey; label: string; icon: typeof TimerIcon }> = [
    { key: 'timer', label: 'Timer', icon: TimerIcon },
    { key: 'leaderboard', label: 'Ranks', icon: Trophy },
    { key: 'rewards', label: 'Rewards', icon: Gift },
    { key: 'profile', label: 'Profile', icon: UserIcon },
  ]
  return (
    <nav
      className="shrink-0 border-t border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 pb-5"
      aria-label="Mobile app navigation"
    >
      <div className="grid grid-cols-4 gap-0">
        {tabs.map((t) => {
          const active = tab === t.key
          const Icon = t.icon
          return (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className="relative flex flex-col items-center justify-center gap-0.5 py-2 min-h-[56px] transition-colors"
              aria-current={active ? 'page' : undefined}
              aria-label={t.label}
            >
              {active && (
                <motion.div
                  layoutId="tabIndicator"
                  className="absolute top-0 h-0.5 w-10 rounded-full bg-emerald-500"
                  transition={{ type: 'spring', stiffness: 350, damping: 30 }}
                />
              )}
              <Icon
                className={cn(
                  'w-5 h-5 transition-colors',
                  active
                    ? 'text-emerald-600 dark:text-emerald-400'
                    : 'text-muted-foreground'
                )}
                strokeWidth={active ? 2.4 : 2}
              />
              <span
                className={cn(
                  'text-[10px] font-medium transition-colors',
                  active
                    ? 'text-emerald-600 dark:text-emerald-400'
                    : 'text-muted-foreground'
                )}
              >
                {t.label}
              </span>
            </button>
          )
        })}
      </div>
    </nav>
  )
}
