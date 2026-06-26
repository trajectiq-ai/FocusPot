'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { format } from 'date-fns'
import { toast } from 'sonner'
import {
  Trophy,
  Plus,
  CalendarDays,
  Gift,
  Clock,
  Sparkles,
  AlertTriangle,
  Users,
  Trash2,
  Crown,
  Loader2,
  History,
  Target,
  Copy,
  Archive,
  Ban,
  MoreVertical,
  Repeat,
  CheckCircle2,
  Info,
} from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { getColor } from '@/lib/colors'
import type {
  ActiveChallenge,
  CompletedChallenge,
  DashboardData,
  ChallengeRich,
  ChallengeScoringModel,
  ChallengeStatus,
  ChallengeScope,
  ChallengesListResponse,
} from './types'
import { CreateChallengeDialog } from './create-challenge-dialog'
import { EndChallengeDialog } from './end-challenge-dialog'

// ============================================================
// Badge metadata
// ============================================================

const SCORING_BADGE: Record<ChallengeScoringModel, { label: string; badge: string }> = {
  TOTAL_HOURS: {
    label: 'Total Hours',
    badge: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300',
  },
  AVG_PER_MEMBER: {
    label: 'Avg / Member',
    badge: 'bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300',
  },
  PARTICIPATION_RATE: {
    label: 'Participation',
    badge: 'bg-sky-100 text-sky-700 dark:bg-sky-950/50 dark:text-sky-300',
  },
  WEIGHTED: {
    label: 'Weighted',
    badge: 'bg-violet-100 text-violet-700 dark:bg-violet-950/50 dark:text-violet-300',
  },
}

const STATUS_BADGE: Record<ChallengeStatus, { label: string; badge: string }> = {
  DRAFT: {
    label: 'Draft',
    badge: 'bg-muted text-muted-foreground',
  },
  SCHEDULED: {
    label: 'Scheduled',
    badge: 'bg-sky-100 text-sky-700 dark:bg-sky-950/50 dark:text-sky-300',
  },
  ACTIVE: {
    label: 'Live',
    badge: 'bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300',
  },
  COMPLETED: {
    label: 'Completed',
    badge: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300',
  },
  CANCELLED: {
    label: 'Cancelled',
    badge: 'bg-rose-100 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300',
  },
}

// ============================================================
// Main ChallengeTab
// ============================================================

