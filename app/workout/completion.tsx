import { useEffect, useMemo, useState } from "react";
import { View, Text, TouchableOpacity, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { supabase } from "@/lib/supabase";
import { useAuthStore } from "@/stores/authStore";
import { useUserStore } from "@/stores/userStore";
import type { WorkoutHistoryEntry, WeightLogRow } from "@/types/fitness";
import { analyzeWorkoutStreaks } from "@/lib/workoutStreaks";
import {
  buildCoachInsightsInput,
  deriveCoachInsights,
} from "@/lib/coachInsights";
import { hapticMedium } from "@/lib/haptics";

function formatDurationLabel(seconds: number): string {
  const mins = Math.max(1, Math.round(seconds / 60));
  return `${mins} dk`;
}

export default function WorkoutCompletionScreen() {
  const router = useRouter();
  const { user } = useAuthStore();
  const { preferences } = useUserStore();
  const params = useLocalSearchParams<{
    title?: string;
    durationSeconds?: string;
    estimatedCalories?: string;
  }>();

  const [sessions, setSessions] = useState<WorkoutHistoryEntry[]>([]);
  const [weightLogs, setWeightLogs] = useState<WeightLogRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }
    void (async () => {
      setLoading(true);
      const [{ data: workoutRows }, { data: weightRows }] = await Promise.all([
        supabase
          .from("workout_sessions")
          .select("id, started_at, completed_at, duration_seconds")
          .eq("user_id", user.id)
          .not("completed_at", "is", null)
          .order("started_at", { ascending: false })
          .limit(60),
        supabase
          .from("weight_logs")
          .select("*")
          .eq("user_id", user.id)
          .order("logged_at", { ascending: false })
          .limit(20),
      ]);
      setSessions((workoutRows as WorkoutHistoryEntry[]) ?? []);
      setWeightLogs((weightRows as WeightLogRow[]) ?? []);
      setLoading(false);
    })();
  }, [user]);

  const durationSeconds = Number(params.durationSeconds ?? "0");
  const estimatedCalories = Number(params.estimatedCalories ?? "0");
  const title = typeof params.title === "string" ? params.title : "Antrenman";

  const streak = useMemo(() => analyzeWorkoutStreaks(sessions), [sessions]);
  const coachInsights = useMemo(() => {
    return deriveCoachInsights(
      buildCoachInsightsInput({
        preferences,
        workoutSessions: sessions,
        weightLogs,
      }),
    );
  }, [preferences, sessions, weightLogs]);

  const burnLabel =
    Number.isFinite(estimatedCalories) && estimatedCalories > 0
      ? `~${estimatedCalories} kcal`
      : coachInsights.todayCalorieBurnRange
        ? `${coachInsights.todayCalorieBurnRange.min}–${coachInsights.todayCalorieBurnRange.max} kcal`
        : "Tahmin için birkaç seans verisi daha gerekli";

  const handleGoHome = () => {
    hapticMedium();
    router.replace("/(tabs)");
  };

  const handleViewProgress = () => {
    hapticMedium();
    router.replace("/(tabs)/progress");
  };

  return (
    <SafeAreaView className="flex-1 bg-dark-900">
      <View className="flex-1 px-6 py-10 justify-center">
        <Text className="text-6xl text-center mb-4">✅</Text>
        <Text className="text-white text-3xl font-bold text-center mb-2">
          Antrenman Tamamlandı
        </Text>
        <Text className="text-gray-400 text-sm text-center mb-8 leading-5">
          {title} seansını başarıyla tamamladın. İstikrarın hedefe giden en güçlü adım.
        </Text>

        {loading ? (
          <ActivityIndicator color="#22c55e" size="large" />
        ) : (
          <>
            <View className="flex-row gap-3 mb-3">
              <SummaryTile label="Süre" value={formatDurationLabel(durationSeconds)} />
              <SummaryTile label="Tahmini Yakım" value={burnLabel} />
            </View>
            <View className="flex-row gap-3 mb-6">
              <SummaryTile label="Güncel Seri" value={`${streak.currentStreakDays} gün`} />
              <SummaryTile
                label="Bu Hafta"
                value={`${streak.workoutsCompletedThisWeek} antrenman`}
              />
            </View>
          </>
        )}

        <View className="bg-dark-700 border border-primary-500/25 rounded-2xl p-4 mb-8">
          <Text className="text-primary-400 text-xs font-semibold uppercase tracking-wide mb-2">
            Koç Notu
          </Text>
          <Text className="text-gray-200 text-sm leading-5">
            {coachInsights.motivationalSummary}
          </Text>
        </View>

        <TouchableOpacity
          onPress={handleGoHome}
          className="bg-primary-500 rounded-2xl py-4 items-center mb-3"
        >
          <Text className="text-white text-base font-bold">Ana Sayfaya Dön</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={handleViewProgress}
          className="bg-dark-700 border border-dark-600 rounded-2xl py-4 items-center"
        >
          <Text className="text-white text-base font-bold">İlerleme Ekranını Aç</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

function SummaryTile({ label, value }: { label: string; value: string }) {
  return (
    <View className="flex-1 bg-dark-700 border border-dark-600 rounded-2xl p-4">
      <Text className="text-gray-400 text-xs uppercase tracking-wide font-semibold mb-1">
        {label}
      </Text>
      <Text className="text-white text-sm font-bold leading-5">{value}</Text>
    </View>
  );
}

