import { create } from 'zustand'
import { Goal, Level, Language } from '../types/database'

interface UserProfile {
  id: string
  full_name: string | null
  avatar_url: string | null
  onboarding_completed: boolean
  preferred_language: Language
}

interface UserPreferences {
  goal: Goal | null
  level: Level | null
  preferred_minutes: number | null
  current_weight: number | null
  target_weight: number | null
  height_cm: number | null
}

interface UserState {
  profile: UserProfile | null
  preferences: UserPreferences | null
  setProfile: (profile: UserProfile) => void
  setPreferences: (prefs: UserPreferences) => void
  updateOnboardingData: (data: Partial<UserPreferences>) => void
  reset: () => void
}

export const useUserStore = create<UserState>((set) => ({
  profile: null,
  preferences: null,

  setProfile: (profile) => set({ profile }),

  setPreferences: (preferences) => set({ preferences }),

  updateOnboardingData: (data) =>
    set((state) => ({
      preferences: state.preferences
        ? { ...state.preferences, ...data }
        : {
            goal: null,
            level: null,
            preferred_minutes: null,
            current_weight: null,
            target_weight: null,
            height_cm: null,
            ...data,
          },
    })),

  reset: () => set({ profile: null, preferences: null }),
}))