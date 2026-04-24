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
      auth_rate_limit_config: {
        Row: {
          id: number
          login_block_minutes: number
          login_max_failures: number
          login_window_minutes: number
          otp_block_minutes: number
          otp_max_failures: number
          otp_window_minutes: number
          password_reset_block_minutes: number
          password_reset_max_per_bucket: number
          password_reset_window_minutes: number
          signup_block_minutes: number
          signup_max_attempts: number
          signup_window_minutes: number
        }
        Insert: {
          id?: number
          login_block_minutes?: number
          login_max_failures?: number
          login_window_minutes?: number
          otp_block_minutes?: number
          otp_max_failures?: number
          otp_window_minutes?: number
          password_reset_block_minutes?: number
          password_reset_max_per_bucket?: number
          password_reset_window_minutes?: number
          signup_block_minutes?: number
          signup_max_attempts?: number
          signup_window_minutes?: number
        }
        Update: {
          id?: number
          login_block_minutes?: number
          login_max_failures?: number
          login_window_minutes?: number
          otp_block_minutes?: number
          otp_max_failures?: number
          otp_window_minutes?: number
          password_reset_block_minutes?: number
          password_reset_max_per_bucket?: number
          password_reset_window_minutes?: number
          signup_block_minutes?: number
          signup_max_attempts?: number
          signup_window_minutes?: number
        }
        Relationships: []
      }
      auth_rate_limits: {
        Row: {
          action_type: string
          attempt_count: number
          blocked_until: string | null
          bucket_key: string
          id: string
          last_attempt_at: string
          period_started_at: string
        }
        Insert: {
          action_type: string
          attempt_count?: number
          blocked_until?: string | null
          bucket_key: string
          id?: string
          last_attempt_at?: string
          period_started_at?: string
        }
        Update: {
          action_type?: string
          attempt_count?: number
          blocked_until?: string | null
          bucket_key?: string
          id?: string
          last_attempt_at?: string
          period_started_at?: string
        }
        Relationships: []
      }
      app_config: {
        Row: {
          id: string
          app_enabled: boolean
          maintenance_message: string
          maintenance_title: string
          maintenance_eta: string | null
          disabled_at: string | null
          disabled_by: string | null
          re_enabled_at: string | null
          re_enabled_by: string | null
          updated_at: string
        }
        Insert: {
          id?: string
          app_enabled?: boolean
          maintenance_message?: string
          maintenance_title?: string
          maintenance_eta?: string | null
          disabled_at?: string | null
          disabled_by?: string | null
          re_enabled_at?: string | null
          re_enabled_by?: string | null
          updated_at?: string
        }
        Update: {
          id?: string
          app_enabled?: boolean
          maintenance_message?: string
          maintenance_title?: string
          maintenance_eta?: string | null
          disabled_at?: string | null
          disabled_by?: string | null
          re_enabled_at?: string | null
          re_enabled_by?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      app_config_log: {
        Row: {
          id: string
          action: string
          performed_by: string | null
          performed_at: string
          old_value: Json | null
          new_value: Json | null
          reason: string | null
        }
        Insert: {
          id?: string
          action: string
          performed_by?: string | null
          performed_at?: string
          old_value?: Json | null
          new_value?: Json | null
          reason?: string | null
        }
        Update: {
          id?: string
          action?: string
          performed_by?: string | null
          performed_at?: string
          old_value?: Json | null
          new_value?: Json | null
          reason?: string | null
        }
        Relationships: []
      }
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
      feature_events: {
        Row: {
          id: string
          user_id: string
          feature: string
          event: string
          metadata: Json | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          feature: string
          event: string
          metadata?: Json | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          feature?: string
          event?: string
          metadata?: Json | null
          created_at?: string
        }
        Relationships: []
      }
      feature_flags: {
        Row: {
          id: string
          feature_key: string
          enabled: boolean
          description: string
          disabled_message: string | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          id?: string
          feature_key: string
          enabled?: boolean
          description?: string
          disabled_message?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          id?: string
          feature_key?: string
          enabled?: boolean
          description?: string
          disabled_message?: string | null
          updated_at?: string
          updated_by?: string | null
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
          relative_effort_score: number | null
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
          relative_effort_score?: number | null
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
          relative_effort_score?: number | null
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
      voice_ai_usage_log: {
        Row: {
          id: string
          user_id: string
          feature: string
          input_tokens: number
          output_tokens: number
          provider: string
          model: string
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          feature: string
          input_tokens?: number
          output_tokens?: number
          provider?: string
          model?: string
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          feature?: string
          input_tokens?: number
          output_tokens?: number
          provider?: string
          model?: string
          created_at?: string
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
      helpyji_daily_usage: {
        Row: {
          day: string
          last_message_at: string | null
          message_count: number
          subject_key: string
        }
        Insert: {
          day: string
          last_message_at?: string | null
          message_count?: number
          subject_key: string
        }
        Update: {
          day?: string
          last_message_at?: string | null
          message_count?: number
          subject_key?: string
        }
        Relationships: []
      }
      helpyji_conversations: {
        Row: {
          content: string
          created_at: string
          id: string
          message_role: string
          session_id: string
          surface: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          message_role: string
          session_id: string
          surface: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          message_role?: string
          session_id?: string
          surface?: string
          user_id?: string
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
          actual_worked_minutes: number
          created_at: string
          daily_plan_id: string
          id: string
          priority: string
          source: string
          source_raw_text: string | null
          status: string
          syllabus_master_id: string | null
          time_end: string | null
          time_slot: string | null
          time_start: string | null
          title: string
          updated_at: string
        }
        Insert: {
          actual_worked_minutes?: number
          created_at?: string
          daily_plan_id: string
          id: string
          priority?: string
          source: string
          source_raw_text?: string | null
          status?: string
          syllabus_master_id?: string | null
          time_end?: string | null
          time_slot?: string | null
          time_start?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          actual_worked_minutes?: number
          created_at?: string
          daily_plan_id?: string
          id?: string
          priority?: string
          source?: string
          source_raw_text?: string | null
          status?: string
          syllabus_master_id?: string | null
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
          {
            foreignKeyName: "daily_tasks_syllabus_master_id_fkey"
            columns: ["syllabus_master_id"]
            isOneToOne: false
            referencedRelation: "syllabus_master"
            referencedColumns: ["id"]
          },
        ]
      }
      doubts: {
        Row: {
          id: string
          user_id: string
          title: string
          description: string
          status: string
          subject: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          title?: string
          description?: string
          status?: string
          subject?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          title?: string
          description?: string
          status?: string
          subject?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      daily_reflections: {
        Row: {
          id: string
          user_id: string
          reflection_date: string
          finished_today: string | null
          skipped_today: string | null
          tomorrow_priority: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          reflection_date?: string
          finished_today?: string | null
          skipped_today?: string | null
          tomorrow_priority?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          reflection_date?: string
          finished_today?: string | null
          skipped_today?: string | null
          tomorrow_priority?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      exam_phase_plans: {
        Row: {
          id: string
          user_id: string
          phase: string
          subject: string
          weekly_hours_target: number | null
          revision_cycles: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          phase: string
          subject: string
          weekly_hours_target?: number | null
          revision_cycles?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          phase?: string
          subject?: string
          weekly_hours_target?: number | null
          revision_cycles?: number
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      mistake_logs: {
        Row: {
          id: string
          user_id: string
          logged_at: string
          subject: string
          syllabus_master_id: string | null
          topic_label: string | null
          mistake_type: string
          source: string | null
          mock_test_id: string | null
          note: string | null
          flag_for_revision: boolean
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          logged_at?: string
          subject: string
          syllabus_master_id?: string | null
          topic_label?: string | null
          mistake_type: string
          source?: string | null
          mock_test_id?: string | null
          note?: string | null
          flag_for_revision?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          logged_at?: string
          subject?: string
          syllabus_master_id?: string | null
          topic_label?: string | null
          mistake_type?: string
          source?: string | null
          mock_test_id?: string | null
          note?: string | null
          flag_for_revision?: boolean
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "mistake_logs_syllabus_master_id_fkey"
            columns: ["syllabus_master_id"]
            isOneToOne: false
            referencedRelation: "syllabus_master"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mistake_logs_mock_test_id_fkey"
            columns: ["mock_test_id"]
            isOneToOne: false
            referencedRelation: "mock_tests"
            referencedColumns: ["id"]
          }
        ]
      }
      mock_tests: {
        Row: {
          id: string
          user_id: string
          test_date: string
          test_name: string
          exam_name: string
          score_type: string
          max_score: number | null
          total_score: number | null
          duration_minutes: number | null
          self_rating: string | null
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          test_date?: string
          test_name?: string
          exam_name?: string
          score_type?: string
          max_score?: number | null
          total_score?: number | null
          duration_minutes?: number | null
          self_rating?: string | null
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          test_date?: string
          test_name?: string
          exam_name?: string
          score_type?: string
          max_score?: number | null
          total_score?: number | null
          duration_minutes?: number | null
          self_rating?: string | null
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      mock_test_subject_scores: {
        Row: {
          id: string
          mock_test_id: string
          subject: string
          max_score: number | null
          score: number | null
          created_at: string
        }
        Insert: {
          id?: string
          mock_test_id: string
          subject: string
          max_score?: number | null
          score?: number | null
          created_at?: string
        }
        Update: {
          id?: string
          mock_test_id?: string
          subject?: string
          max_score?: number | null
          score?: number | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "mock_test_subject_scores_mock_test_id_fkey"
            columns: ["mock_test_id"]
            isOneToOne: false
            referencedRelation: "mock_tests"
            referencedColumns: ["id"]
          }
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
      user_automated_push_daily: {
        Row: {
          ist_date: string
          send_count: number
          updated_at: string
          user_id: string
        }
        Insert: {
          ist_date: string
          send_count?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          ist_date?: string
          send_count?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_custom_notifications: {
        Row: {
          body: string
          created_at: string
          id: string
          is_active: boolean
          last_fired_ist_date: string | null
          repeat_type: string
          run_once_on_ist_date: string | null
          scheduled_time: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          body: string
          created_at?: string
          id?: string
          is_active?: boolean
          last_fired_ist_date?: string | null
          repeat_type: string
          run_once_on_ist_date?: string | null
          scheduled_time: string
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          is_active?: boolean
          last_fired_ist_date?: string | null
          repeat_type?: string
          run_once_on_ist_date?: string | null
          scheduled_time?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_scheduled_notifications: {
        Row: {
          body: string
          chapter: string | null
          created_at: string
          id: string
          is_active: boolean
          last_fired_at: string | null
          next_fire_at: string
          repeat_type: string
          subject: string | null
          tag: string
          title: string
          updated_at: string
          user_id: string
          user_timezone: string
        }
        Insert: {
          body: string
          chapter?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          last_fired_at?: string | null
          next_fire_at: string
          repeat_type: string
          subject?: string | null
          tag?: string
          title: string
          updated_at?: string
          user_id: string
          user_timezone?: string
        }
        Update: {
          body?: string
          chapter?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          last_fired_at?: string | null
          next_fire_at?: string
          repeat_type?: string
          subject?: string | null
          tag?: string
          title?: string
          updated_at?: string
          user_id?: string
          user_timezone?: string
        }
        Relationships: []
      }
      user_engine_notification_prefs: {
        Row: {
          prefs: Json
          updated_at: string
          user_id: string
        }
        Insert: {
          prefs?: Json
          updated_at?: string
          user_id: string
        }
        Update: {
          prefs?: Json
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_productivity_planner: {
        Row: {
          notes: string
          p1: string
          p2: string
          p3: string
          updated_at: string
          user_id: string
        }
        Insert: {
          notes?: string
          p1?: string
          p2?: string
          p3?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          notes?: string
          p1?: string
          p2?: string
          p3?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_quick_exam_todos: {
        Row: {
          created_at: string
          done: boolean
          id: string
          position: number
          priority: string
          text: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          done?: boolean
          id?: string
          position?: number
          priority: string
          text: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          done?: boolean
          id?: string
          position?: number
          priority?: string
          text?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_revision_logs: {
        Row: {
          confidence_stars: number | null
          created_at: string
          groq_feedback: Json | null
          groq_model: string | null
          id: string
          next_review_effective_date: string | null
          recall_transcript: string | null
          session_kind: string
          suggested_next_review_date: string | null
          syllabus_master_id: string | null
          topic_title: string
          user_id: string
          user_overrode_next_review: boolean
        }
        Insert: {
          confidence_stars?: number | null
          created_at?: string
          groq_feedback?: Json | null
          groq_model?: string | null
          id?: string
          next_review_effective_date?: string | null
          recall_transcript?: string | null
          session_kind: string
          suggested_next_review_date?: string | null
          syllabus_master_id?: string | null
          topic_title: string
          user_id: string
          user_overrode_next_review?: boolean
        }
        Update: {
          confidence_stars?: number | null
          created_at?: string
          groq_feedback?: Json | null
          groq_model?: string | null
          id?: string
          next_review_effective_date?: string | null
          recall_transcript?: string | null
          session_kind?: string
          suggested_next_review_date?: string | null
          syllabus_master_id?: string | null
          topic_title?: string
          user_id?: string
          user_overrode_next_review?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "user_revision_logs_syllabus_master_id_fkey"
            columns: ["syllabus_master_id"]
            isOneToOne: false
            referencedRelation: "syllabus_master"
            referencedColumns: ["id"]
          },
        ]
      }
      user_revision_queue_items: {
        Row: {
          created_at: string
          difficulty: string
          id: string
          last_reviewed: string | null
          microtopic_id: string | null
          next_due: string
          notes: string
          reminder_source: string
          status: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          difficulty: string
          id?: string
          last_reviewed?: string | null
          microtopic_id?: string | null
          next_due: string
          notes?: string
          reminder_source?: string
          status?: string
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          difficulty?: string
          id?: string
          last_reviewed?: string | null
          microtopic_id?: string | null
          next_due?: string
          notes?: string
          reminder_source?: string
          status?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_revision_topic_state: {
        Row: {
          last_confidence_stars: number | null
          last_recalled_at: string | null
          last_suggested_interval_max: number | null
          last_suggested_interval_min: number | null
          next_review_effective_date: string | null
          syllabus_master_id: string
          topic_title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          last_confidence_stars?: number | null
          last_recalled_at?: string | null
          last_suggested_interval_max?: number | null
          last_suggested_interval_min?: number | null
          next_review_effective_date?: string | null
          syllabus_master_id: string
          topic_title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          last_confidence_stars?: number | null
          last_recalled_at?: string | null
          last_suggested_interval_max?: number | null
          last_suggested_interval_min?: number | null
          next_review_effective_date?: string | null
          syllabus_master_id?: string
          topic_title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_revision_topic_state_syllabus_master_id_fkey"
            columns: ["syllabus_master_id"]
            isOneToOne: false
            referencedRelation: "syllabus_master"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_sends: {
        Row: {
          id: string
          user_id: string
          channel: string
          notification_type: string
          sent_at: string
          delivered_at: string | null
          opened_at: string | null
          clicked_at: string | null
          converted_at: string | null
        }
        Insert: {
          id?: string
          user_id: string
          channel: string
          notification_type: string
          sent_at?: string
          delivered_at?: string | null
          opened_at?: string | null
          clicked_at?: string | null
          converted_at?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          channel?: string
          notification_type?: string
          sent_at?: string
          delivered_at?: string | null
          opened_at?: string | null
          clicked_at?: string | null
          converted_at?: string | null
        }
        Relationships: []
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
      user_push_tokens: {
        Row: {
          created_at: string
          id: string
          invalid_registration_streak: number
          last_seen_at: string
          token: string
          user_agent: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          invalid_registration_streak?: number
          last_seen_at?: string
          token: string
          user_agent?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          invalid_registration_streak?: number
          last_seen_at?: string
          token?: string
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_system_push_dedupe: {
        Row: {
          created_at: string
          date_key: string
          kind: string
          user_id: string
        }
        Insert: {
          created_at?: string
          date_key: string
          kind: string
          user_id: string
        }
        Update: {
          created_at?: string
          date_key?: string
          kind?: string
          user_id?: string
        }
        Relationships: []
      }
      user_profiles: {
        Row: {
          ai_usage_row_version: number
          ai_tokens_month: string | null
          ai_tokens_used: number
          welcome_ai_tokens_used: number
          paid_trial_ai_tokens_used: number
          subscription_cancelled_at: string | null
          attempts: Json | null
          bonus_photo_scans: number
          bonus_photo_scans_ledger: Json
          bonus_voice_minutes: number
          bonus_voice_minutes_ledger: Json
          bonus_ai_tokens: number
          bonus_ai_tokens_ledger: Json
          bonus_ai_tokens_ledger_at_cancel: Json | null
          bonus_voice_minutes_ledger_at_cancel: Json | null
          class_studying: string | null
          cuet_domain_subjects: Json
          full_name: string | null
          has_had_trial: boolean
          has_used_free_trial: boolean
          id: string
          mandatory_onboarding_completed_at: string | null
          phone_number: string | null
          photo_scans_used_this_month: number
          prepbrain_tokens_month: string | null
          prepbrain_tokens_used: number
          prev_exam_attempted: boolean | null
          prev_score: number | null
          prev_score_entries: Json
          razorpay_subscription_id: string | null
          primary_exam: string | null
          subscription_autopay_months_total: number | null
          subscription_end_date: string | null
          subscription_plan: string | null
          subscription_start_date: string | null
          subscription_status: string | null
          subscription_tier: string | null
          signup_attribution: Json | null
          system_push_notifications: boolean
          target_exam: string | null
          target_exam_date: string | null
          enabled_features: string[] | null
          quick_nav_hrefs: Json | null
          upsc_optional_subjects: string[] | null
          trial_photo_scans_used: number
          trial_started_at: string | null
          trial_voice_seconds_used: number
          ui_prefs: Json | null
          updated_at: string | null
          usage_reset_date: string | null
          user_id: string | null
          voice_minutes_used_this_month: number | string
          ai_study_partner_seconds_remaining: number
          payment_grace_until: string | null
        }
        Insert: {
          ai_usage_row_version?: number
          ai_tokens_month?: string | null
          ai_tokens_used?: number
          welcome_ai_tokens_used?: number
          paid_trial_ai_tokens_used?: number
          subscription_cancelled_at?: string | null
          attempts?: Json | null
          bonus_photo_scans?: number
          bonus_photo_scans_ledger?: Json
          bonus_voice_minutes?: number
          bonus_voice_minutes_ledger?: Json
          bonus_ai_tokens?: number
          bonus_ai_tokens_ledger?: Json
          bonus_ai_tokens_ledger_at_cancel?: Json | null
          bonus_voice_minutes_ledger_at_cancel?: Json | null
          class_studying?: string | null
          cuet_domain_subjects?: Json
          full_name?: string | null
          has_had_trial?: boolean
          has_used_free_trial?: boolean
          id?: string
          mandatory_onboarding_completed_at?: string | null
          phone_number?: string | null
          photo_scans_used_this_month?: number
          prepbrain_tokens_month?: string | null
          prepbrain_tokens_used?: number
          prev_exam_attempted?: boolean | null
          prev_score?: number | null
          prev_score_entries?: Json
          razorpay_subscription_id?: string | null
          primary_exam?: string | null
          subscription_autopay_months_total?: number | null
          subscription_end_date?: string | null
          subscription_plan?: string | null
          subscription_start_date?: string | null
          subscription_status?: string | null
          subscription_tier?: string | null
          signup_attribution?: Json | null
          system_push_notifications?: boolean
          target_exam?: string | null
          target_exam_date?: string | null
          enabled_features?: string[] | null
          quick_nav_hrefs?: Json | null
          upsc_optional_subjects?: string[] | null
          trial_photo_scans_used?: number
          trial_started_at?: string | null
          trial_voice_seconds_used?: number
          ui_prefs?: Json | null
          updated_at?: string | null
          usage_reset_date?: string | null
          user_id?: string | null
          voice_minutes_used_this_month?: number | string
          ai_study_partner_seconds_remaining?: number
          payment_grace_until?: string | null
        }
        Update: {
          ai_usage_row_version?: number
          ai_tokens_month?: string | null
          ai_tokens_used?: number
          welcome_ai_tokens_used?: number
          paid_trial_ai_tokens_used?: number
          subscription_cancelled_at?: string | null
          attempts?: Json | null
          bonus_photo_scans?: number
          bonus_photo_scans_ledger?: Json
          bonus_voice_minutes?: number
          bonus_voice_minutes_ledger?: Json
          bonus_ai_tokens?: number
          bonus_ai_tokens_ledger?: Json
          bonus_ai_tokens_ledger_at_cancel?: Json | null
          bonus_voice_minutes_ledger_at_cancel?: Json | null
          class_studying?: string | null
          cuet_domain_subjects?: Json
          full_name?: string | null
          has_had_trial?: boolean
          has_used_free_trial?: boolean
          id?: string
          mandatory_onboarding_completed_at?: string | null
          phone_number?: string | null
          photo_scans_used_this_month?: number
          prepbrain_tokens_month?: string | null
          prepbrain_tokens_used?: number
          prev_exam_attempted?: boolean | null
          prev_score?: number | null
          prev_score_entries?: Json
          razorpay_subscription_id?: string | null
          primary_exam?: string | null
          subscription_autopay_months_total?: number | null
          subscription_end_date?: string | null
          subscription_plan?: string | null
          subscription_start_date?: string | null
          subscription_status?: string | null
          subscription_tier?: string | null
          signup_attribution?: Json | null
          system_push_notifications?: boolean
          target_exam?: string | null
          target_exam_date?: string | null
          enabled_features?: string[] | null
          quick_nav_hrefs?: Json | null
          upsc_optional_subjects?: string[] | null
          trial_photo_scans_used?: number
          trial_started_at?: string | null
          trial_voice_seconds_used?: number
          ui_prefs?: Json | null
          updated_at?: string | null
          usage_reset_date?: string | null
          user_id?: string | null
          voice_minutes_used_this_month?: number | string
          ai_study_partner_seconds_remaining?: number
          payment_grace_until?: string | null
        }
        Relationships: []
      }
      prepbrain_ai_token_reservations: {
        Row: {
          id: string
          user_id: string
          estimate: number
          month_key: string
          created_at: string
          expires_at: string
          finalized_at: string | null
          cancelled_at: string | null
          input_tokens: number | null
          output_tokens: number | null
          provider: string | null
          model: string | null
        }
        Insert: {
          id?: string
          user_id: string
          estimate: number
          month_key: string
          created_at?: string
          expires_at: string
          finalized_at?: string | null
          cancelled_at?: string | null
          input_tokens?: number | null
          output_tokens?: number | null
          provider?: string | null
          model?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          estimate?: number
          month_key?: string
          created_at?: string
          expires_at?: string
          finalized_at?: string | null
          cancelled_at?: string | null
          input_tokens?: number | null
          output_tokens?: number | null
          provider?: string | null
          model?: string | null
        }
        Relationships: []
      }
      prepbrain_conversations: {
        Row: {
          created_at: string
          id: string
          title: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          title?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          title?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      prepbrain_messages: {
        Row: {
          content: string
          conversation_id: string
          created_at: string
          id: string
          message_role: string
          position: number
          user_id: string
        }
        Insert: {
          content: string
          conversation_id: string
          created_at?: string
          id?: string
          message_role: string
          position: number
          user_id: string
        }
        Update: {
          content?: string
          conversation_id?: string
          created_at?: string
          id?: string
          message_role?: string
          position?: number
          user_id?: string
        }
        Relationships: []
      }
      prepbrain_chat_cooldown: {
        Row: {
          last_request_at: string
          user_id: string
        }
        Insert: {
          last_request_at?: string
          user_id: string
        }
        Update: {
          last_request_at?: string
          user_id?: string
        }
        Relationships: []
      }
      admin_config: {
        Row: {
          key: string
          value: string
          previous_value: string | null
          updated_by: string | null
          updated_at: string
        }
        Insert: {
          key: string
          value: string
          previous_value?: string | null
          updated_by?: string | null
          updated_at?: string
        }
        Update: {
          key?: string
          value?: string
          previous_value?: string | null
          updated_by?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      admin_users: {
        Row: {
          user_id: string
          email: string | null
          user_id_claimed_at: string | null
          updated_at: string
          added_by: string | null
          added_at: string
        }
        Insert: {
          user_id: string
          email?: string | null
          user_id_claimed_at?: string | null
          updated_at?: string
          added_by?: string | null
          added_at?: string
        }
        Update: {
          user_id?: string
          email?: string | null
          user_id_claimed_at?: string | null
          updated_at?: string
          added_by?: string | null
          added_at?: string
        }
        Relationships: []
      }
      admin_user_support_notes: {
        Row: {
          id: string
          user_id: string
          note: string
          created_by: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          note: string
          created_by?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          note?: string
          created_by?: string | null
          created_at?: string
        }
        Relationships: []
      }
      batches: {
        Row: {
          id: string
          batch_number: number
          opens_at: string
          closes_at: string | null
          status: string
          size: number
          notes: string | null
          created_at: string
        }
        Insert: {
          id?: string
          batch_number: number
          opens_at: string
          closes_at?: string | null
          status?: string
          size?: number
          notes?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          batch_number?: number
          opens_at?: string
          closes_at?: string | null
          status?: string
          size?: number
          notes?: string | null
          created_at?: string
        }
        Relationships: []
      }
      waitlist_entries: {
        Row: {
          id: string
          user_id: string
          batch_id: string | null
          position: number
          status: string
          skipped_waitlist: boolean
          razorpay_payment_id: string | null
          notification_channel: string
          contact_email: string | null
          contact_phone: string | null
          joined_at: string
          activated_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          batch_id?: string | null
          position: number
          status?: string
          skipped_waitlist?: boolean
          razorpay_payment_id?: string | null
          notification_channel?: string
          contact_email?: string | null
          contact_phone?: string | null
          joined_at?: string
          activated_at?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          batch_id?: string | null
          position?: number
          status?: string
          skipped_waitlist?: boolean
          razorpay_payment_id?: string | null
          notification_channel?: string
          contact_email?: string | null
          contact_phone?: string | null
          joined_at?: string
          activated_at?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "waitlist_entries_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "batches"
            referencedColumns: ["id"]
          }
        ]
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
      user_target_blueprints: {
        Row: {
          chapters: Json
          created_at: string
          estimated_marks_at_save: number
          exam_name: string
          id: string
          max_score: number
          mode: string
          range_high: number
          range_low: number
          target_clamped: number
          total_marks_covered: number
          user_id: string
        }
        Insert: {
          chapters?: Json
          created_at?: string
          estimated_marks_at_save: number
          exam_name: string
          id?: string
          max_score: number
          mode: string
          range_high: number
          range_low: number
          target_clamped: number
          total_marks_covered: number
          user_id: string
        }
        Update: {
          chapters?: Json
          created_at?: string
          estimated_marks_at_save?: number
          exam_name?: string
          id?: string
          max_score?: number
          mode?: string
          range_high?: number
          range_low?: number
          target_clamped?: number
          total_marks_covered?: number
          user_id?: string
        }
        Relationships: []
      }
      user_target_recommendation_history: {
        Row: {
          achieved_marks: number
          created_at: string
          exam_name: string
          id: string
          meta: Json
          recommended_items: Json
          target_boost: number
          user_id: string
        }
        Insert: {
          achieved_marks: number
          created_at?: string
          exam_name: string
          id?: string
          meta?: Json
          recommended_items?: Json
          target_boost: number
          user_id: string
        }
        Update: {
          achieved_marks?: number
          created_at?: string
          exam_name?: string
          id?: string
          meta?: Json
          recommended_items?: Json
          target_boost?: number
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
      app_updates: {
        Row: {
          id: string
          title: string
          message: string
          category: string
          created_at: string
        }
        Insert: {
          id?: string
          title: string
          message: string
          category?: string
          created_at?: string
        }
        Update: {
          id?: string
          title?: string
          message?: string
          category?: string
          created_at?: string
        }
        Relationships: []
      }
      user_app_update_reads: {
        Row: {
          user_id: string
          update_id: string
          read_at: string
        }
        Insert: {
          user_id: string
          update_id: string
          read_at?: string
        }
        Update: {
          user_id?: string
          update_id?: string
          read_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_app_update_reads_update_id_fkey"
            columns: ["update_id"]
            isOneToOne: false
            referencedRelation: "app_updates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_app_update_reads_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      leaderboard_weekly_metrics: {
        Row: {
          cohort_key: string
          cohort_rank: number | null
          cohort_size: number | null
          composite: number
          syllabus_overall_pct: number
          top_percent: number | null
          updated_at: string
          user_id: string
          week_start: string
          weekly_seconds: number
        }
        Insert: {
          cohort_key: string
          cohort_rank?: number | null
          cohort_size?: number | null
          composite: number
          syllabus_overall_pct: number
          top_percent?: number | null
          updated_at?: string
          user_id: string
          week_start: string
          weekly_seconds?: number
        }
        Update: {
          cohort_key?: string
          cohort_rank?: number | null
          cohort_size?: number | null
          composite?: number
          syllabus_overall_pct?: number
          top_percent?: number | null
          updated_at?: string
          user_id?: string
          week_start?: string
          weekly_seconds?: number
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      auth_rate_limit_password_reset: {
        Args: { p_email: string; p_ip: string; p_step: string }
        Returns: Json
      }
      auth_rate_limit_step: {
        Args: {
          p_action_type: string
          p_bucket_key: string
          p_step: string
        }
        Returns: Json
      }
      consume_welcome_trial_photo_scan: {
        Args: { p_user_id: string }
        Returns: Json
      }
      consume_welcome_trial_voice_seconds: {
        Args: { p_add_seconds: number; p_user_id: string }
        Returns: Json
      }
      prepbrain_ai_token_reserve: {
        Args: { p_estimate: number; p_month_key: string; p_user_id: string }
        Returns: Json
      }
      prepbrain_ai_token_finalize: {
        Args: { p_actual: number; p_reservation_id: string; p_user_id: string }
        Returns: Json
      }
      prepbrain_ai_token_cancel_reservation: {
        Args: { p_reservation_id: string; p_user_id: string }
        Returns: Json
      }
      prepbrain_ai_token_sweep_expired: {
        Args: Record<PropertyKey, never>
        Returns: Json
      }
      get_gated_predicted_score: {
        Args: { target_user_id: string }
        Returns: Json
      }
      refund_automated_push_budget: {
        Args: { p_ist_date: string; p_user_id: string }
        Returns: null
      }
      try_consume_automated_push_budget: {
        Args: { p_ist_date: string; p_max?: number; p_user_id: string }
        Returns: boolean
      }
      upsc_cse_mains_optional_subjects: {
        Args: Record<PropertyKey, never>
        Returns: { base_name: string }[]
      }
      upsc_cse_mains_syllabus_rows: {
        Args: { p_optional?: string | null }
        Returns: Database["public"]["Tables"]["syllabus_master"]["Row"][]
      }
      recompute_leaderboard_weekly_top_percents: {
        Args: { p_week_start: string }
        Returns: undefined
      }
      fetch_task_sessions_for_log: {
        Args: { p_since: string; p_limit?: number }
        Returns: {
          id: string
          task_id: string
          start_time: string
          end_time: string
          duration_seconds: number | null
          created_at: string | null
          task_name: string | null
          microtopic_id: string | null
          assigned_date: string
          task_status: string
        }[]
      }
      add_ai_study_partner_seconds: {
        Args: { p_user_id: string; p_seconds: number }
        Returns: undefined
      }
      deduct_ai_study_partner_seconds: {
        Args: { p_user_id: string; p_seconds: number }
        Returns: undefined
      }
      assign_waitlist_position: {
        Args: {
          p_user_id: string
          p_batch_id: string
          p_notification_ch?: string
          p_contact_email?: string | null
          p_contact_phone?: string | null
        }
        Returns: Json
      }
      activate_waitlist_skip: {
        Args: {
          p_user_id: string
          p_razorpay_payment_id: string
        }
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
