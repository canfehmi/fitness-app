import { supabase } from "@/lib/supabase";

const PROFILE_DECISION_MS = 5000;

/**
 * Tek gerçek kaynak: `profiles.onboarding_completed` (Supabase).
 * Zustand profili gecikirse bile yanlış onboarding/tabs kararı verilmez.
 */
export async function resolveInitialHref(userId: string): Promise<string> {
  const query = supabase
    .from("profiles")
    .select("onboarding_completed")
    .eq("id", userId)
    .maybeSingle();

  type Ok = { kind: "ok"; data: { onboarding_completed: boolean } | null; error: unknown };
  type Timed = { kind: "timeout" };

  const result = await Promise.race<Ok | Timed>([
    query.then((r) => ({
      kind: "ok" as const,
      data: r.data as { onboarding_completed: boolean } | null,
      error: r.error,
    })),
    new Promise<Timed>((resolve) =>
      setTimeout(() => resolve({ kind: "timeout" }), PROFILE_DECISION_MS),
    ),
  ]);

  if (result.kind === "timeout") {
    return "/(tabs)";
  }

  if (result.error) {
    return "/(tabs)";
  }

  if (result.data === null) {
    return "/(onboarding)/goal";
  }

  return result.data.onboarding_completed ? "/(tabs)" : "/(onboarding)/goal";
}

export async function hydrateUserStores(userId: string) {
  const [{ data: profile }, { data: preferences }] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", userId).maybeSingle(),
    supabase.from("user_preferences").select("*").eq("user_id", userId).maybeSingle(),
  ]);
  return { profile, preferences };
}
