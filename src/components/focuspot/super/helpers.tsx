// Formatting + small presentational helpers for the Super Admin dashboard.

import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import type {
  Plan,
  SubscriptionStatus,
  ChallengeStatus,
} from './types'

export function formatCurrency(n: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(n)
}

export function formatNumber(n: number): string {
  return new Intl.NumberFormat('en-US').format(n)
}

export function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  } catch {
    return iso
  }
}

export function timeAgo(iso: string): string {
  const then = new Date(iso).getTime()
  const now = Date.now()
  const diff = Math.max(0, now - then)
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  if (days < 7) return `${days}d ago`
  return formatDate(iso)
}

const planStyles: Record<Plan, string> = {
  STARTER: 'bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300 border-amber-200/60',
  GROWTH: 'bg-violet-100 text-violet-700 dark:bg-violet-950/50 dark:text-violet-300 border-violet-200/60',
}

export function PlanBadge({ plan }: { plan: Plan }) {
  return (
    <Badge
      variant="outline"
      className={cn('font-medium', planStyles[plan])}
    >
      {plan === 'STARTER' ? 'Starter' : 'Growth'}
    </Badge>
  )
}

const subStyles: Record<
  SubscriptionStatus,
  { className: string; label: string; dot: string }
> = {
  ACTIVE: {
    className:
      'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300 border-emerald-200/60',
    label: 'Active',
    dot: 'bg-emerald-500',
  },
  PAST_DUE: {
    className:
      'bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300 border-amber-200/60',
    label: 'Past Due',
    dot: 'bg-amber-500',
  },
  CANCELED: {
    className:
      'bg-rose-100 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300 border-rose-200/60',
    label: 'Canceled',
    dot: 'bg-rose-500',
  },
}

export function StatusBadge({ status }: { status: SubscriptionStatus }) {
  const s = subStyles[status]
  return (
    <Badge variant="outline" className={cn('font-medium gap-1.5', s.className)}>
      <span className={cn('w-1.5 h-1.5 rounded-full', s.dot)} />
      {s.label}
    </Badge>
  )
}

const challengeStyles: Record<
  ChallengeStatus,
  { className: string; label: string }
> = {
  DRAFT: {
    className:
      'bg-muted text-muted-foreground border-border',
    label: 'Draft',
  },
  ACTIVE: {
    className:
      'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300 border-emerald-200/60',
    label: 'Active',
  },
  COMPLETED: {
    className:
      'bg-violet-100 text-violet-700 dark:bg-violet-950/50 dark:text-violet-300 border-violet-200/60',
    label: 'Completed',
  },
}

export function ChallengeStatusBadge({ status }: { status: ChallengeStatus }) {
  const s = challengeStyles[status]
  return (
    <Badge variant="outline" className={cn('font-medium', s.className)}>
      {s.label}
    </Badge>
  )
}

export function UtilizationBar({ value }: { value: number }) {
  const v = Math.min(100, Math.max(0, value))
  const color =
    v >= 90
      ? 'bg-rose-500'
      : v >= 70
        ? 'bg-amber-500'
        : 'bg-emerald-500'
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 w-16 rounded-full bg-muted overflow-hidden">
        <div
          className={cn('h-full rounded-full transition-all', color)}
          style={{ width: `${v}%` }}
        />
      </div>
      <span className="text-xs tabular-nums text-muted-foreground">{v}%</span>
    </div>
  )
}
