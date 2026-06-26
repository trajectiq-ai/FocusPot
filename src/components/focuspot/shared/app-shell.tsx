'use client'

import { useState } from 'react'
import { useAuthStore } from '@/lib/store'
import { getColor, getInitials } from '@/lib/colors'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { LogOut, ChevronDown, Settings, Smartphone } from 'lucide-react'
import { toast } from 'sonner'
import { ProfileDialog } from '@/components/focuspot/employee/profile-dialog'
import { EmailVerificationBanner } from '@/components/focuspot/email-verification-banner'

const roleLabels: Record<string, { label: string; color: string }> = {
  SUPER_ADMIN: { label: 'Super Admin', color: 'violet' },
  COMPANY_ADMIN: { label: 'Company Admin', color: 'amber' },
  EMPLOYEE: { label: 'Employee', color: 'emerald' },
}

export function AppShell({
  children,
  nav,
}: {
  children: React.ReactNode
  nav?: React.ReactNode
}) {
  const { user, logout, setMobilePreview } = useAuthStore()
  const [profileOpen, setProfileOpen] = useState(false)

  const handleLogout = async () => {
    await logout()
    toast.success('Signed out')
  }

  const handleMobilePreview = () => {
    // Open the mobile app preview simulator with no employee preselected.
    // The admin picks an employee from inside the phone frame.
    setMobilePreview(true, null)
    toast('📱 Opening Mobile App Preview', { duration: 2000 })
  }

  const canPreviewMobile =
    user?.role === 'SUPER_ADMIN' || user?.role === 'COMPANY_ADMIN'

  const roleInfo = user ? roleLabels[user.role] : { label: '', color: 'emerald' }
  const c = getColor(user?.avatarColor || 'emerald')

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Email verification banner — above the header so it's the first thing the admin sees */}
      <EmailVerificationBanner emailVerified={user?.emailVerified} />

      {/* Header */}
      <header className="border-b border-border/60 bg-background/80 backdrop-blur-sm sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-xl brand-gradient flex items-center justify-center shadow-sm shrink-0">
              <span className="text-lg">🌿</span>
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-bold text-lg tracking-tight">FocusPot</span>
                <span className={`hidden sm:inline-block text-[10px] font-medium px-1.5 py-0.5 rounded ${getColor(roleInfo.color).bgSoft} ${getColor(roleInfo.color).text}`}>
                  {roleInfo.label}
                </span>
              </div>
            </div>
          </div>

          {/* Nav (desktop) */}
          {nav && <nav className="hidden md:flex items-center gap-1">{nav}</nav>}

          <div className="flex items-center gap-2">
            {/* Mobile App Preview — admin testing tool */}
            {canPreviewMobile && (
              <Button
                onClick={handleMobilePreview}
                variant="outline"
                size="sm"
                className="hidden sm:inline-flex border-emerald-300 text-emerald-700 hover:bg-emerald-50 hover:text-emerald-800 dark:border-emerald-800 dark:text-emerald-400 dark:hover:bg-emerald-950/40"
                aria-label="Preview Mobile App"
                title="Preview the employee mobile app experience"
              >
                <Smartphone className="w-4 h-4 mr-1.5" />
                Preview Mobile App
              </Button>
            )}

            {/* User menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-2 pl-1 pr-2 py-1 rounded-full hover:bg-muted transition-colors">
                  <div className={`w-8 h-8 rounded-full bg-gradient-to-br ${c.gradient} flex items-center justify-center text-white text-xs font-semibold`}>
                    {user ? getInitials(user.name) : '?'}
                  </div>
                  <span className="hidden sm:inline text-sm font-medium max-w-[120px] truncate">{user?.name}</span>
                  <ChevronDown className="w-4 h-4 text-muted-foreground" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <div className="px-2 py-1.5">
                  <p className="text-sm font-medium truncate">{user?.name}</p>
                  <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
                </div>
                <DropdownMenuSeparator />
                {canPreviewMobile && (
                  <DropdownMenuItem
                    onClick={handleMobilePreview}
                    className="cursor-pointer"
                  >
                    <Smartphone className="w-4 h-4 mr-2 text-emerald-600" />
                    Preview Mobile App
                  </DropdownMenuItem>
                )}
                {user?.role === 'EMPLOYEE' && (
                  <DropdownMenuItem
                    onClick={() => setProfileOpen(true)}
                    className="cursor-pointer"
                  >
                    <Settings className="w-4 h-4 mr-2" />
                    Profile &amp; Settings
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem onClick={handleLogout} className="text-destructive focus:text-destructive cursor-pointer">
                  <LogOut className="w-4 h-4 mr-2" />
                  Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
        {/* Mobile nav */}
        {nav && (
          <div className="md:hidden border-t border-border/60 px-2 py-2 overflow-x-auto scrollbar-thin">
            <div className="flex items-center gap-1 min-w-max">{nav}</div>
          </div>
        )}
      </header>

      {/* Main content */}
      <main className="flex-1">{children}</main>

      {/* Footer */}
      <footer className="border-t border-border/60 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-5 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-muted-foreground">
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            FocusPot — Deep work, together.
          </div>
          <div className="flex items-center gap-3">
            <span>Privacy Shield active</span>
            <span>·</span>
            <span>$99–$199/mo per company</span>
          </div>
        </div>
      </footer>

      {/* Employee profile & settings dialog */}
      {user?.role === 'EMPLOYEE' && (
        <ProfileDialog open={profileOpen} onOpenChange={setProfileOpen} />
      )}
    </div>
  )
}

export function NavButton({
  active,
  onClick,
  icon: Icon,
  label,
}: {
  active: boolean
  onClick: () => void
  icon: typeof LogOut
  label: string
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
        active
          ? 'bg-primary text-primary-foreground'
          : 'text-muted-foreground hover:text-foreground hover:bg-muted'
      }`}
    >
      <Icon className="w-4 h-4" />
      {label}
    </button>
  )
}
