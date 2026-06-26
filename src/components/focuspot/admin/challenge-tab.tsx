'use client'

import { useState } from 'react'
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
} from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
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
import { getColor } from '@/lib/colors'
import type { ActiveChallenge, CompletedChallenge, DashboardData } from './types'
import { CreateChallengeDialog } from './create-challenge-dialog'
import { EndChallengeDialog } from './end-challenge-dialog'

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
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to delete challenge')
    } finally {
      setDeleting(false)
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
        <Button onClick={() => setCreateOpen(true)} className="bg-emerald-600 hover:bg-emerald-700">
          <Plus className="w-4 h-4" /> Create New Weekly Challenge
        </Button>
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

      {/* Completed challenges with delete option */}
      {data.completedChallenges.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <History className="w-4 h-4 text-muted-foreground" />
            <h3 className="text-sm font-semibold">Past Challenges</h3>
            <span className="text-xs text-muted-foreground">
              ({data.completedChallenges.length})
            </span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {data.completedChallenges.map((ch) => {
              const winner = ch.winnerTeam
              const winnerColor = winner ? getColor(winner.color) : null
              const startD = new Date(ch.startDate)
              const endD = new Date(ch.endDate)
              return (
                <Card key={ch.id} className="overflow-hidden">
                  <div className="h-1 bg-gradient-to-r from-emerald-400 via-emerald-500 to-teal-500" />
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className="shrink-0 w-9 h-9 rounded-lg bg-muted/60 flex items-center justify-center">
                          <Trophy className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                        </span>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold truncate">{ch.name}</p>
                          <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                            <Clock className="w-3 h-3" />
                            {format(startD, 'MMM d')} → {format(endD, 'MMM d, yyyy')}
                          </p>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 shrink-0 text-muted-foreground hover:text-rose-600"
                        onClick={() => setDeleteTarget(ch)}
                        aria-label={`Delete ${ch.name}`}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap mt-3">
                      {winner ? (
                        <Badge
                          variant="outline"
                          className="gap-1.5 bg-amber-50 dark:bg-amber-950/30 border-amber-200/60 dark:border-amber-800/40 text-amber-800 dark:text-amber-300"
                        >
                          <Crown className="w-3 h-3 text-amber-500" />
                          <span className={`w-2 h-2 rounded-full ${winnerColor?.dot}`} />
                          {winner.name}
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-muted-foreground">
                          No winner
                        </Badge>
                      )}
                      <Badge variant="secondary" className="text-[10px]">
                        <Gift className="w-3 h-3" /> {ch.prize}
                      </Badge>
                      <Badge variant="outline" className="text-[10px]">
                        Completed
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </div>
      )}

      <CreateChallengeDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onCreated={onRefresh}
      />
      <EndChallengeDialog
        challenge={active as ActiveChallenge | null}
        open={endOpen}
        onOpenChange={setEndOpen}
        onEnded={onRefresh}
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
    </div>
  )
}
