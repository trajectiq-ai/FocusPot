'use client'

// Company Admin → Audit Log tab
// Paginated timeline of all admin actions for compliance.
// Filter by action + free-text search. Shows user, action, entity, IP, timestamp.

import { useCallback, useEffect, useMemo, useState } from 'react'
import { format } from 'date-fns'
import {
  ScrollText,
  Loader2,
  Search,
  RefreshCw,
  Shield,
  History,
  Filter,
  User,
  Globe,
  FileText,
} from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { getColor, getInitials } from '@/lib/colors'
import type { AuditLogItem, PaginatedAuditLog } from './types'

// Common actions produced by the FocusPot backend (audit.ts + route handlers).
// Used to populate the action filter dropdown. Custom actions still searchable.
const COMMON_ACTIONS = [
  'CHALLENGE_CREATED',
  'CHALLENGE_UPDATED',
  'CHALLENGE_CANCELLED',
  'CHALLENGE_DUPLICATED',
  'CHALLENGE_ARCHIVED',
  'CHALLENGE_DELETED',
  'CHALLENGE_ENDED',
  'REWARD_CREATED',
  'REWARD_UPDATED',
  'REWARD_DELETED',
  'REDEMPTION_UPDATED',
  'EMPLOYEES_IMPORTED',
  'EMPLOYEE_CREATED',
  'EMPLOYEE_UPDATED',
  'EMPLOYEE_DELETED',
  'TEAM_CREATED',
  'TEAM_UPDATED',
  'TEAM_DELETED',
  'INVITATION_CREATED',
  'INVITATION_REVOKED',
  'COMPANY_SETTINGS_UPDATED',
  'LOGIN_SUCCESS',
  'LOGIN_FAILED',
]

// Action → badge color (semantic). Defaults to muted.
function actionBadgeClass(action: string): string {
  const a = action.toUpperCase()
  if (a.includes('CREATED') || a.includes('ADDED') || a.includes('IMPORTED'))
    return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300'
  if (a.includes('UPDATED') || a.includes('APPROVED') || a.includes('DUPLICATED'))
    return 'bg-sky-100 text-sky-700 dark:bg-sky-950/50 dark:text-sky-300'
  if (a.includes('DELETED') || a.includes('CANCELLED') || a.includes('DECLINED') || a.includes('REVOKED') || a.includes('FAILED'))
    return 'bg-rose-100 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300'
  if (a.includes('ARCHIVED') || a.includes('ENDED') || a.includes('FULFILLED'))
    return 'bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300'
  if (a.includes('LOGIN') || a.includes('SUCCESS'))
    return 'bg-violet-100 text-violet-700 dark:bg-violet-950/50 dark:text-violet-300'
  return 'bg-muted text-muted-foreground'
}

// ============================================================
// Main AuditLogTab
// ============================================================

