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
      syllabus_master: {
        Row: {
          chapter: string
          created_at: string | null
          estimated_minutes: number | null
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
      user_profiles: {
        Row: {
          attempts: Json | null
          full_name: string | null
          id: string
          prev_exam_attempted: boolean | null
          prev_score: number | null
          primary_exam: string | null
          target_exam: string | null
          target_exam_date: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          attempts?: Json | null
          full_name?: string | null
          id?: string
          prev_exam_attempted?: boolean | null
          prev_score?: number | null
          primary_exam?: string | null
          target_exam?: string | null
          target_exam_date?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          attempts?: Json | null
          full_name?: string | null
          id?: string
          prev_exam_attempted?: boolean | null
          prev_score?: number | null
          primary_exam?: string | null
          target_exam?: string | null
          target_exam_date?: string | null
          updated_at?: string | null
          user_id?: string | null
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
