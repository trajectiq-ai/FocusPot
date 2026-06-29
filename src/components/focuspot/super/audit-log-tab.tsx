'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import {
  ScrollText,
  Search,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  User,
  Building2,
  Activity,
  Globe,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

type AuditEntry = {
  id: string
  userId: string | null
  action: string
  entityType: string
  entityId: string | null
  companyId: string | null
  metadata: Record<string, unknown>
  ipAddress: string
  createdAt: string
  user: { id: string; name: string; email: string; role: string } | null
  company: { id: string; name: string; domain: string } | null
}

type Pagination = {
  page: number
  pageSize: number
  total: number
  totalPages: number
  hasNext: boolean
  hasPrev: boolean
}

type Response = { data: AuditEntry[]; pagination: Pagination }

// Color-code actions by category prefix.
function actionTint(action: string): { tint: string; label: string } {
  const a = action.toUpperCase()
  if (a.includes('CREATE')) {
    return {
      tint: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300 border-emerald-200/60',
      label: action,
    }
  }
  if (a.includes('DELETE')) {
    return {
      tint: 'bg-rose-100 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300 border-rose-200/60',
      label: action,
    }
  }
  if (a.includes('UPDATE') || a.includes('PATCH') || a.includes('TOGGLE')) {
    return {
      tint: 'bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300 border-amber-200/60',
      label: action,
    }
  }
  if (a.includes('LOGIN') || a.includes('AUTH') || a.includes('LOGOUT')) {
    return {
      tint: 'bg-sky-100 text-sky-700 dark:bg-sky-950/50 dark:text-sky-300 border-sky-200/60',
      label: action,
    }
  }
  if (a.includes('CHALLENGE')) {
    return {
      tint: 'bg-violet-100 text-violet-700 dark:bg-violet-950/50 dark:text-violet-300 border-violet-200/60',
      label: action,
    }
  }
  return {
    tint: 'bg-muted text-muted-foreground border-border',
    label: action,
  }
}

function formatTimestamp(iso: string): { date: string; time: string; ago: string } {
  try {
    const d = new Date(iso)
    const date = d.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
    const time = d.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      second: '2-digit',
    })
    const diff = Date.now() - d.getTime()
    const mins = Math.floor(diff / 60000)
    let ago: string
    if (mins < 1) ago = 'just now'
    else if (mins < 60) ago = `${mins}m ago`
    else if (mins < 1440) ago = `${Math.floor(mins / 60)}h ago`
    else ago = `${Math.floor(mins / 1440)}d ago`
    return { date, time, ago }
  } catch {
    return { date: iso, time: '', ago: '' }
  }
}

