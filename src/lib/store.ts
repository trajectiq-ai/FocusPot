import { create } from 'zustand'

export type Role = 'SUPER_ADMIN' | 'COMPANY_ADMIN' | 'EMPLOYEE'

export type SessionUser = {
  id: string
  email: string
  name: string
  role: Role
  companyId: string | null
  teamId: string | null
  avatarColor: string
}

type AuthState = {
  user: SessionUser | null
  loading: boolean
  // Mobile App Preview — admin testing tool to preview the employee mobile experience
  mobilePreview: boolean
  // When in mobile preview, the employee identity being previewed
  previewEmployeeId: string | null
  setUser: (user: SessionUser | null) => void
  setLoading: (loading: boolean) => void
  setMobilePreview: (on: boolean, employeeId?: string | null) => void
  logout: () => Promise<void>
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  loading: true,
  mobilePreview: false,
  previewEmployeeId: null,
  setUser: (user) => set({ user, loading: false }),
  setLoading: (loading) => set({ loading }),
  setMobilePreview: (on, employeeId = null) =>
    set({ mobilePreview: on, previewEmployeeId: on ? employeeId : null }),
  logout: async () => {
    await fetch('/api/auth/me', { method: 'POST' })
    set({ user: null, mobilePreview: false, previewEmployeeId: null })
  },
}))
