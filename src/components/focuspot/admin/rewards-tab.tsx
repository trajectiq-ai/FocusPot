'use client'

// Company Admin → Rewards tab
// Two stacked sections (Tabs):
//   1. Reward Catalog  — paginated reward cards with type/value/inventory/active toggle.
//      Create / Edit / Delete (with confirm dialog).
//   2. Redemptions     — paginated table with tier + status badges.
//      Actions: Approve (PENDING→APPROVED), Fulfill (APPROVED→FULFILLED, code input),
//      Decline.

import { useCallback, useEffect, useMemo, useState } from 'react'
import { format } from 'date-fns'
import { toast } from 'sonner'
import {
  Gift,
  Plus,
  Pencil,
  Trash2,
  Loader2,
  Package,
  Sparkles,
  Ticket,
  Palette,
  CheckCircle2,
  XCircle,
  Clock,
  Search,
  RefreshCw,
  Crown,
  Medal,
  Award,
  CalendarClock,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Progress } from '@/components/ui/progress'
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { getColor, getInitials } from '@/lib/colors'
import type {
  RewardItem,
  RewardType,
  RedemptionItem,
  RedemptionStatus,
  RedemptionTier,
  PaginatedRewards,
  PaginatedRedemptions,
} from './types'

// ============================================================
// Badge helpers
// ============================================================

const REWARD_TYPE_META: Record<
  RewardType,
  { label: string; badge: string; ring: string }
> = {
  GIFT_CARD: {
    label: 'Gift Card',
    badge: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300',
    ring: 'from-emerald-500 to-teal-600',
  },
  MERCH: {
    label: 'Merch',
    badge: 'bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300',
    ring: 'from-amber-500 to-orange-600',
  },
  EXPERIENCE: {
    label: 'Experience',
    badge: 'bg-violet-100 text-violet-700 dark:bg-violet-950/50 dark:text-violet-300',
    ring: 'from-violet-500 to-purple-600',
  },
  CUSTOM: {
    label: 'Custom',
    badge: 'bg-sky-100 text-sky-700 dark:bg-sky-950/50 dark:text-sky-300',
    ring: 'from-sky-500 to-cyan-600',
  },
}

const REDEMPTION_STATUS_META: Record<
  RedemptionStatus,
  { label: string; badge: string; icon: typeof Clock }
> = {
  PENDING: {
    label: 'Pending',
    badge: 'bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300',
    icon: Clock,
  },
  APPROVED: {
    label: 'Approved',
    badge: 'bg-sky-100 text-sky-700 dark:bg-sky-950/50 dark:text-sky-300',
    icon: CheckCircle2,
  },
  FULFILLED: {
    label: 'Fulfilled',
    badge: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300',
    icon: CheckCircle2,
  },
  DECLINED: {
    label: 'Declined',
    badge: 'bg-rose-100 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300',
    icon: XCircle,
  },
  EXPIRED: {
    label: 'Expired',
    badge: 'bg-muted text-muted-foreground',
    icon: Clock,
  },
}

const TIER_META: Record<RedemptionTier, { label: string; badge: string; icon: typeof Crown }> = {
  WINNER: {
    label: 'Winner',
    badge: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300',
    icon: Crown,
  },
  RUNNER_UP: {
    label: 'Runner-up',
    badge: 'bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300',
    icon: Medal,
  },
  PARTICIPATION: {
    label: 'Participation',
    badge: 'bg-sky-100 text-sky-700 dark:bg-sky-950/50 dark:text-sky-300',
    icon: Award,
  },
}

const COLOR_OPTIONS = ['emerald', 'amber', 'rose', 'sky', 'violet', 'orange'] as const

// ============================================================
// Main RewardsTab
// ============================================================

export function RewardsTab({ onRefresh }: { onRefresh: () => void }) {
  const [section, setSection] = useState<'catalog' | 'redemptions'>('catalog')

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold tracking-tight flex items-center gap-2">
            <Gift className="w-5 h-5 text-amber-500" /> Rewards
          </h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            Manage your reward catalog and approve redemption requests from employees.
          </p>
        </div>
      </div>

      <Tabs value={section} onValueChange={(v) => setSection(v as 'catalog' | 'redemptions')}>
        <TabsList className="grid w-full sm:w-auto grid-cols-2 sm:inline-flex">
          <TabsTrigger value="catalog" className="gap-1.5">
            <Package className="w-4 h-4" /> Catalog
          </TabsTrigger>
          <TabsTrigger value="redemptions" className="gap-1.5">
            <Ticket className="w-4 h-4" /> Redemptions
          </TabsTrigger>
        </TabsList>
        <TabsContent value="catalog" className="mt-4">
          <RewardCatalogSection onRefresh={onRefresh} />
        </TabsContent>
        <TabsContent value="redemptions" className="mt-4">
          <RedemptionsSection />
        </TabsContent>
      </Tabs>
    </div>
  )
}

