'use client'

import { useCallback, useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import {
  Megaphone,
  Plus,
  Pencil,
  Trash2,
  Loader2,
  Info,
  AlertTriangle,
  Wrench,
  RefreshCw,
  Calendar,
  CheckCircle2,
  XCircle,
  BellRing,
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

type Announcement = {
  id: string
  title: string
  message: string
  type: 'INFO' | 'WARNING' | 'MAINTENANCE'
  active: boolean
  dismissible: boolean
  startsAt: string
  endsAt: string | null
  createdAt: string
  updatedAt: string
}

type Response = { data: Announcement[]; pagination: unknown } | Announcement[]

function asList(r: Response): Announcement[] {
  if (Array.isArray(r)) return r
  return r.data ?? []
}

const TYPE_META: Record<
  string,
  { label: string; icon: typeof Info; tint: string; ring: string }
> = {
  INFO: {
    label: 'Info',
    icon: Info,
    tint: 'bg-sky-100 text-sky-700 dark:bg-sky-950/50 dark:text-sky-300 border-sky-200/60',
    ring: 'bg-sky-100 text-sky-600 dark:bg-sky-950/50 dark:text-sky-400',
  },
  WARNING: {
    label: 'Warning',
    icon: AlertTriangle,
    tint: 'bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300 border-amber-200/60',
    ring: 'bg-amber-100 text-amber-600 dark:bg-amber-950/50 dark:text-amber-400',
  },
  MAINTENANCE: {
    label: 'Maintenance',
    icon: Wrench,
    tint: 'bg-rose-100 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300 border-rose-200/60',
    ring: 'bg-rose-100 text-rose-600 dark:bg-rose-950/50 dark:text-rose-400',
  },
}

function formatDateTime(iso: string | null): string {
  if (!iso) return ''
  try {
    return new Date(iso).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    })
  } catch {
    return ''
  }
}

function toLocalInput(iso: string | null): string {
  if (!iso) return ''
  try {
    const d = new Date(iso)
    const pad = (n: number) => String(n).padStart(2, '0')
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
  } catch {
    return ''
  }
}

export function AnnouncementsTab() {
  const [items, setItems] = useState<Announcement[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [createOpen, setCreateOpen] = useState(false)
  const [editing, setEditing] = useState<Announcement | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)

  const fetchItems = useCallback(async (silent = false) => {
    if (!silent) setLoading(true)
    setRefreshing(true)
    try {
      const res = await fetch('/api/super/announcements?pageSize=100', { cache: 'no-store' })
      if (!res.ok) throw new Error('Failed to load announcements')
      const json = (await res.json()) as Response
      setItems(asList(json))
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Failed to load'
      if (silent) toast.error(msg)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => {
    fetchItems()
  }, [fetchItems])

  const handleDelete = async () => {
    if (!deleteId) return
    setDeleting(true)
    try {
      const res = await fetch(`/api/super/announcements/${deleteId}`, { method: 'DELETE' })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || 'Failed to delete announcement')
      }
      setItems((prev) => prev.filter((a) => a.id !== deleteId))
      toast.success('Announcement deleted')
      setDeleteId(null)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to delete')
    } finally {
      setDeleting(false)
    }
  }

  const stats = {
    total: items.length,
    active: items.filter((a) => a.active).length,
    info: items.filter((a) => a.type === 'INFO').length,
    warning: items.filter((a) => a.type === 'WARNING').length,
    maintenance: items.filter((a) => a.type === 'MAINTENANCE').length,
  }

  return (
    <div className="space-y-6">
      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={Megaphone}
          label="Total"
          value={stats.total}
          tint="bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300"
        />
        <StatCard
          icon={BellRing}
          label="Active"
          value={stats.active}
          tint="bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300"
        />
        <StatCard
          icon={AlertTriangle}
          label="Warnings"
          value={stats.warning}
          tint="bg-orange-100 text-orange-700 dark:bg-orange-950/50 dark:text-orange-300"
        />
        <StatCard
          icon={Wrench}
          label="Maintenance"
          value={stats.maintenance}
          tint="bg-rose-100 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300"
        />
      </div>

      {/* Toolbar */}
      <Card className="p-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-semibold flex items-center gap-2">
              <Megaphone className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              Platform announcements
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Visible to all companies — use sparingly for important updates.
            </p>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <Button
              variant="outline"
              size="icon"
              className="h-9 w-9"
              onClick={() => fetchItems(true)}
              disabled={refreshing}
              aria-label="Refresh"
            >
              <RefreshCw className={cn('w-4 h-4', refreshing && 'animate-spin')} />
            </Button>
            <AnnouncementDialog
              open={createOpen}
              onOpenChange={setCreateOpen}
              onSaved={(a) => {
                setItems((prev) => [a, ...prev])
                fetchItems(true)
              }}
            />
          </div>
        </div>
      </Card>

      {/* List */}
      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-32 rounded-xl" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <Card className="p-10 text-center">
          <div className="text-5xl mb-3">📢</div>
          <h3 className="font-semibold text-lg">No announcements yet</h3>
          <p className="text-sm text-muted-foreground mt-1">
            Create an announcement to broadcast a message across all companies.
          </p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {items.map((a, i) => (
            <AnnouncementCard
              key={a.id}
              announcement={a}
              index={i}
              onEdit={() => setEditing(a)}
              onDelete={() => setDeleteId(a.id)}
            />
          ))}
        </div>
      )}

      {/* Edit dialog */}
      <AnnouncementDialog
        open={!!editing}
        onOpenChange={(v) => !v && setEditing(null)}
        editing={editing}
        onSaved={(a) => {
          setItems((prev) => prev.map((p) => (p.id === a.id ? a : p)))
          setEditing(null)
        }}
      />

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this announcement?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove the announcement. Users will no longer see it.
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
                'Delete announcement'
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
  icon: typeof Megaphone
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

