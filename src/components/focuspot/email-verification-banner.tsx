'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Mail, Loader2, X, AlertCircle, CheckCircle2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'

const DISMISS_KEY = 'focuspot:emailVerifyBannerDismissed'

/**
 * EmailVerificationBanner
 *
 * Shows at the top of admin dashboards when the logged-in user's email is
 * not yet verified. Dismissible for the current session (persists via
 * sessionStorage). Also reacts to the `?verify=success|invalid` query
 * params produced by the email verification callback and surfaces a toast.
 */
export function EmailVerificationBanner({
  emailVerified,
}: {
  emailVerified?: boolean
}) {
  const [dismissed, setDismissed] = useState(false)
  const [sending, setSending] = useState(false)

  // Read dismiss flag from sessionStorage on mount
  useEffect(() => {
    try {
      const v = window.sessionStorage.getItem(DISMISS_KEY)
      if (v === '1') setDismissed(true)
    } catch {
      // sessionStorage may be unavailable (private mode, etc.) — ignore
    }
  }, [])

  // Surface a toast on `?verify=success|invalid` and clean the URL.
  // Uses a sessionStorage dedupe flag so it fires exactly once per verify
  // value even if both page.tsx and this banner mount in the same session.
  useEffect(() => {
    if (typeof window === 'undefined') return
    const url = new URL(window.location.href)
    const verify = url.searchParams.get('verify')
    if (!verify) return

    const dedupeKey = `focuspot:verifyToastShown:${verify}`
    let alreadyShown = false
    try {
      alreadyShown = window.sessionStorage.getItem(dedupeKey) === '1'
    } catch {
      alreadyShown = false
    }

    if (!alreadyShown) {
      if (verify === 'success') {
        toast.success('Email verified! You can now access all FocusPot features.', {
          icon: <CheckCircle2 className="w-4 h-4" />,
          duration: 5000,
        })
      } else if (verify === 'invalid') {
        toast.error('This verification link is invalid or has expired.', {
          icon: <AlertCircle className="w-4 h-4" />,
          duration: 6000,
        })
      }
      try {
        window.sessionStorage.setItem(dedupeKey, '1')
      } catch {
        // ignore
      }
    }

    // Strip the query param so a refresh doesn't re-fire the toast
    url.searchParams.delete('verify')
    window.history.replaceState({}, '', url.toString())
  }, [])

  const handleResend = async () => {
    setSending(true)
    try {
      const res = await fetch('/api/auth/resend-verification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        throw new Error(data.error || 'Failed to resend verification email')
      }
      toast.success('Verification email sent — check your inbox.', {
        icon: <Mail className="w-4 h-4" />,
      })
    } catch (e: any) {
      toast.error(e?.message || 'Failed to resend verification email')
    } finally {
      setSending(false)
    }
  }

  const handleDismiss = () => {
    setDismissed(true)
    try {
      window.sessionStorage.setItem(DISMISS_KEY, '1')
    } catch {
      // ignore
    }
  }

  const shouldShow = !emailVerified && !dismissed

  return (
    <AnimatePresence initial={false}>
      {shouldShow && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          transition={{ duration: 0.2 }}
          className="bg-amber-50 dark:bg-amber-950/40 border-b border-amber-200/70 dark:border-amber-800/50 overflow-hidden"
          role="status"
          aria-live="polite"
        >
          <div className="max-w-7xl mx-auto px-4 sm:px-6 py-2.5 flex items-center gap-3">
            <div className="w-7 h-7 rounded-lg bg-amber-100 dark:bg-amber-900/50 flex items-center justify-center shrink-0">
              <Mail className="w-4 h-4 text-amber-600 dark:text-amber-400" />
            </div>
            <p className="text-xs sm:text-sm text-amber-800 dark:text-amber-200 flex-1 min-w-0">
              <span className="font-medium">Please verify your email address.</span>{' '}
              <span className="hidden sm:inline">Some features may be limited until verified.</span>
            </p>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={handleResend}
              disabled={sending}
              className="h-7 sm:h-8 px-2.5 sm:px-3 text-xs gap-1.5 border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-950/30 text-amber-800 dark:text-amber-200 hover:bg-amber-100 dark:hover:bg-amber-900/40"
            >
              {sending ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span className="hidden sm:inline">Sending…</span>
                </>
              ) : (
                <>
                  <Mail className="w-3.5 h-3.5" />
                  Resend
                </>
              )}
            </Button>
            <button
              type="button"
              onClick={handleDismiss}
              aria-label="Dismiss verification banner"
              className="w-7 h-7 rounded-md flex items-center justify-center text-amber-700 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-900/50 transition-colors shrink-0"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