// ============================================================
// Section 1: Reward Catalog
// ============================================================

function RewardCatalogSection({ onRefresh }: { onRefresh: () => void }) {
  const [data, setData] = useState<RewardItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)
  const [typeFilter, setTypeFilter] = useState<string>('all')
  const [activeFilter, setActiveFilter] = useState<string>('all')

  const [createOpen, setCreateOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<RewardItem | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<RewardItem | null>(null)
  const [togglingId, setTogglingId] = useState<string | null>(null)

  const fetchRewards = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams({ page: String(page), pageSize: '20' })
      if (typeFilter !== 'all') params.set('type', typeFilter)
      if (activeFilter !== 'all') params.set('active', activeFilter)
      const res = await fetch(`/api/admin/rewards?${params.toString()}`, { cache: 'no-store' })
      const j = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(j.error || 'Failed to load rewards')
      const parsed = j as PaginatedRewards
      setData(parsed.data)
      setTotalPages(parsed.pagination.totalPages || 1)
      setTotal(parsed.pagination.total)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load rewards')
    } finally {
      setLoading(false)
    }
  }, [page, typeFilter, activeFilter])

  useEffect(() => {
    fetchRewards()
  }, [fetchRewards])

  // Reset page when filters change
  useEffect(() => {
    setPage(1)
  }, [typeFilter, activeFilter])

  const handleToggleActive = async (reward: RewardItem) => {
    setTogglingId(reward.id)
    try {
      const res = await fetch(`/api/admin/rewards/${reward.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ active: !reward.active }),
      })
      const j = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(j.error || 'Failed to update')
      toast.success(reward.active ? 'Reward deactivated' : 'Reward activated')
      fetchRewards()
      onRefresh()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to update')
    } finally {
      setTogglingId(null)
    }
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    try {
      const res = await fetch(`/api/admin/rewards/${deleteTarget.id}`, { method: 'DELETE' })
      const j = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(j.error || 'Failed to delete')
      toast.success('Reward deleted')
      setDeleteTarget(null)
      fetchRewards()
      onRefresh()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to delete')
    }
  }

  return (
    <div className="space-y-4">
      {/* Filters + create */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All types</SelectItem>
              <SelectItem value="GIFT_CARD">Gift Card</SelectItem>
              <SelectItem value="MERCH">Merch</SelectItem>
              <SelectItem value="EXPERIENCE">Experience</SelectItem>
              <SelectItem value="CUSTOM">Custom</SelectItem>
            </SelectContent>
          </Select>
          <Select value={activeFilter} onValueChange={setActiveFilter}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="true">Active</SelectItem>
              <SelectItem value="false">Inactive</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button onClick={() => setCreateOpen(true)} className="bg-emerald-600 hover:bg-emerald-700">
          <Plus className="w-4 h-4" /> Create Reward
        </Button>
      </div>

      {loading ? (
        <Card>
          <CardContent className="py-12 flex items-center justify-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="w-4 h-4 animate-spin" /> Loading rewards…
          </CardContent>
        </Card>
      ) : error ? (
        <Card className="border-rose-200 dark:border-rose-800/50">
          <CardContent className="py-10 text-center">
            <p className="text-sm text-rose-600 dark:text-rose-400">{error}</p>
            <Button variant="outline" size="sm" className="mt-3" onClick={fetchRewards}>
              Try again
            </Button>
          </CardContent>
        </Card>
      ) : data.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-12 text-center">
            <Gift className="w-10 h-10 mx-auto text-muted-foreground/50 mb-2" />
            <p className="text-sm font-medium">No rewards yet</p>
            <p className="text-xs text-muted-foreground mt-1">
              Create your first reward to start incentivizing your teams.
            </p>
            <Button
              onClick={() => setCreateOpen(true)}
              className="mt-4 bg-emerald-600 hover:bg-emerald-700"
            >
              <Plus className="w-4 h-4" /> Create Reward
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {data.map((r) => (
              <RewardCard
                key={r.id}
                reward={r}
                onEdit={() => setEditTarget(r)}
                onDelete={() => setDeleteTarget(r)}
                onToggle={() => handleToggleActive(r)}
                toggling={togglingId === r.id}
              />
            ))}
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between gap-3 pt-2">
            <p className="text-xs text-muted-foreground">
              {total} reward{total === 1 ? '' : 's'} · page {page} of {totalPages}
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                Next
              </Button>
            </div>
          </div>
        </>
      )}

      {/* Create / Edit dialogs */}
      <RewardFormDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onSaved={() => {
          fetchRewards()
          onRefresh()
        }}
      />
      {editTarget && (
        <RewardFormDialog
          open={!!editTarget}
          onOpenChange={(v) => !v && setEditTarget(null)}
          reward={editTarget}
          onSaved={() => {
            setEditTarget(null)
            fetchRewards()
            onRefresh()
          }}
        />
      )}

      {/* Delete confirm */}
      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(v) => !v && setDeleteTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Trash2 className="w-5 h-5 text-rose-500" /> Delete reward?
            </AlertDialogTitle>
            <AlertDialogDescription>
              This permanently deletes{' '}
              <span className="font-semibold text-foreground">{deleteTarget?.name}</span>.
              You can&apos;t delete a reward that already has redemptions or is linked to a
              challenge — archive it (toggle inactive) instead.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-rose-600 hover:bg-rose-700 text-white"
              onClick={(e) => {
                e.preventDefault()
                handleDelete()
              }}
            >
              <Trash2 className="w-4 h-4" /> Delete permanently
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

function RewardCard({
  reward,
  onEdit,
  onDelete,
  onToggle,
  toggling,
}: {
  reward: RewardItem
  onEdit: () => void
  onDelete: () => void
  onToggle: () => void
  toggling: boolean
}) {
  const typeMeta = REWARD_TYPE_META[reward.type] || REWARD_TYPE_META.CUSTOM
  const c = getColor(reward.imageColor || 'emerald')
  const inventoryPct =
    reward.inventory < 0
      ? 100
      : Math.min(100, Math.max(0, reward.inventory > 0 ? 100 : 0))
  const expired =
    reward.expiresAt && new Date(reward.expiresAt).getTime() < Date.now()

  return (
    <Card className={`overflow-hidden flex flex-col ${!reward.active ? 'opacity-70' : ''}`}>
      <div className={`h-1.5 bg-gradient-to-r ${typeMeta.ring}`} />
      <CardContent className="p-4 flex flex-col gap-3 flex-1">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-3 min-w-0">
            <div
              className={`shrink-0 w-11 h-11 rounded-xl bg-gradient-to-br ${c.gradient} text-white flex items-center justify-center shadow-sm`}
            >
              <Gift className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <p className="font-semibold truncate leading-tight">{reward.name}</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {reward.provider || 'No provider'}
              </p>
            </div>
          </div>
          <Badge className={typeMeta.badge}>{typeMeta.label}</Badge>
        </div>

        {reward.description && (
          <p className="text-xs text-muted-foreground line-clamp-2">{reward.description}</p>
        )}

        <div className="grid grid-cols-2 gap-2 mt-1">
          <div className="rounded-lg border border-border/60 p-2.5 bg-muted/30">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Value</p>
            <p className="text-base font-bold tabular-nums">
              {reward.value > 0 ? `$${reward.value}` : '—'}
            </p>
          </div>
          <div className="rounded-lg border border-border/60 p-2.5 bg-muted/30">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Inventory</p>
            <p className="text-base font-bold tabular-nums">
              {reward.inventory < 0 ? '∞' : reward.inventory}
            </p>
          </div>
        </div>

        {reward.inventory >= 0 && (
          <div className="space-y-1">
            <Progress value={inventoryPct} className="h-1.5" />
          </div>
        )}

        <div className="flex items-center gap-2 flex-wrap text-[10px] text-muted-foreground">
          {reward.redemptionCount > 0 && (
            <Badge variant="outline" className="text-[10px]">
              <Ticket className="w-3 h-3" /> {reward.redemptionCount} redeemed
            </Badge>
          )}
          {reward.linkedChallengeCount > 0 && (
            <Badge variant="outline" className="text-[10px]">
              <Sparkles className="w-3 h-3" /> {reward.linkedChallengeCount} challenge
              {reward.linkedChallengeCount === 1 ? '' : 's'}
            </Badge>
          )}
          {expired && (
            <Badge className="bg-rose-100 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300 text-[10px]">
              Expired
            </Badge>
          )}
          {reward.expiresAt && !expired && (
            <Badge variant="outline" className="text-[10px]">
              <CalendarClock className="w-3 h-3" /> {format(new Date(reward.expiresAt), 'MMM d, yyyy')}
            </Badge>
          )}
        </div>

        <div className="flex items-center justify-between gap-2 pt-1 mt-auto">
          <div className="flex items-center gap-2">
            <Switch
              checked={reward.active}
              onCheckedChange={onToggle}
              disabled={toggling}
              aria-label="Toggle reward active"
            />
            <span className="text-xs text-muted-foreground">
              {toggling ? 'Saving…' : reward.active ? 'Active' : 'Inactive'}
            </span>
          </div>
          <div className="flex gap-1">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onEdit}>
                  <Pencil className="w-3.5 h-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Edit reward</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-muted-foreground hover:text-rose-600"
                  onClick={onDelete}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Delete reward</TooltipContent>
            </Tooltip>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// ============================================================
// Reward Create/Edit dialog
// ============================================================

function RewardFormDialog({
  open,
  onOpenChange,
  reward,
  onSaved,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  reward?: RewardItem
  onSaved: () => void
}) {
  const isEdit = !!reward
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [type, setType] = useState<RewardType>('GIFT_CARD')
  const [value, setValue] = useState('')
  const [provider, setProvider] = useState('')
  const [inventory, setInventory] = useState('-1')
  const [imageColor, setImageColor] = useState<string>('emerald')
  const [expiresAt, setExpiresAt] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (!open) return
    if (reward) {
      setName(reward.name)
      setDescription(reward.description)
      setType(reward.type)
      setValue(reward.value > 0 ? String(reward.value) : '')
      setProvider(reward.provider)
      setInventory(reward.inventory < 0 ? '-1' : String(reward.inventory))
      setImageColor(reward.imageColor || 'emerald')
      setExpiresAt(reward.expiresAt ? reward.expiresAt.split('T')[0] : '')
    } else {
      setName('')
      setDescription('')
      setType('GIFT_CARD')
      setValue('')
      setProvider('')
      setInventory('-1')
      setImageColor('emerald')
      setExpiresAt('')
    }
  }, [open, reward])

  const submit = async () => {
    if (!name.trim()) return toast.error('Please enter a reward name')
    setSubmitting(true)
    try {
      const body: Record<string, unknown> = {
        name: name.trim(),
        description: description.trim(),
        type,
        value: Number(value) || 0,
        provider: provider.trim(),
        inventory: Number(inventory),
        imageColor,
      }
      if (expiresAt) {
        // Send as ISO datetime (end of day)
        body.expiresAt = new Date(`${expiresAt}T23:59:59`).toISOString()
      } else if (isEdit) {
        body.expiresAt = ''
      }

      const url = isEdit ? `/api/admin/rewards/${reward!.id}` : '/api/admin/rewards'
      const method = isEdit ? 'PATCH' : 'POST'
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const j = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(j.error || 'Failed to save reward')
      toast.success(isEdit ? 'Reward updated' : 'Reward created')
      onOpenChange(false)
      onSaved()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to save reward')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto scrollbar-thin">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg">
            <span className="w-8 h-8 rounded-lg bg-amber-100 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <Gift className="w-4 h-4" />
            </span>
            {isEdit ? 'Edit Reward' : 'Create Reward'}
          </DialogTitle>
          <DialogDescription>
            {isEdit
              ? 'Update the details of this reward.'
              : 'Add a new reward to your company catalog. Employees can redeem these via challenge wins.'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="r-name">Name</Label>
            <Input
              id="r-name"
              placeholder="e.g. $100 Amazon Gift Card"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={120}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="r-desc">Description</Label>
            <Textarea
              id="r-desc"
              placeholder="Short description shown to employees…"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              maxLength={500}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="r-type">Type</Label>
              <Select value={type} onValueChange={(v) => setType(v as RewardType)}>
                <SelectTrigger id="r-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="GIFT_CARD">Gift Card</SelectItem>
                  <SelectItem value="MERCH">Merch</SelectItem>
                  <SelectItem value="EXPERIENCE">Experience</SelectItem>
                  <SelectItem value="CUSTOM">Custom</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="r-value">Value (USD)</Label>
              <Input
                id="r-value"
                type="number"
                min={0}
                placeholder="100"
                value={value}
                onChange={(e) => setValue(e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="r-provider">Provider</Label>
              <Input
                id="r-provider"
                placeholder="e.g. Amazon, Tremendous"
                value={provider}
                onChange={(e) => setProvider(e.target.value)}
                maxLength={120}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="r-inv" className="flex items-center gap-1.5">
                Inventory
                <span className="text-xs text-muted-foreground font-normal">(-1 = unlimited)</span>
              </Label>
              <Input
                id="r-inv"
                type="number"
                min={-1}
                placeholder="-1"
                value={inventory}
                onChange={(e) => setInventory(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="r-color" className="flex items-center gap-1.5">
              <Palette className="w-3.5 h-3.5" /> Card color
            </Label>
            <div className="flex gap-2 flex-wrap">
              {COLOR_OPTIONS.map((color) => {
                const cc = getColor(color)
                const selected = imageColor === color
                return (
                  <button
                    key={color}
                    type="button"
                    onClick={() => setImageColor(color)}
                    aria-label={`Color ${color}`}
                    className={`w-9 h-9 rounded-lg bg-gradient-to-br ${cc.gradient} flex items-center justify-center transition ${
                      selected ? 'ring-2 ring-offset-2 ring-offset-background ring-foreground' : 'opacity-70 hover:opacity-100'
                    }`}
                  >
                    {selected && <CheckCircle2 className="w-4 h-4 text-white" />}
                  </button>
                )
              })}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="r-expires" className="flex items-center gap-1.5">
              <CalendarClock className="w-3.5 h-3.5" /> Expires at
              <span className="text-xs text-muted-foreground font-normal">(optional)</span>
            </Label>
            <Input
              id="r-expires"
              type="date"
              value={expiresAt}
              onChange={(e) => setExpiresAt(e.target.value)}
            />
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
            Cancel
          </Button>
          <Button
            onClick={submit}
            disabled={submitting}
            className="bg-emerald-600 hover:bg-emerald-700"
          >
            {submitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" /> Saving…
              </>
            ) : (
              <>
                <Gift className="w-4 h-4" /> {isEdit ? 'Save changes' : 'Create reward'}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ============================================================
// Section 2: Redemptions
// ============================================================

function RedemptionsSection() {
  const [data, setData] = useState<RedemptionItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [search, setSearch] = useState('')
  const [searchDebounced, setSearchDebounced] = useState('')

  const [actionTarget, setActionTarget] = useState<RedemptionItem | null>(null)
  const [actionType, setActionType] = useState<'fulfill' | 'decline' | null>(null)
  const [actionCode, setActionCode] = useState('')
  const [actionNotes, setActionNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => {
      setSearchDebounced(search)
      setPage(1)
    }, 350)
    return () => clearTimeout(t)
  }, [search])

  const fetchRedemptions = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams({ page: String(page), pageSize: '20' })
      if (statusFilter !== 'all') params.set('status', statusFilter)
      if (searchDebounced) params.set('search', searchDebounced)
      const res = await fetch(`/api/admin/redeemptions?${params.toString()}`, {
        cache: 'no-store',
      })
      const j = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(j.error || 'Failed to load redemptions')
      const parsed = j as PaginatedRedemptions
      setData(parsed.data)
      setTotalPages(parsed.pagination.totalPages || 1)
      setTotal(parsed.pagination.total)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load redemptions')
    } finally {
      setLoading(false)
    }
  }, [page, statusFilter, searchDebounced])

  useEffect(() => {
    fetchRedemptions()
  }, [fetchRedemptions])

  useEffect(() => {
    setPage(1)
  }, [statusFilter])

  const handleQuickApprove = async (r: RedemptionItem) => {
    try {
      const res = await fetch(`/api/admin/redeemptions/${r.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'APPROVED' }),
      })
      const j = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(j.error || 'Failed to approve')
      toast.success('Redemption approved')
      fetchRedemptions()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to approve')
    }
  }

  const openFulfill = (r: RedemptionItem) => {
    setActionTarget(r)
    setActionType('fulfill')
    setActionCode(r.code || '')
    setActionNotes(r.notes || '')
  }

  const openDecline = (r: RedemptionItem) => {
    setActionTarget(r)
    setActionType('decline')
    setActionCode('')
    setActionNotes(r.notes || '')
  }

  const handleActionSubmit = async () => {
    if (!actionTarget || !actionType) return
    if (actionType === 'fulfill' && !actionCode.trim()) {
      toast.error('Please enter a fulfillment code')
      return
    }
    setSubmitting(true)
    try {
      const body: Record<string, unknown> = {
        status: actionType === 'fulfill' ? 'FULFILLED' : 'DECLINED',
      }
      if (actionType === 'fulfill') body.code = actionCode.trim()
      if (actionNotes.trim()) body.notes = actionNotes.trim()

      const res = await fetch(`/api/admin/redeemptions/${actionTarget.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const j = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(j.error || 'Failed to update')
      toast.success(actionType === 'fulfill' ? 'Redemption fulfilled' : 'Redemption declined')
      setActionTarget(null)
      setActionType(null)
      fetchRedemptions()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to update')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by reward, name, email, or code…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="PENDING">Pending</SelectItem>
            <SelectItem value="APPROVED">Approved</SelectItem>
            <SelectItem value="FULFILLED">Fulfilled</SelectItem>
            <SelectItem value="DECLINED">Declined</SelectItem>
            <SelectItem value="EXPIRED">Expired</SelectItem>
          </SelectContent>
        </Select>
        <Button variant="outline" size="icon" onClick={fetchRedemptions} aria-label="Refresh">
          <RefreshCw className="w-4 h-4" />
        </Button>
      </div>

      {loading ? (
        <Card>
          <CardContent className="py-12 flex items-center justify-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="w-4 h-4 animate-spin" /> Loading redemptions…
          </CardContent>
        </Card>
      ) : error ? (
        <Card className="border-rose-200 dark:border-rose-800/50">
          <CardContent className="py-10 text-center">
            <p className="text-sm text-rose-600 dark:text-rose-400">{error}</p>
            <Button variant="outline" size="sm" className="mt-3" onClick={fetchRedemptions}>
              Try again
            </Button>
          </CardContent>
        </Card>
      ) : data.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-12 text-center">
            <Ticket className="w-10 h-10 mx-auto text-muted-foreground/50 mb-2" />
            <p className="text-sm font-medium">No redemptions found</p>
            <p className="text-xs text-muted-foreground mt-1">
              {search || statusFilter !== 'all'
                ? 'Try adjusting your filters.'
                : 'Redemptions will appear here when employees claim their rewards.'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Desktop table */}
          <Card className="hidden md:block">
            <CardContent className="p-0">
              <div className="max-h-[36rem] overflow-y-auto scrollbar-thin">
                <Table>
                  <TableHeader className="sticky top-0 bg-card z-10">
                    <TableRow>
                      <TableHead className="pl-6">Employee</TableHead>
                      <TableHead>Reward</TableHead>
                      <TableHead>Tier</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Code</TableHead>
                      <TableHead>Redeemed</TableHead>
                      <TableHead className="pr-6 text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.map((r) => (
                      <RedemptionRow
                        key={r.id}
                        redemption={r}
                        onApprove={() => handleQuickApprove(r)}
                        onFulfill={() => openFulfill(r)}
                        onDecline={() => openDecline(r)}
                      />
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          {/* Mobile cards */}
          <div className="md:hidden grid grid-cols-1 gap-3">
            {data.map((r) => (
              <RedemptionMobileCard
                key={r.id}
                redemption={r}
                onApprove={() => handleQuickApprove(r)}
                onFulfill={() => openFulfill(r)}
                onDecline={() => openDecline(r)}
              />
            ))}
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between gap-3 pt-2">
            <p className="text-xs text-muted-foreground">
              {total} redemption{total === 1 ? '' : 's'} · page {page} of {totalPages}
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                Next
              </Button>
            </div>
          </div>
        </>
      )}

      {/* Fulfill / Decline dialog */}
      <Dialog
        open={!!actionTarget}
        onOpenChange={(v) => {
          if (!v) {
            setActionTarget(null)
            setActionType(null)
          }
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {actionType === 'fulfill' ? (
                <>
                  <CheckCircle2 className="w-5 h-5 text-emerald-600" /> Fulfill redemption
                </>
              ) : (
                <>
                  <XCircle className="w-5 h-5 text-rose-600" /> Decline redemption
                </>
              )}
            </DialogTitle>
            <DialogDescription>
              {actionTarget?.user.name} · {actionTarget?.reward.name}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            {actionType === 'fulfill' && (
              <div className="space-y-2">
                <Label htmlFor="action-code">Fulfillment code</Label>
                <Input
                  id="action-code"
                  placeholder="Paste gift card code or tracking URL"
                  value={actionCode}
                  onChange={(e) => setActionCode(e.target.value)}
                  autoComplete="off"
                  spellCheck={false}
                />
                <p className="text-xs text-muted-foreground">
                  This code will be visible to the employee in their rewards history.
                </p>
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="action-notes">Notes</Label>
              <Textarea
                id="action-notes"
                placeholder="Optional internal note or message to the employee…"
                value={actionNotes}
                onChange={(e) => setActionNotes(e.target.value)}
                rows={3}
                maxLength={500}
              />
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setActionTarget(null)
                setActionType(null)
              }}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button
              onClick={handleActionSubmit}
              disabled={submitting}
              className={
                actionType === 'fulfill'
                  ? 'bg-emerald-600 hover:bg-emerald-700'
                  : 'bg-rose-600 hover:bg-rose-700'
              }
            >
              {submitting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : actionType === 'fulfill' ? (
                <CheckCircle2 className="w-4 h-4" />
              ) : (
                <XCircle className="w-4 h-4" />
              )}
              {actionType === 'fulfill' ? 'Mark as fulfilled' : 'Decline redemption'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function RedemptionRow({
  redemption,
  onApprove,
  onFulfill,
  onDecline,
}: {
  redemption: RedemptionItem
  onApprove: () => void
  onFulfill: () => void
  onDecline: () => void
}) {
  const statusMeta = REDEMPTION_STATUS_META[redemption.status] || REDEMPTION_STATUS_META.PENDING
  const tierMeta = TIER_META[redemption.tier] || TIER_META.PARTICIPATION
  const c = getColor(redemption.user.avatarColor || 'violet')
  const teamColor = redemption.user.team ? getColor(redemption.user.team.color) : null
  const StatusIcon = statusMeta.icon
  const TierIcon = tierMeta.icon

  return (
    <TableRow>
      <TableCell className="pl-6">
        <div className="flex items-center gap-3 min-w-0">
          <div
            className={`shrink-0 w-9 h-9 rounded-full bg-gradient-to-br ${c.gradient} text-white flex items-center justify-center text-xs font-semibold`}
          >
            {getInitials(redemption.user.name)}
          </div>
          <div className="min-w-0">
            <p className="font-medium truncate">{redemption.user.name}</p>
            <p className="text-xs text-muted-foreground truncate flex items-center gap-1">
              {teamColor && <span className={`w-1.5 h-1.5 rounded-full ${teamColor.dot}`} />}
              {redemption.user.team?.name || 'No team'}
            </p>
          </div>
        </div>
      </TableCell>
      <TableCell>
        <div className="flex items-center gap-2">
          <span
            className={`shrink-0 w-7 h-7 rounded-lg bg-gradient-to-br ${getColor(
              redemption.reward.imageColor || 'emerald',
            ).gradient} text-white flex items-center justify-center`}
          >
            <Gift className="w-3.5 h-3.5" />
          </span>
          <div className="min-w-0">
            <p className="text-sm font-medium truncate">{redemption.reward.name}</p>
            <p className="text-xs text-muted-foreground">
              {redemption.reward.value > 0 ? `$${redemption.reward.value}` : '—'}
            </p>
          </div>
        </div>
      </TableCell>
      <TableCell>
        <Badge className={tierMeta.badge}>
          <TierIcon className="w-3 h-3" /> {tierMeta.label}
        </Badge>
      </TableCell>
      <TableCell>
        <Badge className={statusMeta.badge}>
          <StatusIcon className="w-3 h-3" /> {statusMeta.label}
        </Badge>
      </TableCell>
      <TableCell className="text-xs font-mono">
        {redemption.code ? (
          <span className="truncate inline-block max-w-[10rem] align-bottom">
            {redemption.code}
          </span>
        ) : (
          <span className="text-muted-foreground">—</span>
        )}
      </TableCell>
      <TableCell className="text-xs text-muted-foreground tabular-nums">
        {format(new Date(redemption.redeemedAt), 'MMM d, yyyy')}
      </TableCell>
      <TableCell className="pr-6 text-right">
        <div className="flex items-center justify-end gap-1">
          {redemption.status === 'PENDING' && (
            <Button size="sm" variant="outline" onClick={onApprove} className="h-7 gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" /> Approve
            </Button>
          )}
          {redemption.status === 'APPROVED' && (
            <Button
              size="sm"
              onClick={onFulfill}
              className="h-7 gap-1 bg-emerald-600 hover:bg-emerald-700"
            >
              <Gift className="w-3.5 h-3.5" /> Fulfill
            </Button>
          )}
          {(redemption.status === 'PENDING' || redemption.status === 'APPROVED') && (
            <Button
              size="sm"
              variant="ghost"
              onClick={onDecline}
              className="h-7 text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/30"
            >
              <XCircle className="w-3.5 h-3.5" />
            </Button>
          )}
          {(redemption.status === 'FULFILLED' ||
            redemption.status === 'DECLINED' ||
            redemption.status === 'EXPIRED') && (
            <span className="text-xs text-muted-foreground">—</span>
          )}
        </div>
      </TableCell>
    </TableRow>
  )
}

function RedemptionMobileCard({
  redemption,
  onApprove,
  onFulfill,
  onDecline,
}: {
  redemption: RedemptionItem
  onApprove: () => void
  onFulfill: () => void
  onDecline: () => void
}) {
  const statusMeta = REDEMPTION_STATUS_META[redemption.status] || REDEMPTION_STATUS_META.PENDING
  const tierMeta = TIER_META[redemption.tier] || TIER_META.PARTICIPATION
  const c = getColor(redemption.user.avatarColor || 'violet')
  const StatusIcon = statusMeta.icon
  const TierIcon = tierMeta.icon

  return (
    <Card>
      <CardContent className="p-4 space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-3 min-w-0">
            <div
              className={`shrink-0 w-10 h-10 rounded-full bg-gradient-to-br ${c.gradient} text-white flex items-center justify-center text-sm font-semibold`}
            >
              {getInitials(redemption.user.name)}
            </div>
            <div className="min-w-0">
              <p className="font-medium truncate">{redemption.user.name}</p>
              <p className="text-xs text-muted-foreground truncate">
                {redemption.user.team?.name || 'No team'}
              </p>
            </div>
          </div>
          <Badge className={statusMeta.badge}>
            <StatusIcon className="w-3 h-3" /> {statusMeta.label}
          </Badge>
        </div>

        <div className="flex items-center gap-2 p-2.5 rounded-lg bg-muted/40">
          <span
            className={`shrink-0 w-8 h-8 rounded-lg bg-gradient-to-br ${getColor(
              redemption.reward.imageColor || 'emerald',
            ).gradient} text-white flex items-center justify-center`}
          >
            <Gift className="w-4 h-4" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium truncate">{redemption.reward.name}</p>
            <p className="text-xs text-muted-foreground">
              {redemption.reward.value > 0 ? `$${redemption.reward.value}` : '—'}
            </p>
          </div>
          <Badge className={tierMeta.badge}>
            <TierIcon className="w-3 h-3" /> {tierMeta.label}
          </Badge>
        </div>

        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>
            Redeemed {format(new Date(redemption.redeemedAt), 'MMM d, yyyy')}
          </span>
          {redemption.code && (
            <span className="font-mono truncate ml-2">
              Code: {redemption.code}
            </span>
          )}
        </div>

        {(redemption.status === 'PENDING' ||
          redemption.status === 'APPROVED') && (
          <div className="flex gap-2 pt-1">
            {redemption.status === 'PENDING' && (
              <Button
                size="sm"
                variant="outline"
                onClick={onApprove}
                className="flex-1 gap-1"
              >
                <CheckCircle2 className="w-3.5 h-3.5" /> Approve
              </Button>
            )}
            {redemption.status === 'APPROVED' && (
              <Button
                size="sm"
                onClick={onFulfill}
                className="flex-1 gap-1 bg-emerald-600 hover:bg-emerald-700"
              >
                <Gift className="w-3.5 h-3.5" /> Fulfill
              </Button>
            )}
            <Button
              size="sm"
              variant="ghost"
              onClick={onDecline}
              className="text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/30"
            >
              <XCircle className="w-3.5 h-3.5" /> Decline
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
