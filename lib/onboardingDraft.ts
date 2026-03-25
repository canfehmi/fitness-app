import AsyncStorage from "@react-native-async-storage/async-storage";
import type { UserFitnessPreferences } from "@/types/fitness";
import { EMPTY_USER_FITNESS_PREFERENCES } from "@/types/fitness";
import { normalizeUserFitnessPreferences } from "@/lib/fitnessPreferences";

const KEY = "@fitness/onboarding_draft_v1";

/** Tarayıcı OAuth / süreç yeniden başlama sonrası Zustand boşalsa bile onboarding seçimleri kalır. */
export type OnboardingDraft = UserFitnessPreferences;

/** goal + set + vücut bilgisi (3. adım) doluysa onboarding uygulamada tamamlanmış sayılır. */
export function isOnboardingPreferencesComplete(
  p: UserFitnessPreferences | null,
): boolean {
  if (!p) return false;
  return (
    p.goal != null &&
    p.level != null &&
    p.current_weight != null &&
    p.target_weight != null &&
    p.height_cm != null
  );
}

export function mergeOnboardingPreferences(
  store: UserFitnessPreferences | null,
  draft: UserFitnessPreferences | null,
): UserFitnessPreferences {
  const merged: Record<string, unknown> = {
    goal: store?.goal ?? draft?.goal ?? null,
    level: store?.level ?? draft?.level ?? null,
    preferred_minutes:
      store?.preferred_minutes ?? draft?.preferred_minutes ?? null,
    current_weight: store?.current_weight ?? draft?.current_weight ?? null,
    target_weight: store?.target_weight ?? draft?.target_weight ?? null,
    height_cm: store?.height_cm ?? draft?.height_cm ?? null,
  };
  return (
    normalizeUserFitnessPreferences(merged) ?? {
      ...EMPTY_USER_FITNESS_PREFERENCES,
    }
  );
}

export async function saveOnboardingDraft(
  prefs: UserFitnessPreferences,
): Promise<void> {
  try {
    await AsyncStorage.setItem(KEY, JSON.stringify(prefs));
  } catch {
    /* ignore */
  }
}

export async function loadOnboardingDraft(): Promise<OnboardingDraft | null> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object") return null;
    return normalizeUserFitnessPreferences(parsed as Record<string, unknown>);
  } catch {
    return null;
  }
}

export async function clearOnboardingDraft(): Promise<void> {
  try {
    await AsyncStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
}