export function ChallengeTab({
  data,
  onRefresh,
}: {
  data: DashboardData
  onRefresh: () => void
}) {
  const [createOpen, setCreateOpen] = useState(false)
  const [endOpen, setEndOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<CompletedChallenge | null>(null)
  const [deleting, setDeleting] = useState(false)
  const active = data.activeChallenge

  // Rich challenge list (for badges + cancel/duplicate/archive actions)
  const [richList, setRichList] = useState<ChallengeRich[]>([])
  const [richLoading, setRichLoading] = useState(false)
  const [includeArchived, setIncludeArchived] = useState(false)

  // Cancel dialog
  const [cancelTarget, setCancelTarget] = useState<ChallengeRich | null>(null)
  const [cancelReason, setCancelReason] = useState('')
  const [cancelling, setCancelling] = useState(false)

  // Duplicate / archive busy state
  const [busyId, setBusyId] = useState<string | null>(null)

  const fetchChallenges = useCallback(async () => {
    setRichLoading(true)
    try {
      const res = await fetch(
        `/api/admin/challenges?includeArchived=${includeArchived ? 'true' : 'false'}`,
        { cache: 'no-store' },
      )
      const j = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(j.error || 'Failed to load challenges')
      const parsed = j as ChallengesListResponse
      setRichList(parsed.challenges || [])
    } catch {
      // Silent — the dashboard data still powers the main UI
    } finally {
      setRichLoading(false)
    }
  }, [includeArchived])

  useEffect(() => {
    fetchChallenges()
  }, [fetchChallenges])

  // Map of teamId → team info (for resolving scope target team name)
  const teamMap = useMemo(() => {
    const m = new Map<string, { id: string; name: string; color: string }>()
    for (const t of data.teamStats) m.set(t.teamId, { id: t.teamId, name: t.teamName, color: t.teamColor })
    return m
  }, [data.teamStats])

  // Lookup rich info for the active challenge (from dashboard)
  const activeRich = useMemo(() => {
    if (!active) return null
    return richList.find((c) => c.id === active.id) || null
  }, [active, richList])

  // Past/upcoming challenges (everything except the active one)
  const otherChallenges = useMemo(() => {
    const activeId = active?.id
    return richList.filter((c) => c.id !== activeId)
  }, [richList, active])

  // Group other challenges by status
  const upcoming = otherChallenges.filter(
    (c) => c.status === 'SCHEDULED' || c.status === 'DRAFT',
  )
  const past = otherChallenges.filter(
    (c) => c.status === 'COMPLETED' || c.status === 'CANCELLED',
  )

  const start = active ? new Date(active.startDate) : null
  const end = active ? new Date(active.endDate) : null
  const elapsedPct = (() => {
    if (!active || !start || !end) return 0
    const now = Date.now()
    if (end.getTime() <= start.getTime()) return 100
    return Math.min(100, Math.max(0, ((now - start.getTime()) / (end.getTime() - start.getTime())) * 100))
  })()

  const handleDelete = async () => {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      const res = await fetch(`/api/admin/challenges/${deleteTarget.id}`, {
        method: 'DELETE',
      })
      const j = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(j.error || 'Failed to delete challenge')
      toast.success('Challenge deleted')
      setDeleteTarget(null)
      onRefresh()
      fetchChallenges()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to delete challenge')
    } finally {
      setDeleting(false)
    }
  }

  const handleCancel = async () => {
    if (!cancelTarget) return
    setCancelling(true)
    try {
      const res = await fetch(`/api/admin/challenges/${cancelTarget.id}?action=cancel`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: cancelReason.trim() }),
      })
      const j = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(j.error || 'Failed to cancel challenge')
      toast.success('Challenge cancelled')
      setCancelTarget(null)
      setCancelReason('')
      onRefresh()
      fetchChallenges()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to cancel challenge')
    } finally {
      setCancelling(false)
    }
  }

  const handleDuplicate = async (c: ChallengeRich) => {
    setBusyId(c.id)
    try {
      const res = await fetch(`/api/admin/challenges/${c.id}?action=duplicate`, {
        method: 'DELETE',
      })
      const j = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(j.error || 'Failed to duplicate challenge')
      toast.success(`Draft copy created: "${c.name} (Copy)"`)
      fetchChallenges()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to duplicate')
    } finally {
      setBusyId(null)
    }
  }

  const handleArchive = async (c: ChallengeRich) => {
    setBusyId(c.id)
    try {
      const res = await fetch(`/api/admin/challenges/${c.id}?action=archive`, {
        method: 'DELETE',
      })
      const j = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(j.error || 'Failed to archive challenge')
      toast.success('Challenge archived')
      fetchChallenges()
      onRefresh()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to archive')
    } finally {
      setBusyId(null)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header / actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold tracking-tight">Weekly Challenge</h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            Run a Mon → Fri deep work competition across all teams.
          </p>
        </div>
        <div className="flex gap-2">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIncludeArchived((v) => !v)}
                className={includeArchived ? 'border-emerald-500 text-emerald-600' : ''}
              >
                <Archive className="w-4 h-4" />
                <span className="hidden sm:inline ml-1.5">
                  {includeArchived ? 'Showing archived' : 'Show archived'}
                </span>
              </Button>
            </TooltipTrigger>
            <TooltipContent>Toggle visibility of archived challenges</TooltipContent>
          </Tooltip>
          <Button onClick={() => setCreateOpen(true)} className="bg-emerald-600 hover:bg-emerald-700">
            <Plus className="w-4 h-4" /> Create New Challenge
          </Button>
        </div>
      </div>

      {/* Lifecycle hint */}
      <div className="flex items-start gap-2.5 p-4 rounded-xl bg-muted/40 border border-border/60">
        <CalendarDays className="w-5 h-5 text-emerald-600 dark:text-emerald-400 mt-0.5 shrink-0" />
        <div className="text-sm">
          <p className="font-medium">Suggested lifecycle: Monday 9 AM → Friday 5 PM</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            A 5-day sprint gives teams enough runway to build momentum, then ends with a Friday
            winner announcement and gift card delivery.
          </p>
        </div>
      </div>

      {active ? (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <Card className="border-amber-200/60 dark:border-amber-800/40">
            <CardHeader>
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div className="flex items-center gap-3 min-w-0">
                  <span className="shrink-0 w-11 h-11 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 text-white flex items-center justify-center shadow-md shadow-amber-500/20">
                    <Trophy className="w-5 h-5" />
                  </span>
                  <div className="min-w-0">
                    <CardTitle className="text-xl leading-tight truncate">{active.name}</CardTitle>
                    <CardDescription className="flex items-center gap-1.5 mt-1">
                      <Clock className="w-3.5 h-3.5" />
                      {start && end
                        ? `${format(start, 'MMM d')} → ${format(end, 'MMM d, yyyy')}`
                        : ''}
                    </CardDescription>
                  </div>
                </div>
                <Badge className="bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500 mr-1 animate-pulse" />
                  Live
                </Badge>
              </div>

              {/* Badges row */}
              {(activeRich || richLoading === false) && activeRich && (
                <div className="flex flex-wrap gap-1.5 mt-3">
                  <ChallengeBadges challenge={activeRich} teamMap={teamMap} />
                </div>
              )}
            </CardHeader>
            <CardContent className="space-y-5">
              {active.description && (
                <p className="text-sm text-foreground/90 leading-relaxed">{active.description}</p>
              )}

              {/* Progress */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Challenge duration elapsed</span>
                  <span className="font-semibold tabular-nums">{Math.round(elapsedPct)}%</span>
                </div>
                <Progress value={elapsedPct} className="h-2.5" />
                <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                  <span>Started {start ? format(start, 'MMM d, h:mm a') : ''}</span>
                  <span>Ends {end ? format(end, 'MMM d, h:mm a') : ''}</span>
                </div>
              </div>

              {/* Stats grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <div className="rounded-lg border border-border/60 p-3 bg-muted/30">
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Users className="w-3.5 h-3.5" /> Participants
                  </div>
                  <p className="text-lg font-bold tabular-nums mt-1">{data.totalEmployees}</p>
                </div>
                <div className="rounded-lg border border-border/60 p-3 bg-muted/30">
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Sparkles className="w-3.5 h-3.5" /> Prize
                  </div>
                  <p className="text-sm font-semibold mt-1 leading-tight">{active.prize}</p>
                </div>
                <div className="rounded-lg border border-border/60 p-3 bg-muted/30 col-span-2 sm:col-span-1">
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Gift className="w-3.5 h-3.5" /> Gift Card
                  </div>
                  <p className="text-lg font-bold tabular-nums mt-1">
                    {active.giftCardValue > 0 ? `$${active.giftCardValue}` : '—'}
                  </p>
                  {active.giftCardCode ? (
                    <p className="text-[11px] text-emerald-600 dark:text-emerald-400 mt-0.5">
                      Code attached ✓
                    </p>
                  ) : (
                    <p className="text-[11px] text-amber-600 dark:text-amber-400 mt-0.5">
                      No code yet — add when ending
                    </p>
                  )}
                </div>
              </div>

              {/* End action */}
              <div className="flex items-start gap-2 p-3 rounded-lg bg-rose-50 dark:bg-rose-950/20 border border-rose-200/60 dark:border-rose-800/40">
                <AlertTriangle className="w-4 h-4 text-rose-600 dark:text-rose-400 mt-0.5 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-rose-900 dark:text-rose-200">
                    Ending the challenge tallies all focus hours logged so far and crowns the winning
                    team immediately. The gift card code will be emailed to winning team members.
                  </p>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-2">
                <Button
                  variant="outline"
                  onClick={() => setCreateOpen(true)}
                  className="sm:flex-1"
                >
                  <Plus className="w-4 h-4" /> Replace with new challenge
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    if (activeRich) setCancelTarget(activeRich)
                  }}
                  disabled={!activeRich || busyId === activeRich?.id}
                  className="sm:flex-1 border-rose-200 text-rose-600 hover:bg-rose-50 dark:border-rose-800/50 dark:hover:bg-rose-950/30"
                >
                  <Ban className="w-4 h-4" /> Cancel Challenge
                </Button>
                <Button
                  onClick={() => setEndOpen(true)}
                  variant="destructive"
                  className="sm:flex-1 bg-rose-600 hover:bg-rose-700"
                >
                  <Trophy className="w-4 h-4" /> End Challenge Now
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      ) : (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <Card className="border-dashed">
            <CardContent className="py-12 text-center">
              <div className="mx-auto w-14 h-14 rounded-2xl bg-muted/60 flex items-center justify-center mb-3">
                <Trophy className="w-7 h-7 text-muted-foreground" />
              </div>
              <h3 className="text-base font-semibold">No active challenge</h3>
              <p className="text-sm text-muted-foreground mt-1 max-w-sm mx-auto">
                Launch your first weekly challenge to ignite some friendly cross-team competition.
              </p>
              <Button
                onClick={() => setCreateOpen(true)}
                className="mt-4 bg-emerald-600 hover:bg-emerald-700"
              >
                <Plus className="w-4 h-4" /> Create Challenge
              </Button>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Upcoming (DRAFT + SCHEDULED) */}
      {upcoming.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <CalendarDays className="w-4 h-4 text-sky-500" />
            <h3 className="text-sm font-semibold">Upcoming & Drafts</h3>
            <span className="text-xs text-muted-foreground">({upcoming.length})</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {upcoming.map((c) => (
              <ChallengeCard
                key={c.id}
                challenge={c}
                teamMap={teamMap}
                busy={busyId === c.id}
                onCancel={() => setCancelTarget(c)}
                onDuplicate={() => handleDuplicate(c)}
                onArchive={c.status === 'COMPLETED' ? () => handleArchive(c) : undefined}
                onDelete={
                  c.status === 'DRAFT' || c.status === 'CANCELLED'
                    ? () =>
                        setDeleteTarget({
                          id: c.id,
                          name: c.name,
                          startDate: c.startDate,
                          endDate: c.endDate,
                          prize: c.prize,
                          winnerTeam: c.winnerTeam,
                        })
                    : undefined
                }
              />
            ))}
          </div>
        </div>
      )}

      {/* Past challenges (COMPLETED + CANCELLED) */}
      {past.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <History className="w-4 h-4 text-muted-foreground" />
            <h3 className="text-sm font-semibold">Past Challenges</h3>
            <span className="text-xs text-muted-foreground">({past.length})</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {past.map((c) => (
              <ChallengeCard
                key={c.id}
                challenge={c}
                teamMap={teamMap}
                busy={busyId === c.id}
                onCancel={c.status === 'ACTIVE' || c.status === 'SCHEDULED' ? () => setCancelTarget(c) : undefined}
                onDuplicate={() => handleDuplicate(c)}
                onArchive={c.status === 'COMPLETED' ? () => handleArchive(c) : undefined}
                onDelete={
                  c.status === 'DRAFT' || c.status === 'CANCELLED'
                    ? () =>
                        setDeleteTarget({
                          id: c.id,
                          name: c.name,
                          startDate: c.startDate,
                          endDate: c.endDate,
                          prize: c.prize,
                          winnerTeam: c.winnerTeam,
                        })
                    : undefined
                }
              />
            ))}
          </div>
        </div>
      )}

      {richLoading && richList.length === 0 && (
        <Card>
          <CardContent className="py-8 flex items-center justify-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="w-4 h-4 animate-spin" /> Loading challenge history…
          </CardContent>
        </Card>
      )}

      <CreateChallengeDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onCreated={() => {
          onRefresh()
          fetchChallenges()
        }}
      />
      <EndChallengeDialog
        challenge={active as ActiveChallenge | null}
        open={endOpen}
        onOpenChange={setEndOpen}
        onEnded={() => {
          onRefresh()
          fetchChallenges()
        }}
      />

      {/* Delete challenge confirm */}
      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(v) => !v && setDeleteTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Trash2 className="w-5 h-5 text-rose-500" /> Delete challenge?
            </AlertDialogTitle>
            <AlertDialogDescription>
              This permanently deletes{' '}
              <span className="font-semibold text-foreground">{deleteTarget?.name}</span> and all
              focus sessions logged against it. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-rose-600 hover:bg-rose-700 text-white"
              onClick={async (e) => {
                e.preventDefault()
                await handleDelete()
              }}
              disabled={deleting}
            >
              {deleting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" /> Deleting…
                </>
              ) : (
                <>
                  <Trash2 className="w-4 h-4" /> Delete permanently
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Cancel challenge dialog */}
      <Dialog
        open={!!cancelTarget}
        onOpenChange={(v) => {
          if (!v) {
            setCancelTarget(null)
            setCancelReason('')
          }
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Ban className="w-5 h-5 text-rose-500" /> Cancel challenge
            </DialogTitle>
            <DialogDescription>
              Cancelling <span className="font-semibold text-foreground">{cancelTarget?.name}</span>{' '}
              will mark it as cancelled. Employees won&apos;t be able to log more sessions against
              it, but existing sessions are preserved.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="cancel-reason">Reason (optional)</Label>
            <Textarea
              id="cancel-reason"
              placeholder="e.g. Rescheduled due to company offsite…"
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              rows={3}
              maxLength={300}
            />
            <div className="flex items-start gap-1.5 text-xs text-muted-foreground">
              <Info className="w-3 h-3 mt-0.5 shrink-0" />
              <span>
                The reason is stored for audit and shown in the challenge history. Cancelled
                challenges can be deleted permanently or duplicated into a new draft.
              </span>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setCancelTarget(null)
                setCancelReason('')
              }}
              disabled={cancelling}
            >
              Keep challenge
            </Button>
            <Button
              onClick={handleCancel}
              disabled={cancelling}
              className="bg-rose-600 hover:bg-rose-700"
            >
              {cancelling ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Ban className="w-4 h-4" />
              )}
              Cancel challenge
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// ============================================================
// ChallengeBadges — scoring model + scope + recurring + rewards
// ============================================================

