import { create } from 'zustand'

interface Exercise {
  id: string
  name: string
  description: string | null
  work_seconds: number
  rest_seconds: number
  exercise_order: number
  rounds: number
}

interface WorkoutSession {
  workoutId: string
  workoutTitle: string
  exercises: Exercise[]
  currentExerciseIndex: number
  currentRound: number
  isResting: boolean
  secondsLeft: number
  isRunning: boolean
  isCompleted: boolean
  startedAt: string | null
}

interface WorkoutState {
  session: WorkoutSession | null
  startSession: (workoutId: string, workoutTitle: string, exercises: Exercise[]) => void
  tick: () => void
  nextStep: () => void
  pauseResume: () => void
  completeSession: () => void
  resetSession: () => void
  lastCompletedAt: string | null
}

export const useWorkoutStore = create<WorkoutState>((set, get) => ({
  lastCompletedAt: null,
  session: null,

  startSession: (workoutId, workoutTitle, exercises) =>
    set({
      session: {
        workoutId,
        workoutTitle,
        exercises,
        currentExerciseIndex: 0,
        currentRound: 1,
        isResting: false,
        secondsLeft: exercises[0]?.work_seconds ?? 30,
        isRunning: true,
        isCompleted: false,
        startedAt: new Date().toISOString(),
      },
    }),

  tick: () => {
    const { session } = get()
    if (!session || !session.isRunning || session.isCompleted) return
    if (session.secondsLeft > 1) {
      set((s) => ({
        session: s.session ? { ...s.session, secondsLeft: s.session.secondsLeft - 1 } : null,
      }))
    } else {
      get().nextStep()
    }
  },

  nextStep: () => {
    const { session } = get()
    if (!session) return

    const { exercises, currentExerciseIndex, currentRound, isResting } = session
    const currentExercise = exercises[currentExerciseIndex]

    // Dinlenme bitti → sonraki harekete geç
    if (isResting) {
      const nextIndex = currentExerciseIndex + 1
      if (nextIndex >= exercises.length) {
        // Tüm egzersizler bitti, set tamamlandı
        if (currentRound < (exercises[0]?.rounds ?? 1)) {
          // Sonraki round
          set((s) => ({
            session: s.session
              ? {
                  ...s.session,
                  currentExerciseIndex: 0,
                  currentRound: s.session.currentRound + 1,
                  isResting: false,
                  secondsLeft: exercises[0].work_seconds,
                }
              : null,
          }))
        } else {
          set((s) => ({
            session: s.session
              ? { ...s.session, isCompleted: true, isRunning: false }
              : null,
          }))
        }
      } else {
        set((s) => ({
          session: s.session
            ? {
                ...s.session,
                currentExerciseIndex: nextIndex,
                isResting: false,
                secondsLeft: exercises[nextIndex].work_seconds,
              }
            : null,
        }))
      }
    } else {
      // Egzersiz bitti → dinlenmeye geç
      set((s) => ({
        session: s.session
          ? {
              ...s.session,
              isResting: true,
              secondsLeft: currentExercise.rest_seconds,
            }
          : null,
      }))
    }
  },

  pauseResume: () =>
    set((s) => ({
      session: s.session ? { ...s.session, isRunning: !s.session.isRunning } : null,
    })),

  completeSession: () =>
  set((s) => ({
    session: s.session ? { ...s.session, isCompleted: true, isRunning: false } : null,
    lastCompletedAt: new Date().toISOString(),
  })),

  resetSession: () => set({ session: null }),
}))