function AnnouncementCard({
  announcement,
  index,
  onEdit,
  onDelete,
}: {
  announcement: Announcement
  index: number
  onEdit: () => void
  onDelete: () => void
}) {
  const meta = TYPE_META[announcement.type] ?? TYPE_META.INFO
  const Icon = meta.icon
  const now = Date.now()
  const startsAt = new Date(announcement.startsAt).getTime()
  const endsAt = announcement.endsAt ? new Date(announcement.endsAt).getTime() : null
  const isCurrentlyVisible =
    announcement.active && startsAt <= now && (!endsAt || endsAt >= now)

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04, duration: 0.3 }}
    >
      <Card
        className={cn(
          'p-4 h-full relative overflow-hidden',
          !announcement.active && 'opacity-70',
        )}
      >
        <div className="flex items-start gap-3">
          <div
            className={cn(
              'w-10 h-10 rounded-xl flex items-center justify-center shrink-0',
              meta.ring,
            )}
          >
            <Icon className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <h4 className="font-semibold text-sm leading-tight">{announcement.title}</h4>
                <div className="flex items-center flex-wrap gap-1.5 mt-1.5">
                  <Badge variant="outline" className={cn('text-[10px] py-0 h-5 gap-1', meta.tint)}>
                    <Icon className="w-2.5 h-2.5" />
                    {meta.label}
                  </Badge>
                  {announcement.active ? (
                    <Badge
                      variant="outline"
                      className="text-[10px] py-0 h-5 gap-1 bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300 border-emerald-200/60"
                    >
                      <CheckCircle2 className="w-2.5 h-2.5" />
                      Active
                    </Badge>
                  ) : (
                    <Badge
                      variant="outline"
                      className="text-[10px] py-0 h-5 gap-1 text-muted-foreground"
                    >
                      <XCircle className="w-2.5 h-2.5" />
                      Inactive
                    </Badge>
                  )}
                  {isCurrentlyVisible && (
                    <Badge
                      variant="outline"
                      className="text-[10px] py-0 h-5 gap-1 bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300 border-amber-200/60"
                    >
                      <BellRing className="w-2.5 h-2.5" />
                      Live now
                    </Badge>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={onEdit}
                  aria-label="Edit"
                >
                  <Pencil className="w-4 h-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/30"
                  onClick={onDelete}
                  aria-label="Delete"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-2 leading-snug line-clamp-3">
              {announcement.message}
            </p>
            <div className="mt-3 flex items-center flex-wrap gap-x-4 gap-y-1 text-[11px] text-muted-foreground pt-2 border-t border-border/60">
              <div className="flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                <span>From {formatDateTime(announcement.startsAt)}</span>
              </div>
              {announcement.endsAt && (
                <div className="flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  <span>Until {formatDateTime(announcement.endsAt)}</span>
                </div>
              )}
              <span>
                {announcement.dismissible ? 'Dismissible' : 'Persistent'}
              </span>
            </div>
          </div>
        </div>
      </Card>
    </motion.div>
  )
}

