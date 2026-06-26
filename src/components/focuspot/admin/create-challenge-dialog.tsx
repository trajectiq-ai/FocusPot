'use client'

import { useState } from 'react'
import { Gift, CalendarDays, Info, Loader2 } from 'lucide-react'
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

function toDateInput(d: Date) {
  // local date (no timezone shift)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

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

  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [startDate, setStartDate] = useState(toDateInput(today))
  const [endDate, setEndDate] = useState(toDateInput(inFourDays))
  const [prize, setPrize] = useState('')
  const [giftCardValue, setGiftCardValue] = useState('')
  const [giftCardCode, setGiftCardCode] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const reset = () => {
    setName('')
    setDescription('')
    setStartDate(toDateInput(today))
    setEndDate(toDateInput(inFourDays))
    setPrize('')
    setGiftCardValue('')
    setGiftCardCode('')
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

    setSubmitting(true)
    try {
      const res = await fetch('/api/admin/challenges', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim(),
          startDate,
          endDate,
          prize: prize.trim(),
          giftCardValue: Number(giftCardValue) || 0,
          giftCardCode: giftCardCode.trim(),
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to create challenge')
      toast.success('Challenge created! Employees notified.')
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
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto scrollbar-thin">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg">
            <span className="w-8 h-8 rounded-lg bg-amber-100 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <Gift className="w-4 h-4" />
            </span>
            Create Weekly Challenge
          </DialogTitle>
          <DialogDescription>
            Launch a company-wide focus challenge. All employees will be notified instantly.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
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
              placeholder="Paste Amazon/Tremendous code here"
              value={giftCardCode}
              onChange={(e) => setGiftCardCode(e.target.value)}
              autoComplete="off"
              spellCheck={false}
            />
            <div className="flex items-start gap-1.5 text-xs text-muted-foreground">
              <Info className="w-3 h-3 mt-0.5 shrink-0" />
              <span>
                Paste the digital gift card code from Amazon or Tremendous. It will be emailed to the
                winning team automatically when you end the challenge.
              </span>
            </div>
          </div>
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
                <Gift className="w-4 h-4" /> Launch Challenge
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