function ChallengeBadges({
  challenge,
  teamMap,
}: {
  challenge: ChallengeRich
  teamMap: Map<string, { id: string; name: string; color: string }>
}) {
  const scoring = SCORING_BADGE[challenge.scoringModel] || SCORING_BADGE.TOTAL_HOURS
  const targetTeam =
    challenge.targetTeam ||
    (challenge.targetTeamId ? teamMap.get(challenge.targetTeamId) || null : null)
  const targetTeamColor = targetTeam ? getColor(targetTeam.color) : null

  return (
    <>
      <Badge className={scoring.badge}>
        <Target className="w-3 h-3" /> {scoring.label}
      </Badge>
      {challenge.scope === 'TEAM' ? (
        <Badge variant="outline" className="gap-1.5">
          <Users className="w-3 h-3" />
          {targetTeam ? (
            <>
              <span className={`w-1.5 h-1.5 rounded-full ${targetTeamColor?.dot}`} />
              {targetTeam.name}
            </>
          ) : (
            'Team-specific'
          )}
        </Badge>
      ) : (
        <Badge variant="outline" className="gap-1.5">
          <Users className="w-3 h-3" /> Company-wide
        </Badge>
      )}
      {challenge.isRecurring && (
        <Badge className="bg-violet-100 text-violet-700 dark:bg-violet-950/50 dark:text-violet-300">
          <Repeat className="w-3 h-3" /> Recurring
        </Badge>
      )}
      {challenge.rewards && challenge.rewards.length > 0 && (
        <Badge className="bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300">
          <Gift className="w-3 h-3" /> {challenge.rewards.length} reward
          {challenge.rewards.length === 1 ? '' : 's'}
        </Badge>
      )}
    </>
  )
}

