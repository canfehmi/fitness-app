import { useEffect } from "react";
import { useRouter } from "expo-router";
import { View, ActivityIndicator } from "react-native";
import { useAuthStore } from "@/stores/authStore";
import { useUserStore } from "@/stores/userStore";

export default function Index() {
  const router = useRouter();
  const { session, isLoading } = useAuthStore();
  const { profile } = useUserStore();

  useEffect(() => {
    if (isLoading) return;

    if (!session) {
      router.replace("/(onboarding)/goal");
      return;
    }

    if (!profile?.onboarding_completed) {
      router.replace("/(onboarding)/goal");
      return;
    }

    router.replace("/(tabs)");
  }, [session, isLoading, profile]);

  return (
    <View className="flex-1 items-center justify-center bg-dark-900">
      <ActivityIndicator size="large" color="#22c55e" />
    </View>
  );
}
