import { create } from "zustand";
import type { Language } from "../types/database";
import type { UserFitnessPreferences } from "../types/fitness";
import { saveOnboardingDraft, clearOnboardingDraft } from "../lib/onboardingDraft";
import {
  mergeUserFitnessPreferences,
  normalizeUserFitnessPreferences,
  parseGoal,
  parseLevel,
} from "../lib/fitnessPreferences";
import {
  parseMetric,
  parsePreferredMinutes,
} from "../lib/userPreferencesMetrics";

interface UserProfile {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  onboarding_completed: boolean;
  preferred_language: Language;
}

interface UserState {
  profile: UserProfile | null;
  preferences: UserFitnessPreferences | null;
  setProfile: (profile: UserProfile) => void;
  setPreferences: (prefs: Record<string, unknown> | UserFitnessPreferences | null) => void;
  updateOnboardingData: (data: Partial<UserFitnessPreferences>) => void;
  reset: () => void;
}

export const useUserStore = create<UserState>((set) => ({
  profile: null,
  preferences: null,

  setProfile: (profile) => set({ profile }),

  setPreferences: (preferences) =>
    set({
      preferences: preferences
        ? normalizeUserFitnessPreferences(
            preferences as Record<string, unknown>,
          )
        : null,
    }),

  updateOnboardingData: (data) =>
    set((state) => {
      const patch: Partial<UserFitnessPreferences> = {};
      if ("goal" in data && data.goal !== undefined) {
        patch.goal = parseGoal(data.goal);
      }
      if ("level" in data && data.level !== undefined) {
        patch.level = parseLevel(data.level);
      }
      if ("current_weight" in data) {
        patch.current_weight = parseMetric(data.current_weight);
      }
      if ("target_weight" in data) {
        patch.target_weight = parseMetric(data.target_weight);
      }
      if ("height_cm" in data) {
        patch.height_cm = parseMetric(data.height_cm);
      }
      if ("preferred_minutes" in data && data.preferred_minutes !== undefined) {
        patch.preferred_minutes = parsePreferredMinutes(data.preferred_minutes);
      }
      const preferences = mergeUserFitnessPreferences(state.preferences, patch);
      void saveOnboardingDraft(preferences);
      return { preferences };
    }),

  reset: () => {
    void clearOnboardingDraft();
    set({ profile: null, preferences: null });
  },
}));
