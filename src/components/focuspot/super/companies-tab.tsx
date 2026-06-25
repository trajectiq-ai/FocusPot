'use client'

import { useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import {
  Search,
  Eye,
  MoreHorizontal,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  ArrowUpCircle,
  ArrowDownCircle,
  Building2,
  Users,
  Loader2,
  ArrowUpDown,
} from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import type { CompanyRow, Plan, SubscriptionStatus } from './types'
import {
  PlanBadge,
  StatusBadge,
  UtilizationBar,
  formatCurrency,
  formatNumber,
  formatDate,
} from './helpers'

type SortKey = 'revenue' | 'employees'

export function CompaniesTab({
  companies,
  onRefresh,
}: {
  companies: CompanyRow[]
  onRefresh: () => void
}) {
  const [query, setQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<SubscriptionStatus | 'ALL'>('ALL')
  const [sortKey, setSortKey] = useState<SortKey>('revenue')
  const [viewingId, setViewingId] = useState<string | null>(null)
  const [patchingId, setPatchingId] = useState<string | null>(null)

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    let list = companies.filter((c) => {
      const matchesQuery =
        !q ||
        c.name.toLowerCase().includes(q) ||
        c.domain.toLowerCase().includes(q)
      const matchesStatus =
        statusFilter === 'ALL' || c.subscriptionStatus === statusFilter
      return matchesQuery && matchesStatus
    })
    list = [...list].sort((a, b) =>
      sortKey === 'revenue'
        ? b.monthlyRevenue - a.monthlyRevenue
        : b.employeeCount - a.employeeCount,
    )
    return list
  }, [companies, query, statusFilter, sortKey])

  const totalRevenue = filtered.reduce((s, c) => s + c.monthlyRevenue, 0)

  const handleViewAs = async (c: CompanyRow) => {
    setViewingId(c.id)
    try {
      const res = await fetch('/api/super/login-as', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ companyId: c.id }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to switch')
      toast.success(`Now viewing as ${data.user.name}`, {
        description: `Impersonating the admin of ${c.name}`,
      })
      // Brief delay so the toast is visible, then reload to re-route.
      setTimeout(() => window.location.reload(), 700)
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Failed to switch'
      toast.error(msg)
      setViewingId(null)
    }
  }

  const handlePatch = async (
    c: CompanyRow,
    patch: { subscriptionStatus?: SubscriptionStatus; plan?: Plan },
    label: string,
  ) => {
    setPatchingId(c.id)
    try {
      const res = await fetch(`/api/super/companies/${c.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patch),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Update failed')
      toast.success(`${label} — ${c.name}`, {
        description: 'Subscription updated (Stripe webhook simulated).',
      })
      onRefresh()
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Update failed'
      toast.error(msg)
    } finally {
      setPatchingId(null)
    }
  }

  const statusFilters: { key: SubscriptionStatus | 'ALL'; label: string }[] = [
    { key: 'ALL', label: 'All' },
    { key: 'ACTIVE', label: 'Active' },
    { key: 'PAST_DUE', label: 'Past Due' },
    { key: 'CANCELED', label: 'Canceled' },
  ]

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by name or domain…"
            className="pl-9 h-9"
          />
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1 p-0.5 rounded-lg bg-muted">
            {statusFilters.map((f) => (
              <button
                key={f.key}
                onClick={() => setStatusFilter(f.key)}
                className={cn(
                  'px-2.5 py-1 rounded-md text-xs font-medium transition-colors',
                  statusFilter === f.key
                    ? 'bg-background text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground',
                )}
              >
                {f.label}
              </button>
            ))}
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              setSortKey((k) => (k === 'revenue' ? 'employees' : 'revenue'))
            }
            className="h-8 gap-1.5"
          >
            <ArrowUpDown className="w-3.5 h-3.5" />
            Sort by {sortKey === 'revenue' ? 'Revenue' : 'Employees'}
          </Button>
        </div>
      </div>

      {/* Summary strip */}
      <div className="flex items-center justify-between text-xs text-muted-foreground px-1">
        <span>
          Showing <span className="font-semibold text-foreground">{filtered.length}</span>{' '}
          of {companies.length} companies
        </span>
        <span>
          Filtered MRR:{' '}
          <span className="font-semibold text-emerald-600 dark:text-emerald-400">
            {formatCurrency(totalRevenue)}/mo
          </span>
        </span>
      </div>

      {/* Desktop table */}
      <Card className="border-border/60 hidden md:block overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/40 hover:bg-muted/40">
              <TableHead className="pl-4">Company</TableHead>
              <TableHead>Plan</TableHead>
              <TableHead>Employees</TableHead>
              <TableHead className="text-right">MRR</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Joined</TableHead>
              <TableHead className="text-right pr-4">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((c) => (
              <TableRow key={c.id} className="group">
                <TableCell className="pl-4">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white text-xs font-semibold shrink-0">
                      {c.name.slice(0, 2).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium text-sm truncate">{c.name}</p>
                      <p className="text-xs text-muted-foreground truncate">
                        {c.domain}
                      </p>
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <PlanBadge plan={c.plan} />
                </TableCell>
                <TableCell>
                  <div className="flex flex-col gap-1">
                    <span className="text-sm tabular-nums">
                      {formatNumber(c.employeeCount)}{' '}
                      <span className="text-muted-foreground text-xs">
                        / {formatNumber(c.seats)}
                      </span>
                    </span>
                    <UtilizationBar value={c.utilization} />
                  </div>
                </TableCell>
                <TableCell className="text-right font-semibold tabular-nums">
                  {formatCurrency(c.monthlyRevenue)}
                </TableCell>
                <TableCell>
                  <StatusBadge status={c.subscriptionStatus} />
                </TableCell>
                <TableCell className="text-xs text-muted-foreground">
                  {formatDate(c.createdAt)}
                </TableCell>
                <TableCell className="pr-4">
                  <div className="flex items-center justify-end gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-8 gap-1.5"
                      onClick={() => handleViewAs(c)}
                      disabled={viewingId === c.id || patchingId === c.id}
                    >
                      {viewingId === c.id ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Eye className="w-3.5 h-3.5" />
                      )}
                      View as Admin
                    </Button>
                    <ManageMenu
                      company={c}
                      disabled={patchingId === c.id || viewingId === c.id}
                      loading={patchingId === c.id}
                      onPatch={handlePatch}
                    />
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {filtered.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-sm text-muted-foreground py-12">
                  No companies match your filters.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Card>

      {/* Mobile cards */}
      <div className="md:hidden grid grid-cols-1 gap-3">
        {filtered.map((c) => (
          <motion.div
            key={c.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <Card className="border-border/60">
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white text-xs font-semibold shrink-0">
                      {c.name.slice(0, 2).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold text-sm truncate">{c.name}</p>
                      <p className="text-xs text-muted-foreground truncate">
                        {c.domain}
                      </p>
                    </div>
                  </div>
                  <StatusBadge status={c.subscriptionStatus} />
                </div>

                <div className="grid grid-cols-3 gap-2 mt-3 text-center">
                  <div className="rounded-lg bg-muted/50 py-2">
                    <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Plan</p>
                    <div className="mt-1 flex justify-center">
                      <PlanBadge plan={c.plan} />
                    </div>
                  </div>
                  <div className="rounded-lg bg-muted/50 py-2">
                    <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Seats</p>
                    <p className="text-sm font-semibold tabular-nums mt-1">
                      {c.employeeCount}/{c.seats}
                    </p>
                  </div>
                  <div className="rounded-lg bg-muted/50 py-2">
                    <p className="text-[10px] uppercase tracking-wide text-muted-foreground">MRR</p>
                    <p className="text-sm font-semibold tabular-nums mt-1 text-emerald-600 dark:text-emerald-400">
                      {formatCurrency(c.monthlyRevenue)}
                    </p>
                  </div>
                </div>

                <div className="mt-3">
                  <UtilizationBar value={c.utilization} />
                </div>

                <div className="flex items-center gap-2 mt-3">
                  <Button
                    size="sm"
                    variant="outline"
                    className="flex-1 h-9 gap-1.5"
                    onClick={() => handleViewAs(c)}
                    disabled={viewingId === c.id || patchingId === c.id}
                  >
                    {viewingId === c.id ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Eye className="w-3.5 h-3.5" />
                    )}
                    View as Admin
                  </Button>
                  <ManageMenu
                    company={c}
                    disabled={patchingId === c.id || viewingId === c.id}
                    loading={patchingId === c.id}
                    onPatch={handlePatch}
                  />
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
        {filtered.length === 0 && (
          <Card className="border-border/60">
            <CardContent className="p-8 text-center text-sm text-muted-foreground">
              <Building2 className="w-6 h-6 mx-auto mb-2 opacity-50" />
              No companies match your filters.
            </CardContent>
          </Card>
        )}
      </div>

      {/* Footer hint */}
      <p className="text-[11px] text-muted-foreground px-1">
        <Users className="w-3 h-3 inline -mt-0.5 mr-1" />
        &ldquo;View as Admin&rdquo; impersonates that company&apos;s admin and reloads the dashboard.
        Manage actions simulate Stripe webhook events.
      </p>
    </div>
  )
}

function ManageMenu({
  company,
  disabled,
  loading,
  onPatch,
}: {
  company: CompanyRow
  disabled: boolean
  loading: boolean
  onPatch: (
    c: CompanyRow,
    patch: { subscriptionStatus?: SubscriptionStatus; plan?: Plan },
    label: string,
  ) => void
}) {
  const isStarter = company.plan === 'STARTER'
  const isCanceled = company.subscriptionStatus === 'CANCELED'

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          size="sm"
          variant="ghost"
          className="h-8 w-8 p-0"
          disabled={disabled}
          aria-label="Manage subscription"
        >
          {loading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <MoreHorizontal className="w-4 h-4" />
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-52">
        <DropdownMenuLabel className="text-xs text-muted-foreground">
          Subscription
        </DropdownMenuLabel>
        <DropdownMenuItem
          onClick={() =>
            onPatch(company, { subscriptionStatus: 'ACTIVE' }, 'Activated')
          }
          disabled={company.subscriptionStatus === 'ACTIVE'}
          className="cursor-pointer gap-2"
        >
          <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          Activate
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() =>
            onPatch(company, { subscriptionStatus: 'PAST_DUE' }, 'Marked Past Due')
          }
          disabled={company.subscriptionStatus === 'PAST_DUE'}
          className="cursor-pointer gap-2"
        >
          <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400" />
          Mark Past Due
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() =>
            onPatch(company, { subscriptionStatus: 'CANCELED' }, 'Canceled')
          }
          disabled={isCanceled}
          className="cursor-pointer gap-2 text-rose-600 dark:text-rose-400 focus:text-rose-700 dark:focus:text-rose-300"
        >
          <XCircle className="w-4 h-4" />
          Cancel
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuLabel className="text-xs text-muted-foreground">
          Plan
        </DropdownMenuLabel>
        <DropdownMenuItem
          onClick={() =>
            onPatch(company, { plan: 'GROWTH', subscriptionStatus: 'ACTIVE' }, 'Upgraded to Growth')
          }
          disabled={!isStarter}
          className="cursor-pointer gap-2"
        >
          <ArrowUpCircle className="w-4 h-4 text-violet-600 dark:text-violet-400" />
          Upgrade to Growth
          <Badge variant="secondary" className="ml-auto text-[10px] py-0 px-1.5">
            $199
          </Badge>
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() =>
            onPatch(company, { plan: 'STARTER', subscriptionStatus: 'ACTIVE' }, 'Downgraded to Starter')
          }
          disabled={isStarter}
          className="cursor-pointer gap-2"
        >
          <ArrowDownCircle className="w-4 h-4 text-amber-600 dark:text-amber-400" />
          Downgrade to Starter
          <Badge variant="secondary" className="ml-auto text-[10px] py-0 px-1.5">
            $99
          </Badge>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
