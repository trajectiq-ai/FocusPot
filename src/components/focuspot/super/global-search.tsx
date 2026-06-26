'use client'

import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Search,
  Building2,
  User,
  Trophy,
  ChevronRight,
  Loader2,
  Sparkles,
} from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { getColor, getInitials } from '@/lib/colors'
import { cn } from '@/lib/utils'
import { PlanBadge, StatusBadge } from './helpers'
import type { Plan, SubscriptionStatus } from './types'

type CompanyResult = {
  id: string
  name: string
  domain: string
  plan: Plan
  seats: number
  employeeCount: number
  teamCount: number
  subscriptionStatus: SubscriptionStatus
  monthlyRevenue: number
  joinCode: string
  createdAt: string
}

type UserResult = {
  id: string
  name: string
  email: string
  role: string
  active: boolean
  avatarColor: string
  company: { id: string; name: string; domain: string } | null
  team: { id: string; name: string; color: string } | null
  createdAt: string
}

type ChallengeResult = {
  id: string
  name: string
  description: string
  status: string
  scope: string
  prize: string
  giftCardValue: number
  startDate: string
  endDate: string
  company: { id: string; name: string; domain: string } | null
  winnerTeam: { id: string; name: string; color: string } | null
}

type SearchResponse = {
  query: string
  counts: { companies: number; users: number; challenges: number }
  companies: CompanyResult[]
  users: UserResult[]
  challenges: ChallengeResult[]
}

type DetailState =
  | { type: 'company'; data: CompanyResult }
  | { type: 'user'; data: UserResult }
  | { type: 'challenge'; data: ChallengeResult }
  | null

const ROLE_LABELS: Record<string, string> = {
  SUPER_ADMIN: 'Super Admin',
  COMPANY_ADMIN: 'Company Admin',
  EMPLOYEE: 'Employee',
}

const ROLE_TINTS: Record<string, string> = {
  SUPER_ADMIN: 'bg-violet-100 text-violet-700 dark:bg-violet-950/50 dark:text-violet-300 border-violet-200/60',
  COMPANY_ADMIN: 'bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300 border-amber-200/60',
  EMPLOYEE: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300 border-emerald-200/60',
}

const CHALLENGE_STATUS_TINTS: Record<string, string> = {
  DRAFT: 'bg-muted text-muted-foreground border-border',
  SCHEDULED: 'bg-sky-100 text-sky-700 dark:bg-sky-950/50 dark:text-sky-300 border-sky-200/60',
  ACTIVE: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300 border-emerald-200/60',
  COMPLETED: 'bg-violet-100 text-violet-700 dark:bg-violet-950/50 dark:text-violet-300 border-violet-200/60',
  CANCELLED: 'bg-rose-100 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300 border-rose-200/60',
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  } catch {
    return iso
  }
}

