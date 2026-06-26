'use client'

import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  X,
  Smartphone,
  Signal,
  Wifi,
  BatteryFull,
  ChevronLeft,
  Search,
  RefreshCw,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Input } from '@/components/ui/input'
import { useAuthStore } from '@/lib/store'
import { getColor, getInitials } from '@/lib/colors'
import { cn } from '@/lib/utils'
import { MobileApp } from './mobile-app'

// ============================================================
// MobileAppPreview
// ============================================================
// Wraps the MobileApp inside a realistic phone frame (iPhone-style with
// notch + status bar + home indicator). Renders an employee picker when
// no previewEmployeeId is set, otherwise renders the mobile app.
// ============================================================

type PickerEmployee = {
  id: string
  name: string
  email: string
  title: string
  avatarColor: string
  team: { id: string; name: string; color: string } | null
  company: { id: string; name: string } | null
  streak: number
  bestStreak: number
  totalFocusHours: number
  totalPoints: number
  totalSessions: number
}

export function MobileAppPreview() {
  const { user, previewEmployeeId, setMobilePreview } = useAuthStore()
  const [employeeId, setEmployeeId] = useState<string | null>(previewEmployeeId)

  // Sync internal state with the store whenever it changes (e.g., picked
  // from the picker below)
  useEffect(() => {
    setEmployeeId(previewEmployeeId)
  }, [previewEmployeeId])

  const handlePick = (id: string) => {
    setEmployeeId(id)
    setMobilePreview(true, id)
  }

  const handleExit = () => {
    setMobilePreview(false)
  }

  const handleSwitchEmployee = () => {
    setEmployeeId(null)
    setMobilePreview(true, null)
  }

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-zinc-950 via-zinc-900 to-emerald-950 text-foreground flex flex-col">
      {/* Top bar */}
      <header className="shrink-0 px-4 sm:px-6 py-3 flex items-center justify-between gap-3 border-b border-white/5">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-9 h-9 rounded-xl bg-emerald-500/20 ring-1 ring-emerald-400/30 flex items-center justify-center shrink-0">
            <Smartphone className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="text-sm font-semibold text-white truncate">
                Mobile App Preview
              </h1>
              <Badge className="hidden sm:inline-flex bg-amber-500/20 text-amber-300 hover:bg-amber-500/30 border-amber-500/30 text-[10px]">
                Admin Testing Tool
              </Badge>
            </div>
            <p className="text-[11px] text-zinc-400 truncate">
              {user?.role === 'SUPER_ADMIN'
                ? 'Previewing as any employee (Super Admin)'
                : 'Previewing employees in your company'}
            </p>
          </div>
        </div>
        <Button
          onClick={handleExit}
          variant="secondary"
          size="sm"
          className="bg-white/10 text-white hover:bg-white/20 border-white/10"
        >
          <X className="w-4 h-4 mr-1.5" />
          Exit Preview
        </Button>
      </header>

      {/* Body — phone frame + side info */}
      <main className="flex-1 flex items-center justify-center p-4 sm:p-8 overflow-auto">
        <div className="flex flex-col lg:flex-row items-center lg:items-start gap-6 lg:gap-10">
          <PhoneFrame>
            <AnimatePresence mode="wait">
              {employeeId ? (
                <motion.div
                  key={`mobile-${employeeId}`}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="h-full"
                >
                  <MobileApp employeeId={employeeId} onExit={handleExit} />
                </motion.div>
              ) : (
                <motion.div
                  key="picker"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="h-full"
                >
                  <EmployeePicker onPick={handlePick} />
                </motion.div>
              )}
            </AnimatePresence>
          </PhoneFrame>

          {/* Side info panel (hidden on small screens) */}
          <aside className="hidden lg:block w-72 space-y-3">
            <Card className="p-4 bg-white/5 border-white/10 backdrop-blur">
              <h2 className="text-sm font-semibold text-white mb-2">
                About this tool
              </h2>
              <p className="text-xs text-zinc-400 leading-relaxed">
                FocusPot&apos;s web app is for admins only. Employees use the
                native mobile app. This simulator lets admins preview the
                employee experience without leaving the web portal.
              </p>
            </Card>

            {employeeId && (
              <Card className="p-4 bg-white/5 border-white/10 backdrop-blur">
                <h2 className="text-sm font-semibold text-white mb-2">
                  Preview Controls
                </h2>
                <Button
                  onClick={handleSwitchEmployee}
                  variant="outline"
                  size="sm"
                  className="w-full bg-white/5 border-white/10 text-white hover:bg-white/10"
                >
                  <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
                  Switch employee
                </Button>
                <p className="text-[10px] text-zinc-500 mt-2 leading-relaxed">
                  Sessions completed here create real FocusSessions in the
                  database on behalf of the selected employee.
                </p>
              </Card>
            )}

            <Card className="p-4 bg-white/5 border-white/10 backdrop-blur">
              <h2 className="text-sm font-semibold text-white mb-2">
                Tips
              </h2>
              <ul className="space-y-1.5 text-[11px] text-zinc-400">
                <li className="flex gap-1.5">
                  <span className="text-emerald-400">›</span>
                  Switch tabs via the bottom navigation bar
                </li>
                <li className="flex gap-1.5">
                  <span className="text-emerald-400">›</span>
                  Timer pauses when the tab loses focus (anti-cheat)
                </li>
                <li className="flex gap-1.5">
                  <span className="text-emerald-400">›</span>
                  Completed sessions update leaderboards + rewards
                </li>
                <li className="flex gap-1.5">
                  <span className="text-emerald-400">›</span>
                  Tap &quot;Exit Preview&quot; to return to admin dashboard
                </li>
              </ul>
            </Card>
          </aside>
        </div>
      </main>
    </div>
  )
}

