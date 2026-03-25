import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import { useEffect, useMemo, useState } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { useAuthStore } from "@/stores/authStore";
import { useUserStore } from "@/stores/userStore";
import { useWorkout } from "@/hooks/useWorkout";
import { useWorkoutStore } from "@/stores/workoutStore";
import {
  difficultyI18nKey,
  estimateSessionKcal,
  goalI18nKey,
} from "@/lib/homeWorkoutEstimate";
import { hapticMedium } from "@/lib/haptics";
import {
  homeGoalStatLabelTr,
  levelPlanLabelTr,
} from "@/lib/fitnessDisplay";
import { supabase } from "@/lib/supabase";
import type { WorkoutHistoryEntry, WeightLogRow } from "@/types/fitness";
import {
  buildCoachInsightsInput,
  deriveCoachInsights,
} from "@/lib/coachInsights";
import { computeGoalProgressFromPreferences } from "@/lib/goalProgress";
import {
  estimatePlannedWorkoutCalorieRange,
  formatPlannedWorkoutCalorieRangeTr,
} from "@/lib/workoutCalorieEstimate";

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "home.greeting_morning";
  if (hour < 18) return "home.greeting_afternoon";
  return "home.greeting_evening";
}

export default function HomeScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { user } = useAuthStore();
  const { profile, preferences } = useUserStore();
  const { todayWorkout, isLoading, isCompletedToday } = useWorkout();
  const { startSession } = useWorkoutStore();
  const [sessions, setSessions] = useState<WorkoutHistoryEntry[]>([]);
  const [weightLogs, setWeightLogs] = useState<WeightLogRow[]>([]);

  const handleStartWorkout = () => {
    if (!todayWorkout) return;
    hapticMedium();
    startSession(
      todayWorkout.workoutId,
      todayWorkout.workoutTitle,
      todayWorkout.exercises,
    );
    router.push("/workout/session");
  };

  const firstName = profile?.full_name?.split(" ")[0] ?? "Sporcu";

  useEffect(() => {
    if (!user) {
      setSessions([]);
      setWeightLogs([]);
      return;
    }
    void (async () => {
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
      if (workoutRows) setSessions(workoutRows as WorkoutHistoryEntry[]);
      if (weightRows) setWeightLogs(weightRows as WeightLogRow[]);
    })();
  }, [user]);

  const estimatedKcal = useMemo(() => {
    if (!todayWorkout) return null;
    return estimateSessionKcal(
      todayWorkout.estimatedMinutes,
      todayWorkout.exercises,
    );
  }, [todayWorkout]);

  const coachInsights = useMemo(() => {
    const input = buildCoachInsightsInput({
      preferences,
      workoutSessions: sessions,
      weightLogs,
      todayWorkout: todayWorkout
        ? {
            estimatedMinutes: todayWorkout.estimatedMinutes,
            exercises: todayWorkout.exercises,
          }
        : null,
    });
    return deriveCoachInsights(input);
  }, [preferences, sessions, weightLogs, todayWorkout]);

  const goalProgress = useMemo(
    () => computeGoalProgressFromPreferences({ preferences, weightLogs }),
    [preferences, weightLogs],
  );

  const plannedBurnText = useMemo(() => {
    if (!preferences?.level) {
      return "Planını seçtiğinde yakım tahminini burada göreceksin.";
    }
    const range = estimatePlannedWorkoutCalorieRange({
      planLevel: preferences.level,
      userWeightKg: preferences.current_weight,
      durationMinutes: todayWorkout?.estimatedMinutes,
    });
    return formatPlannedWorkoutCalorieRangeTr(range);
  }, [preferences?.level, preferences?.current_weight, todayWorkout?.estimatedMinutes]);

  const suggestedWorkoutText = useMemo(() => {
    if (todayWorkout) {
      return `${todayWorkout.workoutTitle} • ${todayWorkout.estimatedMinutes} dk`;
    }
    if (preferences?.level) {
      return `${levelPlanLabelTr(preferences.level)} planına uygun bir seans`;
    }
    return "Planını seç, bugün ilk seansla ritmi başlat.";
  }, [todayWorkout, preferences?.level]);

  const priorityHeadline = useMemo(() => {
    if (!preferences?.goal) return "Koç notu: Hedefini netleştir, odağın güçlensin.";
    if (coachInsights.workedOutToday) return "Harika iş. Bugünkü antrenmanı tamamladın.";
    if (coachInsights.currentStreakDays > 0) {
      return `Serin ${coachInsights.currentStreakDays} gün — bugün devam ettirebilirsin.`;
    }
    return "Bugünün odağı: kısa, kaliteli ve kontrollü bir seans.";
  }, [preferences?.goal, coachInsights.workedOutToday, coachInsights.currentStreakDays]);

  const handleCoachPrimaryAction = () => {
    hapticMedium();
    if (!preferences?.goal || !preferences?.level) {
      router.push("/(onboarding)/goal");
      return;
    }
    if (todayWorkout) {
      handleStartWorkout();
      return;
    }
    router.push("/(tabs)/progress");
  };

  return (
    <SafeAreaView className="flex-1 bg-dark-900">
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ padding: 24, paddingTop: 48 }}
      >
        {/* Header */}
        <View className="mb-8">
          <Text className="text-gray-400 text-base">{t(getGreeting())},</Text>
          <Text className="text-white text-3xl font-bold">{firstName} 👋</Text>
        </View>

        {/* Stats Row */}
        <View className="flex-row gap-3 mb-8">
          <StatCard
            label="Hedef"
            value={homeGoalStatLabelTr(preferences?.goal)}
          />
          <StatCard
            label="Plan"
            value={levelPlanLabelTr(preferences?.level)}
          />
        </View>

        <CoachSummaryCard
          headline={priorityHeadline}
          suggestedWorkout={suggestedWorkoutText}
          plannedBurnText={plannedBurnText}
          streakText={
            coachInsights.currentStreakDays > 0
              ? `${coachInsights.currentStreakDays} gün`
              : "Henüz seri yok"
          }
          progressText={
            preferences?.goal === "stay_fit"
              ? "Bakım modu"
              : `${goalProgress.goalCompletionPercent}%`
          }
          motivationText={coachInsights.motivationalSummary}
          onPrimaryAction={handleCoachPrimaryAction}
          primaryActionLabel={
            !preferences?.goal || !preferences?.level
              ? "Hedefini güncelle"
              : "İlk antrenmanına başla"
          }
        />

        {/* Today's Workout */}
        <View className="mb-6">
          <Text className="text-white text-xl font-bold mb-4">
            {t("home.todays_workout")}
          </Text>

          {isLoading ? (
            <View className="bg-dark-700 rounded-3xl p-6 items-center">
              <ActivityIndicator color="#22c55e" />
            </View>
          ) : isCompletedToday ? (
            <View className="bg-primary-500/10 border-2 border-primary-500 rounded-3xl p-6 items-center">
              <Text className="text-4xl mb-3">🎉</Text>
              <Text className="text-primary-400 text-xl font-bold">
                {t("home.completed_today")}
              </Text>
            </View>
          ) : todayWorkout ? (
            <View className="bg-dark-700 rounded-3xl p-6 border border-dark-600">
              <View className="flex-row items-center justify-between mb-4">
                <View>
                  <Text className="text-white text-xl font-bold">
                    {todayWorkout.workoutTitle}
                  </Text>
                  <Text className="text-gray-400 text-sm mt-1">
                    {todayWorkout.estimatedMinutes} dk •{" "}
                    {todayWorkout.exercises.length} hareket
                  </Text>
                </View>
                <View className="bg-primary-500/20 rounded-2xl px-3 py-1">
                  <Text className="text-primary-400 text-sm font-semibold">
                    {todayWorkout.estimatedMinutes} dk
                  </Text>
                </View>
              </View>

              <View className="rounded-2xl bg-dark-600/80 border border-dark-600 px-4 py-3 mb-5 gap-2.5">
                {estimatedKcal != null && (
                  <WorkoutValueRow
                    emoji="🔥"
                    label={t("home.workout_value.calories_label")}
                    value={t("home.workout_value.calories_value", {
                      kcal: estimatedKcal,
                    })}
                  />
                )}
                <WorkoutValueRow
                  emoji="🎯"
                  label={t("home.workout_value.goal_label")}
                  value={t(goalI18nKey(preferences?.goal))}
                />
                <WorkoutValueRow
                  emoji="📈"
                  label={t("home.workout_value.difficulty_label")}
                  value={t(difficultyI18nKey(preferences?.level))}
                />
              </View>

              {/* Exercise List */}
              <View className="gap-2 mb-6">
                {todayWorkout.exercises.slice(0, 4).map((ex, i) => (
                  <View key={ex.id} className="flex-row items-center gap-3">
                    <View className="w-7 h-7 rounded-full bg-dark-600 items-center justify-center">
                      <Text className="text-gray-400 text-xs font-bold">
                        {i + 1}
                      </Text>
                    </View>
                    <Text className="text-gray-300 text-sm flex-1">
                      {ex.name}
                    </Text>
                    <Text className="text-gray-500 text-xs">
                      {ex.work_seconds}s
                    </Text>
                  </View>
                ))}
                {todayWorkout.exercises.length > 4 && (
                  <Text className="text-gray-500 text-sm ml-10">
                    +{todayWorkout.exercises.length - 4} hareket daha
                  </Text>
                )}
              </View>

              {/* Start Button */}
              <TouchableOpacity
                onPress={handleStartWorkout}
                className="bg-primary-500 rounded-2xl py-4 items-center"
              >
                <Text className="text-white text-base font-bold">
                  {t("home.start_workout")}
                </Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View className="bg-dark-700 rounded-3xl p-6 items-center border border-dark-600">
              <Text className="text-4xl mb-3">😴</Text>
              <Text className="text-white text-lg font-bold mb-2 text-center">
                {t("home.rest_day")}
              </Text>
              <Text className="text-gray-400 text-sm text-center leading-5 mb-4">
                Kısa bir seans bile ritmini korur. Hazırsan bugün net bir başlangıç yapalım.
              </Text>
              <TouchableOpacity
                onPress={handleCoachPrimaryAction}
                className="bg-primary-500 rounded-2xl py-3 px-6 items-center"
              >
                <Text className="text-white text-sm font-bold">Seansı başlat</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <View className="flex-1 bg-dark-700 rounded-2xl p-4 border border-dark-600">
      <Text className="text-gray-400 text-xs mb-1">{label}</Text>
      <Text className="text-white text-sm font-bold">{value}</Text>
    </View>
  );
}