export function GlobalSearch({
  onNavigateCompanies,
}: {
  onNavigateCompanies?: () => void
}) {
  const [query, setQuery] = useState('')
  const [debounced, setDebounced] = useState('')
  const [results, setResults] = useState<SearchResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [open, setOpen] = useState(false)
  const [detail, setDetail] = useState<DetailState>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const inputId = useId()

  // Debounce search input
  useEffect(() => {
    const t = setTimeout(() => setDebounced(query.trim()), 300)
    return () => clearTimeout(t)
  }, [query])

  // Search executor — runs in a callback so setState isn't directly in an effect body.
  const runSearch = useCallback(async (q: string) => {
    setLoading(true)
    try {
      const r = await fetch(
        `/api/super/search?q=${encodeURIComponent(q)}&limit=8`,
        { cache: 'no-store' },
      )
      if (!r.ok) throw new Error('Search failed')
      const d = (await r.json()) as SearchResponse
      setResults(d)
      setOpen(true)
    } catch {
      setResults(null)
    } finally {
      setLoading(false)
    }
  }, [])

  // Trigger search when debounced query changes (skip empty queries).
  useEffect(() => {
    if (!debounced) return
    runSearch(debounced)
  }, [debounced, runSearch])

  // Click-outside to close dropdown
  useEffect(() => {
    if (!open) return
    const handle = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handle)
    return () => document.removeEventListener('mousedown', handle)
  }, [open])

  // Keyboard shortcut: Cmd/Ctrl+K focuses search
  useEffect(() => {
    const handle = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        inputRef.current?.focus()
        inputRef.current?.select()
      }
      if (e.key === 'Escape') {
        setOpen(false)
        inputRef.current?.blur()
      }
    }
    document.addEventListener('keydown', handle)
    return () => document.removeEventListener('keydown', handle)
  }, [])

  const hasResults = useMemo(() => {
    if (!results) return false
    return (
      results.companies.length > 0 ||
      results.users.length > 0 ||
      results.challenges.length > 0
    )
  }, [results])

  const totalCount = results
    ? results.counts.companies + results.counts.users + results.counts.challenges
    : 0

  const handleCompanyClick = (c: CompanyResult) => {
    setDetail({ type: 'company', data: c })
    setOpen(false)
  }
  const handleUserClick = (u: UserResult) => {
    setDetail({ type: 'user', data: u })
    setOpen(false)
  }
  const handleChallengeClick = (c: ChallengeResult) => {
    setDetail({ type: 'challenge', data: c })
    setOpen(false)
  }

  return (
    <>
      <div ref={containerRef} className="relative w-full sm:w-72 md:w-80">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
        <Input
          id={inputId}
          ref={inputRef}
          type="search"
          placeholder="Search companies, people, challenges…"
          value={query}
          onChange={(e) => {
            const v = e.target.value
            setQuery(v)
            if (!v.trim()) {
              setResults(null)
              setOpen(false)
            }
          }}
          onFocus={() => {
            if (hasResults) setOpen(true)
          }}
          className="pl-9 pr-12 h-9 text-sm"
          aria-label="Global search"
        />
        <kbd
          className="hidden sm:flex absolute right-2 top-1/2 -translate-y-1/2 items-center gap-0.5 px-1.5 py-0.5 rounded border border-border bg-muted text-[10px] font-mono text-muted-foreground pointer-events-none"
          aria-hidden
        >
          ⌘K
        </kbd>

        {/* Dropdown */}
        <AnimatePresence>
          {open && debounced && (
            <motion.div
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.15 }}
              className="absolute z-50 mt-1.5 w-full sm:w-96 max-w-[calc(100vw-2rem)] rounded-xl border border-border bg-popover text-popover-foreground shadow-lg overflow-hidden"
              role="listbox"
            >
              {/* Header */}
              <div className="flex items-center justify-between px-3 py-2 border-b border-border/60">
                <span className="text-xs font-medium text-muted-foreground">
                  {loading
                    ? 'Searching…'
                    : hasResults
                      ? `${totalCount} result${totalCount === 1 ? '' : 's'} for “${results!.query}”`
                      : `No results for “${debounced}”`}
                </span>
                {loading && <Loader2 className="w-3.5 h-3.5 animate-spin text-muted-foreground" />}
              </div>

              <div className="max-h-80 overflow-y-auto scrollbar-thin">
                {!loading && !hasResults && (
                  <div className="px-3 py-8 text-center">
                    <Sparkles className="w-6 h-6 mx-auto text-muted-foreground/50 mb-2" />
                    <p className="text-sm text-muted-foreground">
                      Try searching by name, email, domain, or prize.
                    </p>
                  </div>
                )}

                {/* Companies */}
                {results && results.companies.length > 0 && (
                  <SearchGroup
                    icon={Building2}
                    label="Companies"
                    count={results.counts.companies}
                  >
                    {results.companies.map((c) => (
                      <SearchRow
                        key={c.id}
                        onClick={() => handleCompanyClick(c)}
                        icon={<Building2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />}
                        title={c.name}
                        subtitle={c.domain}
                        right={<PlanBadge plan={c.plan} />}
                      />
                    ))}
                  </SearchGroup>
                )}

                {/* Users */}
                {results && results.users.length > 0 && (
                  <SearchGroup
                    icon={User}
                    label="People"
                    count={results.counts.users}
                  >
                    {results.users.map((u) => {
                      const c = getColor(u.avatarColor || 'emerald')
                      return (
                        <SearchRow
                          key={u.id}
                          onClick={() => handleUserClick(u)}
                          icon={
                            <div
                              className={cn(
                                'w-6 h-6 rounded-full bg-gradient-to-br flex items-center justify-center text-white text-[10px] font-semibold',
                                c.gradient,
                              )}
                            >
                              {getInitials(u.name)}
                            </div>
                          }
                          title={u.name}
                          subtitle={u.email}
                          right={
                            <Badge
                              variant="outline"
                              className={cn(
                                'text-[10px] py-0 h-5',
                                ROLE_TINTS[u.role] ?? ROLE_TINTS.EMPLOYEE,
                              )}
                            >
                              {ROLE_LABELS[u.role] ?? u.role}
                            </Badge>
                          }
                        />
                      )
                    })}
                  </SearchGroup>
                )}

                {/* Challenges */}
                {results && results.challenges.length > 0 && (
                  <SearchGroup
                    icon={Trophy}
                    label="Challenges"
                    count={results.counts.challenges}
                  >
                    {results.challenges.map((ch) => (
                      <SearchRow
                        key={ch.id}
                        onClick={() => handleChallengeClick(ch)}
                        icon={<Trophy className="w-4 h-4 text-amber-500" />}
                        title={ch.name}
                        subtitle={ch.company?.name ?? 'Platform'}
                        right={
                          <Badge
                            variant="outline"
                            className={cn(
                              'text-[10px] py-0 h-5',
                              CHALLENGE_STATUS_TINTS[ch.status] ??
                                'bg-muted text-muted-foreground border-border',
                            )}
                          >
                            {ch.status}
                          </Badge>
                        }
                      />
                    ))}
                  </SearchGroup>
                )}
              </div>

              {/* Footer */}
              {onNavigateCompanies && (
                <div className="border-t border-border/60 px-3 py-2 flex items-center justify-between">
                  <span className="text-[11px] text-muted-foreground">
                    Press <span className="font-mono">Esc</span> to close
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2 text-xs"
                    onClick={() => {
                      setOpen(false)
                      onNavigateCompanies()
                    }}
                  >
                    Browse all companies
                    <ChevronRight className="w-3 h-3 ml-1" />
                  </Button>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Detail dialog */}
      <DetailDialog detail={detail} onClose={() => setDetail(null)} />
    </>
  )
}

