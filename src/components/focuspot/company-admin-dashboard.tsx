'use client'

// Company Admin (HR Manager) dashboard — FocusPot B2B SaaS.
// Built by Task 4-b. Fetches anonymous aggregates from /api/admin/dashboard.

import { useCallback, useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  LayoutDashboard,
  Trophy,
  Users,
  History,
  RefreshCw,
  ShieldCheck,
  Sparkles,
} from 'lucide-react'
import { AppShell, NavButton } from '@/components/focuspot/shared/app-shell'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { getColor, getInitials } from '@/lib/colors'
import { useAuthStore } from '@/lib/store'
import { toast } from 'sonner'

import { NotificationsMenu } from './admin/notifications-menu'
import { OverviewTab } from './admin/overview-tab'
import { ChallengeTab } from './admin/challenge-tab'
import { TeamsTab } from './admin/teams-tab'
import { HistoryTab } from './admin/history-tab'
import type { DashboardData, TabKey } from './admin/types'

const TABS: { key: TabKey; label: string; icon: typeof LayoutDashboard }[] = [
  { key: 'overview', label: 'Overview', icon: LayoutDashboard },
  { key: 'challenge', label: 'Challenge', icon: Trophy },
  { key: 'teams', label: 'Teams', icon: Users },
  { key: 'history', label: 'History', icon: History },
]

export function CompanyAdminDashboard() {
  const { user } = useAuthStore()
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<TabKey>('overview')

  const fetchData = useCallback(async (silent = false) => {
    if (silent) setRefreshing(true)
    else setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/admin/dashboard', { cache: 'no-store' })
      if (!res.ok) {
        const j = await res.json().catch(() => ({}))
        throw new Error(j.error || `Request failed (${res.status})`)
      }
      const json = (await res.json()) as DashboardData
      setData(json)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load dashboard')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const handleRefresh = useCallback(() => fetchData(true), [fetchData])

  const handleMarkAllRead = useCallback(() => {
    setData((prev) => {
      if (!prev) return prev
      return {
        ...prev,
        notifications: prev.notifications.map((n) => ({ ...n, read: true })),
      }
    })
    toast.success('All notifications marked as read')
  }, [])

  const nav = (
    <>
      {TABS.map((t) => (
        <NavButton
          key={t.key}
          active={activeTab === t.key}
          onClick={() => setActiveTab(t.key)}
          icon={t.icon}
          label={t.label}
        />
      ))}
      <div className="hidden md:flex items-center pl-2 ml-1 border-l border-border/60">
        {data && <NotificationsMenu notifications={data.notifications} onMarkAllRead={handleMarkAllRead} />}
      </div>
      {data && (
        <div className="md:hidden ml-1">
          <NotificationsMenu notifications={data.notifications} onMarkAllRead={handleMarkAllRead} />
        </div>
      )}
    </>
  )

  const adminColor = getColor(data?.admin.avatarColor || user?.avatarColor || 'amber')

  return (
    <AppShell nav={nav}>
      {/* Page sub-header */}
      <div className="border-b border-border/60 bg-background/80 backdrop-blur-sm sticky top-16 z-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between gap-3">
          <div className="min-w-0 flex items-center gap-3">
            {data && (
              <div
                className={`hidden sm:flex shrink-0 w-10 h-10 rounded-xl bg-gradient-to-br ${adminColor.gradient} text-white items-center justify-center text-sm font-semibold shadow-sm`}
              >
                {getInitials(data.admin.name)}
              </div>
            )}
            <div className="min-w-0">
              <h1 className="text-lg sm:text-xl font-bold tracking-tight truncate">
                {data ? `Welcome back, ${data.admin.name.split(' ')[0]}` : 'Loading…'}
              </h1>
              <p className="text-xs text-muted-foreground truncate">
                {data ? `${data.company.name} · ${data.company.domain}` : 'Company dashboard'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <BadgeShield />
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              disabled={refreshing}
              className="gap-1.5"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Refresh</span>
            </Button>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        {loading ? (
          <DashboardSkeleton />
        ) : error ? (
          <ErrorState error={error} onRetry={() => fetchData(false)} />
        ) : data ? (
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.2 }}
            >
              {activeTab === 'overview' && (
                <OverviewTab data={data} onGoToChallenge={() => setActiveTab('challenge')} />
              )}
              {activeTab === 'challenge' && <ChallengeTab data={data} onRefresh={handleRefresh} />}
              {activeTab === 'teams' && <TeamsTab data={data} />}
              {activeTab === 'history' && <HistoryTab challenges={data.completedChallenges} />}
            </motion.div>
          </AnimatePresence>
        ) : null}
      </div>
    </AppShell>
  )
}

function BadgeShield() {
  return (
    <span className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200/60 dark:border-emerald-800/40 text-emerald-700 dark:text-emerald-300 text-xs font-medium">
      <ShieldCheck className="w-3.5 h-3.5" />
      Privacy Shield
    </span>
  )
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-24 w-full rounded-2xl" />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-28 rounded-xl" />
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Skeleton className="h-72 rounded-xl" />
        <Skeleton className="h-72 rounded-xl lg:col-span-2" />
      </div>
      <Skeleton className="h-32 rounded-xl" />
    </div>
  )
}

function ErrorState({ error, onRetry }: { error: string; onRetry: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="w-14 h-14 rounded-2xl bg-rose-100 dark:bg-rose-950/50 flex items-center justify-center mb-4">
        <Sparkles className="w-7 h-7 text-rose-600 dark:text-rose-400" />
      </div>
      <h3 className="text-base font-semibold">Couldn&apos;t load dashboard</h3>
      <p className="text-sm text-muted-foreground mt-1 max-w-sm">{error}</p>
      <Button onClick={onRetry} className="mt-4 bg-emerald-600 hover:bg-emerald-700">
        <RefreshCw className="w-4 h-4" /> Try again
      </Button>
    </div>
  )
}