function AnnouncementDialog({
  open,
  onOpenChange,
  editing,
  onSaved,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  editing?: Announcement | null
  onSaved: (a: Announcement) => void
}) {
  const isEdit = !!editing
  const [title, setTitle] = useState('')
  const [message, setMessage] = useState('')
  const [type, setType] = useState<'INFO' | 'WARNING' | 'MAINTENANCE'>('INFO')
  const [active, setActive] = useState(true)
  const [dismissible, setDismissible] = useState(true)
  const [startsAt, setStartsAt] = useState('')
  const [endsAt, setEndsAt] = useState('')
  const [hasEnd, setHasEnd] = useState(false)
  const [saving, setSaving] = useState(false)

  // Reset form when dialog opens
  useEffect(() => {
    if (!open) return
    if (editing) {
      setTitle(editing.title)
      setMessage(editing.message)
      setType(editing.type)
      setActive(editing.active)
      setDismissible(editing.dismissible)
      setStartsAt(toLocalInput(editing.startsAt))
      setEndsAt(toLocalInput(editing.endsAt))
      setHasEnd(!!editing.endsAt)
    } else {
      const now = new Date()
      const pad = (n: number) => String(n).padStart(2, '0')
      setTitle('')
      setMessage('')
      setType('INFO')
      setActive(true)
      setDismissible(true)
      setStartsAt(
        `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}T${pad(now.getHours())}:${pad(now.getMinutes())}`,
      )
      setEndsAt('')
      setHasEnd(false)
    }
  }, [open, editing])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (saving) return
    if (!title.trim() || !message.trim()) {
      toast.error('Title and message are required')
      return
    }
    if (!startsAt) {
      toast.error('Start date/time is required')
      return
    }
    setSaving(true)
    try {
      const startISO = new Date(startsAt).toISOString()
      const endISO = hasEnd && endsAt ? new Date(endsAt).toISOString() : null
      if (endISO && startISO && new Date(endISO) < new Date(startISO)) {
        toast.error('End date cannot be before start date')
        setSaving(false)
        return
      }
      const body: Record<string, unknown> = {
        title: title.trim(),
        message: message.trim(),
        type,
        active,
        dismissible,
        startsAt: startISO,
        endsAt: endISO,
      }
      const url = isEdit
        ? `/api/super/announcements/${editing!.id}`
        : '/api/super/announcements'
      const method = isEdit ? 'PATCH' : 'POST'
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || `Failed to ${isEdit ? 'update' : 'create'}`)
      toast.success(isEdit ? 'Announcement updated' : 'Announcement created')
      onSaved(data.announcement)
      onOpenChange(false)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to save')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {!isEdit && (
        <DialogTrigger asChild>
          <Button size="sm" className="shrink-0">
            <Plus className="w-4 h-4 mr-1" />
            New
          </Button>
        </DialogTrigger>
      )}
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit announcement' : 'Create announcement'}</DialogTitle>
          <DialogDescription>
            Broadcast a message to every company on FocusPot.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label htmlFor="ann-title">Title</Label>
            <Input
              id="ann-title"
              placeholder="Scheduled maintenance this weekend"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="ann-message">Message</Label>
            <Textarea
              id="ann-message"
              placeholder="Detailed message to users…"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={3}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="ann-type">Type</Label>
            <Select
              value={type}
              onValueChange={(v) => setType(v as 'INFO' | 'WARNING' | 'MAINTENANCE')}
            >
              <SelectTrigger id="ann-type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="INFO">Info</SelectItem>
                <SelectItem value="WARNING">Warning</SelectItem>
                <SelectItem value="MAINTENANCE">Maintenance</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="ann-starts">Starts at</Label>
              <Input
                id="ann-starts"
                type="datetime-local"
                value={startsAt}
                onChange={(e) => setStartsAt(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ann-ends">Ends at</Label>
              <Input
                id="ann-ends"
                type="datetime-local"
                value={endsAt}
                onChange={(e) => setEndsAt(e.target.value)}
                disabled={!hasEnd}
                placeholder="Optional"
              />
              <label className="flex items-center gap-2 text-[11px] text-muted-foreground cursor-pointer">
                <input
                  type="checkbox"
                  checked={hasEnd}
                  onChange={(e) => {
                    setHasEnd(e.target.checked)
                    if (!e.target.checked) setEndsAt('')
                  }}
                  className="rounded"
                />
                Has end date
              </label>
            </div>
          </div>
          <div className="flex items-center justify-between rounded-lg border border-border/60 p-3">
            <div>
              <Label className="cursor-pointer">Active</Label>
              <p className="text-[11px] text-muted-foreground">Visible to users.</p>
            </div>
            <Switch checked={active} onCheckedChange={setActive} />
          </div>
          <div className="flex items-center justify-between rounded-lg border border-border/60 p-3">
            <div>
              <Label className="cursor-pointer">Dismissible</Label>
              <p className="text-[11px] text-muted-foreground">Users can close the banner.</p>
            </div>
            <Switch checked={dismissible} onCheckedChange={setDismissible} />
          </div>
        </form>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={saving}>
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                {isEdit ? 'Saving…' : 'Creating…'}
              </>
            ) : isEdit ? (
              'Save changes'
            ) : (
              'Create announcement'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