function SearchGroup({
  icon: Icon,
  label,
  count,
  children,
}: {
  icon: typeof Building2
  label: string
  count: number
  children: React.ReactNode
}) {
  return (
    <div className="py-1">
      <div className="px-3 py-1.5 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
        <Icon className="w-3 h-3" />
        {label}
        <span className="font-normal text-muted-foreground/60">({count})</span>
      </div>
      {children}
    </div>
  )
}

function SearchRow({
  onClick,
  icon,
  title,
  subtitle,
  right,
}: {
  onClick: () => void
  icon: React.ReactNode
  title: string
  subtitle: string
  right?: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full text-left flex items-center gap-2.5 px-3 py-2 hover:bg-muted/60 transition-colors focus:bg-muted/60 focus:outline-none"
    >
      <div className="w-7 h-7 rounded-lg bg-muted flex items-center justify-center shrink-0">
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-sm font-medium leading-tight truncate">{title}</div>
        <div className="text-[11px] text-muted-foreground truncate">{subtitle}</div>
      </div>
      {right && <div className="shrink-0">{right}</div>}
      <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/60 shrink-0" />
    </button>
  )
}

function DetailDialog({
  detail,
  onClose,
}: {
  detail: DetailState
  onClose: () => void
}) {
  const open = !!detail
  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md">
        {detail?.type === 'company' && <CompanyDetail data={detail.data} />}
        {detail?.type === 'user' && <UserDetail data={detail.data} />}
        {detail?.type === 'challenge' && <ChallengeDetail data={detail.data} />}
      </DialogContent>
    </Dialog>
  )
}

function CompanyDetail({ data }: { data: CompanyResult }) {
  return (
    <>
      <DialogHeader>
        <div className="flex items-center gap-3 mb-1">
          <div className="w-12 h-12 rounded-xl bg-emerald-100 dark:bg-emerald-950/50 flex items-center justify-center">
            <Building2 className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div className="min-w-0">
            <DialogTitle className="text-base">{data.name}</DialogTitle>
            <DialogDescription className="truncate">{data.domain}</DialogDescription>
          </div>
        </div>
      </DialogHeader>
      <div className="space-y-3 py-2">
        <div className="flex items-center gap-2 flex-wrap">
          <PlanBadge plan={data.plan} />
          <StatusBadge status={data.subscriptionStatus} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <DetailStat label="Employees" value={String(data.employeeCount)} />
          <DetailStat label="Teams" value={String(data.teamCount)} />
          <DetailStat label="Seats" value={String(data.seats)} />
          <DetailStat
            label="Monthly revenue"
            value={`$${data.monthlyRevenue.toLocaleString()}`}
          />
        </div>
        <div className="rounded-lg bg-muted/50 p-3 text-xs">
          <span className="text-muted-foreground">Join code: </span>
          <span className="font-mono font-semibold">{data.joinCode}</span>
        </div>
        <div className="text-[11px] text-muted-foreground">
          Created {formatDate(data.createdAt)}
        </div>
      </div>
    </>
  )
}

