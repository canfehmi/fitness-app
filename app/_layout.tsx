import "@/global.css";
import "@/lib/i18n";
import "react-native-url-polyfill/auto";

import { useEffect } from "react";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { supabase } from "@/lib/supabase";
import { useAuthStore } from "@/stores/authStore";
import { useUserStore } from "@/stores/userStore";

export default function RootLayout() {
  const { setSession } = useAuthStore();
  const { setProfile, setPreferences, reset } = useUserStore();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session?.user) loadUserData(session.user.id);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setSession(session);
      if (session?.user) {
        loadUserData(session.user.id);
      } else {
        reset();
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const loadUserData = async (userId: string) => {
    const [{ data: profile }, { data: preferences }] = await Promise.all([
      supabase.from("profiles").select("*").eq("id", userId).single(),
      supabase
        .from("user_preferences")
        .select("*")
        .eq("user_id", userId)
        .single(),
    ]);

    if (profile) setProfile(profile as any);
    if (preferences) setPreferences(preferences as any);
  };

  return (
    <>
      <StatusBar style="light" />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(onboarding)" />
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen
          name="workout/session"
          options={{ presentation: "fullScreenModal" }}
        />
      </Stack>
    </>
  );
}
