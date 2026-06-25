'use client'

import { useEffect } from 'react'
import { useAuthStore } from '@/lib/store'
import { LoginScreen } from '@/components/focuspot/login-screen'
import { EmployeeDashboard } from '@/components/focuspot/employee-dashboard'
import { CompanyAdminDashboard } from '@/components/focuspot/company-admin-dashboard'
import { SuperAdminDashboard } from '@/components/focuspot/super-admin-dashboard'

export default function Home() {
  const { user, loading, setUser, setLoading } = useAuthStore()

  useEffect(() => {
    fetch('/api/auth/me')
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

  if (!user) {
    return <LoginScreen />
  }

  if (user.role === 'SUPER_ADMIN') return <SuperAdminDashboard />
  if (user.role === 'COMPANY_ADMIN') return <CompanyAdminDashboard />
  return <EmployeeDashboard />
}
