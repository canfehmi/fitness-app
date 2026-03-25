import { supabase } from "@/lib/supabase";
import { formatPostgrestError } from "@/lib/supabaseError";
import { clearOnboardingDraft } from "@/lib/onboardingDraft";
import type { UserFitnessPreferences } from "@/types/fitness";
import {
  metricsForUpsert,
  parsePreferredMinutes,
} from "@/lib/userPreferencesMetrics";

/**
 * Onboarding son adımında profiles + user_preferences kaydı.
 * Google ile önceden giriş yapmış kullanıcılar için onboarding_completed = true.
 */
export async function persistOnboardingCompletion(
  userId: string,
  prefs: UserFitnessPreferences,
) {
  const { data: authData, error: authErr } = await supabase.auth.getSession();
  if (authErr) throw authErr;
  const uid = authData.session?.user?.id;
  if (!uid || uid !== userId) {
    throw new Error(
      "Oturum bulunamadı veya kullanıcı eşleşmiyor. Lütfen tekrar giriş yapın.",
    );
  }

  const { data: existing } = await supabase
    .from("profiles")
    .select("full_name, avatar_url")
    .eq("id", userId)
    .maybeSingle();

  const row = existing as {
    full_name: string | null;
    avatar_url: string | null;
  } | null;

  const { error: pErr } = await supabase.from("profiles").upsert(
    {
      id: userId,
      full_name: row?.full_name ?? null,
      avatar_url: row?.avatar_url ?? null,
      onboarding_completed: true,
      preferred_language: "tr",
    } as any,
    { onConflict: "id" },
  );
  if (pErr) throw formatPostgrestError(pErr);

  const m = metricsForUpsert(prefs);
  const { error: uErr } = await supabase.from("user_preferences").upsert(
    {
      user_id: userId,
      goal: prefs.goal,
      level: prefs.level,
      preferred_minutes: parsePreferredMinutes(prefs.preferred_minutes),
      current_weight: m.current_weight,
      target_weight: m.target_weight,
      height_cm: m.height_cm,
    } as any,
    { onConflict: "user_id" },
  );
  if (uErr) throw formatPostgrestError(uErr);

  await clearOnboardingDraft();
}
