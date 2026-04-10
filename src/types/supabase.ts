export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      exams: {
        Row: {
          created_at: string
          display_name: string
          exam_name: string
          id: string
          max_score: number | null
          multi_subject: boolean
          sort_order: number
        }
        Insert: {
          created_at?: string
          display_name: string
          exam_name: string
          id?: string
          max_score?: number | null
          multi_subject?: boolean
          sort_order?: number
        }
        Update: {
          created_at?: string
          display_name?: string
          exam_name?: string
          id?: string
          max_score?: number | null
          multi_subject?: boolean
          sort_order?: number
        }
        Relationships: []
      }
      syllabus_master: {
        Row: {
          chapter: string
          created_at: string | null
          estimated_minutes: number | null
          exam_name: string
          id: string
          marks_2023: number | null
          marks_2024: number | null
          marks_2025: number | null
          microtopic: string
          subject: string
        }
        Insert: {
          chapter: string
          created_at?: string | null
          estimated_minutes?: number | null
          exam_name?: string
          id?: string
          marks_2023?: number | null
          marks_2024?: number | null
          marks_2025?: number | null
          microtopic: string
          subject: string
        }
        Update: {
          chapter?: string
          created_at?: string | null
          estimated_minutes?: number | null
          exam_name?: string
          id?: string
          marks_2023?: number | null
          marks_2024?: number | null
          marks_2025?: number | null
          microtopic?: string
          subject?: string
        }
        Relationships: []
      }
      task_sessions: {
        Row: {
          created_at: string | null
          duration_seconds: number | null
          end_time: string | null
          id: string
          start_time: string
          task_id: string
        }
        Insert: {
          created_at?: string | null
          duration_seconds?: number | null
          end_time?: string | null
          id?: string
          start_time?: string
          task_id: string
        }
        Update: {
          created_at?: string | null
          duration_seconds?: number | null
          end_time?: string | null
          id?: string
          start_time?: string
          task_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_sessions_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      study_sessions: {
        Row: {
          created_at: string
          duration_seconds: number
          ended_at: string
          id: string
          is_camera_proven: boolean
          started_at: string
          subject: string
          user_id: string
        }
        Insert: {
          created_at?: string
          duration_seconds: number
          ended_at: string
          id?: string
          is_camera_proven?: boolean
          started_at: string
          subject: string
          user_id: string
        }
        Update: {
          created_at?: string
          duration_seconds?: number
          ended_at?: string
          id?: string
          is_camera_proven?: boolean
          started_at?: string
          subject?: string
          user_id?: string
        }
        Relationships: []
      }
      meditation_sessions: {
        Row: {
          created_at: string
          date: string
          duration_minutes: number
          guided: boolean
          id: string
          notes: string | null
          session_type: string
          soundscape: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          date: string
          duration_minutes: number
          guided?: boolean
          id?: string
          notes?: string | null
          session_type: string
          soundscape?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          date?: string
          duration_minutes?: number
          guided?: boolean
          id?: string
          notes?: string | null
          session_type?: string
          soundscape?: string | null
          user_id?: string
        }
        Relationships: []
      }
      voice_timeline_entries: {
        Row: {
          id: string
          user_id: string
          log_date: string
          transcript_raw: string
          title: string
          description: string
          category: string
          subject: string | null
          chapter: string | null
          estimated_minutes: number | null
          occurred_at: string
          parsed_json: Json | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          log_date: string
          transcript_raw: string
          title: string
          description?: string
          category: string
          subject?: string | null
          chapter?: string | null
          estimated_minutes?: number | null
          occurred_at?: string
          parsed_json?: Json | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          log_date?: string
          transcript_raw?: string
          title?: string
          description?: string
          category?: string
          subject?: string | null
          chapter?: string | null
          estimated_minutes?: number | null
          occurred_at?: string
          parsed_json?: Json | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      handwritten_planner_entries: {
        Row: {
          id: string
          user_id: string
          log_date: string
          source_text: string
          title: string
          start_time: string | null
          end_time: string | null
          duration: string | null
          parsed_json: Json | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          log_date: string
          source_text?: string
          title: string
          start_time?: string | null
          end_time?: string | null
          duration?: string | null
          parsed_json?: Json | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          log_date?: string
          source_text?: string
          title?: string
          start_time?: string | null
          end_time?: string | null
          duration?: string | null
          parsed_json?: Json | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      daily_motivational_phrases: {
        Row: {
          active: boolean
          author: string | null
          category: string
          created_at: string
          id: string
          phrase: string
        }
        Insert: {
          active?: boolean
          author?: string | null
          category?: string
          created_at?: string
          id?: string
          phrase: string
        }
        Update: {
          active?: boolean
          author?: string | null
          category?: string
          created_at?: string
          id?: string
          phrase?: string
        }
        Relationships: []
      }
      daily_plans: {
        Row: {
          created_at: string
          id: string
          plan_date: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          plan_date: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          plan_date?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      daily_tasks: {
        Row: {
          created_at: string
          daily_plan_id: string
          id: string
          priority: string
          source: string
          source_raw_text: string | null
          status: string
          time_end: string | null
          time_slot: string | null
          time_start: string | null
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          daily_plan_id: string
          id: string
          priority?: string
          source: string
          source_raw_text?: string | null
          status?: string
          time_end?: string | null
          time_slot?: string | null
          time_start?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          daily_plan_id?: string
          id?: string
          priority?: string
          source?: string
          source_raw_text?: string | null
          status?: string
          time_end?: string | null
          time_slot?: string | null
          time_start?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "daily_tasks_daily_plan_id_fkey"
            columns: ["daily_plan_id"]
            isOneToOne: false
            referencedRelation: "daily_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      tasks: {
        Row: {
          assigned_date: string
          created_at: string | null
          estimated_minutes: number | null
          estimated_time_minutes: number | null
          end_time: string | null
          id: string
          marks_value: number | null
          marks_weight: number | null
          microtopic_id: string | null
          name: string | null
          source?: string | null
          start_time: string | null
          status: string
          time_spent_seconds: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          assigned_date: string
          created_at?: string | null
          estimated_minutes?: number | null
          estimated_time_minutes?: number | null
          end_time?: string | null
          id?: string
          marks_value?: number | null
          marks_weight?: number | null
          microtopic_id?: string | null
          name?: string | null
          source?: string | null
          start_time?: string | null
          status?: string
          time_spent_seconds?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          assigned_date?: string
          created_at?: string | null
          estimated_minutes?: number | null
          estimated_time_minutes?: number | null
          end_time?: string | null
          id?: string
          marks_value?: number | null
          marks_weight?: number | null
          microtopic_id?: string | null
          name?: string | null
          source?: string | null
          start_time?: string | null
          status?: string
          time_spent_seconds?: number | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tasks_microtopic_id_fkey"
            columns: ["microtopic_id"]
            isOneToOne: false
            referencedRelation: "syllabus_master"
            referencedColumns: ["id"]
          },
        ]
      }
      user_notifications: {
        Row: {
          created_at: string
          id: string
          kind: string
          message: string
          read: boolean
          title: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          kind: string
          message: string
          read?: boolean
          title: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          kind?: string
          message?: string
          read?: boolean
          title?: string
          user_id?: string
        }
        Relationships: []
      }
      user_profiles: {
        Row: {
          attempts: Json | null
          bonus_photo_scans: number
          bonus_photo_scans_ledger: Json
          bonus_voice_minutes: number
          bonus_voice_minutes_ledger: Json
          class_studying: string | null
          cuet_domain_subjects: Json
          full_name: string | null
          id: string
          mandatory_onboarding_completed_at: string | null
          phone_number: string | null
          photo_scans_used_this_month: number
          prev_exam_attempted: boolean | null
          prev_score: number | null
          prev_score_entries: Json
          razorpay_subscription_id: string | null
          primary_exam: string | null
          subscription_end_date: string | null
          subscription_plan: string | null
          subscription_start_date: string | null
          subscription_status: string | null
          subscription_tier: string | null
          target_exam: string | null
          target_exam_date: string | null
          updated_at: string | null
          usage_reset_date: string | null
          user_id: string | null
          voice_minutes_used_this_month: number
        }
        Insert: {
          attempts?: Json | null
          bonus_photo_scans?: number
          bonus_photo_scans_ledger?: Json
          bonus_voice_minutes?: number
          bonus_voice_minutes_ledger?: Json
          class_studying?: string | null
          cuet_domain_subjects?: Json
          full_name?: string | null
          id?: string
          mandatory_onboarding_completed_at?: string | null
          phone_number?: string | null
          photo_scans_used_this_month?: number
          prev_exam_attempted?: boolean | null
          prev_score?: number | null
          prev_score_entries?: Json
          razorpay_subscription_id?: string | null
          primary_exam?: string | null
          subscription_end_date?: string | null
          subscription_plan?: string | null
          subscription_start_date?: string | null
          subscription_status?: string | null
          subscription_tier?: string | null
          target_exam?: string | null
          target_exam_date?: string | null
          updated_at?: string | null
          usage_reset_date?: string | null
          user_id?: string | null
          voice_minutes_used_this_month?: number
        }
        Update: {
          attempts?: Json | null
          bonus_photo_scans?: number
          bonus_photo_scans_ledger?: Json
          bonus_voice_minutes?: number
          bonus_voice_minutes_ledger?: Json
          class_studying?: string | null
          cuet_domain_subjects?: Json
          full_name?: string | null
          id?: string
          mandatory_onboarding_completed_at?: string | null
          phone_number?: string | null
          photo_scans_used_this_month?: number
          prev_exam_attempted?: boolean | null
          prev_score?: number | null
          prev_score_entries?: Json
          razorpay_subscription_id?: string | null
          primary_exam?: string | null
          subscription_end_date?: string | null
          subscription_plan?: string | null
          subscription_start_date?: string | null
          subscription_status?: string | null
          subscription_tier?: string | null
          target_exam?: string | null
          target_exam_date?: string | null
          updated_at?: string | null
          usage_reset_date?: string | null
          user_id?: string | null
          voice_minutes_used_this_month?: number
        }
        Relationships: []
      }
      razorpay_processed_payments: {
        Row: {
          created_at: string
          kind: string
          razorpay_payment_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          kind: string
          razorpay_payment_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          kind?: string
          razorpay_payment_id?: string
          user_id?: string
        }
        Relationships: []
      }
      user_syllabus_customizations: {
        Row: {
          action_type: string
          chapter: string | null
          chapter_override: string | null
          created_at: string
          custom_row_id: string | null
          exam_name: string
          id: string
          microtopic: string | null
          microtopic_override: string | null
          subject: string | null
          subject_override: string | null
          syllabus_master_id: string | null
          target_type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          action_type: string
          chapter?: string | null
          chapter_override?: string | null
          created_at?: string
          custom_row_id?: string | null
          exam_name: string
          id?: string
          microtopic?: string | null
          microtopic_override?: string | null
          subject?: string | null
          subject_override?: string | null
          syllabus_master_id?: string | null
          target_type: string
          updated_at?: string
          user_id: string
        }
        Update: {
          action_type?: string
          chapter?: string | null
          chapter_override?: string | null
          created_at?: string
          custom_row_id?: string | null
          exam_name?: string
          id?: string
          microtopic?: string | null
          microtopic_override?: string | null
          subject?: string | null
          subject_override?: string | null
          syllabus_master_id?: string | null
          target_type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_syllabus_customizations_syllabus_master_id_fkey"
            columns: ["syllabus_master_id"]
            isOneToOne: false
            referencedRelation: "syllabus_master"
            referencedColumns: ["id"]
          },
        ]
      }
      user_syllabus_marks_overrides: {
        Row: {
          created_at: string
          exam_name: string
          id: string
          marks_2023: number | null
          marks_2024: number | null
          marks_2025: number | null
          syllabus_master_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          exam_name: string
          id?: string
          marks_2023?: number | null
          marks_2024?: number | null
          marks_2025?: number | null
          syllabus_master_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          exam_name?: string
          id?: string
          marks_2023?: number | null
          marks_2024?: number | null
          marks_2025?: number | null
          syllabus_master_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_progress: {
        Row: {
          id: string
          mastery_level: string | null
          microtopic_id: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          id?: string
          mastery_level?: string | null
          microtopic_id?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          id?: string
          mastery_level?: string | null
          microtopic_id?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_progress_microtopic_id_fkey"
            columns: ["microtopic_id"]
            isOneToOne: false
            referencedRelation: "syllabus_master"
            referencedColumns: ["id"]
          },
        ]
      }
      user_microtopic_progress: {
        Row: {
          last_updated: string
          status: string
          syllabus_master_id: string
          user_id: string
        }
        Insert: {
          last_updated?: string
          status: string
          syllabus_master_id: string
          user_id: string
        }
        Update: {
          last_updated?: string
          status?: string
          syllabus_master_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_microtopic_progress_syllabus_master_id_fkey"
            columns: ["syllabus_master_id"]
            isOneToOne: false
            referencedRelation: "syllabus_master"
            referencedColumns: ["id"]
          },
        ]
      }
      motivation_letters: {
        Row: {
          body: string
          created_at: string
          id: string
          letter_date: string
          pinned: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          body?: string
          created_at?: string
          id?: string
          letter_date: string
          pinned?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          letter_date?: string
          pinned?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      motivation_voice_affirmations: {
        Row: {
          audio_base64: string | null
          audio_mime: string | null
          created_at: string
          id: string
          recorded_at: string
          tags: string[]
          transcript: string
          updated_at: string
          user_id: string
        }
        Insert: {
          audio_base64?: string | null
          audio_mime?: string | null
          created_at?: string
          id?: string
          recorded_at?: string
          tags?: string[]
          transcript?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          audio_base64?: string | null
          audio_mime?: string | null
          created_at?: string
          id?: string
          recorded_at?: string
          tags?: string[]
          transcript?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      motivation_vision_photos: {
        Row: {
          caption: string | null
          created_at: string
          id: string
          image_data_url: string
          is_wallpaper: boolean
          photo_date: string
          updated_at: string
          user_id: string
        }
        Insert: {
          caption?: string | null
          created_at?: string
          id?: string
          image_data_url: string
          is_wallpaper?: boolean
          photo_date?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          caption?: string | null
          created_at?: string
          id?: string
          image_data_url?: string
          is_wallpaper?: boolean
          photo_date?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_motivation_prefs: {
        Row: {
          updated_at: string
          user_id: string
          wallpaper_photo_id: string | null
        }
        Insert: {
          updated_at?: string
          user_id: string
          wallpaper_photo_id?: string | null
        }
        Update: {
          updated_at?: string
          user_id?: string
          wallpaper_photo_id?: string | null
        }
        Relationships: []
      }
      user_habits: {
        Row: {
          created_at: string
          id: string
          name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      habit_logs: {
        Row: {
          comment: string | null
          completed: boolean
          created_at: string
          habit_id: string
          id: string
          log_date: string
          updated_at: string
          user_id: string
        }
        Insert: {
          comment?: string | null
          completed?: boolean
          created_at?: string
          habit_id: string
          id?: string
          log_date: string
          updated_at?: string
          user_id: string
        }
        Update: {
          comment?: string | null
          completed?: boolean
          created_at?: string
          habit_id?: string
          id?: string
          log_date?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "habit_logs_habit_id_fkey"
            columns: ["habit_id"]
            isOneToOne: false
            referencedRelation: "user_habits"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_gated_predicted_score: {
        Args: { target_user_id: string }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