function WorkoutValueRow({
  emoji,
  label,
  value,
}: {
  emoji: string;
  label: string;
  value: string;
}) {
  return (
    <View className="flex-row items-start gap-3">
      <Text className="text-lg leading-6">{emoji}</Text>
      <View className="flex-1">
        <Text className="text-gray-500 text-xs font-semibold mb-0.5">
          {label}
        </Text>
        <Text className="text-white text-sm font-bold leading-5">{value}</Text>
      </View>
    </View>
  );
}

function CoachSummaryCard({
  headline,
  suggestedWorkout,
  plannedBurnText,
  streakText,
  progressText,
  motivationText,
  onPrimaryAction,
  primaryActionLabel,
}: {
  headline: string;
  suggestedWorkout: string;
  plannedBurnText: string;
  streakText: string;
  progressText: string;
  motivationText: string;
  onPrimaryAction: () => void;
  primaryActionLabel: string;
}) {
  return (
    <View className="mb-8 rounded-3xl border border-primary-500/20 bg-dark-700 p-5">
      <Text className="text-primary-400 text-xs font-semibold uppercase tracking-wide mb-2">
        Koç Özeti
      </Text>
      <Text className="text-white text-lg font-bold leading-6 mb-3">{headline}</Text>

      <Text className="text-gray-400 text-sm mb-1">Bugünkü öneri</Text>
      <Text className="text-white text-sm font-semibold mb-4">{suggestedWorkout}</Text>

      <View className="flex-row gap-2 mb-4">
        <CoachMetricPill label="Tahmini Yakım" value={plannedBurnText} />
      </View>
      <View className="flex-row gap-2 mb-4">
        <CoachMetricPill label="Güncel Seri" value={streakText} />
        <CoachMetricPill label="Hedefe Yakınlık" value={progressText} />
      </View>

      <Text className="text-gray-300 text-sm leading-5">{motivationText}</Text>
      <TouchableOpacity
        onPress={onPrimaryAction}
        className="mt-4 bg-primary-500 rounded-2xl py-3 items-center"
      >
        <Text className="text-white text-sm font-bold">{primaryActionLabel}</Text>
      </TouchableOpacity>
    </View>
  );
}

function CoachMetricPill({ label, value }: { label: string; value: string }) {
  return (
    <View className="flex-1 rounded-2xl border border-dark-600 bg-dark-600/70 px-3 py-3">
      <Text className="text-gray-500 text-[11px] font-semibold uppercase tracking-wide mb-1">
        {label}
      </Text>
      <Text className="text-white text-xs font-semibold leading-4">{value}</Text>
    </View>
  );
}