// ============================================================
// Phone Frame
// ============================================================

function PhoneFrame({ children }: { children: React.ReactNode }) {
  // Live-updating clock for the status bar
  const [time, setTime] = useState(() => formatPhoneTime(new Date()))
  useEffect(() => {
    const id = setInterval(() => setTime(formatPhoneTime(new Date())), 30_000)
    return () => clearInterval(id)
  }, [])

  return (
    <div className="relative shrink-0" style={{ width: 375, height: 812 }}>
      {/* Outer bezel */}
      <div
        className={cn(
          'absolute inset-0 rounded-[3rem] bg-zinc-950 shadow-2xl',
          'ring-1 ring-white/10',
          'shadow-black/60'
        )}
      />
      {/* Side buttons */}
      <div className="absolute -left-[3px] top-32 w-[3px] h-8 rounded-l bg-zinc-800" />
      <div className="absolute -left-[3px] top-44 w-[3px] h-12 rounded-l bg-zinc-800" />
      <div className="absolute -left-[3px] top-60 w-[3px] h-12 rounded-l bg-zinc-800" />
      <div className="absolute -right-[3px] top-48 w-[3px] h-16 rounded-r bg-zinc-800" />

      {/* Inner screen */}
      <div className="absolute inset-[8px] rounded-[2.7rem] bg-background overflow-hidden">
        {/* Status bar */}
        <div className="absolute top-0 inset-x-0 h-12 flex items-center justify-between px-7 z-20 pointer-events-none">
          <div className="text-[12px] font-semibold tabular-nums text-foreground">
            {time}
          </div>
          {/* Notch */}
          <div className="absolute left-1/2 -translate-x-1/2 top-2 w-28 h-7 rounded-full bg-zinc-950" />
          <div className="flex items-center gap-1.5 text-foreground">
            <Signal className="w-3.5 h-3.5" />
            <Wifi className="w-3.5 h-3.5" />
            <BatteryFull className="w-4 h-4" />
          </div>
        </div>

        {/* App content area (below status bar) */}
        <div className="absolute inset-0 pt-12">
          <div className="h-full">{children}</div>
        </div>

        {/* Home indicator */}
        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 w-32 h-1.5 rounded-full bg-foreground/40 z-20 pointer-events-none" />
      </div>
    </div>
  )
}

function formatPhoneTime(d: Date): string {
  return d.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  })
}

// ============================================================
// Employee Picker
// ============================================================