export function AuditLogTab() {
  const [data, setData] = useState<AuditLogItem[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)
  const [actionFilter, setActionFilter] = useState<string>('all')
  const [search, setSearch] = useState('')
  const [searchDebounced, setSearchDebounced] = useState('')

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => {
      setSearchDebounced(search)
      setPage(1)
    }, 350)
    return () => clearTimeout(t)
  }, [search])

  const fetchLogs = useCallback(
    async (silent = false) => {
      if (silent) setRefreshing(true)
      else setLoading(true)
      setError(null)
      try {
        const params = new URLSearchParams({ page: String(page), pageSize: '25' })
        if (actionFilter !== 'all') params.set('action', actionFilter)
        if (searchDebounced) params.set('search', searchDebounced)
        const res = await fetch(`/api/admin/audit-log?${params.toString()}`, {
          cache: 'no-store',
        })
        const j = await res.json().catch(() => ({}))
        if (!res.ok) throw new Error(j.error || 'Failed to load audit log')
        const parsed = j as PaginatedAuditLog
        setData(parsed.data)
        setTotalPages(parsed.pagination.totalPages || 1)
        setTotal(parsed.pagination.total)
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to load audit log')
      } finally {
        setLoading(false)
        setRefreshing(false)
      }
    },
    [page, actionFilter, searchDebounced],
  )

  useEffect(() => {
    fetchLogs(false)
  }, [fetchLogs])

  useEffect(() => {
    setPage(1)
  }, [actionFilter])

  // Available actions for the filter dropdown — combine common list with any
  // actions already seen in the loaded data (so admin can filter on custom ones too).
  const actionOptions = useMemo(() => {
    const seen = new Set<string>(COMMON_ACTIONS)
    for (const log of data) seen.add(log.action)
    return Array.from(seen).sort()
  }, [data])

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold tracking-tight flex items-center gap-2">
            <ScrollText className="w-5 h-5 text-amber-500" /> Audit Log
          </h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            A chronological timeline of every admin action — for compliance and security review.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => fetchLogs(true)}
          disabled={refreshing}
          className="gap-1.5"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
          <span className="hidden sm:inline">Refresh</span>
        </Button>
      </div>

      {/* Compliance banner */}
      <div className="flex items-start gap-2.5 p-4 rounded-xl border border-emerald-200/70 dark:border-emerald-800/50 bg-emerald-50/60 dark:bg-emerald-950/20">
        <Shield className="w-5 h-5 text-emerald-600 dark:text-emerald-400 mt-0.5 shrink-0" />
        <div className="text-sm">
          <p className="font-semibold text-emerald-900 dark:text-emerald-100">
            Immutable activity record
          </p>
          <p className="text-xs text-emerald-800/80 dark:text-emerald-200/70 mt-0.5">
            Every privileged action (challenge lifecycle, reward edits, employee management,
            settings changes) is logged with the actor, IP address, and timestamp. Logs are
            scoped to your company.
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by action or entity type…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={actionFilter} onValueChange={setActionFilter}>
          <SelectTrigger className="w-full sm:w-64">
            <Filter className="w-3.5 h-3.5 mr-1.5 shrink-0" />
            <SelectValue placeholder="Filter by action" />
          </SelectTrigger>
          <SelectContent className="max-h-72">
            <SelectItem value="all">All actions</SelectItem>
            {actionOptions.map((a) => (
              <SelectItem key={a} value={a}>
                {a}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Body */}
      {loading ? (
        <Card>
          <CardContent className="py-12 flex items-center justify-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="w-4 h-4 animate-spin" /> Loading audit log…
          </CardContent>
        </Card>
      ) : error ? (
        <Card className="border-rose-200 dark:border-rose-800/50">
          <CardContent className="py-10 text-center">
            <p className="text-sm text-rose-600 dark:text-rose-400">{error}</p>
            <Button variant="outline" size="sm" className="mt-3" onClick={() => fetchLogs(false)}>
              Try again
            </Button>
          </CardContent>
        </Card>
      ) : data.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-12 text-center">
            <History className="w-10 h-10 mx-auto text-muted-foreground/50 mb-2" />
            <p className="text-sm font-medium">No audit entries found</p>
            <p className="text-xs text-muted-foreground mt-1">
              {search || actionFilter !== 'all'
                ? 'Try adjusting your filters.'
                : 'Activity will appear here as your team uses FocusPot.'}
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
                      <TableHead className="pl-6">Timestamp</TableHead>
                      <TableHead>User</TableHead>
                      <TableHead>Action</TableHead>
                      <TableHead>Entity</TableHead>
                      <TableHead>IP address</TableHead>
                      <TableHead className="pr-6">Details</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.map((log) => (
                      <AuditLogRow key={log.id} log={log} />
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          {/* Mobile cards */}
          <div className="md:hidden grid grid-cols-1 gap-3">
            {data.map((log) => (
              <AuditLogMobileCard key={log.id} log={log} />
            ))}
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between gap-3 pt-2">
            <p className="text-xs text-muted-foreground">
              {total} entr{total === 1 ? 'y' : 'ies'} · page {page} of {totalPages}
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
    </div>
  )
}

// ============================================================
// Row + mobile card
// ============================================================

function parseMetadata(raw: string): Record<string, unknown> | null {
  if (!raw || raw === '{}') return null
  try {
    return JSON.parse(raw) as Record<string, unknown>
  } catch {
    return null
  }
}

function AuditLogRow({ log }: { log: AuditLogItem }) {
  const meta = useMemo(() => parseMetadata(log.metadata), [log.metadata])
  const userColor = getColor('violet')
  const created = new Date(log.createdAt)

  return (
    <TableRow>
      <TableCell className="pl-6 text-xs text-muted-foreground tabular-nums whitespace-nowrap">
        <div>{format(created, 'MMM d, yyyy')}</div>
        <div className="font-medium text-foreground">{format(created, 'h:mm:ss a')}</div>
      </TableCell>
      <TableCell>
        {log.user ? (
          <div className="flex items-center gap-2 min-w-0">
            <div
              className={`shrink-0 w-7 h-7 rounded-full bg-gradient-to-br ${userColor.gradient} text-white flex items-center justify-center text-[10px] font-semibold`}
            >
              {getInitials(log.user.name)}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium truncate">{log.user.name}</p>
              <p className="text-xs text-muted-foreground truncate">{log.user.email}</p>
            </div>
          </div>
        ) : (
          <span className="text-xs text-muted-foreground italic">System</span>
        )}
      </TableCell>
      <TableCell>
        <Badge className={actionBadgeClass(log.action)}>{log.action}</Badge>
      </TableCell>
      <TableCell>
        <div className="flex items-center gap-1.5 text-xs">
          <FileText className="w-3 h-3 text-muted-foreground" />
          <span className="font-medium">{log.entityType}</span>
          {log.entityId && (
            <span className="text-muted-foreground font-mono truncate max-w-[8rem]">
              #{log.entityId.slice(-6)}
            </span>
          )}
        </div>
      </TableCell>
      <TableCell className="text-xs font-mono text-muted-foreground">
        {log.ipAddress || '—'}
      </TableCell>
      <TableCell className="pr-6 text-xs text-muted-foreground">
        {meta ? (
          <MetadataPreview meta={meta} />
        ) : (
          <span className="text-muted-foreground">—</span>
        )}
      </TableCell>
    </TableRow>
  )
}

function AuditLogMobileCard({ log }: { log: AuditLogItem }) {
  const meta = useMemo(() => parseMetadata(log.metadata), [log.metadata])
  const userColor = getColor('violet')
  const created = new Date(log.createdAt)

  return (
    <Card>
      <CardContent className="p-4 space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            {log.user ? (
              <>
                <div
                  className={`shrink-0 w-9 h-9 rounded-full bg-gradient-to-br ${userColor.gradient} text-white flex items-center justify-center text-xs font-semibold`}
                >
                  {getInitials(log.user.name)}
                </div>
                <div className="min-w-0">
                  <p className="font-medium truncate">{log.user.name}</p>
                  <p className="text-xs text-muted-foreground truncate flex items-center gap-1">
                    <User className="w-3 h-3" /> {log.user.email}
                  </p>
                </div>
              </>
            ) : (
              <div className="flex items-center gap-2">
                <div className="shrink-0 w-9 h-9 rounded-full bg-muted flex items-center justify-center">
                  <User className="w-4 h-4 text-muted-foreground" />
                </div>
                <p className="text-sm italic text-muted-foreground">System</p>
              </div>
            )}
          </div>
          <Badge className={actionBadgeClass(log.action)}>{log.action}</Badge>
        </div>

        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="flex items-center gap-1.5">
            <History className="w-3 h-3 text-muted-foreground" />
            <span className="text-muted-foreground">{format(created, 'MMM d, h:mm a')}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <FileText className="w-3 h-3 text-muted-foreground" />
            <span className="font-medium">{log.entityType}</span>
            {log.entityId && (
              <span className="text-muted-foreground font-mono">#{log.entityId.slice(-6)}</span>
            )}
          </div>
        </div>

        {log.ipAddress && (
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Globe className="w-3 h-3" />
            <span className="font-mono">{log.ipAddress}</span>
          </div>
        )}

        {meta && <MetadataPreview meta={meta} />}
      </CardContent>
    </Card>
  )
}

function MetadataPreview({ meta }: { meta: Record<string, unknown> }) {
  // Render a compact, single-line summary of the most relevant metadata keys.
  const entries = Object.entries(meta).slice(0, 3)
  if (entries.length === 0) return null
  return (
    <div className="flex flex-wrap gap-1.5 max-w-md">
      {entries.map(([k, v]) => (
        <Badge key={k} variant="outline" className="text-[10px] gap-1 font-normal">
          <span className="text-muted-foreground">{k}:</span>
          <span className="font-mono truncate max-w-[8rem]">{String(v)}</span>
        </Badge>
      ))}
    </div>
  )
}
