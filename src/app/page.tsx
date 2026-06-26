'use client'

import { useEffect } from 'react'
import { useAuthStore } from '@/lib/store'
import { LoginScreen } from '@/components/focuspot/login-screen'
import { CompanyAdminDashboard } from '@/components/focuspot/company-admin-dashboard'
import { SuperAdminDashboard } from '@/components/focuspot/super-admin-dashboard'
import { MobileAppPreview } from '@/components/focuspot/mobile/app-preview'

export default function Home() {
  const { user, loading, setUser, mobilePreview } = useAuthStore()

  useEffect(() => {
    fetch('/api/auth/me', { cache: 'no-store' })
      .then((r) => r.json())
      .then((data) => {
        setUser(data.user || null)
      })
      .catch(() => setUser(null))
  }, [setUser])

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
