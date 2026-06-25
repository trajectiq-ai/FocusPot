'use client'

import { useState } from 'react'
import { Bell, Check, Loader2 } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { motion, AnimatePresence } from 'framer-motion'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu'
import type { AdminNotification } from './types'

const typeColor: Record<string, string> = {
  CHALLENGE: 'bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300',
  SUCCESS: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300',
  INFO: 'bg-sky-100 text-sky-700 dark:bg-sky-950/50 dark:text-sky-300',
  WARNING: 'bg-rose-100 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300',
}

export function NotificationsMenu({
  notifications,
  onMarkAllRead,
  onMarkRead,
}: {
  notifications: AdminNotification[]
  onMarkAllRead: () => void
  onMarkRead: (id: string) => void
}) {
  const unread = notifications.filter((n) => !n.read).length
  const [markingAll, setMarkingAll] = useState(false)
  const [pendingId, setPendingId] = useState<string | null>(null)

  const handleMarkAll = async () => {
    if (markingAll || unread === 0) return
    setMarkingAll(true)
    try {
      const res = await fetch('/api/notifications/read-all', { method: 'POST' })
      const j = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(j.error || 'Failed to mark all as read')
      onMarkAllRead()
      toast.success(
        `Marked ${j.updated ?? unread} notification${(j.updated ?? unread) === 1 ? '' : 's'} as read`
      )
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to mark notifications as read')
    } finally {
      setMarkingAll(false)
    }
  }

  const handleClick = async (n: AdminNotification) => {
    if (n.read || pendingId) return
    setPendingId(n.id)
    try {
      const res = await fetch(`/api/notifications/${n.id}/read`, { method: 'PATCH' })
      const j = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(j.error || 'Failed to mark as read')
      onMarkRead(n.id)
    } catch {
      // silent — toast inside parent if desired
    } finally {
      setPendingId(null)
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative rounded-full"
          aria-label={`Notifications${unread > 0 ? `, ${unread} unread` : ''}`}
        >
          <Bell className="w-5 h-5" />
          <AnimatePresence>
            {unread > 0 && (
              <motion.span
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0 }}
                className="absolute top-1.5 right-1.5 min-w-4 h-4 px-1 rounded-full bg-rose-500 text-white text-[10px] font-bold flex items-center justify-center"
              >
                {unread}
              </motion.span>
            )}
          </AnimatePresence>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 sm:w-96 p-0">
        <div className="flex items-center justify-between px-3 py-2.5 border-b border-border/60">
          <span className="text-sm font-semibold">Notifications</span>
          {unread > 0 && (
            <button
              onClick={handleMarkAll}
              disabled={markingAll}
              className="text-xs text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1 disabled:opacity-50"
            >
              {markingAll ? (
                <>
                  <Loader2 className="w-3 h-3 animate-spin" /> Marking…
                </>
              ) : (
                <>
                  <Check className="w-3 h-3" /> Mark all read
                </>
              )}
            </button>
          )}
        </div>
        <div className="max-h-96 overflow-y-auto scrollbar-thin">
          {notifications.length === 0 ? (
            <div className="px-4 py-8 text-center text-sm text-muted-foreground">
              You&apos;re all caught up
            </div>
          ) : (
            notifications.map((n) => {
              const isPending = pendingId === n.id
              return (
                <button
                  key={n.id}
                  onClick={() => handleClick(n)}
                  disabled={n.read || isPending}
                  className={`w-full text-left px-3 py-3 border-b border-border/40 last:border-0 hover:bg-muted/50 transition-colors disabled:cursor-default ${
                    !n.read ? 'bg-emerald-50/40 dark:bg-emerald-950/20' : ''
                  }`}
                >
                  <div className="flex items-start gap-2.5">
                    <span
                      className={`mt-0.5 shrink-0 w-2 h-2 rounded-full ${
                        !n.read ? 'bg-emerald-500' : 'bg-transparent'
                      }`}
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-medium leading-tight">{n.title}</p>
                        {n.type && (
                          <span
                            className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${
                              typeColor[n.type] || typeColor.INFO
                            }`}
                          >
                            {n.type}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{n.message}</p>
                      <p className="text-[11px] text-muted-foreground/70 mt-1">
                        {formatDistanceToNow(new Date(n.createdAt), { addSuffix: true })}
                      </p>
                    </div>
                    {isPending && (
                      <Loader2 className="w-3 h-3 animate-spin text-muted-foreground shrink-0 mt-1" />
                    )}
                  </div>
                </button>
              )
            })
          )}
        </div>
        <DropdownMenuSeparator />
        <DropdownMenuLabel className="text-xs text-muted-foreground font-normal">
          {notifications.length} total notification{notifications.length === 1 ? '' : 's'}
        </DropdownMenuLabel>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
