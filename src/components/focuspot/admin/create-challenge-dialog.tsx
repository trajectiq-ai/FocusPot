'use client'

import { useCallback, useEffect, useState } from 'react'
import { Gift, CalendarDays, Info, Loader2, Target, Users, Repeat, Sparkles, Plus, X, Crown, Medal, Award } from 'lucide-react'
import { toast } from 'sonner'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { getColor } from '@/lib/colors'
import type {
  RewardItem,
  RedemptionTier,
  TeamManageItem,
} from './types'

function toDateInput(d: Date) {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

// ============================================================
// Scoring model metadata
// ============================================================

type ScoringModel = 'TOTAL_HOURS' | 'AVG_PER_MEMBER' | 'PARTICIPATION_RATE' | 'WEIGHTED'
type ChallengeStatusChoice = 'ACTIVE' | 'SCHEDULED' | 'DRAFT'
type Scope = 'COMPANY' | 'TEAM'

const SCORING_META: Record<
  ScoringModel,
  { label: string; tooltip: string }
> = {
  TOTAL_HOURS: {
    label: 'Total Hours',
    tooltip: 'Sum of all team focus hours. Best for same-sized teams — rewards volume.',
  },
  AVG_PER_MEMBER: {
    label: 'Average per Member',
    tooltip: 'Team focus hours divided by team size. Fair when teams differ in size — rewards engagement.',
  },
  PARTICIPATION_RATE: {
    label: 'Participation Rate',
    tooltip: 'Percentage of team members who logged at least one session. Rewards broad engagement.',
  },
  WEIGHTED: {
    label: 'Weighted',
    tooltip: 'Custom weighted formula (hours × weight + sessions × weight). For advanced admins.',
  },
}

const STATUS_META: Record<
  ChallengeStatusChoice,
  { label: string; description: string }
> = {
  ACTIVE: {
    label: 'Active Now',
    description: 'Starts immediately and notifies all employees.',
  },
  SCHEDULED: {
    label: 'Schedule for Later',
    description: 'Auto-activates on the start date — no employee notifications yet.',
  },
  DRAFT: {
    label: 'Save as Draft',
    description: 'Hidden from employees. You can edit and launch it later.',
  },
}

const TIER_META: Record<RedemptionTier, { label: string; icon: typeof Crown; badge: string }> = {
  WINNER: { label: 'Winner', icon: Crown, badge: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300' },
  RUNNER_UP: { label: 'Runner-up', icon: Medal, badge: 'bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300' },
  PARTICIPATION: { label: 'Participation', icon: Award, badge: 'bg-sky-100 text-sky-700 dark:bg-sky-950/50 dark:text-sky-300' },
}

type LinkedReward = {
  rewardId: string
  tier: RedemptionTier
  // Local cache of reward info for display
  name: string
  type: string
  imageColor: string
}

// ============================================================
// Main dialog
// ============================================================

export function CreateChallengeDialog({
  open,
  onOpenChange,
  onCreated,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  onCreated: () => void
}) {
  const today = new Date()
  const inFourDays = new Date()
  inFourDays.setDate(today.getDate() + 4)

  // Core fields
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [startDate, setStartDate] = useState(toDateInput(today))
  const [endDate, setEndDate] = useState(toDateInput(inFourDays))
  const [prize, setPrize] = useState('')
  const [giftCardValue, setGiftCardValue] = useState('')
  const [giftCardCode, setGiftCardCode] = useState('')

  // Enterprise fields
  const [scoringModel, setScoringModel] = useState<ScoringModel>('TOTAL_HOURS')
  const [scope, setScope] = useState<Scope>('COMPANY')
  const [targetTeamId, setTargetTeamId] = useState<string>('')
  const [statusChoice, setStatusChoice] = useState<ChallengeStatusChoice>('ACTIVE')
  const [isRecurring, setIsRecurring] = useState(false)

  // Reward linking
  const [linkedRewards, setLinkedRewards] = useState<LinkedReward[]>([])

  // Resource data (teams + rewards)
  const [teams, setTeams] = useState<TeamManageItem[]>([])
  const [rewards, setRewards] = useState<RewardItem[]>([])
  const [submitting, setSubmitting] = useState(false)

  // Fetch teams + rewards when dialog opens
  const fetchResources = useCallback(async () => {
    try {
      const [teamsRes, rewardsRes] = await Promise.all([
        fetch('/api/admin/teams', { cache: 'no-store' }),
        fetch('/api/admin/rewards?pageSize=100&active=true', { cache: 'no-store' }),
      ])
      if (teamsRes.ok) {
        const tj = await teamsRes.json()
        setTeams(tj.teams || [])
        if ((tj.teams || []).length > 0 && !targetTeamId) {
          setTargetTeamId((tj.teams[0] as TeamManageItem).id)
        }
      }
      if (rewardsRes.ok) {
        const rj = await rewardsRes.json()
        setRewards(rj.data || [])
      }
    } catch {
      // Silent — fields just won't be populated
    }
  }, [targetTeamId])

  useEffect(() => {
    if (open) fetchResources()
  }, [open, fetchResources])

  const reset = () => {
    setName('')
    setDescription('')
    setStartDate(toDateInput(today))
    setEndDate(toDateInput(inFourDays))
    setPrize('')
    setGiftCardValue('')
    setGiftCardCode('')
    setScoringModel('TOTAL_HOURS')
    setScope('COMPANY')
    setTargetTeamId(teams[0]?.id || '')
    setStatusChoice('ACTIVE')
    setIsRecurring(false)
    setLinkedRewards([])
  }

  const handleSubmit = async () => {
    if (!name.trim()) {
      toast.error('Please enter a challenge name')
      return
    }
    if (!prize.trim()) {
      toast.error('Please enter a prize description')
      return
    }
    if (!startDate || !endDate) {
      toast.error('Please select start and end dates')
      return
    }
    if (new Date(endDate) <= new Date(startDate)) {
      toast.error('End date must be after start date')
      return
    }
    if (scope === 'TEAM' && !targetTeamId) {
      toast.error('Please select a team for team-scoped challenges')
      return
    }

    setSubmitting(true)
    try {
      const body: Record<string, unknown> = {
        name: name.trim(),
        description: description.trim(),
        startDate,
        endDate,
        prize: prize.trim(),
        giftCardValue: Number(giftCardValue) || 0,
        giftCardCode: giftCardCode.trim(),
        scoringModel,
        scope,
        targetTeamId: scope === 'TEAM' ? targetTeamId : null,
        status: statusChoice,
        isRecurring,
        recurrencePattern: isRecurring ? 'weekly' : '',
      }
      if (linkedRewards.length > 0) {
        body.rewardIds = linkedRewards.map((r, idx) => ({
          rewardId: r.rewardId,
          tier: r.tier,
          position: idx + 1,
        }))
      }

      const res = await fetch('/api/admin/challenges', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to create challenge')
      toast.success(
        statusChoice === 'ACTIVE'
          ? 'Challenge is live! Employees notified.'
          : statusChoice === 'SCHEDULED'
            ? 'Challenge scheduled. It will auto-activate on the start date.'
            : 'Draft saved. You can launch it later.',
      )
      reset()
      onOpenChange(false)
      onCreated()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to create challenge')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[92vh] overflow-y-auto scrollbar-thin">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg">
            <span className="w-8 h-8 rounded-lg bg-amber-100 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <Gift className="w-4 h-4" />
            </span>
            Create Challenge
          </DialogTitle>
          <DialogDescription>
            Launch a deep work challenge with scoring, scope, scheduling, recurring options,
            and reward linking.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          {/* Lifecycle hint */}
          <div className="flex items-start gap-2 p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200/60 dark:border-emerald-800/40">
            <CalendarDays className="w-4 h-4 text-emerald-600 dark:text-emerald-400 mt-0.5 shrink-0" />
            <p className="text-xs text-emerald-800 dark:text-emerald-300">
              <span className="font-semibold">Suggested lifecycle:</span> Monday 9 AM → Friday 5 PM.
              Defaults are pre-filled (today → +4 days).
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="ch-name">Challenge name</Label>
            <Input
              id="ch-name"
              placeholder="e.g. Q4 Focus Sprint"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={80}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="ch-desc">Description</Label>
            <Textarea
              id="ch-desc"
              placeholder="Describe the goal, rules, and how teams can win…"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              maxLength={500}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="ch-start">Start date</Label>
              <Input
                id="ch-start"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ch-end">End date</Label>
              <Input
                id="ch-end"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
          </div>

          {/* Scoring model */}
          <div className="space-y-2">
            <Label className="flex items-center gap-1.5">
              <Target className="w-3.5 h-3.5" /> Scoring model
            </Label>
            <Select value={scoringModel} onValueChange={(v) => setScoringModel(v as ScoringModel)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(SCORING_META) as ScoringModel[]).map((m) => (
                  <SelectItem key={m} value={m}>
                    {SCORING_META[m].label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="flex items-start gap-1.5 text-xs text-muted-foreground">
              <Info className="w-3 h-3 mt-0.5 shrink-0" />
              <span>{SCORING_META[scoringModel].tooltip}</span>
            </div>
          </div>

          {/* Scope */}
          <div className="space-y-2">
            <Label className="flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5" /> Scope
            </Label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setScope('COMPANY')}
                className={`text-left p-3 rounded-lg border transition ${
                  scope === 'COMPANY'
                    ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/30 ring-1 ring-emerald-500'
                    : 'border-border hover:bg-muted/40'
                }`}
              >
                <p className="text-sm font-medium">Company-wide</p>
                <p className="text-xs text-muted-foreground">All teams compete together</p>
              </button>
              <button
                type="button"
                onClick={() => setScope('TEAM')}
                className={`text-left p-3 rounded-lg border transition ${
                  scope === 'TEAM'
                    ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/30 ring-1 ring-emerald-500'
                    : 'border-border hover:bg-muted/40'
                }`}
              >
                <p className="text-sm font-medium">Specific team</p>
                <p className="text-xs text-muted-foreground">Only one team participates</p>
              </button>
            </div>
            {scope === 'TEAM' && (
              <div className="pt-1">
                <Select value={targetTeamId} onValueChange={setTargetTeamId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a team" />
                  </SelectTrigger>
                  <SelectContent>
                    {teams.map((t) => (
                      <SelectItem key={t.id} value={t.id}>
                        <span className={`inline-block w-2 h-2 rounded-full mr-1.5 ${getColor(t.color).dot}`} />
                        {t.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {teams.length === 0 && (
                  <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
                    No teams available. Create a team first.
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Status */}
          <div className="space-y-2">
            <Label className="flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5" /> Status
            </Label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {(Object.keys(STATUS_META) as ChallengeStatusChoice[]).map((s) => (
                <Tooltip key={s}>
                  <TooltipTrigger asChild>
                    <button
                      type="button"
                      onClick={() => setStatusChoice(s)}
                      className={`text-left p-3 rounded-lg border transition h-full ${
                        statusChoice === s
                          ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/30 ring-1 ring-emerald-500'
                          : 'border-border hover:bg-muted/40'
                      }`}
                    >
                      <p className="text-sm font-medium">{STATUS_META[s].label}</p>
                      <p className="text-[11px] text-muted-foreground mt-0.5 leading-tight">
                        {STATUS_META[s].description}
                      </p>
                    </button>
                  </TooltipTrigger>
                  <TooltipContent>{STATUS_META[s].description}</TooltipContent>
                </Tooltip>
              ))}
            </div>
            {statusChoice === 'SCHEDULED' && (
              <p className="text-xs text-amber-600 dark:text-amber-400 mt-1 flex items-center gap-1.5">
                <Info className="w-3 h-3" />
                The scheduler will auto-activate this challenge on the start date.
              </p>
            )}
          </div>

          {/* Recurring */}
          <div className="flex items-start gap-3 p-3 rounded-lg border border-border/60 bg-muted/30">
            <Checkbox
              id="ch-recurring"
              checked={isRecurring}
              onCheckedChange={(v) => setIsRecurring(v === true)}
              className="mt-0.5"
            />
            <div className="flex-1 min-w-0">
              <Label htmlFor="ch-recurring" className="text-sm font-medium flex items-center gap-1.5 cursor-pointer">
                <Repeat className="w-3.5 h-3.5" /> Repeat weekly
              </Label>
              <p className="text-xs text-muted-foreground mt-0.5">
                The scheduler will create a new challenge instance each week with the same
                duration, scoring, scope, and rewards.
              </p>
            </div>
          </div>

          {/* Prize + gift card */}
          <div className="space-y-3">
            <div className="space-y-2">
              <Label htmlFor="ch-prize">Prize description</Label>
              <Input
                id="ch-prize"
                placeholder="e.g. $100 Team Lunch Gift Card"
                value={prize}
                onChange={(e) => setPrize(e.target.value)}
                maxLength={120}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="ch-value">Gift card value (USD)</Label>
                <Input
                  id="ch-value"
                  type="number"
                  min={0}
                  placeholder="100"
                  value={giftCardValue}
                  onChange={(e) => setGiftCardValue(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="ch-code" className="flex items-center gap-1.5">
                  Gift card code
                  <span className="text-xs text-muted-foreground font-normal">(emailed to winners)</span>
                </Label>
                <Input
                  id="ch-code"
                  placeholder="Paste code here"
                  value={giftCardCode}
                  onChange={(e) => setGiftCardCode(e.target.value)}
                  autoComplete="off"
                  spellCheck={false}
                />
              </div>
            </div>
            <div className="flex items-start gap-1.5 text-xs text-muted-foreground">
              <Info className="w-3 h-3 mt-0.5 shrink-0" />
              <span>
                The gift card code is emailed to the winning team when you end the challenge.
                You can also link catalog rewards below for tier-based prize delivery.
              </span>
            </div>
          </div>

          {/* Reward linking */}
          <RewardLinker
            rewards={rewards}
            linked={linkedRewards}
            onChange={setLinkedRewards}
          />
        </div>

        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={submitting}
          >
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={submitting} className="bg-emerald-600 hover:bg-emerald-700">
            {submitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" /> Creating…
              </>
            ) : (
              <>
                <Gift className="w-4 h-4" /> {statusChoice === 'ACTIVE' ? 'Launch Challenge' : statusChoice === 'SCHEDULED' ? 'Schedule Challenge' : 'Save Draft'}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ============================================================
// Reward linker — multi-select with per-reward tier
// ============================================================

function RewardLinker({
  rewards,
  linked,
  onChange,
}: {
  rewards: RewardItem[]
  linked: LinkedReward[]
  onChange: (next: LinkedReward[]) => void
}) {
  const [pickerOpen, setPickerOpen] = useState(false)

  const availableRewards = rewards.filter(
    (r) => !linked.some((l) => l.rewardId === r.id),
  )

  const addReward = (r: RewardItem) => {
    onChange([
      ...linked,
      {
        rewardId: r.id,
        tier: 'WINNER',
        name: r.name,
        type: r.type,
        imageColor: r.imageColor,
      },
    ])
    setPickerOpen(false)
  }

  const removeReward = (rewardId: string) => {
    onChange(linked.filter((l) => l.rewardId !== rewardId))
  }

  const updateTier = (rewardId: string, tier: RedemptionTier) => {
    onChange(linked.map((l) => (l.rewardId === rewardId ? { ...l, tier } : l)))
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <Label className="flex items-center gap-1.5">
          <Gift className="w-3.5 h-3.5" /> Linked rewards
          <span className="text-xs text-muted-foreground font-normal">(optional)</span>
        </Label>
        {availableRewards.length > 0 && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setPickerOpen((v) => !v)}
            className="h-7 gap-1"
          >
            <Plus className="w-3.5 h-3.5" /> Add reward
          </Button>
        )}
      </div>

      {pickerOpen && availableRewards.length > 0 && (
        <div className="rounded-lg border border-border/60 bg-card p-2 max-h-48 overflow-y-auto scrollbar-thin space-y-1">
          {availableRewards.map((r) => {
            const cc = getColor(r.imageColor || 'emerald')
            return (
              <button
                key={r.id}
                type="button"
                onClick={() => addReward(r)}
                className="w-full flex items-center gap-2 p-2 rounded-md hover:bg-muted/60 transition text-left"
              >
                <span
                  className={`shrink-0 w-7 h-7 rounded-md bg-gradient-to-br ${cc.gradient} text-white flex items-center justify-center`}
                >
                  <Gift className="w-3.5 h-3.5" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium truncate">{r.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {r.type.replace('_', ' ')} · {r.value > 0 ? `$${r.value}` : '—'}
                  </p>
                </div>
                <Plus className="w-3.5 h-3.5 text-muted-foreground" />
              </button>
            )
          })}
        </div>
      )}

      {linked.length === 0 ? (
        <p className="text-xs text-muted-foreground bg-muted/30 rounded-lg p-3 border border-dashed">
          No rewards linked. Winners will only receive the gift card code above. Link catalog
          rewards to enable tier-based prize delivery (e.g. Winner → $100 card, Runner-up →
          branded merch).
        </p>
      ) : (
        <div className="space-y-2">
          {linked.map((l) => {
            const cc = getColor(l.imageColor || 'emerald')
            return (
              <div
                key={l.rewardId}
                className="flex items-center gap-2 p-2.5 rounded-lg border border-border/60 bg-muted/20"
              >
                <span
                  className={`shrink-0 w-8 h-8 rounded-md bg-gradient-to-br ${cc.gradient} text-white flex items-center justify-center`}
                >
                  <Gift className="w-4 h-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium truncate">{l.name}</p>
                  <p className="text-xs text-muted-foreground">{l.type.replace('_', ' ')}</p>
                </div>
                <Select
                  value={l.tier}
                  onValueChange={(v) => updateTier(l.rewardId, v as RedemptionTier)}
                >
                  <SelectTrigger className="h-8 w-[130px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(Object.keys(TIER_META) as RedemptionTier[]).map((t) => {
                      const TierIcon = TIER_META[t].icon
                      return (
                        <SelectItem key={t} value={t}>
                          <span className="flex items-center gap-1.5">
                            <TierIcon className="w-3 h-3" />
                            {TIER_META[t].label}
                          </span>
                        </SelectItem>
                      )
                    })}
                  </SelectContent>
                </Select>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 shrink-0 text-muted-foreground hover:text-rose-600"
                  onClick={() => removeReward(l.rewardId)}
                  aria-label="Remove reward"
                >
                  <X className="w-3.5 h-3.5" />
                </Button>
              </div>
            )
          })}
          <div className="flex flex-wrap gap-1.5 pt-1">
            {linked.map((l) => {
              const TierIcon = TIER_META[l.tier].icon
              return (
                <Badge key={l.rewardId} className={TIER_META[l.tier].badge}>
                  <TierIcon className="w-3 h-3" /> {l.name} → {TIER_META[l.tier].label}
                </Badge>
              )
            })}
          </div>
        </div>
      )}

      {rewards.length === 0 && (
        <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
          No active rewards in your catalog. Create rewards in the Rewards tab to enable
          linking.
        </p>
      )}
    </div>
  )
}
