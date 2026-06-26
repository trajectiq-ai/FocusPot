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
  setUser: (user: SessionUser | null) => void
  setLoading: (loading: boolean) => void
  logout: () => Promise<void>
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  loading: true,
  setUser: (user) => set({ user, loading: false }),
  setLoading: (loading) => set({ loading }),
  logout: async () => {
    await fetch('/api/auth/me', { method: 'POST' })
    set({ user: null })
  },
}))
