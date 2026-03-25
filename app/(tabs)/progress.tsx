import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useState, useEffect, useMemo } from "react";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { useAuthStore } from "@/stores/authStore";
import { useUserStore } from "@/stores/userStore";
import { supabase } from "@/lib/supabase";
import {
  formatKgValueOnly,
  parseMetric,
} from "@/lib/userPreferencesMetrics";
import { parseWeightKgForLog } from "@/lib/fitnessPreferences";
import type { WeightLogRow, WorkoutHistoryEntry } from "@/types/fitness";
import { analyzeWorkoutStreaks } from "@/lib/workoutStreaks";
import { computeGoalProgressFromPreferences } from "@/lib/goalProgress";
import {
  hapticError,
  hapticLight,
  hapticMedium,
  hapticSuccess,
} from "@/lib/haptics";

export default function ProgressScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { user } = useAuthStore();
  const { preferences } = useUserStore();

  const [weightLogs, setWeightLogs] = useState<WeightLogRow[]>([]);
  const [sessions, setSessions] = useState<WorkoutHistoryEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [newWeight, setNewWeight] = useState("");
  const [showWeightInput, setShowWeightInput] = useState(false);
  const [weightSaving, setWeightSaving] = useState(false);

  useEffect(() => {
    if (!user) {
      setIsLoading(false);
      return;
    }
    fetchData();
  }, [user]);

  const fetchData = async () => {
    if (!user) return;
    setIsLoading(true);
    try {
      const [{ data: logs }, { data: workoutSessions }] = await Promise.all([
        supabase
          .from("weight_logs")
          .select("*")
          .eq("user_id", user.id)
          .order("logged_at", { ascending: false })
          .limit(10),
        supabase
          .from("workout_sessions")
          .select("id, started_at, completed_at, duration_seconds")
          .eq("user_id", user.id)
          .not("completed_at", "is", null)
          .order("started_at", { ascending: false })
          .limit(30),
      ]);
      if (logs) setWeightLogs(logs as WeightLogRow[]);
      if (workoutSessions) setSessions(workoutSessions as WorkoutHistoryEntry[]);
    } catch (err) {
      console.error(err);
      hapticError();
      Alert.alert(t("common.error_title"), t("common.error"));
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddWeight = async () => {
    if (!user) return;
    const kg = parseWeightKgForLog(newWeight);
    if (kg === null) return;
    hapticLight();
    setWeightSaving(true);
    try {
      const { error } = await supabase.from("weight_logs").insert({
        user_id: user.id,
        weight_kg: kg,
        logged_at: new Date().toISOString(),
      } as any);
      if (error) {
        hapticError();
        Alert.alert(t("common.error_title"), error.message);
        return;
      }
      hapticSuccess();
      Alert.alert(t("common.success_title"), t("common.weight_saved"));
      setNewWeight("");
      setShowWeightInput(false);
      fetchData();
    } finally {
      setWeightSaving(false);
    }
  };

  const streak = useMemo(() => analyzeWorkoutStreaks(sessions), [sessions]);
  const goalProgress = useMemo(
    () => computeGoalProgressFromPreferences({ preferences, weightLogs }),
    [preferences, weightLogs],
  );

  const currentWeight =
    parseMetric(weightLogs[0]?.weight_kg) ??
    parseMetric(preferences?.current_weight) ??
    null;
  const targetWeight = parseMetric(preferences?.target_weight);

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString("tr-TR", { day: "numeric", month: "short" });
  };

  const formatDuration = (seconds: number | null) => {
    if (!seconds) return "-";
    const mins = Math.floor(seconds / 60);
    return `${mins} dk`;
  };

  const hasCompletedWorkouts = sessions.length > 0;
  const hasWeightLogs = weightLogs.length > 0;
  const latestWeight = parseMetric(weightLogs[0]?.weight_kg);
  const previousWeight = parseMetric(weightLogs[1]?.weight_kg);

  const goToWorkout = () => {
    hapticMedium();
    router.push("/(tabs)");
  };

  const trendText = useMemo(() => {
    if (latestWeight == null) return "Trend takibi için ilk kilonu kaydet.";
    if (previousWeight == null) return "Bir kayıt daha eklendiğinde trend daha net görünecek.";
    const diff = Number((latestWeight - previousWeight).toFixed(1));
    if (Math.abs(diff) < 0.1) return "Kilon dengede. İstikrarını koruyorsun.";
    if (diff < 0) return `${Math.abs(diff)} kg düşüş. İvmen güçlü görünüyor.`;
    return `${diff} kg artış görünüyor. Bugünkü seansla dengeyi toparlayabilirsin.`;
  }, [latestWeight, previousWeight]);

  const avgDurationMins = useMemo(() => {
    const durationValues = sessions
      .map((s) => s.duration_seconds ?? 0)
      .filter((v) => Number.isFinite(v) && v > 0);
    if (durationValues.length === 0) return null;
    const avgSeconds =
      durationValues.reduce((total, sec) => total + sec, 0) / durationValues.length;
    return Math.max(1, Math.round(avgSeconds / 60));
  }, [sessions]);

  const latestWorkoutSummary = useMemo(() => {
    if (!sessions[0]?.started_at) return "Henüz tamamlanan seans yok";
    return `${formatDate(sessions[0].started_at)} tarihinde tamamlandı`;
  }, [sessions]);

  return (
    <SafeAreaView className="flex-1 bg-dark-900">
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ padding: 24, paddingTop: 48 }}
      >
        {/* Header */}
        <Text className="text-white text-3xl font-bold mb-8">
          {t("progress.title")}
        </Text>

        {isLoading ? (
          <ActivityIndicator color="#22c55e" size="large" />
        ) : (
          <>
            <View className="mb-6 rounded-3xl border border-primary-500/25 bg-dark-700/90 p-5">
              <Text className="text-primary-400 text-xs font-semibold uppercase tracking-wide mb-2">
                Koç Özeti
              </Text>
              <Text className="text-white text-base font-bold leading-6">
                {hasCompletedWorkouts
                  ? `Toplam ${sessions.length} antrenman tamamladın. İlerlemen net şekilde görünmeye başladı.`
                  : "İlk seansınla birlikte bu alan kişisel ilerleme paneline dönüşecek."}
              </Text>
              <Text className="text-gray-400 text-sm mt-2 leading-5">
                {hasCompletedWorkouts
                  ? `Bu hafta ${streak.workoutsCompletedThisWeek} seans, güncel seri ${streak.currentStreakDays} gün.`
                  : "Kısa bir başlangıç yeterli: bugün tek seansla ritmi başlat."}
              </Text>
              {!hasCompletedWorkouts && (
                <TouchableOpacity
                  onPress={goToWorkout}
                  className="mt-4 bg-primary-500 rounded-2xl py-3 items-center"
                >
                  <Text className="text-white text-sm font-bold">Seansı başlat</Text>
                </TouchableOpacity>
              )}
            </View>

            <View className="flex-row gap-3 mb-6">
              <StatCard
                emoji="🏋️"
                label={t("progress.total_workouts")}
                value={String(sessions.length)}
              />
              <StatCard
                emoji="🔥"
                label={t("progress.this_week")}
                value={String(streak.workoutsCompletedThisWeek)}
              />
              <StatCard
                emoji="⚡"
                label="Mevcut Seri"
                value={`${streak.currentStreakDays} gün`}
              />
            </View>

            <View className="bg-dark-700 rounded-3xl p-6 border border-dark-600 mb-6">
              <Text className="text-white text-lg font-bold mb-2">Kilo Hedef İlerlemesi</Text>
              <Text className="text-gray-400 text-sm mb-4">
                Hedefe yaklaşımını sade ve anlaşılır şekilde takip et.
              </Text>
              <View className="flex-row gap-3 mb-3">
                <ProgressChip
                  label="İlerleme"
                  value={
                    preferences?.goal === "stay_fit"
                      ? "Bakım modu"
                      : `%${goalProgress.goalCompletionPercent}`
                  }
                />
                <ProgressChip
                  label="Tamamlanan"
                  value={`${goalProgress.achievedProgressKg} kg`}
                />
                <ProgressChip
                  label="Kalan"
                  value={`${goalProgress.remainingProgressKg} kg`}
                />
              </View>
              {(!preferences?.goal || !preferences?.level) && (
                <TouchableOpacity
                  onPress={() => router.push("/(onboarding)/goal")}
                  className="mt-2 bg-primary-500 rounded-xl py-3 items-center"
                >
                  <Text className="text-white text-sm font-bold">Hedefini güncelle</Text>
                </TouchableOpacity>
              )}
            </View>

            <View className="bg-dark-700 rounded-3xl p-6 border border-dark-600 mb-6">
              <Text className="text-white text-lg font-bold mb-2">Antrenman Geçmiş Özeti</Text>
              <Text className="text-gray-400 text-sm mb-4">
                Son seanslarına göre kısa ve net bir özet.
              </Text>
              <View className="flex-row gap-3">
                <ProgressChip label="Son Antrenman" value={latestWorkoutSummary} wide />
                <ProgressChip
                  label="Ortalama Süre"
                  value={avgDurationMins != null ? `${avgDurationMins} dk` : "Veri bekleniyor"}
                  wide
                />
              </View>
            </View>

            {/* Weight Section */}
            <View className="bg-dark-700 rounded-3xl p-6 border border-dark-600 mb-6">
              <View className="flex-row items-center justify-between mb-4">
                <Text className="text-white text-lg font-bold">
                  {t("progress.weight")}
                </Text>
                <TouchableOpacity
                  onPress={() => {
                    hapticLight();
                    setShowWeightInput(!showWeightInput);
                  }}
                  className="bg-primary-500/20 rounded-xl px-3 py-1"
                >
                  <Text className="text-primary-400 text-sm font-semibold">
                    + {t("progress.log_weight")}
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Weight Input */}
              {showWeightInput && (
                <View className="flex-row gap-3 mb-4">
                  <TextInput
                    value={newWeight}
                    onChangeText={setNewWeight}
                    placeholder="kg"
                    placeholderTextColor="#4b5563"
                    keyboardType="numeric"
                    className="flex-1 bg-dark-600 rounded-xl px-4 py-3 text-white text-base border border-dark-600"
                  />
                  <TouchableOpacity
                    onPress={handleAddWeight}
                    disabled={weightSaving}
                    className={`rounded-xl px-4 py-3 items-center justify-center ${
                      weightSaving ? "bg-dark-600" : "bg-primary-500"
                    }`}
                  >
                    {weightSaving ? (
                      <ActivityIndicator color="white" size="small" />
                    ) : (
                      <Text className="text-white font-bold">Ekle</Text>
                    )}
                  </TouchableOpacity>
                </View>
              )}

              {/* Current vs Target */}
              <View className="flex-row gap-3 mb-4">
                <View className="flex-1 bg-dark-600 rounded-2xl p-4 items-center">
                  <Text className="text-gray-400 text-xs mb-1">Mevcut</Text>
                  <Text className="text-white text-2xl font-bold">
                    {formatKgValueOnly(currentWeight)}
                  </Text>
                  <Text className="text-gray-500 text-xs">kg</Text>
                </View>
                <View className="flex-1 bg-dark-600 rounded-2xl p-4 items-center">
                  <Text className="text-gray-400 text-xs mb-1">Hedef</Text>
                  <Text className="text-primary-400 text-2xl font-bold">
                    {formatKgValueOnly(targetWeight)}
                  </Text>
                  <Text className="text-gray-500 text-xs">kg</Text>
                </View>
                <View className="flex-1 bg-dark-600 rounded-2xl p-4 items-center">
                  <Text className="text-gray-400 text-xs mb-1">Hedefe Kalan</Text>
                  <Text className="text-yellow-400 text-2xl font-bold">
                    {goalProgress.remainingProgressKg}
                  </Text>
                  <Text className="text-gray-500 text-xs">kg</Text>
                </View>
              </View>

              {/* Weight Log History */}
              {hasWeightLogs ? (
                <View className="gap-2">
                  {weightLogs.slice(0, 5).map((log) => (
                    <View
                      key={log.id}
                      className="flex-row items-center justify-between py-2 border-b border-dark-600"
                    >
                      <Text className="text-gray-400 text-sm">
                        {formatDate(log.logged_at)}
                      </Text>
                      <Text className="text-white font-semibold">
                        {formatKgValueOnly(log.weight_kg)} kg
                      </Text>
                    </View>
                  ))}
                </View>
              ) : (
                <View className="rounded-2xl border border-dark-600 bg-dark-600/50 px-4 py-4">
                  <Text className="text-gray-300 text-sm text-center leading-5 mb-3">
                    İlk kilonu kaydet, değişimi gün gün birlikte izleyelim.
                  </Text>
                  <TouchableOpacity
                    onPress={() => {
                      hapticLight();
                      setShowWeightInput(true);
                    }}
                    className="bg-primary-500 rounded-xl py-3 items-center"
                  >
                    <Text className="text-white text-sm font-bold">İlk kilonu kaydet</Text>
                  </TouchableOpacity>
                </View>
              )}
              <Text className="text-gray-400 text-xs mt-4">{trendText}</Text>
            </View>

            <View className="bg-dark-700 rounded-3xl p-6 border border-dark-600">
              <Text className="text-white text-lg font-bold mb-4">
                {t("progress.workouts")} Geçmişi
              </Text>
              {hasCompletedWorkouts ? (
                <View className="gap-3">
                  {sessions.slice(0, 7).map((s) => (
                    <View
                      key={s.id}
                      className="flex-row items-center justify-between bg-dark-600 rounded-2xl p-4"
                    >
                      <View className="flex-row items-center gap-3">
                        <Text className="text-2xl">✅</Text>
                        <View>
                          <Text className="text-white font-semibold text-sm">
                            Antrenman Tamamlandı
                          </Text>
                          <Text className="text-gray-400 text-xs mt-0.5">
                            {formatDate(s.started_at)}
                          </Text>
                        </View>
                      </View>
                      <Text className="text-primary-400 text-sm font-semibold">
                        {formatDuration(s.duration_seconds)}
                      </Text>
                    </View>
                  ))}
                </View>
              ) : (
                <View className="rounded-2xl border border-dark-600 bg-dark-600/50 px-4 py-4">
                  <Text className="text-gray-300 text-sm text-center leading-5 mb-3">
                    Bugün bir seansla başla, antrenman geçmişin burada oluşmaya başlasın.
                  </Text>
                  <TouchableOpacity
                    onPress={goToWorkout}
                    className="bg-primary-500 rounded-xl py-3 items-center"
                  >
                    <Text className="text-white text-sm font-bold">Seansı başlat</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function StatCard({
  emoji,
  label,
  value,
}: {
  emoji: string;
  label: string;
  value: string;
}) {
  return (
    <View className="flex-1 bg-dark-700 rounded-2xl p-4 border border-dark-600">
      <Text className="text-2xl mb-2">{emoji}</Text>
      <Text className="text-white text-2xl font-bold">{value}</Text>
      <Text className="text-gray-400 text-xs mt-1">{label}</Text>
    </View>
  );
}

function ProgressChip({
  label,
  value,
  wide,
}: {
  label: string;
  value: string;
  wide?: boolean;
}) {
  return (
    <View
      className={`${wide ? "flex-1" : "flex-1"} bg-dark-600 rounded-2xl p-4 border border-dark-600`}
    >
      <Text className="text-gray-400 text-[11px] uppercase tracking-wide font-semibold mb-1">
        {label}
      </Text>
      <Text className="text-white text-sm font-bold leading-5">{value}</Text>
    </View>
  );
}
