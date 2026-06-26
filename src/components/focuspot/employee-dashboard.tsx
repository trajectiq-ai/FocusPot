'use client'

import { useCallback, useEffect, useState } from 'react'
import { Timer, Trophy, History as HistoryIcon, Gift } from 'lucide-react'
import { AppShell, NavButton } from '@/components/focuspot/shared/app-shell'
import { Skeleton } from '@/components/ui/skeleton'
import { useAuthStore } from '@/lib/store'
import { getColor } from '@/lib/colors'
import { EmployeeFocusTimer } from './employee/focus-timer'
import { EmployeeLeaderboard } from './employee/leaderboard'
import { EmployeeHistory, type SessionEntry } from './employee/history'
import { EmployeeChallenge } from './employee/challenge'
import { NotificationsBell, type EmployeeNotification } from './employee/notifications'

type Tab = 'timer' | 'leaderboard' | 'history' | 'challenge'

type MeResponse = {
  user: {
    id: string
    name: string
    email: string
    avatarColor: string
    streak: number
    bestStreak: number
    totalFocusHours: number
    totalPoints: number
    lastFocusDate: string | null
  }
  company: { id: string; name: string; domain: string }
  team: { id: string; name: string; color: string }
  activeChallenge: {
    id: string
    name: string
    description: string
    startDate: string
    endDate: string
    prize: string
    giftCardValue: number
    status: string
  } | null
  lastCompleted: {
    id: string
    name: string
    prize: string
    giftCardValue: number
    winnerTeam: { id: string; name: string; color: string } | null
    isWinner: boolean
    giftCardCode: string
  } | null
  recentSessions: SessionEntry[]
  todaySessionCount: number
  todayFocusMinutes: number
  notifications: EmployeeNotification[]
}

function greeting() {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning'
  if (h < 18) return 'Good afternoon'
  return 'Good evening'
}

export function EmployeeDashboard() {
  const { user } = useAuthStore()
  const [tab, setTab] = useState<Tab>('timer')
  const [me, setMe] = useState<MeResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [leaderboardRefreshKey, setLeaderboardRefreshKey] = useState(0)

  useEffect(() => {
    let cancelled = false
    fetch('/api/employee/me', { cache: 'no-store' })
      .then((r) => r.json())
      .then((data) => {
        if (!cancelled) setMe(data)
      })
      .catch(() => {
        // ignore — UI shows skeleton / empty state
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  const handleSessionComplete = useCallback(
    async (durationMinutes: number, points: number) => {
      const challengeId = me?.activeChallenge?.id ?? null
      const res = await fetch('/api/employee/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ durationMinutes, points, challengeId }),
      })
      if (!res.ok) throw new Error('Failed to save session')
      const data = await res.json()

      setMe((prev) => {
        if (!prev) return prev
        return {
          ...prev,
          user: {
            ...prev.user,
            streak: data.updatedStats.streak,
            bestStreak: data.updatedStats.bestStreak,
            totalFocusHours: data.updatedStats.totalFocusHours,
            totalPoints: data.updatedStats.totalPoints,
          },
          todayFocusMinutes: prev.todayFocusMinutes + durationMinutes,
          todaySessionCount: prev.todaySessionCount + 1,
          recentSessions: [
            {
              id: data.session.id,
              startTime: new Date().toISOString(),
              durationMinutes,
              points,
              completed: true,
            },
            ...prev.recentSessions,
          ].slice(0, 20),
        }
      })

      // Trigger a leaderboard refresh on next visit
      setLeaderboardRefreshKey((k) => k + 1)

      return {
        streak: data.updatedStats.streak as number,
        streakIncreased: data.updatedStats.streakIncreased as boolean,
      }
    },
    [me?.activeChallenge?.id]
  )

  const nav = (
    <>
      <NavButton
        active={tab === 'timer'}
        onClick={() => setTab('timer')}
        icon={Timer}
        label="Focus Timer"
      />
      <NavButton
        active={tab === 'leaderboard'}
        onClick={() => setTab('leaderboard')}
        icon={Trophy}
        label="Leaderboard"
      />
      <NavButton
        active={tab === 'history'}
        onClick={() => setTab('history')}
        icon={HistoryIcon}
        label="History"
      />
      <NavButton
        active={tab === 'challenge'}
        onClick={() => setTab('challenge')}
        icon={Gift}
        label="Challenge"
      />
    </>
  )

  return (
    <AppShell nav={nav}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        {/* Top bar: greeting + notifications */}
        <div className="flex items-start justify-between gap-4 mb-6">
          <div className="min-w-0">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
              {greeting()}, {user?.name?.split(' ')[0] ?? 'there'} 🌿
            </h1>
            {me?.team && (
              <p className="text-sm text-muted-foreground mt-1 flex items-center gap-2 flex-wrap">
                <span
                  className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium ${
                    getColor(me.team.color).bgSoft
                  } ${getColor(me.team.color).text}`}
                >
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${getColor(me.team.color).dot}`}
                  />
                  {me.team.name}
                </span>
                <span className="text-muted-foreground/60">·</span>
                <span>{me.company?.name}</span>
              </p>
            )}
          </div>
          <NotificationsBell notifications={me?.notifications ?? []} />
        </div>

        {loading ? (
          <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Skeleton className="h-20 w-full rounded-2xl" />
              <Skeleton className="h-20 w-full rounded-2xl" />
              <Skeleton className="h-20 w-full rounded-2xl" />
            </div>
            <Skeleton className="h-[28rem] w-full rounded-2xl" />
          </div>
        ) : !me ? (
          <div className="p-10 text-center text-sm text-muted-foreground">
            Could not load your dashboard. Please refresh.
          </div>
        ) : (
          <>
            {tab === 'timer' && (
              <EmployeeFocusTimer
                activeChallengeId={me.activeChallenge?.id ?? null}
                streak={me.user.streak}
                bestStreak={me.user.bestStreak}
                todayFocusMinutes={me.todayFocusMinutes}
                totalFocusHours={me.user.totalFocusHours}
                onComplete={handleSessionComplete}
              />
            )}
            {tab === 'leaderboard' && (
              <EmployeeLeaderboard
                key={`${me.activeChallenge?.id ?? 'all'}-${leaderboardRefreshKey}`}
                activeChallengeId={me.activeChallenge?.id ?? null}
              />
            )}
            {tab === 'history' && <EmployeeHistory sessions={me.recentSessions} />}
            {tab === 'challenge' && (
              <EmployeeChallenge
                activeChallenge={me.activeChallenge}
                lastCompleted={me.lastCompleted}
              />
            )}
          </>
        )}
      </div>
    </AppShell>
  )
}
