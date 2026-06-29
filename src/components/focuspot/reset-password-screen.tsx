'use client'

import { useState, useEffect, FormEvent } from 'react'
import { motion } from 'framer-motion'
import {
  KeyRound,
  CheckCircle,
  AlertCircle,
  Loader2,
  ArrowLeft,
  ShieldCheck,
  Eye,
  EyeOff,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import { toast } from 'sonner'

type Status = 'form' | 'submitting' | 'success' | 'error'

export function ResetPasswordScreen({ token }: { token: string }) {
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [status, setStatus] = useState<Status>('form')
  const [errorMessage, setErrorMessage] = useState('')

  // Auto-clear the ?reset=TOKEN query string so a refresh doesn't resubmit
  useEffect(() => {
    if (typeof window === 'undefined') return
    const url = new URL(window.location.href)
    if (url.searchParams.has('reset')) {
      url.searchParams.delete('reset')
      window.history.replaceState({}, '', url.toString())
    }
  }, [])

  const validate = (): string | null => {
    if (password.length < 6) return 'Password must be at least 6 characters'
    if (password !== confirm) return 'Passwords do not match'
    return null
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setErrorMessage('')
    const err = validate()
    if (err) {
      setStatus('error')
      setErrorMessage(err)
      toast.error(err)
      return
    }
    setStatus('submitting')
    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        throw new Error(data.error || data.message || 'Reset failed')
      }
      setStatus('success')
      toast.success('Password reset successfully')
    } catch (e: any) {
      setStatus('error')
      const msg = e?.message || 'This reset link is invalid or has expired'
      setErrorMessage(msg)
      toast.error(msg)
    }
  }

  const handleSignIn = () => {
    // Hard reload to `/` so the login screen renders fresh
    window.location.href = '/'
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Compact header */}
      <header className="border-b border-border/60 backdrop-blur-sm bg-background/80 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <a
            href="/"
            className="flex items-center gap-2.5 group"
            aria-label="Back to FocusPot home"
          >
            <div className="w-9 h-9 rounded-xl brand-gradient flex items-center justify-center shadow-sm">
              <span className="text-lg">🌿</span>
            </div>
            <span className="font-bold text-lg tracking-tight group-hover:text-primary transition-colors">
              FocusPot
            </span>
          </a>
          <a
            href="/"
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden sm:inline">Back to sign in</span>
            <span className="sm:hidden">Sign in</span>
          </a>
        </div>
      </header>

      {/* Centered card */}
      <main className="flex-1 flex items-center justify-center px-4 py-10 sm:py-16">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="w-full max-w-md"
        >
          <Card className="border-border/60 shadow-xl shadow-primary/5">
            <CardContent className="p-6 sm:p-8">
              {status === 'success' ? (
                <SuccessState onSignIn={handleSignIn} />
              ) : (
                <>
                  <div className="flex items-center gap-2.5 mb-5">
                    <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-950/50 flex items-center justify-center">
                      <KeyRound className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                    </div>
                    <div>
                      <h1 className="text-xl font-semibold tracking-tight">Reset your password</h1>
                      <p className="text-xs text-muted-foreground">
                        Choose a new password for your FocusPot account.
                      </p>
                    </div>
                  </div>

                  {status === 'error' && errorMessage && (
                    <div className="flex items-start gap-2.5 p-3 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200/60 dark:border-rose-800/40 mb-4">
                      <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
                      <p className="text-xs text-rose-700 dark:text-rose-300 flex-1">
                        {errorMessage}
                      </p>
                    </div>
                  )}

                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-1.5">
                      <Label htmlFor="new-password" className="text-xs">New password</Label>
                      <div className="relative">
                        <Input
                          id="new-password"
                          type={showPassword ? 'text' : 'password'}
                          placeholder="Min. 6 characters"
                          value={password}
                          onChange={(e) => {
                            setPassword(e.target.value)
                            if (status === 'error') setStatus('form')
                          }}
                          autoComplete="new-password"
                          autoFocus
                          required
                          className="pr-10"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword((s) => !s)}
                          className="absolute inset-y-0 right-0 px-3 flex items-center text-muted-foreground hover:text-foreground transition-colors"
                          aria-label={showPassword ? 'Hide password' : 'Show password'}
                        >
                          {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="confirm-password" className="text-xs">Confirm password</Label>
                      <Input
                        id="confirm-password"
                        type={showPassword ? 'text' : 'password'}
                        placeholder="Re-enter your new password"
                        value={confirm}
                        onChange={(e) => {
                          setConfirm(e.target.value)
                          if (status === 'error') setStatus('form')
                        }}
                        autoComplete="new-password"
                        required
                      />
                    </div>

                    {/* Password strength hint */}
                    <div className="flex items-start gap-2 p-2.5 rounded-lg bg-muted/40">
                      <ShieldCheck className="w-3.5 h-3.5 text-muted-foreground shrink-0 mt-0.5" />
                      <p className="text-[11px] text-muted-foreground leading-relaxed">
                        Use at least 6 characters. A strong, unique password protects your team&apos;s focus data.
                      </p>
                    </div>

                    <Button
                      type="submit"
                      className="w-full bg-emerald-600 hover:bg-emerald-700 gap-1.5"
                      disabled={status === 'submitting' || !password || !confirm}
                      size="lg"
                    >
                      {status === 'submitting' ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Resetting…
                        </>
                      ) : (
                        <>
                          <KeyRound className="w-4 h-4" />
                          Reset password
                        </>
                      )}
                    </Button>
                  </form>

                  <p className="text-xs text-muted-foreground text-center mt-4">
                    Remembered your password?{' '}
                    <a
                      href="/"
                      className="text-primary hover:underline font-medium"
                    >
                      Sign in
                    </a>
                  </p>
                </>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </main>

      <footer className="border-t border-border/60 mt-auto">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-5 flex items-center justify-center gap-2 text-xs text-muted-foreground">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
          FocusPot — Deep work, together.
        </div>
      </footer>
    </div>
  )
}

function SuccessState({ onSignIn }: { onSignIn: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3 }}
      className="text-center py-4"
    >
      <div className="w-14 h-14 rounded-2xl bg-emerald-100 dark:bg-emerald-950/50 flex items-center justify-center mx-auto mb-4">
        <CheckCircle className="w-7 h-7 text-emerald-600 dark:text-emerald-400" />
      </div>
      <h2 className="text-xl font-semibold mb-1.5">Password reset!</h2>
      <p className="text-sm text-muted-foreground mb-6 max-w-xs mx-auto">
        Your password has been updated successfully. You can now sign in with your new password.
      </p>
      <Button
        onClick={onSignIn}
        className="w-full bg-emerald-600 hover:bg-emerald-700 gap-1.5"
        size="lg"
      >
        Sign in
        <ArrowLeft className="w-4 h-4 rotate-180" />
      </Button>
    </motion.div>
  )
}
