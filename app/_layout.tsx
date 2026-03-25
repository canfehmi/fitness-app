import "@/global.css";
import "@/lib/i18n";
import "react-native-url-polyfill/auto";

import { useEffect } from "react";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { supabase } from "@/lib/supabase";
import { useAuthStore } from "@/stores/authStore";
import { useUserStore } from "@/stores/userStore";

export default function RootLayout() {
  const { setSession, clearAuthLoading } = useAuthStore();
  const { setProfile, setPreferences, reset } = useUserStore();

  useEffect(() => {
    let alive = true;

    (async () => {
      const safety = setTimeout(() => {
        if (!alive) return;
        clearAuthLoading();
      }, 12000);
      try {
        const { data } = await supabase.auth.getSession();
        if (!alive) return;
        setSession(data.session);
        if (data.session?.user) void loadUserData(data.session.user.id);
      } catch {
        if (!alive) return;
        setSession(null);
      } finally {
        clearTimeout(safety);
      }
    })();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === "SIGNED_OUT") {
        setSession(null);
        reset();
        return;
      }
      if (session?.user) {
        setSession(session);
        void loadUserData(session.user.id);
      }
    });

    return () => {
      alive = false;
      subscription.unsubscribe();
    };
  }, []);

  const loadUserData = async (userId: string) => {
    const [{ data: profile }, { data: preferences }] = await Promise.all([
      supabase.from("profiles").select("*").eq("id", userId).maybeSingle(),
      supabase
        .from("user_preferences")
        .select("*")
        .eq("user_id", userId)
        .maybeSingle(),
    ]);
    if (profile) setProfile(profile as any);
    if (preferences) setPreferences(preferences as any);
  };

  return (
    <SafeAreaProvider>
      <StatusBar style="light" />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(onboarding)" />
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen
          name="workout/session"
          options={{ presentation: "fullScreenModal" }}
        />
        <Stack.Screen
          name="workout/completion"
          options={{ presentation: "fullScreenModal" }}
        />
      </Stack>
    </SafeAreaProvider>
  );
}