function EmployeePicker({ onPick }: { onPick: (id: string) => void }) {
  const [employees, setEmployees] = useState<PickerEmployee[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [query, setQuery] = useState('')

  useEffect(() => {
    let cancelled = false
    fetch('/api/admin/mobile-preview', { cache: 'no-store' })
      .then(async (r) => {
        if (!r.ok) throw new Error('Failed to load employees')
        return r.json() as Promise<{ employees: PickerEmployee[] }>
      })
      .then((d) => {
        if (!cancelled) {
          setEmployees(d.employees)
          setError(null)
        }
      })
      .catch((e) => {
        if (!cancelled)
          setError(e instanceof Error ? e.message : 'Failed to load')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  const filtered = employees.filter((e) => {
    if (!query.trim()) return true
    const q = query.toLowerCase()
    return (
      e.name.toLowerCase().includes(q) ||
      e.email.toLowerCase().includes(q) ||
      e.title?.toLowerCase().includes(q) ||
      e.team?.name?.toLowerCase().includes(q)
    )
  })

  return (
    <div className="h-full flex flex-col bg-background">
      {/* Header */}
      <div className="px-4 pt-3 pb-2">
        <div className="flex items-center gap-2 mb-1">
          <Smartphone className="w-4 h-4 text-emerald-600" />
          <h1 className="text-base font-bold">Preview As…</h1>
        </div>
        <p className="text-[11px] text-muted-foreground mb-3">
          Pick an employee to preview their mobile app experience.
        </p>

        {/* Search */}
        <div className="relative">
          <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search name, team, title…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="h-9 pl-8 text-xs rounded-xl bg-muted/50 border-0"
          />
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto mobile-scroll px-3 pb-3">
        {loading ? (
          <div className="space-y-2 pt-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-16 rounded-xl" />
            ))}
          </div>
        ) : error ? (
          <div className="p-6 text-center">
            <div className="text-3xl mb-1">🍃</div>
            <p className="text-xs font-semibold">Could not load</p>
            <p className="text-[10px] text-muted-foreground mt-1">{error}</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-6 text-center text-xs text-muted-foreground">
            No employees match your search.
          </div>
        ) : (
          <div className="space-y-1.5 pt-1">
            {filtered.map((emp, idx) => (
              <EmployeeRow key={emp.id} employee={emp} index={idx} onPick={onPick} />
            ))}
          </div>
        )}
      </div>

      {/* Footer note */}
      <div className="px-4 py-2 border-t border-border bg-muted/30">
        <p className="text-[10px] text-muted-foreground text-center">
          {filtered.length} of {employees.length} employees
        </p>
      </div>
    </div>
  )
}

function EmployeeRow({
  employee,
  index,
  onPick,
}: {
  employee: PickerEmployee
  index: number
  onPick: (id: string) => void
}) {
  const c = getColor(employee.avatarColor || 'emerald')
  const team = employee.team
    ? getColor(employee.team.color || 'emerald')
    : null

  return (
    <motion.button
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(index * 0.03, 0.3) }}
      onClick={() => onPick(employee.id)}
      className="w-full flex items-center gap-2.5 p-2.5 rounded-xl bg-card border border-border hover:border-emerald-400 hover:shadow-md hover:shadow-emerald-500/10 transition-all text-left active:scale-[0.98]"
    >
      <div
        className={cn(
          'w-10 h-10 rounded-full bg-gradient-to-br flex items-center justify-center text-white text-xs font-semibold shrink-0',
          c.gradient
        )}
      >
        {getInitials(employee.name)}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <span className="text-xs font-semibold truncate">{employee.name}</span>
          {employee.streak >= 2 && (
            <span className="text-[10px]" aria-label={`${employee.streak} day streak`}>
              🔥
            </span>
          )}
        </div>
        <div className="text-[10px] text-muted-foreground truncate">
          {employee.title || employee.email}
        </div>
        <div className="flex items-center gap-1.5 mt-0.5">
          {employee.team && (
            <Badge
              variant="outline"
              className={cn('text-[9px] py-0 h-4', team?.text, team?.border)}
            >
              <div className={cn('w-1 h-1 rounded-full', team?.dot)} />
              {employee.team.name}
            </Badge>
          )}
          <span className="text-[9px] text-muted-foreground">
            {employee.totalFocusHours}h · {employee.totalSessions} sessions
          </span>
        </div>
      </div>
      <ChevronLeft className="w-4 h-4 text-muted-foreground rotate-180" />
    </motion.button>
  )
}
