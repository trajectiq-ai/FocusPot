'use client'

import { useCallback, useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import {
  Flag,
  Plus,
  Trash2,
  Loader2,
  Globe,
  Building2,
  RefreshCw,
  Search,
  CheckCircle2,
  XCircle,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
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
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

type Flag = {
  id: string
  key: string
  name: string
  description: string
  enabled: boolean
  scope: 'GLOBAL' | 'COMPANY'
  companyId: string | null
  company: { id: string; name: string; domain: string } | null
  createdAt: string
  updatedAt: string
}

type Response = { data: Flag[]; pagination: unknown } | Flag[]

function asList(r: Response): Flag[] {
  if (Array.isArray(r)) return r
  return r.data ?? []
}

export function FeatureFlagsTab() {
  const [flags, setFlags] = useState<Flag[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [query, setQuery] = useState('')
  const [scopeFilter, setScopeFilter] = useState<'ALL' | 'GLOBAL' | 'COMPANY'>('ALL')
  const [createOpen, setCreateOpen] = useState(false)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [pendingToggleId, setPendingToggleId] = useState<string | null>(null)

  const fetchFlags = useCallback(async (silent = false) => {
    if (!silent) setLoading(true)
    setRefreshing(true)
    try {
      const res = await fetch('/api/super/feature-flags?pageSize=100', { cache: 'no-store' })
      if (!res.ok) throw new Error('Failed to load feature flags')
      const json = (await res.json()) as Response
      setFlags(asList(json))
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Failed to load'
      if (silent) toast.error(msg)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => {
    fetchFlags()
  }, [fetchFlags])

  const filtered = flags.filter((f) => {
    const q = query.trim().toLowerCase()
    const matchesQuery =
      !q ||
      f.key.toLowerCase().includes(q) ||
      f.name.toLowerCase().includes(q) ||
      f.description.toLowerCase().includes(q)
    const matchesScope = scopeFilter === 'ALL' || f.scope === scopeFilter
    return matchesQuery && matchesScope
  })

  const handleToggle = async (flag: Flag, nextEnabled: boolean) => {
    setPendingToggleId(flag.id)
    // Optimistic
    setFlags((prev) =>
      prev.map((f) => (f.id === flag.id ? { ...f, enabled: nextEnabled } : f)),
    )
    try {
      const res = await fetch(`/api/super/feature-flags/${flag.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled: nextEnabled }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || 'Failed to update flag')
      }
      toast.success(`${flag.name} ${nextEnabled ? 'enabled' : 'disabled'}`)
    } catch (e) {
      // Roll back
      setFlags((prev) =>
        prev.map((f) => (f.id === flag.id ? { ...f, enabled: flag.enabled } : f)),
      )
      const msg = e instanceof Error ? e.message : 'Failed to update'
      toast.error(msg)
    } finally {
      setPendingToggleId(null)
    }
  }

  const handleDelete = async () => {
    if (!deleteId) return
    setDeleting(true)
    try {
      const res = await fetch(`/api/super/feature-flags/${deleteId}`, { method: 'DELETE' })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || 'Failed to delete flag')
      }
      setFlags((prev) => prev.filter((f) => f.id !== deleteId))
      toast.success('Feature flag deleted')
      setDeleteId(null)
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Failed to delete'
      toast.error(msg)
    } finally {
      setDeleting(false)
    }
  }

  const stats = {
    total: flags.length,
    enabled: flags.filter((f) => f.enabled).length,
    global: flags.filter((f) => f.scope === 'GLOBAL').length,
    company: flags.filter((f) => f.scope === 'COMPANY').length,
  }

  return (
    <div className="space-y-6">
      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={Flag}
          label="Total flags"
          value={stats.total}
          tint="bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300"
        />
        <StatCard
          icon={CheckCircle2}
          label="Enabled"
          value={stats.enabled}
          tint="bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300"
        />
        <StatCard
          icon={Globe}
          label="Global"
          value={stats.global}
          tint="bg-violet-100 text-violet-700 dark:bg-violet-950/50 dark:text-violet-300"
        />
        <StatCard
          icon={Building2}
          label="Company-scoped"
          value={stats.company}
          tint="bg-sky-100 text-sky-700 dark:bg-sky-950/50 dark:text-sky-300"
        />
      </div>

      {/* Toolbar */}
      <Card className="p-4">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search by key, name, or description…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="pl-9 h-9"
            />
          </div>
          <Select
            value={scopeFilter}
            onValueChange={(v) => setScopeFilter(v as 'ALL' | 'GLOBAL' | 'COMPANY')}
          >
            <SelectTrigger className="w-full sm:w-40 h-9">
              <SelectValue placeholder="Scope" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All scopes</SelectItem>
              <SelectItem value="GLOBAL">Global</SelectItem>
              <SelectItem value="COMPANY">Company</SelectItem>
            </SelectContent>
          </Select>
          <Button
            variant="outline"
            size="icon"
            className="h-9 w-9 shrink-0"
            onClick={() => fetchFlags(true)}
            disabled={refreshing}
            aria-label="Refresh"
          >
            <RefreshCw className={cn('w-4 h-4', refreshing && 'animate-spin')} />
          </Button>
          <CreateFlagDialog
            open={createOpen}
            onOpenChange={setCreateOpen}
            onCreated={(flag) => {
              setFlags((prev) => [flag, ...prev])
              fetchFlags(true)
            }}
          />
        </div>
      </Card>

      {/* Flags table */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Flag className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            Feature flags
            <span className="text-xs font-normal text-muted-foreground">
              ({filtered.length} shown)
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-6 space-y-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="p-10 text-center text-sm text-muted-foreground">
              <Flag className="w-8 h-8 mx-auto mb-2 opacity-40" />
              No feature flags yet. Create one to control platform behavior.
            </div>
          ) : (
            <div className="overflow-x-auto scrollbar-thin">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="min-w-[200px]">Flag</TableHead>
                    <TableHead className="min-w-[120px]">Scope</TableHead>
                    <TableHead className="text-center">Enabled</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((f, i) => (
                    <motion.tr
                      key={f.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: i * 0.03 }}
                      className="hover:bg-muted/40 transition-colors"
                    >
                      <TableCell>
                        <div className="font-mono text-xs text-emerald-700 dark:text-emerald-400 font-semibold">
                          {f.key}
                        </div>
                        <div className="text-sm font-medium mt-0.5">{f.name}</div>
                        {f.description && (
                          <div className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
                            {f.description}
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        {f.scope === 'GLOBAL' ? (
                          <Badge
                            variant="outline"
                            className="gap-1 bg-violet-100 text-violet-700 dark:bg-violet-950/50 dark:text-violet-300 border-violet-200/60"
                          >
                            <Globe className="w-3 h-3" />
                            Global
                          </Badge>
                        ) : (
                          <Badge
                            variant="outline"
                            className="gap-1 bg-sky-100 text-sky-700 dark:bg-sky-950/50 dark:text-sky-300 border-sky-200/60"
                          >
                            <Building2 className="w-3 h-3" />
                            {f.company?.name ?? 'Company'}
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center gap-2">
                          <Switch
                            checked={f.enabled}
                            onCheckedChange={(v) => handleToggle(f, v)}
                            disabled={pendingToggleId === f.id}
                          />
                          {pendingToggleId === f.id ? (
                            <Loader2 className="w-3 h-3 animate-spin text-muted-foreground" />
                          ) : f.enabled ? (
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                          ) : (
                            <XCircle className="w-3.5 h-3.5 text-muted-foreground" />
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/30"
                          onClick={() => setDeleteId(f.id)}
                          aria-label="Delete flag"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </TableCell>
                    </motion.tr>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this feature flag?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove the flag and revert any code path relying on it to its
              default behavior. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault()
                handleDelete()
              }}
              disabled={deleting}
              className="bg-rose-600 hover:bg-rose-700 text-white"
            >
              {deleting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Deleting…
                </>
              ) : (
                'Delete flag'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

function StatCard({
  icon: Icon,
  label,
  value,
  tint,
}: {
  icon: typeof Flag
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

function CreateFlagDialog({
  open,
  onOpenChange,
  onCreated,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  onCreated: (flag: Flag) => void
}) {
  const [key, setKey] = useState('')
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [scope, setScope] = useState<'GLOBAL' | 'COMPANY'>('GLOBAL')
  const [companyId, setCompanyId] = useState('')
  const [enabled, setEnabled] = useState(false)
  const [saving, setSaving] = useState(false)
  const [companies, setCompanies] = useState<{ id: string; name: string }[]>([])

  // Load companies list for company-scoped flags
  useEffect(() => {
    if (!open || companies.length > 0) return
    fetch('/api/super/companies?pageSize=100', { cache: 'no-store' })
      .then(async (r) => {
        if (!r.ok) return
        const json = await r.json()
        const list = Array.isArray(json)
          ? json
          : (json as { data?: { id: string; name: string }[] }).data ?? []
        setCompanies(list.map((c) => ({ id: c.id, name: c.name })))
      })
      .catch(() => {
        // ignore
      })
  }, [open, companies.length])

  const reset = () => {
    setKey('')
    setName('')
    setDescription('')
    setScope('GLOBAL')
    setCompanyId('')
    setEnabled(false)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (saving) return
    if (!key.trim() || !name.trim()) {
      toast.error('Key and name are required')
      return
    }
    if (!/^[A-Z0-9_]+$/.test(key)) {
      toast.error('Key must be UPPERCASE_SNAKE_CASE')
      return
    }
    if (scope === 'COMPANY' && !companyId) {
      toast.error('Select a company for company-scoped flags')
      return
    }
    setSaving(true)
    try {
      const res = await fetch('/api/super/feature-flags', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          key: key.trim(),
          name: name.trim(),
          description: description.trim(),
          scope,
          companyId: scope === 'COMPANY' ? companyId : null,
          enabled,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to create flag')
      toast.success('Feature flag created')
      onCreated(data.flag)
      onOpenChange(false)
      reset()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to create')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        onOpenChange(v)
        if (!v) reset()
      }}
    >
      <DialogTrigger asChild>
        <Button size="sm" className="shrink-0">
          <Plus className="w-4 h-4 mr-1" />
          New flag
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Create feature flag</DialogTitle>
          <DialogDescription>
            Toggle platform behavior globally or for a single company.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label htmlFor="flag-key">Key</Label>
            <Input
              id="flag-key"
              placeholder="ENABLE_NEW_DASHBOARD"
              value={key}
              onChange={(e) => setKey(e.target.value.toUpperCase().replace(/[^A-Z0-9_]/g, '_'))}
              className="font-mono"
            />
            <p className="text-[11px] text-muted-foreground">
              UPPERCASE_SNAKE_CASE. Must be unique.
            </p>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="flag-name">Name</Label>
            <Input
              id="flag-name"
              placeholder="Enable new dashboard"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="flag-desc">Description</Label>
            <Textarea
              id="flag-desc"
              placeholder="What does this flag control?"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="flag-scope">Scope</Label>
              <Select
                value={scope}
                onValueChange={(v) => setScope(v as 'GLOBAL' | 'COMPANY')}
              >
                <SelectTrigger id="flag-scope">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="GLOBAL">Global</SelectItem>
                  <SelectItem value="COMPANY">Company</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {scope === 'COMPANY' && (
              <div className="space-y-1.5">
                <Label htmlFor="flag-company">Company</Label>
                <Select value={companyId} onValueChange={setCompanyId}>
                  <SelectTrigger id="flag-company">
                    <SelectValue placeholder="Select…" />
                  </SelectTrigger>
                  <SelectContent>
                    {companies.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
          <div className="flex items-center justify-between rounded-lg border border-border/60 p-3">
            <div>
              <Label htmlFor="flag-enabled" className="cursor-pointer">
                Enabled by default
              </Label>
              <p className="text-[11px] text-muted-foreground">
                Toggle this on to activate immediately.
              </p>
            </div>
            <Switch id="flag-enabled" checked={enabled} onCheckedChange={setEnabled} />
          </div>
        </form>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={saving}
          >
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={saving}>
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Creating…
              </>
            ) : (
              'Create flag'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