function UserDetail({ data }: { data: UserResult }) {
  const c = getColor(data.avatarColor || 'emerald')
  return (
    <>
      <DialogHeader>
        <div className="flex items-center gap-3 mb-1">
          <div
            className={cn(
              'w-12 h-12 rounded-full bg-gradient-to-br flex items-center justify-center text-white font-semibold',
              c.gradient,
            )}
          >
            {getInitials(data.name)}
          </div>
          <div className="min-w-0">
            <DialogTitle className="text-base">{data.name}</DialogTitle>
            <DialogDescription className="truncate">{data.email}</DialogDescription>
          </div>
        </div>
      </DialogHeader>
      <div className="space-y-3 py-2">
        <div className="flex items-center gap-2 flex-wrap">
          <Badge
            variant="outline"
            className={cn(
              'text-[10px] py-0 h-5',
              ROLE_TINTS[data.role] ?? ROLE_TINTS.EMPLOYEE,
            )}
          >
            {ROLE_LABELS[data.role] ?? data.role}
          </Badge>
          {data.active ? (
            <Badge
              variant="outline"
              className="text-[10px] py-0 h-5 bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300 border-emerald-200/60"
            >
              Active
            </Badge>
          ) : (
            <Badge
              variant="outline"
              className="text-[10px] py-0 h-5 bg-muted text-muted-foreground border-border"
            >
              Deactivated
            </Badge>
          )}
        </div>
        <div className="grid grid-cols-1 gap-2">
          <DetailRow label="Company" value={data.company?.name ?? '—'} />
          <DetailRow label="Team" value={data.team?.name ?? '—'} />
          <DetailRow label="Joined" value={formatDate(data.createdAt)} />
        </div>
      </div>
    </>
  )
}

function ChallengeDetail({ data }: { data: ChallengeResult }) {
  const statusTint = CHALLENGE_STATUS_TINTS[data.status] ?? 'bg-muted text-muted-foreground border-border'
  return (
    <>
      <DialogHeader>
        <div className="flex items-center gap-3 mb-1">
          <div className="w-12 h-12 rounded-xl bg-amber-100 dark:bg-amber-950/50 flex items-center justify-center">
            <Trophy className="w-6 h-6 text-amber-500" />
          </div>
          <div className="min-w-0">
            <DialogTitle className="text-base">{data.name}</DialogTitle>
            <DialogDescription className="truncate">
              {data.company?.name ?? 'Platform-wide'}
            </DialogDescription>
          </div>
        </div>
      </DialogHeader>
      <div className="space-y-3 py-2">
        <div className="flex items-center gap-2 flex-wrap">
          <Badge variant="outline" className={cn('text-[10px] py-0 h-5', statusTint)}>
            {data.status}
          </Badge>
          <Badge variant="outline" className="text-[10px] py-0 h-5 text-muted-foreground">
            {data.scope === 'TEAM' ? 'Team scope' : 'Company scope'}
          </Badge>
        </div>
        {data.description && (
          <p className="text-sm text-muted-foreground">{data.description}</p>
        )}
        <div className="grid grid-cols-2 gap-3">
          <DetailStat
            label="Prize value"
            value={data.giftCardValue > 0 ? `$${data.giftCardValue}` : data.prize || '—'}
          />
          <DetailStat
            label="Duration"
            value={`${formatDate(data.startDate)} → ${formatDate(data.endDate)}`}
          />
        </div>
        {data.winnerTeam && (
          <div className="rounded-lg bg-violet-50 dark:bg-violet-950/30 border border-violet-200/60 dark:border-violet-800/60 p-3 text-xs">
            <span className="text-muted-foreground">Winner: </span>
            <span className="font-semibold text-violet-700 dark:text-violet-300">
              {data.winnerTeam.name}
            </span>
          </div>
        )}
      </div>
    </>
  )
}

function DetailStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-muted/50 p-2.5">
      <div className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">
        {label}
      </div>
      <div className="text-sm font-semibold mt-0.5 tabular-nums">{value}</div>
    </div>
  )
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between text-sm py-1 border-b border-border/40 last:border-0">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  )
}
