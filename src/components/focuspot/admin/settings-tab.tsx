'use client'

// Company Admin → Settings tab
// Lets the admin view/edit company info, manage the join code, and see billing.

import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import {
  Building2,
  KeyRound,
  Copy,
  Check,
  RefreshCw,
  Pencil,
  Loader2,
  CreditCard,
  Users,
  AlertTriangle,
  ShieldCheck,
  TrendingUp,
  Globe,
} from 'lucide-react'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Progress } from '@/components/ui/progress'
import { Separator } from '@/components/ui/separator'
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
import type { CompanyInfo } from './types'

function subscriptionStyle(status: string) {
  switch (status) {
    case 'ACTIVE':
      return {
        badge: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300',
        dot: 'bg-emerald-500',
        label: 'Active',
      }
    case 'PAST_DUE':
      return {
        badge: 'bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300',
        dot: 'bg-amber-500',
        label: 'Past Due',
      }
    case 'CANCELED':
      return {
        badge: 'bg-rose-100 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300',
        dot: 'bg-rose-500',
        label: 'Canceled',
      }
    default:
      return {
        badge: 'bg-muted text-muted-foreground',
        dot: 'bg-muted-foreground',
        label: status || 'Unknown',
      }
  }
}

export function SettingsTab({
  company,
  totalEmployees,
  onRefresh,
}: {
  company: CompanyInfo
  totalEmployees: number
  onRefresh: () => void
}) {
  const [joinCode, setJoinCode] = useState(company.joinCode)
  const [copied, setCopied] = useState(false)
  const [regenerateOpen, setRegenerateOpen] = useState(false)
  const [editNameOpen, setEditNameOpen] = useState(false)
  const [regenerating, setRegenerating] = useState(false)

  useEffect(() => {
    setJoinCode(company.joinCode)
  }, [company.joinCode])

  const sub = subscriptionStyle(company.subscriptionStatus)
  const seatsPct = Math.min(
    100,
    company.seats > 0 ? Math.round((totalEmployees / company.seats) * 100) : 0
  )
  const seatsLeft = company.seats - totalEmployees
  const isStarter = company.plan === 'STARTER'
  const approachingLimit = isStarter && seatsLeft <= 10

  const copyCode = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
      toast.success('Join code copied')
    } catch {
      toast.error('Could not copy to clipboard')
    }
  }

  const handleRegenerate = async () => {
    setRegenerating(true)
    try {
      const res = await fetch('/api/admin/company', { method: 'POST' })
      const j = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(j.error || 'Failed to regenerate code')
      setJoinCode(j.joinCode)
      setRegenerateOpen(false)
      toast.success('Join code regenerated')
      onRefresh()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to regenerate code')
    } finally {
      setRegenerating(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold tracking-tight">Settings</h2>
        <p className="text-sm text-muted-foreground mt-0.5">
          Manage your company profile, join code, and subscription.
        </p>
      </div>

      {/* JOIN CODE — CRITICAL ONBOARDING ARTIFACT */}
      <Card className="overflow-hidden border-emerald-200/70 dark:border-emerald-800/50">
        <div className="h-1.5 bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-600" />
        <CardHeader>
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div>
              <CardTitle className="text-lg flex items-center gap-2">
                <span className="w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                  <KeyRound className="w-4 h-4" />
                </span>
                Company Join Code
              </CardTitle>
              <CardDescription className="mt-1">
                Share this code with your employees. They&apos;ll use it at signup to join your
                company workspace.
              </CardDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setRegenerateOpen(true)}
              className="gap-1.5 shrink-0"
            >
              <RefreshCw className="w-3.5 h-3.5" /> Regenerate
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Big monospace code display */}
          <div className="relative rounded-xl border-2 border-dashed border-emerald-300 dark:border-emerald-700/60 bg-emerald-50/60 dark:bg-emerald-950/20 p-5 sm:p-6 text-center">
            <p className="text-[11px] uppercase tracking-widest text-emerald-700/70 dark:text-emerald-300/70 font-semibold mb-2">
              Your join code
            </p>
            <div className="flex items-center justify-center gap-3 flex-wrap">
              <code className="text-2xl sm:text-4xl font-bold tracking-[0.15em] font-mono text-emerald-700 dark:text-emerald-300 break-all">
                {joinCode}
              </code>
              <Button
                variant="outline"
                size="icon"
                onClick={() => copyCode(joinCode)}
                className={`shrink-0 ${copied ? 'text-emerald-600 border-emerald-300' : ''}`}
                aria-label="Copy join code"
              >
                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              </Button>
            </div>
          </div>

          <div className="flex items-start gap-2 p-3 rounded-lg bg-muted/40 border border-border/60">
            <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400 mt-0.5 shrink-0" />
            <div className="text-xs text-muted-foreground">
              <p className="font-medium text-foreground mb-0.5">How employees use this code</p>
              Send your team to the FocusPot signup page and ask them to enter this code in the
              &quot;Join Code&quot; field. They&apos;ll be added to your company and assigned to a
              default team.
            </div>
          </div>
        </CardContent>
      </Card>

      {/* COMPANY INFO */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <span className="w-8 h-8 rounded-lg bg-violet-100 dark:bg-violet-950/50 text-violet-600 dark:text-violet-400 flex items-center justify-center">
              <Building2 className="w-4 h-4" />
            </span>
            Company Information
          </CardTitle>
          <CardDescription>Your company profile as it appears across FocusPot.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Company name</Label>
              <div className="flex items-center gap-2">
                <Input value={company.name} readOnly className="bg-muted/40 font-medium" />
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setEditNameOpen(true)}
                  aria-label="Edit company name"
                >
                  <Pencil className="w-4 h-4" />
                </Button>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Domain</Label>
              <div className="flex items-center gap-2 h-9 px-3 rounded-md border border-input bg-muted/30">
                <Globe className="w-3.5 h-3.5 text-muted-foreground" />
                <span className="text-sm font-medium truncate">{company.domain}</span>
                <span className="ml-auto text-[10px] text-muted-foreground">read-only</span>
              </div>
            </div>
          </div>
          <Separator />
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div>
              <p className="text-xs text-muted-foreground">Plan</p>
              <p className="text-sm font-semibold font-mono">{company.plan}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Monthly revenue</p>
              <p className="text-sm font-semibold tabular-nums">${company.monthlyRevenue}/mo</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Seats</p>
              <p className="text-sm font-semibold tabular-nums">
                {totalEmployees} / {company.seats}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Subscription</p>
              <Badge className={sub.badge}>
                <span className={`w-1.5 h-1.5 rounded-full ${sub.dot} mr-1`} />
                {sub.label}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* BILLING */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <span className="w-8 h-8 rounded-lg bg-sky-100 dark:bg-sky-950/50 text-sky-600 dark:text-sky-400 flex items-center justify-center">
              <CreditCard className="w-4 h-4" />
            </span>
            Billing & Subscription
          </CardTitle>
          <CardDescription>
            Plans are managed by the FocusPot Super Admin team via Stripe. To upgrade or change
            your plan, contact support.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="rounded-lg border border-border/60 p-4 bg-muted/30">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <TrendingUp className="w-3.5 h-3.5" /> Monthly revenue
              </div>
              <p className="text-2xl font-bold tabular-nums mt-1">
                ${company.monthlyRevenue}
                <span className="text-sm font-normal text-muted-foreground">/mo</span>
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {company.plan === 'STARTER' ? '$99/mo base plan' : company.plan === 'GROWTH' ? '$199/mo base plan' : 'Custom'}
              </p>
            </div>
            <div className="rounded-lg border border-border/60 p-4 bg-muted/30">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Users className="w-3.5 h-3.5" /> Seat usage
              </div>
              <p className="text-2xl font-bold tabular-nums mt-1">
                {totalEmployees}
                <span className="text-sm font-normal text-muted-foreground"> / {company.seats}</span>
              </p>
              <Progress value={seatsPct} className="h-1.5 mt-2" />
              <p className="text-xs text-muted-foreground mt-1">{seatsLeft} available</p>
            </div>
            <div className="rounded-lg border border-border/60 p-4 bg-muted/30">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <CreditCard className="w-3.5 h-3.5" /> Plan
              </div>
              <p className="text-2xl font-bold font-mono mt-1">{company.plan}</p>
              <Badge className={`${sub.badge} mt-1`}>{sub.label}</Badge>
            </div>
          </div>

          {approachingLimit && (
            <div className="flex items-start gap-3 p-4 rounded-xl bg-amber-50 dark:bg-amber-950/20 border border-amber-200/70 dark:border-amber-800/50">
              <div className="shrink-0 w-9 h-9 rounded-lg bg-amber-100 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                <TrendingUp className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-amber-900 dark:text-amber-100">
                  Approaching your Starter seat limit
                </p>
                <p className="text-xs text-amber-800/80 dark:text-amber-200/80 mt-0.5">
                  You have {seatsLeft} seat{seatsLeft === 1 ? '' : 's'} remaining on your Starter
                  plan (50 seats). Upgrade to Growth for 200 seats at $199/mo — managed by the
                  FocusPot Super Admin team via Stripe.
                </p>
              </div>
            </div>
          )}

          {company.subscriptionStatus === 'PAST_DUE' && (
            <div className="flex items-start gap-3 p-4 rounded-xl bg-amber-50 dark:bg-amber-950/20 border border-amber-200/70 dark:border-amber-800/50">
              <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
              <div>
                <p className="text-sm font-semibold text-amber-900 dark:text-amber-100">
                  Payment past due
                </p>
                <p className="text-xs text-amber-800/80 dark:text-amber-200/80 mt-0.5">
                  Your latest invoice is past due. Update your billing details to avoid service
                  interruption.
                </p>
              </div>
            </div>
          )}

          {company.subscriptionStatus === 'CANCELED' && (
            <div className="flex items-start gap-3 p-4 rounded-xl bg-rose-50 dark:bg-rose-950/20 border border-rose-200/70 dark:border-rose-800/50">
              <AlertTriangle className="w-5 h-5 text-rose-600 dark:text-rose-400 mt-0.5 shrink-0" />
              <div>
                <p className="text-sm font-semibold text-rose-900 dark:text-rose-100">
                  Subscription canceled
                </p>
                <p className="text-xs text-rose-800/80 dark:text-rose-200/80 mt-0.5">
                  Your subscription has been canceled. Contact FocusPot support to reactivate your
                  account.
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* DANGER ZONE */}
      <Card className="border-rose-200 dark:border-rose-800/50">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2 text-rose-700 dark:text-rose-400">
            <AlertTriangle className="w-5 h-5" />
            Danger Zone
          </CardTitle>
          <CardDescription>
            Irreversible actions. Proceed with caution.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between flex-wrap gap-3 p-4 rounded-lg border border-rose-200/60 dark:border-rose-800/40 bg-rose-50/40 dark:bg-rose-950/10">
            <div className="min-w-0">
              <p className="text-sm font-medium">Regenerate join code</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Invalidates the old code. Employees who haven&apos;t joined yet will need the new
                one.
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setRegenerateOpen(true)}
              className="border-rose-300 text-rose-700 hover:bg-rose-50 dark:border-rose-800/60 dark:text-rose-400 dark:hover:bg-rose-950/30 gap-1.5"
            >
              <RefreshCw className="w-3.5 h-3.5" /> Regenerate code
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Edit name dialog */}
      <EditNameDialog
        open={editNameOpen}
        onOpenChange={setEditNameOpen}
        currentName={company.name}
        onSaved={() => {
          setEditNameOpen(false)
          onRefresh()
        }}
      />

      {/* Regenerate confirm */}
      <AlertDialog open={regenerateOpen} onOpenChange={setRegenerateOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <RefreshCw className="w-5 h-5 text-amber-500" /> Regenerate join code?
            </AlertDialogTitle>
            <AlertDialogDescription>
              This will <span className="font-semibold text-foreground">invalidate the old code</span>{' '}
              immediately. Employees who have already joined are unaffected, but anyone who hasn&apos;t
              joined yet will need the new code. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={regenerating}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-amber-600 hover:bg-amber-700 text-white"
              onClick={async (e) => {
                e.preventDefault()
                await handleRegenerate()
              }}
              disabled={regenerating}
            >
              {regenerating ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" /> Regenerating…
                </>
              ) : (
                <>
                  <RefreshCw className="w-4 h-4" /> Regenerate code
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

function EditNameDialog({
  open,
  onOpenChange,
  currentName,
  onSaved,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  currentName: string
  onSaved: () => void
}) {
  const [name, setName] = useState(currentName)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (open) setName(currentName)
  }, [open, currentName])

  const submit = async () => {
    if (!name.trim() || name.trim().length < 2) {
      toast.error('Company name must be at least 2 characters')
      return
    }
    if (name.trim() === currentName) {
      onOpenChange(false)
      return
    }
    setSubmitting(true)
    try {
      const res = await fetch('/api/admin/company', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim() }),
      })
      const j = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(j.error || 'Failed to update')
      toast.success('Company name updated')
      onSaved()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to update')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Pencil className="w-4 h-4 text-muted-foreground" /> Edit company name
          </DialogTitle>
          <DialogDescription>
            This is how your company appears to employees and on FocusPot.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="company-name">Company name</Label>
            <Input
              id="company-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={100}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={submitting} className="bg-emerald-600 hover:bg-emerald-700">
            {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