export function AuditLogTab() {
  const [entries, setEntries] = useState<AuditEntry[]>([])
  const [pagination, setPagination] = useState<Pagination | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [actionFilter, setActionFilter] = useState<string>('ALL')
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const fetchEntries = useCallback(
    async (silent = false) => {
      if (!silent) setLoading(true)
      setRefreshing(true)
      try {
        const params = new URLSearchParams({
          page: String(page),
          pageSize: '25',
        })
        if (search.trim()) params.set('search', search.trim())
        if (actionFilter !== 'ALL') params.set('action', actionFilter)
        const res = await fetch(`/api/super/audit-log?${params.toString()}`, {
          cache: 'no-store',
        })
        if (!res.ok) throw new Error('Failed to load audit log')
        const json = (await res.json()) as Response
        setEntries(json.data ?? [])
        setPagination(json.pagination ?? null)
      } catch (e) {
        const msg = e instanceof Error ? e.message : 'Failed to load'
        if (silent) toast.error(msg)
      } finally {
        setLoading(false)
        setRefreshing(false)
      }
    },
    [page, search, actionFilter],
  )

  useEffect(() => {
    fetchEntries()
  }, [fetchEntries])

  // Debounce search by 350ms
  useEffect(() => {
    const t = setTimeout(() => {
      if (page !== 1) setPage(1)
      else fetchEntries(true)
    }, 350)
    return () => clearTimeout(t)
  }, [search, page, fetchEntries])

  const handleActionFilterChange = (v: string) => {
    setActionFilter(v)
    setPage(1)
  }

  const stats = useMemo(() => {
    if (!pagination) return { total: 0, page: 1, totalPages: 0 }
    return {
      total: pagination.total,
      page: pagination.page,
      totalPages: pagination.totalPages,
    }
  }, [pagination])

  return (
    <div className="space-y-6">
      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={ScrollText}
          label="Total events"
          value={stats.total}
          tint="bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300"
        />
        <StatCard
          icon={Activity}
          label="Current page"
          value={stats.page}
          tint="bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300"
        />
        <StatCard
          icon={ChevronRight}
          label="Total pages"
          value={stats.totalPages}
          tint="bg-violet-100 text-violet-700 dark:bg-violet-950/50 dark:text-violet-300"
        />
        <StatCard
          icon={Globe}
          label="Page size"
          value={25}
          tint="bg-sky-100 text-sky-700 dark:bg-sky-950/50 dark:text-sky-300"
        />
      </div>

      {/* Toolbar */}
      <Card className="p-4">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search actions or entity types…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 h-9"
            />
          </div>
          <Select value={actionFilter} onValueChange={handleActionFilterChange}>
            <SelectTrigger className="w-full sm:w-52 h-9">
              <SelectValue placeholder="Filter by action" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All actions</SelectItem>
              <SelectItem value="CREATE">Create</SelectItem>
              <SelectItem value="UPDATE">Update</SelectItem>
              <SelectItem value="DELETE">Delete</SelectItem>
              <SelectItem value="LOGIN">Login</SelectItem>
              <SelectItem value="CHALLENGE">Challenge</SelectItem>
              <SelectItem value="FEATURE_FLAG">Feature flag</SelectItem>
              <SelectItem value="ANNOUNCEMENT">Announcement</SelectItem>
            </SelectContent>
          </Select>
          <Button
            variant="outline"
            size="icon"
            className="h-9 w-9 shrink-0"
            onClick={() => fetchEntries(true)}
            disabled={refreshing}
            aria-label="Refresh"
          >
            <RefreshCw className={cn('w-4 h-4', refreshing && 'animate-spin')} />
          </Button>
        </div>
      </Card>

      {/* Audit table */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <ScrollText className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            Platform audit log
            <span className="text-xs font-normal text-muted-foreground">
              (page {stats.page} of {Math.max(1, stats.totalPages)} · {stats.total} events)
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-6 space-y-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : entries.length === 0 ? (
            <div className="p-10 text-center text-sm text-muted-foreground">
              <ScrollText className="w-8 h-8 mx-auto mb-2 opacity-40" />
              No audit entries match your filters.
            </div>
          ) : (
            <div className="overflow-x-auto scrollbar-thin">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="min-w-[160px]">Timestamp</TableHead>
                    <TableHead className="min-w-[180px]">User</TableHead>
                    <TableHead className="min-w-[180px]">Action</TableHead>
                    <TableHead className="min-w-[120px]">Entity</TableHead>
                    <TableHead className="min-w-[140px]">Company</TableHead>
                    <TableHead className="min-w-[100px]">IP</TableHead>
                    <TableHead className="text-right">Details</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {entries.map((entry, i) => {
                    const ts = formatTimestamp(entry.createdAt)
                    const at = actionTint(entry.action)
                    const isExpanded = expandedId === entry.id
                    return (
                      <motion.tr
                        key={entry.id}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: i * 0.02 }}
                        className="cursor-pointer hover:bg-muted/40 transition-colors"
                        onClick={() =>
                          setExpandedId(isExpanded ? null : entry.id)
                        }
                      >
                        <TableCell>
                          <div className="font-medium text-xs">{ts.date}</div>
                          <div className="text-[11px] text-muted-foreground">
                            {ts.time} · {ts.ago}
                          </div>
                        </TableCell>
                        <TableCell>
                          {entry.user ? (
                            <div className="flex items-center gap-2 min-w-0">
                              <div className="w-6 h-6 rounded-full bg-emerald-100 dark:bg-emerald-950/50 flex items-center justify-center shrink-0">
                                <User className="w-3 h-3 text-emerald-600" />
                              </div>
                              <div className="min-w-0">
                                <div className="text-xs font-medium truncate">
                                  {entry.user.name}
                                </div>
                                <div className="text-[11px] text-muted-foreground truncate">
                                  {entry.user.email}
                                </div>
                              </div>
                            </div>
                          ) : (
                            <span className="text-[11px] text-muted-foreground italic">
                              System
                            </span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={cn('text-[10px] py-0 h-5 font-mono', at.tint)}
                          >
                            {at.label}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="text-xs font-medium">{entry.entityType}</div>
                          {entry.entityId && (
                            <div className="text-[11px] text-muted-foreground font-mono truncate max-w-[140px]">
                              {entry.entityId.slice(-8)}
                            </div>
                          )}
                        </TableCell>
                        <TableCell>
                          {entry.company ? (
                            <div className="flex items-center gap-1.5 min-w-0">
                              <Building2 className="w-3 h-3 text-muted-foreground shrink-0" />
                              <span className="text-xs truncate">{entry.company.name}</span>
                            </div>
                          ) : (
                            <span className="text-[11px] text-muted-foreground italic">
                              Platform
                            </span>
                          )}
                        </TableCell>
                        <TableCell>
                          {entry.ipAddress ? (
                            <span className="text-[11px] font-mono text-muted-foreground">
                              {entry.ipAddress}
                            </span>
                          ) : (
                            <span className="text-[11px] text-muted-foreground/50">—</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          {Object.keys(entry.metadata).length > 0 ? (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 px-2"
                              onClick={(e) => {
                                e.stopPropagation()
                                setExpandedId(isExpanded ? null : entry.id)
                              }}
                            >
                              {isExpanded ? (
                                <ChevronUp className="w-3.5 h-3.5" />
                              ) : (
                                <ChevronDown className="w-3.5 h-3.5" />
                              )}
                              <span className="ml-1 text-xs">
                                {Object.keys(entry.metadata).length}
                              </span>
                            </Button>
                          ) : (
                            <span className="text-[11px] text-muted-foreground/50">—</span>
                          )}
                        </TableCell>
                      </motion.tr>
                    )
                  })}
                  {/* Expanded metadata row */}
                  {expandedId &&
                    entries
                      .filter((e) => e.id === expandedId)
                      .map((entry) => (
                        <TableRow key={`${entry.id}-meta`} className="bg-muted/30">
                          <TableCell colSpan={7} className="p-4">
                            <div className="space-y-2">
                              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                                Metadata
                              </p>
                              <pre className="text-xs font-mono bg-background border border-border/60 rounded-lg p-3 overflow-x-auto scrollbar-thin">
                                {JSON.stringify(entry.metadata, null, 2)}
                              </pre>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pagination */}
      {pagination && pagination.totalPages > 1 && (
        <div className="flex items-center justify-between gap-3">
          <p className="text-xs text-muted-foreground">
            Showing {(pagination.page - 1) * pagination.pageSize + 1}–
            {Math.min(pagination.page * pagination.pageSize, pagination.total)} of{' '}
            {pagination.total}
          </p>
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={!pagination.hasPrev || loading}
              className="h-8"
            >
              <ChevronLeft className="w-4 h-4 mr-1" />
              Prev
            </Button>
            <span className="text-xs text-muted-foreground px-2">
              {pagination.page} / {pagination.totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => p + 1)}
              disabled={!pagination.hasNext || loading}
              className="h-8"
            >
              Next
              <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}

function StatCard({
  icon: Icon,
  label,
  value,
  tint,
}: {
  icon: typeof ScrollText
  label: string
  value: number
  tint: string
}) {
  return (
    <Card className="p-4">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            {label}
          </p>
          <p className="text-2xl font-bold tabular-nums mt-1">{value}</p>
        </div>
        <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center shrink-0', tint)}>
          <Icon className="w-4 h-4" />
        </div>
      </div>
    </Card>
  )
}
