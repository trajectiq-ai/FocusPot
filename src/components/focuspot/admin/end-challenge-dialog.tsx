'use client'

import { useState } from 'react'
import { Trophy, Loader2, AlertTriangle, Gift } from 'lucide-react'
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
import type { ActiveChallenge } from './types'

export function EndChallengeDialog({
  challenge,
  open,
  onOpenChange,
  onEnded,
}: {
  challenge: ActiveChallenge | null
  open: boolean
  onOpenChange: (v: boolean) => void
  onEnded: () => void
}) {
  const [giftCardCode, setGiftCardCode] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async () => {
    if (!challenge) return
    if (!giftCardCode.trim() && challenge.giftCardValue > 0) {
      toast.error('Please paste the gift card code to distribute to the winning team')
      return
    }
    setSubmitting(true)
    try {
      const res = await fetch(`/api/admin/challenges/${challenge.id}/end`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ giftCardCode: giftCardCode.trim() }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to end challenge')
      const winnerName = data.winnerTeam?.name
      if (winnerName) {
        toast.success(`Challenge ended! Winning team: ${winnerName} 🏆`, {
          description: `${data.notifiedEmployees || 0} employees notified.`,
        })
      } else {
        toast.success('Challenge ended. No winning team was determined.')
      }
      setGiftCardCode('')
      onOpenChange(false)
      onEnded()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to end challenge')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg">
            <span className="w-8 h-8 rounded-lg bg-rose-100 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400 flex items-center justify-center">
              <Trophy className="w-4 h-4" />
            </span>
            End Challenge Now
          </DialogTitle>
          <DialogDescription>
            This will compute the winning team by total focus hours and notify all employees
            immediately.
          </DialogDescription>
        </DialogHeader>

        {challenge && (
          <div className="rounded-lg border border-border/60 bg-muted/40 p-3 space-y-1">
            <p className="text-sm font-medium">{challenge.name}</p>
            <p className="text-xs text-muted-foreground">
              Prize: {challenge.prize}
              {challenge.giftCardValue > 0 && ` · $${challenge.giftCardValue} gift card`}
            </p>
          </div>
        )}

        <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200/60 dark:border-amber-800/40">
          <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
          <p className="text-xs text-amber-800 dark:text-amber-300">
            Ending the challenge early will tally all focus sessions logged so far and crown the
            winning team. This action cannot be undone.
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="end-code" className="flex items-center gap-1.5">
            <Gift className="w-3.5 h-3.5" />
            Gift card code for the winning team
          </Label>
          <Input
            id="end-code"
            placeholder="Paste the gift card code"
            value={giftCardCode}
            onChange={(e) => setGiftCardCode(e.target.value)}
            autoComplete="off"
            spellCheck={false}
          />
          <p className="text-xs text-muted-foreground">
            The code will be &quot;emailed&quot; to the winning team members automatically.
          </p>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={submitting}
            className="bg-rose-600 hover:bg-rose-700 text-white"
          >
            {submitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" /> Ending…
              </>
            ) : (
              <>
                <Trophy className="w-4 h-4" /> End &amp; Crown Winner
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
