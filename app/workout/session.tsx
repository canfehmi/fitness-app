import {
  View,
  Text,
  TouchableOpacity,
  Alert,
  ScrollView,
  Image,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { useWorkoutStore } from "@/stores/workoutStore";
import { useAuthStore } from "@/stores/authStore";
import { supabase } from "@/lib/supabase";
import { getExerciseImageUri } from "@/lib/exerciseVisuals";
import { hapticLight, hapticMedium, hapticSuccess } from "@/lib/haptics";
import { estimateSessionKcal } from "@/lib/homeWorkoutEstimate";

export default function SessionScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { user } = useAuthStore();
  const { session, tick, pauseResume, resetSession } = useWorkoutStore();
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef<Date>(new Date());
  const [imageLoadError, setImageLoadError] = useState(false);
  const celebratedComplete = useRef(false);
  const completionHandled = useRef(false);

  useEffect(() => {
    if (!session) {
      router.back();
      return;
    }
    startTimeRef.current = new Date();
  }, []);

  useEffect(() => {
    if (!session) return;

    if (session.isRunning && !session.isCompleted) {
      timerRef.current = setInterval(() => tick(), 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [session?.isRunning, session?.isCompleted]);

  useEffect(() => {
    if (session?.isCompleted) {
      if (!completionHandled.current) {
        completionHandled.current = true;
        void handleComplete();
      }
    }
  }, [session?.isCompleted]);

  const handleComplete = async () => {
    if (!user || !session) return;

    const durationSeconds = Math.floor(
      (new Date().getTime() - startTimeRef.current.getTime()) / 1000,
    );

    const completionDateIso = new Date().toISOString();
    const estimatedMinutes = Math.max(1, Math.round(durationSeconds / 60));
    const estimatedCalories = estimateSessionKcal(
      estimatedMinutes,
      session.exercises,
    );

    await supabase.from("workout_sessions").insert({
      user_id: user.id,
      workout_id: session.workoutId,
      started_at: startTimeRef.current.toISOString(),
      completed_at: completionDateIso,
      duration_seconds: durationSeconds,
    } as any);

    resetSession();
    router.replace({
      pathname: "/workout/completion",
      params: {
        title: session.workoutTitle,
        durationSeconds: String(durationSeconds),
        estimatedCalories: String(estimatedCalories),
      },
    });
  };

  const handleExit = () => {
    hapticLight();
    Alert.alert(
      "Antrenmanı Bırak",
      "Antrenmanı yarıda bırakmak istediğine emin misin?",
      [
        { text: "Devam Et", style: "cancel" },
        {
          text: "Bırak",
          style: "destructive",
          onPress: () => {
            resetSession();
            router.back();
          },
        },
      ],
    );
  };

  useEffect(() => {
    setImageLoadError(false);
  }, [session?.currentExerciseIndex, session?.isResting]);

  useEffect(() => {
    if (!session) {
      celebratedComplete.current = false;
      return;
    }
    if (session.isCompleted && !celebratedComplete.current) {
      celebratedComplete.current = true;
      hapticSuccess();
    }
  }, [session]);

  if (!session) return null;

  const currentExercise = session.exercises[session.currentExerciseIndex];
  const nextExercise = session.exercises[session.currentExerciseIndex + 1];
  const displayExercise = session.isResting ? nextExercise : currentExercise;
  const guideUri =
    displayExercise != null ? getExerciseImageUri(displayExercise.name) : null;

  const progress =
    session.secondsLeft /
    (session.isResting
      ? currentExercise.rest_seconds
      : currentExercise.work_seconds);

  if (session.isCompleted) return null;

  return (
    <SafeAreaView className="flex-1 bg-dark-900">
      {/* Header */}
      <View className="flex-row items-center justify-between px-6 pt-4 pb-2">
        <TouchableOpacity onPress={handleExit} className="p-2">
          <Text className="text-gray-400 text-base">✕</Text>
        </TouchableOpacity>
        <Text className="text-white font-semibold">{session.workoutTitle}</Text>
        <View className="bg-dark-700 rounded-xl px-3 py-1">
          <Text className="text-gray-400 text-sm">
            {session.currentExerciseIndex + 1}/{session.exercises.length}
          </Text>
        </View>
      </View>

      <ScrollView
        className="flex-1 px-6"
        contentContainerStyle={{
          flexGrow: 1,
          justifyContent: "center",
          paddingBottom: 24,
        }}
        keyboardShouldPersistTaps="handled"
      >
        {/* Phase Label */}
        <Text
          className={`text-lg font-semibold mb-4 text-center ${
            session.isResting ? "text-blue-400" : "text-primary-400"
          }`}
        >
          {session.isResting
            ? "😮‍💨 " + t("workout.rest")
            : "💪 " + t("workout.exercise")}
        </Text>

        {/* Visual guide — next move during rest, current move during work */}
        {guideUri != null && (
          <View className="mb-5 w-full">
            {session.isResting && (
              <Text className="text-gray-500 text-xs font-semibold uppercase tracking-wide mb-2">
                {t("workout.next_preview")}
              </Text>
            )}
            <View
              className="w-full overflow-hidden rounded-2xl border border-dark-600 bg-dark-800"
              style={{ height: 200 }}
            >
              {!imageLoadError ? (
                <Image
                  source={{ uri: guideUri }}
                  style={{ width: "100%", height: "100%" }}
                  resizeMode="cover"
                  accessibilityLabel={displayExercise?.name}
                  onError={() => setImageLoadError(true)}
                />
              ) : (
                <View className="flex-1 h-full items-center justify-center bg-dark-700">
                  <Text className="text-7xl">💪</Text>
                  <Text className="text-gray-500 text-xs mt-2 px-4 text-center">
                    {displayExercise?.name}
                  </Text>
                </View>
              )}
            </View>
            {!session.isResting && (
              <Text className="text-gray-500 text-xs mt-2 leading-5">
                {t("workout.visual_hint")}
              </Text>
            )}
          </View>
        )}

        {/* Timer Circle */}
        <View className="items-center justify-center mb-8">
          <View
            style={{ width: 220, height: 220 }}
            className="items-center justify-center"
          >
            {/* SVG Circle */}
            <View
              style={{
                position: "absolute",
                width: 220,
                height: 220,
                borderRadius: 110,
                borderWidth: 8,
                borderColor: "#222222",
              }}
            />
            <View
              style={{
                position: "absolute",
                width: 220,
                height: 220,
                borderRadius: 110,
                borderWidth: 8,
                borderColor: session.isResting ? "#60a5fa" : "#22c55e",
                opacity: progress,
              }}
            />
            <Text
              className={`text-7xl font-bold ${
                session.isResting ? "text-blue-400" : "text-white"
              }`}
            >
              {session.secondsLeft}
            </Text>
            <Text className="text-gray-500 text-sm mt-1">saniye</Text>
          </View>
        </View>

        {/* Exercise Name */}
        {!session.isResting && (
          <View className="items-center mb-4">
            <Text className="text-white text-2xl font-bold text-center mb-2">
              {currentExercise.name}
            </Text>
            {currentExercise.description && (
              <Text className="text-gray-400 text-sm text-center px-4">
                {currentExercise.description}
              </Text>
            )}
          </View>
        )}

        {session.isResting && (
          <View className="items-center mb-4">
            <Text className="text-white text-xl font-bold mb-2">Dinlen</Text>
            <Text className="text-gray-400 text-sm">
              Sıradaki:{" "}
              {session.exercises[session.currentExerciseIndex + 1]?.name ??
                "Bitti!"}
            </Text>
          </View>
        )}

        {/* Round indicator */}
        <Text className="text-gray-500 text-sm mb-12">
          {t("workout.round")} {session.currentRound}
        </Text>

        {/* Controls */}
        <View className="flex-row gap-4 w-full">
          <TouchableOpacity
            onPress={() => {
              hapticLight();
              pauseResume();
            }}
            className="flex-1 bg-dark-700 rounded-2xl py-4 items-center border border-dark-600"
          >
            <Text className="text-white text-base font-bold">
              {session.isRunning ? t("workout.pause") : t("workout.resume")}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Exercise Progress Bottom */}
      <View className="px-6 pb-8">
        <View className="flex-row gap-1">
          {session.exercises.map((_, i) => (
            <View
              key={i}
              className={`flex-1 h-1 rounded-full ${
                i < session.currentExerciseIndex
                  ? "bg-primary-500"
                  : i === session.currentExerciseIndex
                    ? "bg-primary-400"
                    : "bg-dark-600"
              }`}
            />
          ))}
        </View>
      </View>
    </SafeAreaView>
  );
}
