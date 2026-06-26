'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import {
  Bar,
  BarChart,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  LabelList,
} from 'recharts'
import { toast } from 'sonner'
import {
  Lock,
  Users,
  Clock,
  Zap,
  Crown,
  Shield,
  Plus,
  Pencil,
  Trash2,
  Loader2,
  Check,
} from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
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
import type { DashboardData, TeamManageItem, TeamStat, TeamColor } from './types'
import { TEAM_COLORS } from './types'

// Hex map for chart fills (since recharts can't take Tailwind classes)
const TEAM_HEX: Record<string, string> = {
  emerald: '#10b981',
  amber: '#f59e0b',
  rose: '#f43f5e',
  sky: '#0ea5e9',
  violet: '#8b5cf6',
  orange: '#f97316',
}

function hexFor(color: string) {
  return TEAM_HEX[color] || TEAM_HEX.emerald
}

function CustomBarTooltip({ active, payload }: any) {
  if (!active || !payload || !payload.length) return null
  const item = payload[0].payload
  return (
    <div className="rounded-lg border border-border/60 bg-popover px-3 py-2 shadow-md text-xs">
      <div className="flex items-center gap-1.5 mb-1">
        <span
          className="w-2.5 h-2.5 rounded-full"
          style={{ backgroundColor: hexFor(item.teamColor) }}
        />
        <span className="font-medium">{item.teamName}</span>
      </div>
      <p className="text-muted-foreground tabular-nums">
        {item.totalHours} focus hrs · {item.memberCount} members
      </p>
    </div>
  )
}

