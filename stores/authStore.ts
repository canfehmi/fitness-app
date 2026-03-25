import { create } from 'zustand'
import { Session, User } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'

interface AuthState {
  session: Session | null
  user: User | null
  isLoading: boolean
  setSession: (session: Session | null) => void
  /** getSession asılırsa veya hata olursa spinner kilitlenmesin */
  clearAuthLoading: () => void
  signOut: () => Promise<void>
}

export const useAuthStore = create<AuthState>((set) => ({
  session: null,
  user: null,
  isLoading: true,

  setSession: (session) =>
    set({ session, user: session?.user ?? null, isLoading: false }),

  clearAuthLoading: () => set({ isLoading: false }),

  signOut: async () => {
    await supabase.auth.signOut()
    set({ session: null, user: null, isLoading: false })
  },
}))