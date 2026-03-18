export type Goal = 'lose_weight' | 'stay_fit'
export type Level = '15min_1set' | '30min_1set' | '15min_2set' | '30min_2set'
export type Language = 'tr' | 'en'

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          full_name: string | null
          avatar_url: string | null
          onboarding_completed: boolean
          preferred_language: Language | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          full_name?: string | null
          avatar_url?: string | null
          onboarding_completed?: boolean
          preferred_language?: Language | null
        }
        Update: {
          full_name?: string | null
          avatar_url?: string | null
          onboarding_completed?: boolean
          preferred_language?: Language | null
        }
      }
      user_preferences: {
        Row: {
          id: string
          user_id: string
          goal: Goal | null
          level: Level | null
          preferred_minutes: number | null
          current_weight: number | null
          target_weight: number | null
          height_cm: number | null
          created_at: string
          updated_at: string
        }
        Insert: {
          user_id: string
          goal?: Goal | null
          level?: Level | null
          preferred_minutes?: number | null
          current_weight?: number | null
          target_weight?: number | null
          height_cm?: number | null
        }
        Update: {
          goal?: Goal | null
          level?: Level | null
          preferred_minutes?: number | null
          current_weight?: number | null
          target_weight?: number | null
          height_cm?: number | null
        }
      }
      exercises: {
        Row: {
          id: string
          name: string
          description: string | null
          work_seconds: number
          rest_seconds: number
          created_at: string
          updated_at: string
        }
        Insert: {
          name: string
          description?: string | null
          work_seconds: number
          rest_seconds?: number
        }
        Update: {
          name?: string
          description?: string | null
          work_seconds?: number
          rest_seconds?: number
        }
      }
      workouts: {
        Row: {
          id: string
          title: string
          description: string | null
          estimated_minutes: number
          level: string | null
          is_premium: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          title: string
          description?: string | null
          estimated_minutes: number
          level?: string | null
          is_premium?: boolean
        }
        Update: {
          title?: string
          description?: string | null
          estimated_minutes?: number
          level?: string | null
          is_premium?: boolean
        }
      }
      workout_exercises: {
        Row: {
          id: string
          workout_id: string
          exercise_id: string
          exercise_order: number
          rounds: number
          created_at: string
          updated_at: string
        }
        Insert: {
          workout_id: string
          exercise_id: string
          exercise_order: number
          rounds?: number
        }
        Update: {
          exercise_order?: number
          rounds?: number
        }
      }
      workout_sessions: {
        Row: {
          id: string
          user_id: string
          workout_id: string
          started_at: string
          completed_at: string | null
          duration_seconds: number | null
          calories_burned: number | null
          created_at: string
          updated_at: string
        }
        Insert: {
          user_id: string
          workout_id: string
          started_at?: string
          completed_at?: string | null
          duration_seconds?: number | null
          calories_burned?: number | null
        }
        Update: {
          completed_at?: string | null
          duration_seconds?: number | null
          calories_burned?: number | null
        }
      }
      programs: {
        Row: {
          id: string
          name: string
          description: string | null
          goal: Goal | null
          level: Level | null
          is_premium: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          name: string
          description?: string | null
          goal?: Goal | null
          level?: Level | null
          is_premium?: boolean
        }
        Update: {
          name?: string
          description?: string | null
          goal?: Goal | null
          level?: Level | null
          is_premium?: boolean
        }
      }
      program_days: {
        Row: {
          id: string
          program_id: string
          day_number: number
          workout_id: string | null
          title: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          program_id: string
          day_number: number
          workout_id?: string | null
          title?: string | null
        }
        Update: {
          workout_id?: string | null
          title?: string | null
        }
      }
      user_programs: {
        Row: {
          id: string
          user_id: string
          program_id: string
          is_active: boolean
          started_at: string
          completed_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          user_id: string
          program_id: string
          is_active?: boolean
          started_at?: string
          completed_at?: string | null
        }
        Update: {
          is_active?: boolean
          completed_at?: string | null
        }
      }
      weight_logs: {
        Row: {
          id: string
          user_id: string
          weight_kg: number
          note: string | null
          logged_at: string
          created_at: string
          updated_at: string
        }
        Insert: {
          user_id: string
          weight_kg: number
          note?: string | null
          logged_at?: string
        }
        Update: {
          weight_kg?: number
          note?: string | null
          logged_at?: string
        }
      }
      subscriptions: {
        Row: {
          id: string
          user_id: string
          is_active: boolean
          product_id: string | null
          expires_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          user_id: string
          is_active?: boolean
          product_id?: string | null
          expires_at?: string | null
        }
        Update: {
          is_active?: boolean
          product_id?: string | null
          expires_at?: string | null
        }
      }
    }
  }
}