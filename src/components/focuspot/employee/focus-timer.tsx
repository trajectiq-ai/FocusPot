'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Play, RotateCcw, AlertTriangle, Flame, Clock, Target } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { PlantAnimation } from './plant-animation'

type Props = {
  activeChallengeId: string | null
  streak: number
  bestStreak: number
  todayFocusMinutes: number
  totalFocusHours: number
  onComplete: (
    durationMinutes: number,
    points: number
  ) => Promise<{ streak: number; streakIncreased: boolean }>
}

const DURATIONS = [
  { minutes: 30, points: 5 },
  { minutes: 60, points: 10 },
] as const

function formatHM(mins: number) {
  const h = Math.floor(mins / 60)
  const m = mins % 60
  if (h === 0) return `${m}m`
  return m === 0 ? `${h}h` : `${h}h ${m}m`
}

export function EmployeeFocusTimer({
  activeChallengeId,
  streak,
  bestStreak,
  todayFocusMinutes,
  totalFocusHours,
  onComplete,
}: Props) {
  const [durationIdx, setDurationIdx] = useState(1) // default 60 min
  const duration = DURATIONS[durationIdx].minutes
  const points = DURATIONS[durationIdx].points

  const [secondsLeft, setSecondsLeft] = useState(duration * 60)
  const [isRunning, setIsRunning] = useState(false)
  const [isPaused, setIsPaused] = useState(false) // visibility-paused
  const [interruptions, setInterruptions] = useState(0)
  const [showPlant, setShowPlant] = useState(false)
  const [showFlame, setShowFlame] = useState(false)
  const [isCompleting, setIsCompleting] = useState(false)

  const totalSeconds = duration * 60

  // When duration changes (and not running), reset the timer
  useEffect(() => {
    if (!isRunning) setSecondsLeft(duration * 60)
  }, [duration, isRunning])

  // Tick: only when running & not visibility-paused
  useEffect(() => {
    if (!isRunning || isPaused) return
    const id = setInterval(() => {
      setSecondsLeft((s) => Math.max(0, s - 1))
    }, 1000)
    return () => clearInterval(id)
  }, [isRunning, isPaused])

  // Anti-cheat: Page Visibility API
  useEffect(() => {
    const handleVisibility = () => {
      if (!isRunning) return
      if (document.hidden) {
        if (!isPaused) {
          setIsPaused(true)
          setInterruptions((c) => c + 1)
          toast.error('Stay focused! Timer paused — come back to FocusPot to continue.', {
            duration: 4000,
          })
        }
      } else if (isPaused) {
        setIsPaused(false)
        toast.success('Welcome back! Timer resumed.', { duration: 2000 })
      }
    }
    document.addEventListener('visibilitychange', handleVisibility)
    return () => document.removeEventListener('visibilitychange', handleVisibility)
  }, [isRunning, isPaused])

  // Completion handler kept in a ref so the zero-check effect has stable deps
  const completionRef = useRef<() => void>(() => {})
  completionRef.current = async () => {
    if (isCompleting) return
    setIsCompleting(true)
    setIsRunning(false)
    try {
      const res = await onComplete(duration, points)
      setShowPlant(true)
      window.setTimeout(() => setShowPlant(false), 4500)
      toast.success(`+${points} points! Great deep work 🌱`, { duration: 4000 })
      if (res.streakIncreased && res.streak >= 2) {
        setShowFlame(true)
        window.setTimeout(() => setShowFlame(false), 4000)
        toast(`🔥 Streak extended to ${res.streak} days!`, { duration: 4000 })
      }
    } catch {
      toast.error('Could not save your session. Please try again.')
    } finally {
      setIsCompleting(false)
      setSecondsLeft(duration * 60)
    }
  }

  // When timer hits zero, complete the session
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
    toast.success('Deep work session started! Stay focused 🌱', { duration: 2500 })
  }, [duration])

  const handleEndEarly = useCallback(() => {
    setIsRunning(false)
    setIsPaused(false)
    setSecondsLeft(duration * 60)
    toast('Session ended early — no points awarded. Try again!', { duration: 3000 })
  }, [duration])

  const mm = Math.floor(secondsLeft / 60)
    .toString()
    .padStart(2, '0')
  const ss = (secondsLeft % 60).toString().padStart(2, '0')
  const progress = (totalSeconds - secondsLeft) / totalSeconds // 0 → 1

  // Circle SVG
  const R = 140
  const CIRC = 2 * Math.PI * R
  const offset = CIRC * (1 - progress)

  const isActive = isRunning && !isPaused

  return (
    <div className="space-y-6">
      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="p-4 flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-amber-100 dark:bg-amber-950/50 flex items-center justify-center shrink-0">
            {streak >= 2 ? (
              <span className="text-xl flame" aria-label={`Streak: ${streak} days`}>
                🔥
              </span>
            ) : (
              <Flame className="w-5 h-5 text-amber-600" />
            )}
          </div>
          <div className="min-w-0">
            <div className="text-xs text-muted-foreground">Current Streak</div>
            <div className="text-xl font-bold">
              {streak} {streak === 1 ? 'day' : 'days'}
              <span className="text-xs text-muted-foreground font-normal ml-1">
                · best {bestStreak}
              </span>
            </div>
          </div>
        </Card>

        <Card className="p-4 flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-emerald-100 dark:bg-emerald-950/50 flex items-center justify-center shrink-0">
            <Clock className="w-5 h-5 text-emerald-600" />
          </div>
          <div className="min-w-0">
            <div className="text-xs text-muted-foreground">Today&apos;s Focus</div>
            <div className="text-xl font-bold">{formatHM(todayFocusMinutes)}</div>
          </div>
        </Card>

        <Card className="p-4 flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-violet-100 dark:bg-violet-950/50 flex items-center justify-center shrink-0">
            <Target className="w-5 h-5 text-violet-600" />
          </div>
          <div className="min-w-0">
            <div className="text-xs text-muted-foreground">Total Focus</div>
            <div className="text-xl font-bold">{totalFocusHours}h</div>
          </div>
        </Card>
      </div>

      {/* Timer card */}
      <Card className="p-6 sm:p-10 relative overflow-hidden">
        {activeChallengeId && (
          <Badge className="absolute top-4 right-4 bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-400 hover:bg-amber-200">
            🏆 Challenge active
          </Badge>
        )}

        <div className="flex flex-col items-center">
          {/* Duration picker */}
          {!isRunning && (
            <motion.div
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex gap-2 mb-8"
              role="radiogroup"
              aria-label="Select focus duration"
            >
              {DURATIONS.map((d, i) => (
                <button
                  key={d.minutes}
                  onClick={() => setDurationIdx(i)}
                  role="radio"
                  aria-checked={durationIdx === i}
                  className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                    durationIdx === i
                      ? 'bg-primary text-primary-foreground shadow-md'
                      : 'bg-muted text-muted-foreground hover:bg-muted/70'
                  }`}
                >
                  {d.minutes} min · +{d.points} pts
                </button>
              ))}
            </motion.div>
          )}

          {/* Timer circle */}
          <div className={`relative rounded-full ${isActive ? 'timer-active' : ''}`}>
            <svg
              width="320"
              height="320"
              viewBox="0 0 320 320"
              className="transform -rotate-90 max-w-full h-auto"
              aria-hidden="true"
            >
              <circle
                cx="160"
                cy="160"
                r={R}
                fill="none"
                stroke="currentColor"
                strokeWidth="14"
                className="text-muted/30"
              />
              <motion.circle
                cx="160"
                cy="160"
                r={R}
                fill="none"
                stroke="url(#timerGradient)"
                strokeWidth="14"
                strokeLinecap="round"
                strokeDasharray={CIRC}
                initial={false}
                animate={{ strokeDashoffset: offset }}
                transition={{ ease: 'linear', duration: 0.4 }}
              />
              <defs>
                <linearGradient id="timerGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="oklch(0.55 0.14 155)" />
                  <stop offset="100%" stopColor="oklch(0.6 0.16 170)" />
                </linearGradient>
              </defs>
            </svg>

            {/* Center overlay */}
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
                    <div className="text-7xl flame">🔥</div>
                    <div className="text-sm font-semibold text-amber-600 mt-2">
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
                    <div className="text-6xl sm:text-7xl font-bold tabular-nums tracking-tight">
                      {mm}:{ss}
                    </div>
                    <div className="text-sm text-muted-foreground mt-2 h-5">
                      {isPaused ? (
                        <span className="text-rose-600 font-medium inline-flex items-center gap-1">
                          <AlertTriangle className="w-4 h-4" /> Paused
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

          {/* Paused warning banner */}
          <AnimatePresence>
            {isPaused && (
              <motion.div
                initial={{ opacity: 0, y: 10, height: 0 }}
                animate={{ opacity: 1, y: 0, height: 'auto' }}
                exit={{ opacity: 0, y: 10, height: 0 }}
                className="mt-6 max-w-md w-full"
              >
                <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 text-center">
                  <div className="flex items-center justify-center gap-2 font-semibold mb-1">
                    <AlertTriangle className="w-4 h-4" />
                    Stay focused!
                  </div>
                  <p className="text-sm">
                    Timer paused — come back to FocusPot to continue.
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Controls */}
          <div className="mt-8 flex flex-col sm:flex-row items-center gap-4">
            {!isRunning ? (
              <Button
                size="lg"
                onClick={handleStart}
                disabled={isCompleting}
                className="bg-emerald-600 hover:bg-emerald-700 text-white px-8 py-6 text-lg rounded-2xl shadow-lg shadow-emerald-600/20"
              >
                <Play className="w-5 h-5 mr-2" fill="currentColor" />
                Start Deep Work
              </Button>
            ) : (
              <>
                <Button
                  size="lg"
                  variant="outline"
                  onClick={handleEndEarly}
                  className="px-6 py-6 rounded-2xl"
                >
                  <RotateCcw className="w-5 h-5 mr-2" />
                  End Early
                </Button>
                <div className="text-sm text-muted-foreground inline-flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4 text-amber-500" />
                  Interruptions:{' '}
                  <span
                    className={`font-semibold ${
                      interruptions > 0 ? 'text-rose-600' : 'text-foreground'
                    }`}
                  >
                    {interruptions}
                  </span>
                </div>
              </>
            )}
          </div>

          {!isRunning && (
            <p className="mt-4 text-xs text-muted-foreground text-center max-w-md">
              Switching tabs or minimizing the window will pause the timer. Only
              completed sessions count toward your streak and your team&apos;s
              challenge.
            </p>
          )}
        </div>
      </Card>
    </div>
  )
}
