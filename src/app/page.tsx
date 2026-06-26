'use client'

import { Suspense, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { CheckCircle2, AlertCircle } from 'lucide-react'
import { useAuthStore } from '@/lib/store'
import { toast } from 'sonner'
import { LoginScreen } from '@/components/focuspot/login-screen'
import { CompanyAdminDashboard } from '@/components/focuspot/company-admin-dashboard'
import { SuperAdminDashboard } from '@/components/focuspot/super-admin-dashboard'
import { MobileAppPreview } from '@/components/focuspot/mobile/app-preview'
import { ResetPasswordScreen } from '@/components/focuspot/reset-password-screen'

function PageLogic() {
  const { user, loading, setUser, mobilePreview } = useAuthStore()
  const searchParams = useSearchParams()
  const resetToken = searchParams.get('reset')
  const verify = searchParams.get('verify')

  // Fetch the current session
  useEffect(() => {
    fetch('/api/auth/me', { cache: 'no-store' })
      .then((r) => r.json())
      .then((data) => {
        setUser(data.user || null)
      })
      .catch(() => setUser(null))
  }, [setUser])

  // Handle `?verify=success|invalid` → show toast (deduped) + clean URL
  useEffect(() => {
    if (typeof window === 'undefined') return
    if (verify !== 'success' && verify !== 'invalid') return

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
      } else {
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

    // Strip the verify param from the URL so refreshes don't re-fire the toast.
    const url = new URL(window.location.href)
    url.searchParams.delete('verify')
    window.history.replaceState({}, '', url.toString())
  }, [verify])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-2xl brand-gradient flex items-center justify-center animate-pulse">
            <span className="text-2xl">🌿</span>
          </div>
          <p className="text-sm text-muted-foreground">Loading FocusPot…</p>
        </div>
      </div>
    )
  }

  // Reset password flow — only triggered when user is NOT logged in
  if (resetToken && resetToken.length >= 10 && !user) {
    return <ResetPasswordScreen token={resetToken} />
  }

  // Not logged in → login screen (admin-only web portal)
  if (!user) {
    return <LoginScreen />
  }

  // Mobile App Preview mode (admin testing tool)
  if (mobilePreview) {
    return <MobileAppPreview />
  }

  // Web application — Super Admin and Company Admin only
  // Employees are blocked at the API level and never reach here
  if (user.role === 'SUPER_ADMIN') return <SuperAdminDashboard />
  if (user.role === 'COMPANY_ADMIN') return <CompanyAdminDashboard />

  // Safety net: if an employee somehow reaches here, show access denied
  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-6">
      <div className="max-w-md text-center">
        <div className="w-16 h-16 rounded-2xl bg-amber-100 dark:bg-amber-950/50 flex items-center justify-center mx-auto mb-4">
          <span className="text-3xl">📱</span>
        </div>
        <h1 className="text-xl font-bold mb-2">Web Access Not Available</h1>
        <p className="text-sm text-muted-foreground mb-4">
          Employee accounts must use the FocusPot mobile app (Android & iOS).
          The web portal is for administrators only.
        </p>
        <button
          onClick={() => useAuthStore.getState().logout()}
          className="text-sm text-primary hover:underline"
        >
          Sign out
        </button>
      </div>
    </div>
  )
}

export default function Home() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-background">
          <div className="flex flex-col items-center gap-4">
            <div className="w-12 h-12 rounded-2xl brand-gradient flex items-center justify-center animate-pulse">
              <span className="text-2xl">🌿</span>
            </div>
            <p className="text-sm text-muted-foreground">Loading FocusPot…</p>
          </div>
        </div>
      }
    >
      <PageLogic />
    </Suspense>
  )
}
