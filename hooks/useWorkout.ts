import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAuthStore } from "@/stores/authStore";
import { useUserStore } from "@/stores/userStore";
import { useWorkoutStore } from "@/stores/workoutStore";

export interface TodayWorkout {
  workoutId: string;
  workoutTitle: string;
  estimatedMinutes: number;
  exercises: {
    id: string;
    name: string;
    description: string | null;
    work_seconds: number;
    rest_seconds: number;
    exercise_order: number;
    rounds: number;
  }[];
}

export function useWorkout() {
  const { user } = useAuthStore();
  const { preferences } = useUserStore();
  const [todayWorkout, setTodayWorkout] = useState<TodayWorkout | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isCompletedToday, setIsCompletedToday] = useState(false);
  const { lastCompletedAt } = useWorkoutStore();

  const fetchTodayWorkout = useCallback(async () => {
    if (!user || !preferences?.level) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const { data: sessions } = await supabase
        .from("workout_sessions")
        .select("id")
        .eq("user_id", user.id)
        .gte("started_at", today.toISOString())
        .not("completed_at", "is", null);

      if (sessions && sessions.length > 0) setIsCompletedToday(true);

      const { data: workouts, error } = (await supabase
        .from("workouts")
        .select(
          `
        id,
        title,
        estimated_minutes,
        workout_exercises (
          exercise_order,
          rounds,
          exercises (
            id,
            name,
            description,
            work_seconds,
            rest_seconds
          )
        )
      `,
        )
        .eq("level", preferences.level)
        .eq("is_premium", false)
        .limit(1)
        .single()) as any;

      if (error) throw error;

      if (workouts) {
        const exercises = (workouts.workout_exercises as any[])
          .map((we: any) => ({
            id: we.exercises.id,
            name: we.exercises.name,
            description: we.exercises.description,
            work_seconds: we.exercises.work_seconds,
            rest_seconds: we.exercises.rest_seconds,
            exercise_order: we.exercise_order,
            rounds: we.rounds,
          }))
          .sort((a: any, b: any) => a.exercise_order - b.exercise_order);

        setTodayWorkout({
          workoutId: workouts.id,
          workoutTitle: workouts.title,
          estimatedMinutes: workouts.estimated_minutes,
          exercises,
        });
      }
    } catch (err) {
      console.error("fetchTodayWorkout error:", err);
    } finally {
      setIsLoading(false);
    }
  }, [user, preferences?.level]);

  useEffect(() => {
    if (!user) {
      setIsLoading(false);
      setTodayWorkout(null);
      return;
    }
    if (!preferences) {
      // OAuth sonrası preferences store'a geç gelir; yoksa spinner'da sonsuz kalma
      setIsLoading(false);
      return;
    }
    void fetchTodayWorkout();
  }, [user, preferences, lastCompletedAt, fetchTodayWorkout]);

  return {
    todayWorkout,
    isLoading,
    isCompletedToday,
    refetch: fetchTodayWorkout,
  };
}
