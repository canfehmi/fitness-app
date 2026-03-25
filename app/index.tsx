import { useEffect, useRef } from "react";
import { useRouter } from "expo-router";
import { View, ActivityIndicator, Text } from "react-native";
import { useAuthStore } from "@/stores/authStore";
import { useUserStore } from "@/stores/userStore";
import { hydrateUserStores, resolveInitialHref } from "@/lib/initialRoute";

const FALLBACK_MS = 8000;

/**
 * Tek seferlik yönlendirme: Supabase'ten onboarding_completed okunur (lib/initialRoute).
 * Zustand profiline güvenilmez — yanlış onboarding/tabs döngüsünü keser.
 */
export default function Index() {
  const router = useRouter();
  const { isLoading } = useAuthStore();
  const { setProfile, setPreferences } = useUserStore();
  const navigated = useRef(false);

  useEffect(() => {
    if (isLoading) return;
    if (navigated.current) return;

    let alive = true;

    const fallback = setTimeout(() => {
      if (!alive || navigated.current) return;
      navigated.current = true;
      router.replace("/(tabs)");
    }, FALLBACK_MS);

    void (async () => {
      await new Promise((r) => setTimeout(r, 50));
      if (!alive) return;

      const session = useAuthStore.getState().session;

      try {
        if (!session?.user) {
          navigated.current = true;
          router.replace("/(onboarding)/goal");
          return;
        }

        const href = await resolveInitialHref(session.user.id);
        if (!alive) return;
        navigated.current = true;
        router.replace(href as any);

        void hydrateUserStores(session.user.id).then(({ profile, preferences }) => {
          if (profile) setProfile(profile as any);
          if (preferences) setPreferences(preferences as any);
        });
      } catch {
        if (alive) {
          navigated.current = true;
          router.replace("/(tabs)");
        }
      } finally {
        clearTimeout(fallback);
      }
    })();

    return () => {
      alive = false;
      clearTimeout(fallback);
    };
  }, [isLoading, router, setProfile, setPreferences]);

  return (
    <View className="flex-1 items-center justify-center bg-dark-900 px-6">
      <ActivityIndicator size="large" color="#22c55e" />
      <Text className="text-gray-500 text-xs mt-6 text-center">
        Yükleniyor…
      </Text>
    </View>
  );
}
