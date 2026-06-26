'use client'

import { useCallback, useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { LayoutDashboard, Building2, Activity, Crown, RefreshCw } from 'lucide-react'
import { AppShell, NavButton } from '@/components/focuspot/shared/app-shell'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { toast } from 'sonner'
import { useAuthStore } from '@/lib/store'
import type { DashboardData } from './super/types'
import { OverviewTab } from './super/overview-tab'
import { CompaniesTab } from './super/companies-tab'
import { ActivityTab } from './super/activity-tab'
import { NotificationsBell } from './super/notifications-bell'

type TabKey = 'overview' | 'companies' | 'activity'

const TAB_META: { key: TabKey; label: string; icon: typeof Crown }[] = [
  { key: 'overview', label: 'Overview', icon: LayoutDashboard },
  { key: 'companies', label: 'Companies', icon: Building2 },
  { key: 'activity', label: 'Activity', icon: Activity },
]

const PAGE_TITLES: Record<TabKey, { title: string; subtitle: string }> = {
  overview: {
    title: 'Platform Overview',
    subtitle: 'Monitor MRR, ARR, and engagement across all FocusPot customers',
  },
  companies: {
    title: 'Companies',
    subtitle: 'Manage subscriptions, plans, and impersonate company admins',
  },
  activity: {
    title: 'Platform Activity',
    subtitle: 'Recent challenges and focus engagement across all companies',
  },
}

export function SuperAdminDashboard() {
  const { user } = useAuthStore()
  const [tab, setTab] = useState<TabKey>('overview')
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchDashboard = useCallback(async (silent = false) => {
    if (!silent) setLoading(true)
    setRefreshing(true)
    setError(null)
    try {
      const res = await fetch('/api/super/dashboard', { cache: 'no-store' })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.error || 'Failed to load dashboard')
      }
      const json = (await res.json()) as DashboardData
      setData(json)
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Failed to load dashboard'
      setError(msg)
      if (silent) toast.error(msg)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => {
    fetchDashboard()
  }, [fetchDashboard])

  const nav = (
    <>
      {TAB_META.map((t) => (
        <NavButton
          key={t.key}
          active={tab === t.key}
          onClick={() => setTab(t.key)}
          icon={t.icon}
          label={t.label}
        />
      ))}
    </>
  )

  const meta = PAGE_TITLES[tab]

  return (
    <AppShell nav={nav}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        {/* Page header */}
        <div className="flex items-start sm:items-center justify-between gap-4 mb-6">
          <div className="min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full bg-violet-100 text-violet-700 dark:bg-violet-950/50 dark:text-violet-300">
                <Crown className="w-3 h-3" />
                Super Admin
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
              {meta.title}
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              {meta.subtitle}
            </p>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <Button
              variant="outline"
              size="icon"
              className="h-9 w-9 rounded-full"
              onClick={() => fetchDashboard(true)}
              disabled={refreshing}
              aria-label="Refresh"
            >
              <RefreshCw
                className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`}
              />
            </Button>
            {data && <NotificationsBell notifications={data.notifications} />}
          </div>
        </div>

        {/* Content */}
        {loading ? (
          <LoadingState />
        ) : error ? (
          <ErrorState message={error} onRetry={() => fetchDashboard()} />
        ) : data ? (
          <AnimatePresence mode="wait">
            <motion.div
              key={tab}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.25 }}
            >
              {tab === 'overview' && <OverviewTab data={data} />}
              {tab === 'companies' && (
                <CompaniesTab
                  companies={data.companies}
                  onRefresh={() => fetchDashboard(true)}
                />
              )}
              {tab === 'activity' && <ActivityTab data={data} />}
            </motion.div>
          </AnimatePresence>
        ) : null}

        {/* Signed-in-as footer note */}
        {user && (
          <p className="mt-8 text-[11px] text-muted-foreground text-center">
            Signed in as <span className="font-medium">{user.name}</span> ({user.email})
          </p>
        )}
      </div>
    </AppShell>
  )
}

function LoadingState() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Skeleton className="lg:col-span-2 h-40 rounded-xl" />
        <Skeleton className="h-40 rounded-xl" />
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-28 rounded-xl" />
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Skeleton className="h-80 rounded-xl" />
        <Skeleton className="lg:col-span-2 h-80 rounded-xl" />
      </div>
    </div>
  )
}

function ErrorState({
  message,
  onRetry,
}: {
  message: string
  onRetry: () => void
}) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="w-12 h-12 rounded-full bg-rose-100 dark:bg-rose-950/50 flex items-center justify-center mb-4">
        <span className="text-2xl">⚠️</span>
      </div>
      <p className="text-sm font-medium text-rose-700 dark:text-rose-400">
        {message}
      </p>
      <p className="text-xs text-muted-foreground mt-1 mb-4">
        You may not have Super Admin access, or the server is unavailable.
      </p>
      <Button onClick={onRetry} variant="outline" size="sm">
        <RefreshCw className="w-4 h-4 mr-2" />
        Try again
      </Button>
    </div>
  )
}