// ============================================================
// ChallengeCard — used for upcoming + past challenges
// ============================================================

function ChallengeCard({
  challenge,
  teamMap,
  busy,
  onCancel,
  onDuplicate,
  onArchive,
  onDelete,
}: {
  challenge: ChallengeRich
  teamMap: Map<string, { id: string; name: string; color: string }>
  busy: boolean
  onCancel?: () => void
  onDuplicate: () => void
  onArchive?: () => void
  onDelete?: () => void
}) {
  const winner = challenge.winnerTeam
  const winnerColor = winner ? getColor(winner.color) : null
  const startD = new Date(challenge.startDate)
  const endD = new Date(challenge.endDate)
  const statusMeta = STATUS_BADGE[challenge.status] || STATUS_BADGE.DRAFT

  // Card accent color by status
  const accent =
    challenge.status === 'COMPLETED'
      ? 'bg-gradient-to-r from-emerald-400 via-emerald-500 to-teal-500'
      : challenge.status === 'CANCELLED'
        ? 'bg-gradient-to-r from-rose-400 to-rose-500'
        : challenge.status === 'SCHEDULED'
          ? 'bg-gradient-to-r from-sky-400 to-sky-500'
          : 'bg-gradient-to-r from-amber-400 via-amber-500 to-orange-500'

  return (
    <Card className="overflow-hidden">
      <div className={`h-1 ${accent}`} />
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2.5 min-w-0">
            <span
              className={`shrink-0 w-9 h-9 rounded-lg flex items-center justify-center ${
                challenge.status === 'CANCELLED'
                  ? 'bg-rose-100 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400'
                  : 'bg-muted/60 text-amber-600 dark:text-amber-400'
              }`}
            >
              {challenge.status === 'CANCELLED' ? (
                <Ban className="w-4 h-4" />
              ) : challenge.status === 'COMPLETED' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              ) : (
                <Trophy className="w-4 h-4" />
              )}
            </span>
            <div className="min-w-0">
              <p className="text-sm font-semibold truncate">{challenge.name}</p>
              <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                <Clock className="w-3 h-3" />
                {format(startD, 'MMM d')} → {format(endD, 'MMM d, yyyy')}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <Badge className={statusMeta.badge}>{statusMeta.label}</Badge>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  disabled={busy}
                  aria-label="Challenge actions"
                >
                  {busy ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <MoreVertical className="w-3.5 h-3.5" />
                  )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem onClick={onDuplicate}>
                  <Copy className="w-4 h-4" /> Duplicate to draft
                </DropdownMenuItem>
                {onCancel && (
                  <DropdownMenuItem
                    onClick={onCancel}
                    className="text-rose-600 focus:text-rose-700"
                  >
                    <Ban className="w-4 h-4" /> Cancel challenge
                  </DropdownMenuItem>
                )}
                {onArchive && (
                  <DropdownMenuItem onClick={onArchive}>
                    <Archive className="w-4 h-4" /> Archive
                  </DropdownMenuItem>
                )}
                {onDelete && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={onDelete}
                      variant="destructive"
                    >
                      <Trash2 className="w-4 h-4" /> Delete permanently
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Badges */}
        <div className="flex items-center gap-1.5 flex-wrap mt-3">
          <ChallengeBadges challenge={challenge} teamMap={teamMap} />
        </div>

        {/* Winner / prize */}
        <div className="flex items-center gap-2 flex-wrap mt-3">
          {challenge.status === 'COMPLETED' && winner ? (
            <Badge
              variant="outline"
              className="gap-1.5 bg-amber-50 dark:bg-amber-950/30 border-amber-200/60 dark:border-amber-800/40 text-amber-800 dark:text-amber-300"
            >
              <Crown className="w-3 h-3 text-amber-500" />
              <span className={`w-2 h-2 rounded-full ${winnerColor?.dot}`} />
              {winner.name}
            </Badge>
          ) : challenge.status === 'COMPLETED' && !winner ? (
            <Badge variant="outline" className="text-muted-foreground">
              No winner
            </Badge>
          ) : null}
          <Badge variant="secondary" className="text-[10px]">
            <Gift className="w-3 h-3" /> {challenge.prize}
          </Badge>
          {challenge.giftCardValue > 0 && (
            <Badge variant="outline" className="text-[10px]">
              ${challenge.giftCardValue} gift card
            </Badge>
          )}
        </div>

        {challenge.status === 'CANCELLED' && challenge.cancelledReason && (
          <div className="mt-3 p-2 rounded-md bg-rose-50 dark:bg-rose-950/20 border border-rose-200/60 dark:border-rose-800/40">
            <p className="text-xs text-rose-900 dark:text-rose-200">
              <span className="font-semibold">Cancel reason:</span> {challenge.cancelledReason}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
