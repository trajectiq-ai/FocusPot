'use client'

import { useState } from 'react'
import { formatDistanceToNow } from 'date-fns'
import { Bell, CheckCircle2, Trophy, Gift, Info, Sparkles } from 'lucide-react'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

export type EmployeeNotification = {
  id: string
  title: string
  message: string
  type: string
  read: boolean
  createdAt: string
}

function iconFor(type: string) {
  switch (type) {
    case 'CHALLENGE_STARTED':
    case 'CHALLENGE_ENDED':
      return Trophy
    case 'CHALLENGE_WON':
      return Gift
    case 'STREAK':
      return CheckCircle2
    case 'INFO':
    default:
      return Info
  }
}

function tintFor(type: string) {
  switch (type) {
    case 'CHALLENGE_WON':
      return 'bg-amber-100 dark:bg-amber-950/50 text-amber-600'
    case 'CHALLENGE_STARTED':
    case 'CHALLENGE_ENDED':
      return 'bg-violet-100 dark:bg-violet-950/50 text-violet-600'
    case 'STREAK':
      return 'bg-orange-100 dark:bg-orange-950/50 text-orange-600'
    default:
      return 'bg-emerald-100 dark:bg-emerald-950/50 text-emerald-600'
  }
}

export function NotificationsBell({ notifications }: { notifications: EmployeeNotification[] }) {
  const [open, setOpen] = useState(false)
  const unread = notifications.filter((n) => !n.read).length

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          className="relative p-2 rounded-full hover:bg-muted transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          aria-label={`Notifications${unread > 0 ? `, ${unread} unread` : ''}`}
        >
          <Bell className="w-5 h-5" />
          {unread > 0 && (
            <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-rose-500 text-white text-[10px] font-bold flex items-center justify-center ring-2 ring-background">
              {unread > 9 ? '9+' : unread}
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 sm:w-96 p-0">
        <div className="p-3 border-b flex items-center gap-2">
          <Bell className="w-4 h-4" />
          <span className="font-semibold text-sm">Notifications</span>
          {unread > 0 && (
            <Badge variant="secondary" className="ml-auto text-[10px]">
              {unread} new
            </Badge>
          )}
        </div>
        <div className="max-h-96 overflow-y-auto scrollbar-thin">
          {notifications.length === 0 ? (
            <div className="p-8 text-center text-sm text-muted-foreground">
              <Sparkles className="w-6 h-6 mx-auto mb-2 opacity-40" />
              You&apos;re all caught up!
            </div>
          ) : (
            notifications.map((n) => {
              const Icon = iconFor(n.type)
              return (
                <div
                  key={n.id}
                  className={cn(
                    'p-3 border-b last:border-b-0 hover:bg-muted/50 transition-colors',
                    !n.read && 'bg-emerald-50/60 dark:bg-emerald-950/20'
                  )}
                >
                  <div className="flex items-start gap-2.5">
                    <div
                      className={cn(
                        'w-7 h-7 rounded-lg flex items-center justify-center shrink-0',
                        tintFor(n.type)
                      )}
                    >
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium leading-snug">{n.title}</div>
                      <div className="text-xs text-muted-foreground mt-0.5 leading-snug">
                        {n.message}
                      </div>
                      <div className="text-[10px] text-muted-foreground/70 mt-1">
                        {formatDistanceToNow(new Date(n.createdAt), { addSuffix: true })}
                      </div>
                    </div>
                    {!n.read && (
                      <div className="w-2 h-2 rounded-full bg-emerald-500 shrink-0 mt-1.5" />
                    )}
                  </div>
                </div>
              )
            })
          )}
        </div>
      </PopoverContent>
    </Popover>
  )
}
