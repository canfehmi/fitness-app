import type { User } from "@supabase/supabase-js";
import { supabase } from "./supabase";
import {
  clearOnboardingDraft,
  isOnboardingPreferencesComplete,
  loadOnboardingDraft,
  mergeOnboardingPreferences,
} from "./onboardingDraft";
import {
  metricsForUpsert,
  parsePreferredMinutes,
} from "./userPreferencesMetrics";
import type { UserFitnessPreferences } from "@/types/fitness";

export type OAuthNavigateDeps = {
  setSession: (session: import("@supabase/supabase-js").Session | null) => void;
  setProfile: (p: any) => void;
  setPreferences: (p: any) => void;
  preferences: UserFitnessPreferences | null;
  router: { replace: (href: string) => void };
};

/** Hash + query; query overrides hash (same behavior as @supabase/auth-js). */
export function parseOAuthParamsFromUrl(href: string): Record<string, string> {
  try {
    const url = new URL(href);
    const result: Record<string, string> = {};
    if (url.hash?.startsWith("#")) {
      try {
        const hashParams = new URLSearchParams(url.hash.substring(1));
        hashParams.forEach((value, key) => {
          result[key] = value;
        });
      } catch {
        /* ignore */
      }
    }
    url.searchParams.forEach((value, key) => {
      result[key] = value;
    });
    return result;
  } catch {
    const result: Record<string, string> = {};
    const part = href.includes("#")
      ? href.split("#")[1]
      : href.includes("?")
        ? href.split("?")[1]
        : "";
    if (!part) return result;
    const q = new URLSearchParams(part);
    q.forEach((value, key) => {
      result[key] = value;
    });
    return result;
  }
}

export async function establishSessionFromOAuthParams(
  params: Record<string, string>,
): Promise<{ session: import("@supabase/supabase-js").Session | null; error: Error | null }> {
  if (params.error || params.error_description) {
    const msg =
      params.error_description || params.error || "OAuth iptal edildi veya hata oluştu";
    return { session: null, error: new Error(msg) };
  }

  const code = params.code;
  const accessToken = params.access_token;
  const refreshToken = params.refresh_token;

  if (code) {
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) return { session: null, error };
    return { session: data.session, error: null };
  }

  if (accessToken && refreshToken) {
    const { data, error } = await supabase.auth.setSession({
      access_token: accessToken,
      refresh_token: refreshToken,
    });
    if (error) return { session: null, error };
    return { session: data.session, error: null };
  }

  return { session: null, error: null };
}

async function upsertNewOAuthProfile(
  user: User,
  deps: OAuthNavigateDeps,
): Promise<{ onboarding_completed: boolean }> {
  const draft = await loadOnboardingDraft();
  const merged = mergeOnboardingPreferences(deps.preferences, draft);
  const onboarding_completed = isOnboardingPreferencesComplete(merged);

  const { error: pErr } = await supabase.from("profiles").upsert(
    {
      id: user.id,
      full_name: (user.user_metadata?.full_name as string | undefined) ?? null,
      avatar_url: (user.user_metadata?.avatar_url as string | undefined) ?? null,
      onboarding_completed,
      preferred_language: "tr",
    } as any,
    { onConflict: "id" },
  );
  if (pErr) {
    console.error("[oauth] profiles upsert", pErr);
    throw pErr;
  }
  const m = metricsForUpsert(merged);
  const { error: uErr } = await supabase.from("user_preferences").upsert(
    {
      user_id: user.id,
      goal: merged.goal,
      level: merged.level,
      preferred_minutes: parsePreferredMinutes(merged.preferred_minutes),
      current_weight: m.current_weight,
      target_weight: m.target_weight,
      height_cm: m.height_cm,
    } as any,
    { onConflict: "user_id" },
  );
  if (uErr) {
    console.error("[oauth] user_preferences upsert", uErr);
    throw uErr;
  }

  await clearOnboardingDraft();
  deps.setPreferences(merged as any);
  return { onboarding_completed };
}

async function syncProfileToStore(userId: string, deps: OAuthNavigateDeps) {
  const [{ data: profile }, { data: prefs }] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", userId).maybeSingle(),
    supabase.from("user_preferences").select("*").eq("user_id", userId).maybeSingle(),
  ]);
  if (profile) deps.setProfile(profile as any);
  if (prefs) deps.setPreferences(prefs as any);
}

/**
 * Yeni Google kullanıcı: taslakta onboarding tamamsa profiles.onboarding_completed true.
 * Uygulama içi onboarding bitmemişse false + onboarding ekranı.
 */
const PROFILE_QUERY_MS = 4000;

export async function navigateAfterOAuthSession(
  user: User,
  deps: OAuthNavigateDeps,
) {
  let target: "/(tabs)" | "/(onboarding)/goal" = "/(onboarding)/goal";

  try {
    const profileQuery = supabase
      .from("profiles")
      .select("onboarding_completed")
      .eq("id", user.id)
      .maybeSingle();

    const { data, error } = await Promise.race([
      profileQuery,
      new Promise<{ data: null; error: { message: string } }>((resolve) =>
        setTimeout(
          () => resolve({ data: null, error: { message: "timeout" } }),
          PROFILE_QUERY_MS,
        ),
      ),
    ]);

    if (error?.message === "timeout") {
      try {
        const { onboarding_completed } = await upsertNewOAuthProfile(user, deps);
        await syncProfileToStore(user.id, deps);
        target = onboarding_completed ? "/(tabs)" : "/(onboarding)/goal";
      } catch (e) {
        console.error("[oauth] timeout profile sync", e);
        target = "/(onboarding)/goal";
      }
    } else if (error) {
      target = "/(onboarding)/goal";
    } else {
      const p = data as { onboarding_completed: boolean } | null;
      if (!p) {
        const { onboarding_completed } = await upsertNewOAuthProfile(user, deps);
        await syncProfileToStore(user.id, deps);
        target = onboarding_completed ? "/(tabs)" : "/(onboarding)/goal";
      } else if (p.onboarding_completed) {
        await syncProfileToStore(user.id, deps);
        target = "/(tabs)";
      } else {
        await syncProfileToStore(user.id, deps);
        target = "/(onboarding)/goal";
      }
    }
  } catch {
    target = "/(onboarding)/goal";
  }

  deps.router.replace(target);
}

export async function completeOAuthRedirect(
  url: string,
  deps: OAuthNavigateDeps,
): Promise<boolean> {
  const params = parseOAuthParamsFromUrl(url);
  let { session, error } = await establishSessionFromOAuthParams(params);
  if (error) throw error;

  if (!session?.user) {
    const { data } = await supabase.auth.getSession();
    session = data.session;
  }
  if (!session?.user) return false;

  deps.setSession(session);
  await navigateAfterOAuthSession(session.user, deps);
  return true;
}

export async function syncSessionFromStorageAndNavigate(
  deps: OAuthNavigateDeps,
): Promise<boolean> {
  const { data } = await supabase.auth.getSession();
  if (!data.session?.user) return false;
  deps.setSession(data.session);
  await navigateAfterOAuthSession(data.session.user, deps);
  return true;
}
