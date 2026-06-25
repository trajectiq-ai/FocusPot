'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { UserCog, Palette, KeyRound, Check } from 'lucide-react'
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
import { useAuthStore } from '@/lib/store'
import { getColor, getInitials } from '@/lib/colors'
import { toast } from 'sonner'

const AVATAR_COLORS = ['emerald', 'amber', 'rose', 'sky', 'violet', 'orange'] as const
type AvatarColor = (typeof AVATAR_COLORS)[number]

export function ProfileDialog({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const { user, setUser } = useAuthStore()

  // Form state — profile
  const [name, setName] = useState('')
  const [title, setTitle] = useState('')
  const [avatarColor, setAvatarColor] = useState<AvatarColor>('emerald')

  // Password state
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')

  const [saving, setSaving] = useState(false)

  // Sync form from store user whenever dialog opens
  useEffect(() => {
    if (open && user) {
      setName(user.name ?? '')
      setTitle((user as any).title ?? '')
      setAvatarColor(
        AVATAR_COLORS.includes(user.avatarColor as AvatarColor)
          ? (user.avatarColor as AvatarColor)
          : 'emerald'
      )
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
    }
  }, [open, user])

  if (!user) return null

  const c = getColor(avatarColor)

  const changingPassword = newPassword.length > 0 || confirmPassword.length > 0 || currentPassword.length > 0

  const validate = (): string | null => {
    if (name.trim().length < 2) return 'Name must be at least 2 characters'
    if (changingPassword) {
      if (!currentPassword) return 'Current password is required to change your password'
      if (newPassword.length < 6) return 'New password must be at least 6 characters'
      if (newPassword !== confirmPassword) return 'New passwords do not match'
    }
    return null
  }

  const handleSave = async () => {
    const err = validate()
    if (err) {
      toast.error(err)
      return
    }

    const payload: Record<string, string> = {}
    if (name.trim() !== user.name) payload.name = name.trim()
    if (title.trim() !== ((user as any).title ?? '')) payload.title = title.trim()
    if (avatarColor !== user.avatarColor) payload.avatarColor = avatarColor
    if (changingPassword) {
      payload.currentPassword = currentPassword
      payload.newPassword = newPassword
    }

    if (Object.keys(payload).length === 0) {
      toast('No changes to save')
      onOpenChange(false)
      return
    }

    setSaving(true)
    try {
      const res = await fetch('/api/employee/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to update profile')

      // Merge returned user into the session user (preserve fields like role/teamId/companyId).
      // `title` isn't part of SessionUser but we keep it on the object so the
      // dialog remembers it across re-opens.
      setUser({
        ...user,
        name: data.user.name,
        email: data.user.email,
        avatarColor: data.user.avatarColor,
        role: data.user.role,
        title: data.user.title,
      } as any)

      toast.success('Profile updated')
      onOpenChange(false)
    } catch (e: any) {
      toast.error(e.message || 'Failed to update profile')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto scrollbar-thin">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserCog className="w-5 h-5 text-primary" />
            Profile &amp; Settings
          </DialogTitle>
          <DialogDescription>
            Update your personal info, avatar color, and password.
          </DialogDescription>
        </DialogHeader>

        {/* Live preview */}
        <div className="flex items-center gap-3 p-3 rounded-xl bg-muted/40 border border-border/60">
          <div
            className={`w-12 h-12 rounded-full bg-gradient-to-br ${c.gradient} flex items-center justify-center text-white text-sm font-semibold shrink-0`}
          >
            {getInitials(name || user.name)}
          </div>
          <div className="min-w-0">
            <div className="text-sm font-medium truncate">{name || user.name}</div>
            <div className="text-xs text-muted-foreground truncate">
              {title || (user as any).title || user.email}
            </div>
          </div>
        </div>

        {/* Profile section */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-sm font-medium text-foreground/80">
            <UserCog className="w-4 h-4 text-muted-foreground" />
            Profile
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="profile-name" className="text-xs">Full name</Label>
            <Input
              id="profile-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your name"
              maxLength={100}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="profile-title" className="text-xs">Job title</Label>
            <Input
              id="profile-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Senior Engineer"
              maxLength={100}
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Palette className="w-4 h-4 text-muted-foreground" />
              <Label className="text-xs">Avatar color</Label>
            </div>
            <div className="grid grid-cols-6 gap-2">
              {AVATAR_COLORS.map((color) => {
                const cc = getColor(color)
                const active = avatarColor === color
                return (
                  <button
                    key={color}
                    type="button"
                    onClick={() => setAvatarColor(color)}
                    aria-label={color}
                    aria-pressed={active}
                    className={`relative aspect-square rounded-xl bg-gradient-to-br ${cc.gradient} flex items-center justify-center transition-all ${
                      active
                        ? 'ring-2 ring-offset-2 ring-offset-background ring-foreground scale-105'
                        : 'hover:scale-105 opacity-90 hover:opacity-100'
                    }`}
                  >
                    {active && <Check className="w-4 h-4 text-white" strokeWidth={3} />}
                  </button>
                )
              })}
            </div>
          </div>
        </div>

        {/* Divider */}
        <div className="relative my-1">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t border-border/60" />
          </div>
          <div className="relative flex justify-center">
            <span className="bg-background px-2 text-xs text-muted-foreground flex items-center gap-1.5">
              <KeyRound className="w-3 h-3" /> Change password
            </span>
          </div>
        </div>

        {/* Password section */}
        <motion.div
          initial={false}
          className="space-y-3"
        >
          <div className="space-y-1.5">
            <Label htmlFor="cur-pw" className="text-xs">Current password</Label>
            <Input
              id="cur-pw"
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              placeholder="••••••••"
              autoComplete="current-password"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="new-pw" className="text-xs">New password</Label>
            <Input
              id="new-pw"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Min. 6 characters"
              autoComplete="new-password"
            />
            {newPassword.length > 0 && newPassword.length < 6 && (
              <p className="text-[11px] text-rose-500">Password must be at least 6 characters</p>
            )}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="confirm-pw" className="text-xs">Confirm new password</Label>
            <Input
              id="confirm-pw"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Re-enter new password"
              autoComplete="new-password"
            />
            {confirmPassword.length > 0 && newPassword !== confirmPassword && (
              <p className="text-[11px] text-rose-500">Passwords do not match</p>
            )}
          </div>
          <p className="text-[11px] text-muted-foreground">
            Leave password fields blank to keep your current password.
          </p>
        </motion.div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? 'Saving…' : 'Save changes'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