export function TeamsTab({
  data,
  onRefresh,
}: {
  data: DashboardData
  onRefresh: () => void
}) {
  const ranked = useMemo(
    () => [...data.teamStats].sort((a, b) => b.totalHours - a.totalHours),
    [data.teamStats]
  )
  const maxHours = Math.max(1, ...ranked.map((t) => t.totalHours))
  const leader = ranked[0]

  // Management state — fetch live teams for CRUD controls
  const [manageTeams, setManageTeams] = useState<TeamManageItem[]>([])
  const [createOpen, setCreateOpen] = useState(false)
  const [editTeam, setEditTeam] = useState<TeamManageItem | null>(null)
  const [deleteTeam, setDeleteTeam] = useState<TeamManageItem | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const fetchTeams = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/teams', { cache: 'no-store' })
      if (res.ok) {
        const j = await res.json()
        setManageTeams(j.teams || [])
      }
    } catch {
      // silent — analytics still render
    }
  }, [])

  useEffect(() => {
    fetchTeams()
  }, [fetchTeams])

  // Find oldest team (by createdAt) for the "members reassigned to" hint on delete
  const oldestTeam = useMemo(() => {
    if (manageTeams.length <= 1) return null
    return [...manageTeams].sort(
      (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    )[0]
  }, [manageTeams])

  const handleDelete = async () => {
    if (!deleteTeam) return
    setSubmitting(true)
    try {
      const res = await fetch(`/api/admin/teams/${deleteTeam.id}`, { method: 'DELETE' })
      const j = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(j.error || 'Failed to delete team')
      toast.success(
        `Team deleted${j.reassignedTo ? `, members reassigned to ${j.reassignedTo}` : ''}`
      )
      setDeleteTeam(null)
      await fetchTeams()
      onRefresh()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to delete team')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Privacy Shield header */}
      <div className="flex items-start gap-2.5 p-4 rounded-xl border border-emerald-200/70 dark:border-emerald-800/50 bg-emerald-50/60 dark:bg-emerald-950/20">
        <Shield className="w-5 h-5 text-emerald-600 dark:text-emerald-400 mt-0.5 shrink-0" />
        <div className="text-sm">
          <p className="font-semibold text-emerald-900 dark:text-emerald-100">
            Privacy Shield — Anonymous Team Data
          </p>
          <p className="text-xs text-emerald-800/80 dark:text-emerald-200/70 mt-0.5">
            All metrics below are aggregated at the team level. Individual employee focus hours,
            sessions, and streaks are never visible to admins.
          </p>
        </div>
      </div>

      <div className="flex items-end justify-between gap-3 flex-wrap">
        <div>
          <h2 className="text-xl font-bold tracking-tight">Team Analytics</h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            Ranked by total focus hours during the active challenge.
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {leader && (
            <Badge className="bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300">
              <Crown className="w-3.5 h-3.5" /> Leading: {leader.teamName}
            </Badge>
          )}
          <Button
            onClick={() => setCreateOpen(true)}
            className="bg-emerald-600 hover:bg-emerald-700"
          >
            <Plus className="w-4 h-4" /> Create Team
          </Button>
        </div>
      </div>

      {/* Horizontal bar chart */}
      {ranked.length > 0 && (
        <Card>
          <CardHeader>
            <CardDescription className="text-xs uppercase tracking-wide font-medium">
              Team Focus Hours Comparison
            </CardDescription>
            <CardTitle className="text-lg">Who&apos;s leading the challenge</CardTitle>
          </CardHeader>
          <CardContent>
            <div
              className="w-full"
              style={{ height: Math.max(220, 56 * ranked.length) }}
            >
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={ranked}
                  layout="vertical"
                  margin={{ top: 4, right: 32, bottom: 4, left: 8 }}
                  barCategoryGap={12}
                >
                  <XAxis type="number" hide domain={[0, maxHours]} />
                  <YAxis
                    type="category"
                    dataKey="teamName"
                    tick={{ fontSize: 12, fill: 'var(--foreground)' }}
                    tickLine={false}
                    axisLine={false}
                    width={120}
                  />
                  <Tooltip content={<CustomBarTooltip />} cursor={{ fill: 'var(--muted)', opacity: 0.4 }} />
                  <Bar dataKey="totalHours" radius={[0, 8, 8, 0]} maxBarSize={28}>
                    {ranked.map((t, i) => (
                      <Cell
                        key={t.teamId}
                        fill={hexFor(t.teamColor)}
                        opacity={i === 0 ? 1 : 0.75}
                      />
                    ))}
                    <LabelList
                      dataKey="totalHours"
                      position="right"
                      formatter={(v: any) => `${v}h`}
                      style={{ fontSize: 11, fill: 'var(--muted-foreground)', fontWeight: 600 }}
                    />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Team cards grid with management controls */}
      {ranked.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-12 text-center text-sm text-muted-foreground">
            No teams yet. Create one to get started.
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {ranked.map((team, idx) => {
            const manageTeam = manageTeams.find((t) => t.id === team.teamId) || null
            return (
              <TeamCard
                key={team.teamId}
                team={team}
                rank={idx + 1}
                maxHours={maxHours}
                delay={idx * 0.05}
                onEdit={manageTeam ? () => setEditTeam(manageTeam) : null}
                onDelete={manageTeam ? () => setDeleteTeam(manageTeam) : null}
              />
            )
          })}
        </div>
      )}

      {/* Detailed table */}
      {ranked.length > 0 && (
        <Card>
          <CardHeader>
            <CardDescription className="text-xs uppercase tracking-wide font-medium flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5" /> Anonymous Team Breakdown
            </CardDescription>
            <CardTitle className="text-lg">All teams</CardTitle>
          </CardHeader>
          <CardContent className="px-0 sm:px-6">
            <div className="max-h-96 overflow-y-auto scrollbar-thin">
              <Table>
                <TableHeader className="sticky top-0 bg-card z-10">
                  <TableRow>
                    <TableHead className="pl-4 sm:pl-6 w-12">#</TableHead>
                    <TableHead>Team</TableHead>
                    <TableHead className="text-right">Members</TableHead>
                    <TableHead className="text-right">Hours</TableHead>
                    <TableHead className="text-right hidden sm:table-cell">Avg/Member</TableHead>
                    <TableHead className="text-right hidden sm:table-cell">Sessions</TableHead>
                    <TableHead className="text-right pr-4 sm:pr-6">Participation</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {ranked.map((t, i) => {
                    const c = getColor(t.teamColor)
                    return (
                      <TableRow key={t.teamId}>
                        <TableCell className="pl-4 sm:pl-6 font-semibold tabular-nums">
                          {i === 0 ? (
                            <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-amber-100 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 text-xs">
                              <Crown className="w-3.5 h-3.5" />
                            </span>
                          ) : (
                            <span className="text-muted-foreground">{i + 1}</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <span className={`w-2.5 h-2.5 rounded-full ${c.dot}`} />
                            <span className="font-medium">{t.teamName}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-right tabular-nums">{t.memberCount}</TableCell>
                        <TableCell className="text-right tabular-nums font-semibold">{t.totalHours}</TableCell>
                        <TableCell className="text-right tabular-nums hidden sm:table-cell">
                          {t.avgHoursPerMember}
                        </TableCell>
                        <TableCell className="text-right tabular-nums hidden sm:table-cell">
                          {t.sessionCount}
                        </TableCell>
                        <TableCell className="pr-4 sm:pr-6">
                          <div className="flex items-center gap-2 justify-end">
                            <Progress value={Math.min(100, t.participationRate)} className="h-1.5 w-16" />
                            <span className="text-xs tabular-nums w-8 text-right">
                              {Math.min(100, t.participationRate)}%
                            </span>
                          </div>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Create Team dialog */}
      <TeamFormDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        mode="create"
        onSaved={async () => {
          setCreateOpen(false)
          await fetchTeams()
          onRefresh()
        }}
      />

      {/* Edit Team dialog */}
      <TeamFormDialog
        open={!!editTeam}
        onOpenChange={(v) => !v && setEditTeam(null)}
        mode="edit"
        team={editTeam}
        onSaved={async () => {
          setEditTeam(null)
          await fetchTeams()
          onRefresh()
        }}
      />

      {/* Delete confirm */}
      <AlertDialog open={!!deleteTeam} onOpenChange={(v) => !v && setDeleteTeam(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Trash2 className="w-5 h-5 text-rose-500" /> Delete team &quot;{deleteTeam?.name}&quot;?
            </AlertDialogTitle>
            <AlertDialogDescription>
              This will remove the team. {deleteTeam && oldestTeam && oldestTeam.id !== deleteTeam.id ? (
                <>
                  Members will be reassigned to{' '}
                  <span className="font-semibold text-foreground">{oldestTeam.name}</span>.
                </>
              ) : (
                <>You&apos;ll need at least one other team before this one can be deleted.</>
              )}{' '}
              Team analytics for this team will disappear from the dashboard.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={submitting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-rose-600 hover:bg-rose-700 text-white"
              onClick={async (e) => {
                e.preventDefault()
                await handleDelete()
              }}
              disabled={submitting}
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" /> Deleting…
                </>
              ) : (
                <>
                  <Trash2 className="w-4 h-4" /> Delete team
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

function TeamCard({
  team,
  rank,
  maxHours,
  delay,
  onEdit,
  onDelete,
}: {
  team: TeamStat
  rank: number
  maxHours: number
  delay: number
  onEdit: (() => void) | null
  onDelete: (() => void) | null
}) {
  const c = getColor(team.teamColor)
  const isLeader = rank === 1
  const barPct = Math.round((team.totalHours / maxHours) * 100)

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay }}
    >
      <Card
        className={`relative overflow-hidden ${
          isLeader
            ? 'border-amber-300 dark:border-amber-700/60 shadow-md shadow-amber-500/10'
            : ''
        }`}
      >
        {isLeader && (
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-400 to-orange-500" />
        )}
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2.5 min-w-0">
              <span className={`w-3 h-3 rounded-full ${c.dot} shrink-0`} />
              <div className="min-w-0">
                <CardTitle className="text-base leading-tight flex items-center gap-1.5">
                  {team.teamName}
                  {isLeader && <Crown className="w-4 h-4 text-amber-500 shrink-0" />}
                </CardTitle>
                <CardDescription className="flex items-center gap-1 mt-0.5">
                  <Lock className="w-3 h-3" />
                  Anonymous team data
                </CardDescription>
              </div>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <Badge
                className={
                  isLeader
                    ? 'bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300'
                    : 'bg-muted text-muted-foreground'
                }
              >
                #{rank}
              </Badge>
              {onEdit && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-muted-foreground hover:text-foreground"
                  onClick={onEdit}
                  aria-label={`Edit ${team.teamName}`}
                >
                  <Pencil className="w-3.5 h-3.5" />
                </Button>
              )}
              {onDelete && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-muted-foreground hover:text-rose-600"
                  onClick={onDelete}
                  aria-label={`Delete ${team.teamName}`}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-3 pt-0">
          {/* Hours bar relative to leader */}
          <div className="space-y-1">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground flex items-center gap-1">
                <Clock className="w-3 h-3" /> Total focus hours
              </span>
              <span className="font-bold tabular-nums">{team.totalHours}h</span>
            </div>
            <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
              <motion.div
                className={`h-full rounded-full ${c.bg}`}
                initial={{ width: 0 }}
                animate={{ width: `${barPct}%` }}
                transition={{ duration: 0.6, delay: delay + 0.1 }}
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2 pt-1">
            <Stat icon={Users} value={team.memberCount} label="Members" />
            <Stat icon={Clock} value={team.avgHoursPerMember} label="Avg/member" />
            <Stat icon={Zap} value={team.sessionCount} label="Sessions" />
          </div>

          {/* Participation */}
          <div className="space-y-1 pt-1">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Participation rate</span>
              <span className="font-semibold tabular-nums">
                {Math.min(100, team.participationRate)}%
              </span>
            </div>
            <Progress value={Math.min(100, team.participationRate)} className="h-1.5" />
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}

function Stat({
  icon: Icon,
  value,
  label,
}: {
  icon: React.ElementType
  value: React.ReactNode
  label: string
}) {
  return (
    <div className="rounded-lg bg-muted/40 border border-border/40 p-2 text-center">
      <Icon className="w-3.5 h-3.5 mx-auto text-muted-foreground" />
      <p className="text-sm font-bold tabular-nums mt-0.5">{value}</p>
      <p className="text-[10px] text-muted-foreground">{label}</p>
    </div>
  )
}

function TeamFormDialog({
  open,
  onOpenChange,
  mode,
  team,
  onSaved,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  mode: 'create' | 'edit'
  team?: TeamManageItem | null
  onSaved: () => void
}) {
  const [name, setName] = useState('')
  const [color, setColor] = useState<TeamColor>('emerald')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (open) {
      setName(team?.name || '')
      setColor((team?.color as TeamColor) || 'emerald')
    }
  }, [open, team])

  const submit = async () => {
    if (!name.trim() || name.trim().length < 2) {
      toast.error('Team name must be at least 2 characters')
      return
    }
    setSubmitting(true)
    try {
      const url = mode === 'create' ? '/api/admin/teams' : `/api/admin/teams/${team?.id}`
      const method = mode === 'create' ? 'POST' : 'PATCH'
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), color }),
      })
      const j = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(j.error || 'Failed to save team')
      toast.success(mode === 'create' ? 'Team created' : 'Team updated')
      onSaved()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to save team')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span className="w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              {mode === 'create' ? <Plus className="w-4 h-4" /> : <Pencil className="w-4 h-4" />}
            </span>
            {mode === 'create' ? 'Create Team' : 'Edit Team'}
          </DialogTitle>
          <DialogDescription>
            {mode === 'create'
              ? 'Add a new team to your company workspace.'
              : 'Update the team name or color.'}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="team-name">Team name</Label>
            <Input
              id="team-name"
              placeholder="e.g. Product Engineering"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={50}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Team color</Label>
            <div className="grid grid-cols-6 gap-2">
              {TEAM_COLORS.map((c) => {
                const cc = getColor(c)
                const selected = color === c
                return (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setColor(c)}
                    aria-label={`Color ${c}`}
                    className={`relative h-10 rounded-lg ${cc.bg} transition-all ${
                      selected
                        ? 'ring-2 ring-offset-2 ring-offset-background ring-foreground'
                        : 'hover:opacity-90 opacity-80'
                    }`}
                  >
                    {selected && (
                      <Check className="absolute inset-0 m-auto w-4 h-4 text-white" />
                    )}
                  </button>
                )
              })}
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={submitting} className="bg-emerald-600 hover:bg-emerald-700">
            {submitting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : mode === 'create' ? (
              <>
                <Plus className="w-4 h-4" /> Create
              </>
            ) : (
              <>
                <Check className="w-4 h-4" /> Save
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

