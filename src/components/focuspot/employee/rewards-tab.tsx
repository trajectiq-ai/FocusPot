'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import {
  Gift,
  Copy,
  Check,
  Trophy,
  Medal,
  Award,
  Clock,
  Calendar,
  Package,
  Sparkles,
  Hash,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { getColor } from '@/lib/colors'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

type Reward = {
  id: string
  name: string
  description: string
  type: string // GIFT_CARD | MERCH | EXPERIENCE | CUSTOM
  value: number
  provider: string
  imageColor: string
}

type Redemption = {
  id: string
  rewardId: string
  challengeId: string | null
  tier: string // WINNER | RUNNER_UP | PARTICIPATION
  position: number
  status: string // PENDING | APPROVED | FULFILLED | DECLINED | EXPIRED
  code: string
  notes: string
  redeemedAt: string
  fulfilledAt: string | null
  expiresAt: string | null
  reward: Reward
}

type Summary = {
  total: number
  pending: number
  approved: number
  fulfilled: number
  declined: number
  totalValue: number
}

type Response = {
  summary: Summary
  redemptions: Redemption[]
}

const TIER_META: Record<string, { icon: typeof Trophy; label: string; tint: string }> = {
  WINNER: {
    icon: Trophy,
    label: 'Winner',
    tint: 'bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300 border-amber-200/60',
  },
  RUNNER_UP: {
    icon: Medal,
    label: 'Runner-up',
    tint: 'bg-violet-100 text-violet-700 dark:bg-violet-950/50 dark:text-violet-300 border-violet-200/60',
  },
  PARTICIPATION: {
    icon: Award,
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

const TYPE_META: Record<string, { label: string; icon: typeof Gift }> = {
  GIFT_CARD: { label: 'Gift card', icon: Gift },
  MERCH: { label: 'Merch', icon: Package },
  EXPERIENCE: { label: 'Experience', icon: Sparkles },
  CUSTOM: { label: 'Custom', icon: Award },
}

function formatDate(iso: string | null): string {
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

export function RewardsTab() {
  const [data, setData] = useState<Response | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    fetch('/api/employee/rewards', { cache: 'no-store' })
      .then(async (r) => {
        if (!r.ok) throw new Error('Failed to load rewards')
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

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Skeleton className="h-24 rounded-xl" />
          <Skeleton className="h-24 rounded-xl" />
          <Skeleton className="h-24 rounded-xl" />
        </div>
        <Skeleton className="h-48 rounded-xl" />
        <Skeleton className="h-48 rounded-xl" />
      </div>
    )
  }

  if (error || !data) {
    return (
      <Card className="p-10 text-center">
        <div className="text-5xl mb-3">🎁</div>
        <h3 className="font-semibold text-lg">Could not load rewards</h3>
        <p className="text-sm text-muted-foreground mt-1">{error || 'Please try again.'}</p>
      </Card>
    )
  }

  const { summary, redemptions } = data

  return (
    <div className="space-y-6">
      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <SummaryStat
          icon={Gift}
          label="Total rewards"
          value={summary.total}
          sub="lifetime redemptions"
          tint="bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300"
          index={0}
        />
        <SummaryStat
          icon={Check}
          label="Fulfilled"
          value={summary.fulfilled}
          sub={summary.totalValue > 0 ? `$${summary.totalValue} total value` : 'no fulfilled rewards'}
          tint="bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300"
          index={1}
        />
        <SummaryStat
          icon={Clock}
          label="Pending"
          value={summary.pending}
          sub={summary.pending > 0 ? 'awaiting fulfillment' : 'all caught up'}
          tint="bg-violet-100 text-violet-700 dark:bg-violet-950/50 dark:text-violet-300"
          index={2}
        />
      </div>

      {/* Rewards list */}
      {redemptions.length === 0 ? (
        <Card className="p-10 text-center">
          <div className="text-5xl mb-3">🌱</div>
          <h3 className="font-semibold text-lg">No rewards yet</h3>
          <p className="text-sm text-muted-foreground mt-1 max-w-md mx-auto">
            Complete focus sessions and win challenges to earn rewards! Top performers on each
            challenge win gift cards, merch, and more.
          </p>
        </Card>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
              Your reward history
            </h3>
            <span className="text-xs text-muted-foreground">
              {redemptions.length} item{redemptions.length === 1 ? '' : 's'}
            </span>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {redemptions.map((r, i) => (
              <RewardCard key={r.id} redemption={r} index={i} />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function SummaryStat({
  icon: Icon,
  label,
  value,
  sub,
  tint,
  index,
}: {
  icon: typeof Gift
  label: string
  value: number
  sub: string
  tint: string
  index: number
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05, duration: 0.3 }}
    >
      <Card className="p-4 h-full">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              {label}
            </p>
            <p className="text-2xl font-bold tabular-nums mt-1">{value}</p>
            <p className="text-[11px] text-muted-foreground mt-0.5">{sub}</p>
          </div>
          <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center shrink-0', tint)}>
            <Icon className="w-4 h-4" />
          </div>
        </div>
      </Card>
    </motion.div>
  )
}

function RewardCard({ redemption, index }: { redemption: Redemption; index: number }) {
  const [copied, setCopied] = useState(false)
  const reward = redemption.reward
  const tierMeta = TIER_META[redemption.tier] ?? TIER_META.PARTICIPATION
  const statusMeta = STATUS_META[redemption.status] ?? STATUS_META.PENDING
  const typeMeta = TYPE_META[reward.type] ?? TYPE_META.CUSTOM
  const TierIcon = tierMeta.icon
  const TypeIcon = typeMeta.icon
  const c = getColor(reward.imageColor || 'emerald')
  const isFulfilled = redemption.status === 'FULFILLED' && !!redemption.code
  const isDeclined = redemption.status === 'DECLINED'
  const isExpired = redemption.status === 'EXPIRED'

  const handleCopy = async () => {
    if (!redemption.code) return
    try {
      await navigator.clipboard.writeText(redemption.code)
      setCopied(true)
      toast.success('Code copied to clipboard')
      setTimeout(() => setCopied(false), 2000)
    } catch {
      toast.error('Could not copy code')
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04, duration: 0.3 }}
    >
      <Card
        className={cn(
          'p-4 h-full relative overflow-hidden transition-all',
          isDeclined || isExpired ? 'opacity-60' : '',
        )}
      >
        <div
          className={cn(
            'absolute -top-10 -right-10 w-32 h-32 rounded-full blur-3xl pointer-events-none',
            c.bgSoft,
          )}
        />
        <div className="relative flex items-start gap-3">
          {/* Reward icon */}
          <div
            className={cn(
              'w-14 h-14 rounded-2xl flex items-center justify-center shrink-0',
              c.bgSoft,
            )}
          >
            <TypeIcon className={cn('w-6 h-6', c.text)} />
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <h4 className="font-semibold text-sm leading-tight truncate">{reward.name}</h4>
                {reward.description && (
                  <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2 leading-snug">
                    {reward.description}
                  </p>
                )}
              </div>
              {reward.value > 0 && (
                <span className={cn('text-sm font-bold shrink-0', c.text)}>
                  ${reward.value}
                </span>
              )}
            </div>

            {/* Badges */}
            <div className="flex items-center flex-wrap gap-1.5 mt-2">
              <Badge variant="outline" className={cn('text-[10px] py-0 h-5 gap-1', tierMeta.tint)}>
                <TierIcon className="w-2.5 h-2.5" />
                {tierMeta.label}
                {redemption.position > 0 && redemption.position <= 3 && (
                  <span className="ml-0.5">#{redemption.position}</span>
                )}
              </Badge>
              <Badge variant="outline" className="text-[10px] py-0 h-5 text-muted-foreground">
                <TypeIcon className="w-2.5 h-2.5" />
                {typeMeta.label}
              </Badge>
              <Badge variant="outline" className={cn('text-[10px] py-0 h-5 gap-1', statusMeta.tint)}>
                <span className={cn('w-1.5 h-1.5 rounded-full', statusMeta.dot)} />
                {statusMeta.label}
              </Badge>
            </div>
          </div>
        </div>

        {/* Fulfillment code */}
        {isFulfilled && (
          <div className="mt-4 p-3 rounded-lg border-2 border-dashed border-emerald-300/60 dark:border-emerald-700/60 bg-emerald-50/50 dark:bg-emerald-950/20">
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                <div className="flex items-center gap-1.5 text-[11px] font-medium text-emerald-700 dark:text-emerald-300 mb-1">
                  <Hash className="w-3 h-3" />
                  Your reward code
                </div>
                <code className="text-sm font-mono font-semibold tracking-wide break-all">
                  {redemption.code}
                </code>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={handleCopy}
                className="shrink-0 h-7 px-2 text-xs gap-1"
              >
                {copied ? (
                  <>
                    <Check className="w-3 h-3 text-emerald-600" />
                    Copied
                  </>
                ) : (
                  <>
                    <Copy className="w-3 h-3" />
                    Copy
                  </>
                )}
              </Button>
            </div>
            {redemption.notes && (
              <p className="text-[11px] text-muted-foreground mt-2 pt-2 border-t border-emerald-200/50 dark:border-emerald-800/50">
                {redemption.notes}
              </p>
            )}
          </div>
        )}

        {/* Footer dates */}
        <div className="mt-3 flex items-center justify-between gap-2 text-[11px] text-muted-foreground flex-wrap">
          <div className="flex items-center gap-1.5">
            <Calendar className="w-3 h-3" />
            <span>Earned {formatDate(redemption.redeemedAt)}</span>
          </div>
          {redemption.fulfilledAt && (
            <div className="flex items-center gap-1.5">
              <Check className="w-3 h-3 text-emerald-500" />
              <span>Fulfilled {formatDate(redemption.fulfilledAt)}</span>
            </div>
          )}
          {redemption.expiresAt && !isFulfilled && !isDeclined && (
            <div className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400">
              <Clock className="w-3 h-3" />
              <span>Expires {formatDate(redemption.expiresAt)}</span>
            </div>
          )}
        </div>
      </Card>
    </motion.div>
  )
}
