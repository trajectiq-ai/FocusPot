'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Bell, Check, Info, Trophy, AlertTriangle, PartyPopper } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type { NotificationRow } from './types'
import { timeAgo } from './helpers'

const typeMeta: Record<
  string,
  { icon: typeof Info; className: string; ring: string }
> = {
  INFO: {
    icon: Info,
    className: 'text-sky-600 dark:text-sky-400',
    ring: 'bg-sky-100 dark:bg-sky-950/50',
  },
  SUCCESS: {
    icon: Check,
    className: 'text-emerald-600 dark:text-emerald-400',
    ring: 'bg-emerald-100 dark:bg-emerald-950/50',
  },
  WARNING: {
    icon: AlertTriangle,
    className: 'text-amber-600 dark:text-amber-400',
    ring: 'bg-amber-100 dark:bg-amber-950/50',
  },
  CHALLENGE: {
    icon: Trophy,
    className: 'text-violet-600 dark:text-violet-400',
    ring: 'bg-violet-100 dark:bg-violet-950/50',
  },
}

export function NotificationsBell({
  notifications,
}: {
  notifications: NotificationRow[]
}) {
  const [open, setOpen] = useState(false)
  const unread = notifications.filter((n) => !n.read).length

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative rounded-full h-9 w-9"
          aria-label="Notifications"
        >
          <Bell className="h-4 w-4" />
          <AnimatePresence>
            {unread > 0 && (
              <motion.span
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0 }}
                className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 rounded-full bg-rose-500 text-white text-[10px] font-bold flex items-center justify-center"
              >
                {unread}
              </motion.span>
            )}
          </AnimatePresence>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="w-80 sm:w-96 p-0 overflow-hidden"
      >
        <div className="flex items-center justify-between px-3 py-2.5 border-b border-border/60">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-sm">Notifications</span>
            {unread > 0 && (
              <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-rose-100 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300">
                {unread} new
              </span>
            )}
          </div>
        </div>
        <div className="max-h-96 overflow-y-auto scrollbar-thin">
          {notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-center px-4">
              <PartyPopper className="w-6 h-6 text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground">
                You&apos;re all caught up.
              </p>
            </div>
          ) : (
            notifications.map((n) => {
              const meta = typeMeta[n.type] || typeMeta.INFO
              const Icon = meta.icon
              return (
                <div
                  key={n.id}
                  className={cn(
                    'flex gap-3 px-3 py-2.5 border-b border-border/40 last:border-0 hover:bg-muted/40 transition-colors',
                    !n.read && 'bg-emerald-50/40 dark:bg-emerald-950/10',
                  )}
                >
                  <div
                    className={cn(
                      'shrink-0 w-8 h-8 rounded-full flex items-center justify-center',
                      meta.ring,
                    )}
                  >
                    <Icon className={cn('w-4 h-4', meta.className)} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm font-medium leading-tight">
                        {n.title}
                      </p>
                      {!n.read && (
                        <span className="shrink-0 w-2 h-2 rounded-full bg-emerald-500 mt-1.5" />
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                      {n.message}
                    </p>
                    <p className="text-[10px] text-muted-foreground/70 mt-1">
                      {timeAgo(n.createdAt)}
                    </p>
                  </div>
                </div>
              )
            })
          )}
        </div>
        <DropdownMenuSeparator className="m-0" />
        <div className="px-3 py-2 text-center">
          <span className="text-[11px] text-muted-foreground">
            Platform-wide alerts for {notifications.length} recent events
          </span>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
