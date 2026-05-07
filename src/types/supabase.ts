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
      admin_config: {
        Row: {
          key: string
          previous_value: string | null
          updated_at: string
          updated_by: string | null
          value: string
        }
        Insert: {
          key: string
          previous_value?: string | null
          updated_at?: string
          updated_by?: string | null
          value: string
        }
        Update: {
          key?: string
          previous_value?: string | null
          updated_at?: string
          updated_by?: string | null
          value?: string
        }
        Relationships: []
      }
      admin_user_support_notes: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          note: string
          user_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          note: string
          user_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          note?: string
          user_id?: string
        }
        Relationships: []
      }
      admin_users: {
        Row: {
          added_at: string
          added_by: string | null
          email: string | null
          updated_at: string
          user_id: string
          user_id_claimed_at: string | null
        }
        Insert: {
          added_at?: string
          added_by?: string | null
          email?: string | null
          updated_at?: string
          user_id: string
          user_id_claimed_at?: string | null
        }
        Update: {
          added_at?: string
          added_by?: string | null
          email?: string | null
          updated_at?: string
          user_id?: string
          user_id_claimed_at?: string | null
        }
        Relationships: []
      }
      anonymous_stats: {
        Row: {
          created_at: string
          exam_key: string
          id: string
          metric: string
          pct_of_users: number
          sample_size: number
          stat_date: string
        }
        Insert: {
          created_at?: string
          exam_key: string
          id?: string
          metric: string
          pct_of_users: number
          sample_size?: number
          stat_date: string
        }
        Update: {
          created_at?: string
          exam_key?: string
          id?: string
          metric?: string
          pct_of_users?: number
          sample_size?: number
          stat_date?: string
        }
        Relationships: []
      }
      app_config: {
        Row: {
          app_enabled: boolean
          daily_cap_enabled: boolean
          daily_cap_timezone: string
          daily_trial_cap: number
          disabled_at: string | null
          disabled_by: string | null
          id: string
          maintenance_eta: string | null
          maintenance_message: string
          maintenance_title: string
          re_enabled_at: string | null
          re_enabled_by: string | null
          updated_at: string
        }
        Insert: {
          app_enabled?: boolean
          daily_cap_enabled?: boolean
          daily_cap_timezone?: string
          daily_trial_cap?: number
          disabled_at?: string | null
          disabled_by?: string | null
          id?: string
          maintenance_eta?: string | null
          maintenance_message?: string
          maintenance_title?: string
          re_enabled_at?: string | null
          re_enabled_by?: string | null
          updated_at?: string
        }
        Update: {
          app_enabled?: boolean
          daily_cap_enabled?: boolean
          daily_cap_timezone?: string
          daily_trial_cap?: number
          disabled_at?: string | null
          disabled_by?: string | null
          id?: string
          maintenance_eta?: string | null
          maintenance_message?: string
          maintenance_title?: string
          re_enabled_at?: string | null
          re_enabled_by?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      app_config_log: {
        Row: {
          action: string
          id: string
          new_value: Json | null
          old_value: Json | null
          performed_at: string
          performed_by: string | null
          reason: string | null
        }
        Insert: {
          action: string
          id?: string
          new_value?: Json | null
          old_value?: Json | null
          performed_at?: string
          performed_by?: string | null
          reason?: string | null
        }
        Update: {
          action?: string
          id?: string
          new_value?: Json | null
          old_value?: Json | null
          performed_at?: string
          performed_by?: string | null
          reason?: string | null
        }
        Relationships: []
      }
      app_updates: {
        Row: {
          category: string
          created_at: string
          id: string
          message: string
          title: string
        }
        Insert: {
          category?: string
          created_at?: string
          id?: string
          message: string
          title: string
        }
        Update: {
          category?: string
          created_at?: string
          id?: string
          message?: string
          title?: string
        }
        Relationships: []
      }
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
      batches: {
        Row: {
          batch_number: number
          closes_at: string | null
          created_at: string
          id: string
          notes: string | null
          opens_at: string
          size: number
          status: string
        }
        Insert: {
          batch_number: number
          closes_at?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          opens_at: string
          size?: number
          status?: string
        }
        Update: {
          batch_number?: number
          closes_at?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          opens_at?: string
          size?: number
          status?: string
        }
        Relationships: []
      }
      chapter_marks: {
        Row: {
          chapter: string
          exam_name: string
          marks_2023: number | null
          marks_2024: number | null
          marks_2025: number | null
          marks_2026: number | null
          subject: string
        }
        Insert: {
          chapter: string
          exam_name: string
          marks_2023?: number | null
          marks_2024?: number | null
          marks_2025?: number | null
          marks_2026?: number | null
          subject: string
        }
        Update: {
          chapter?: string
          exam_name?: string
          marks_2023?: number | null
          marks_2024?: number | null
          marks_2025?: number | null
          marks_2026?: number | null
          subject?: string
        }
        Relationships: []
      }
      exam_subject_question_history: {
        Row: {
          exam_name: string
          year: number
          shift: string
          subject: string
          questions_min: number
          questions_max: number
        }
        Insert: {
          exam_name: string
          year: number
          shift?: string
          subject: string
          questions_min: number
          questions_max: number
        }
        Update: {
          exam_name?: string
          year?: number
          shift?: string
          subject?: string
          questions_min?: number
          questions_max?: number
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
          morning_ignition_completed: boolean
          plan_date: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          morning_ignition_completed?: boolean
          plan_date: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          morning_ignition_completed?: boolean
          plan_date?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      daily_reflections: {
        Row: {
          created_at: string
          finished_today: string | null
          id: string
          reflection_date: string
          skipped_today: string | null
          tomorrow_priority: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          finished_today?: string | null
          id?: string
          reflection_date?: string
          skipped_today?: string | null
          tomorrow_priority?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          finished_today?: string | null
          id?: string
          reflection_date?: string
          skipped_today?: string | null
          tomorrow_priority?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      daily_tasks: {
        Row: {
          actual_worked_minutes: number
          backlog_item_id: string | null
          created_at: string
          daily_plan_id: string
          estimated_minutes: number | null
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
          backlog_item_id?: string | null
          created_at?: string
          daily_plan_id: string
          estimated_minutes?: number | null
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
          backlog_item_id?: string | null
          created_at?: string
          daily_plan_id?: string
          estimated_minutes?: number | null
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
            foreignKeyName: "daily_tasks_backlog_item_id_fkey"
            columns: ["backlog_item_id"]
            isOneToOne: false
            referencedRelation: "user_syllabus_backlog"
            referencedColumns: ["id"]
          },
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
            referencedRelation: "exam_full_analysis_view"
            referencedColumns: ["microtopic_id"]
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
      daily_trial_counts: {
        Row: {
          cap: number
          created_at: string
          date: string
          id: string
          trials_started: number
          updated_at: string
        }
        Insert: {
          cap: number
          created_at?: string
          date: string
          id?: string
          trials_started?: number
          updated_at?: string
        }
        Update: {
          cap?: number
          created_at?: string
          date?: string
          id?: string
          trials_started?: number
          updated_at?: string
        }
        Relationships: []
      }
      exam_phase_plans: {
        Row: {
          created_at: string
          id: string
          phase: string
          revision_cycles: number
          subject: string
          updated_at: string
          user_id: string
          weekly_hours_target: number | null
        }
        Insert: {
          created_at?: string
          id?: string
          phase: string
          revision_cycles?: number
          subject: string
          updated_at?: string
          user_id: string
          weekly_hours_target?: number | null
        }
        Update: {
          created_at?: string
          id?: string
          phase?: string
          revision_cycles?: number
          subject?: string
          updated_at?: string
          user_id?: string
          weekly_hours_target?: number | null
        }
        Relationships: []
      }
      exams: {
        Row: {
          created_at: string | null
          display_name: string
          exam_name: string
          is_multi_subject: boolean | null
          max_score: number | null
          multi_subject: boolean
          scoring_type: string | null
          sort_order: number | null
        }
        Insert: {
          created_at?: string | null
          display_name: string
          exam_name: string
          is_multi_subject?: boolean | null
          max_score?: number | null
          multi_subject?: boolean
          scoring_type?: string | null
          sort_order?: number | null
        }
        Update: {
          created_at?: string | null
          display_name?: string
          exam_name?: string
          is_multi_subject?: boolean | null
          max_score?: number | null
          multi_subject?: boolean
          scoring_type?: string | null
          sort_order?: number | null
        }
        Relationships: []
      }
      feature_events: {
        Row: {
          created_at: string
          event: string
          feature: string
          id: string
          metadata: Json | null
          user_id: string
        }
        Insert: {
          created_at?: string
          event: string
          feature: string
          id?: string
          metadata?: Json | null
          user_id: string
        }
        Update: {
          created_at?: string
          event?: string
          feature?: string
          id?: string
          metadata?: Json | null
          user_id?: string
        }
        Relationships: []
      }
      feature_flags: {
        Row: {
          description: string
          disabled_message: string | null
          enabled: boolean
          feature_key: string
          id: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          description?: string
          disabled_message?: string | null
          enabled?: boolean
          feature_key: string
          id?: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          description?: string
          disabled_message?: string | null
          enabled?: boolean
          feature_key?: string
          id?: string
          updated_at?: string
          updated_by?: string | null
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
      handwritten_planner_entries: {
        Row: {
          created_at: string
          duration: string | null
          end_time: string | null
          id: string
          log_date: string
          parsed_json: Json | null
          source_text: string
          start_time: string | null
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          duration?: string | null
          end_time?: string | null
          id?: string
          log_date: string
          parsed_json?: Json | null
          source_text?: string
          start_time?: string | null
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          duration?: string | null
          end_time?: string | null
          id?: string
          log_date?: string
          parsed_json?: Json | null
          source_text?: string
          start_time?: string | null
          title?: string
          updated_at?: string
          user_id?: string
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
          composite?: number
          syllabus_overall_pct?: number
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
      mistake_logs: {
        Row: {
          created_at: string
          flag_for_revision: boolean
          id: string
          logged_at: string
          mistake_type: string
          mock_test_id: string | null
          note: string | null
          source: string | null
          subject: string
          syllabus_master_id: string | null
          topic_label: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          flag_for_revision?: boolean
          id?: string
          logged_at?: string
          mistake_type: string
          mock_test_id?: string | null
          note?: string | null
          source?: string | null
          subject: string
          syllabus_master_id?: string | null
          topic_label?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          flag_for_revision?: boolean
          id?: string
          logged_at?: string
          mistake_type?: string
          mock_test_id?: string | null
          note?: string | null
          source?: string | null
          subject?: string
          syllabus_master_id?: string | null
          topic_label?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "mistake_logs_mock_test_id_fkey"
            columns: ["mock_test_id"]
            isOneToOne: false
            referencedRelation: "mock_tests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mistake_logs_syllabus_master_id_fkey"
            columns: ["syllabus_master_id"]
            isOneToOne: false
            referencedRelation: "exam_full_analysis_view"
            referencedColumns: ["microtopic_id"]
          },
          {
            foreignKeyName: "mistake_logs_syllabus_master_id_fkey"
            columns: ["syllabus_master_id"]
            isOneToOne: false
            referencedRelation: "syllabus_master"
            referencedColumns: ["id"]
          },
        ]
      }
      mock_test_subject_scores: {
        Row: {
          created_at: string
          id: string
          max_score: number | null
          mock_test_id: string
          score: number | null
          subject: string
        }
        Insert: {
          created_at?: string
          id?: string
          max_score?: number | null
          mock_test_id: string
          score?: number | null
          subject: string
        }
        Update: {
          created_at?: string
          id?: string
          max_score?: number | null
          mock_test_id?: string
          score?: number | null
          subject?: string
        }
        Relationships: [
          {
            foreignKeyName: "mock_test_subject_scores_mock_test_id_fkey"
            columns: ["mock_test_id"]
            isOneToOne: false
            referencedRelation: "mock_tests"
            referencedColumns: ["id"]
          },
        ]
      }
      mock_tests: {
        Row: {
          created_at: string
          duration_minutes: number | null
          exam_name: string
          id: string
          max_score: number | null
          notes: string | null
          score_type: string
          self_rating: string | null
          test_date: string
          test_name: string
          total_score: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          duration_minutes?: number | null
          exam_name?: string
          id?: string
          max_score?: number | null
          notes?: string | null
          score_type?: string
          self_rating?: string | null
          test_date?: string
          test_name?: string
          total_score?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          duration_minutes?: number | null
          exam_name?: string
          id?: string
          max_score?: number | null
          notes?: string | null
          score_type?: string
          self_rating?: string | null
          test_date?: string
          test_name?: string
          total_score?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
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
      notification_sends: {
        Row: {
          channel: string
          clicked_at: string | null
          converted_at: string | null
          delivered_at: string | null
          id: string
          notification_type: string
          opened_at: string | null
          sent_at: string
          user_id: string
        }
        Insert: {
          channel: string
          clicked_at?: string | null
          converted_at?: string | null
          delivered_at?: string | null
          id?: string
          notification_type: string
          opened_at?: string | null
          sent_at?: string
          user_id: string
        }
        Update: {
          channel?: string
          clicked_at?: string | null
          converted_at?: string | null
          delivered_at?: string | null
          id?: string
          notification_type?: string
          opened_at?: string | null
          sent_at?: string
          user_id?: string
        }
        Relationships: []
      }
      prepbrain_ai_token_reservations: {
        Row: {
          cancelled_at: string | null
          created_at: string
          estimate: number
          expires_at: string
          finalized_at: string | null
          id: string
          input_tokens: number | null
          model: string | null
          month_key: string
          output_tokens: number | null
          provider: string | null
          user_id: string
        }
        Insert: {
          cancelled_at?: string | null
          created_at?: string
          estimate: number
          expires_at: string
          finalized_at?: string | null
          id?: string
          input_tokens?: number | null
          model?: string | null
          month_key: string
          output_tokens?: number | null
          provider?: string | null
          user_id: string
        }
        Update: {
          cancelled_at?: string | null
          created_at?: string
          estimate?: number
          expires_at?: string
          finalized_at?: string | null
          id?: string
          input_tokens?: number | null
          model?: string | null
          month_key?: string
          output_tokens?: number | null
          provider?: string | null
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
        Relationships: [
          {
            foreignKeyName: "prepbrain_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "prepbrain_conversations"
            referencedColumns: ["id"]
          },
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
      referral_codes: {
        Row: {
          campaign: string | null
          code: string
          created_at: string
          description: string | null
          id: string
          is_active: boolean
        }
        Insert: {
          campaign?: string | null
          code: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
        }
        Update: {
          campaign?: string | null
          code?: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
        }
        Relationships: []
      }
      referral_events: {
        Row: {
          code: string | null
          created_at: string
          event_type: string
          id: string
          metadata: Json
          session_id: string | null
          user_id: string | null
        }
        Insert: {
          code?: string | null
          created_at?: string
          event_type: string
          id?: string
          metadata?: Json
          session_id?: string | null
          user_id?: string | null
        }
        Update: {
          code?: string | null
          created_at?: string
          event_type?: string
          id?: string
          metadata?: Json
          session_id?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      study_camera_cooldown: {
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
      study_partner_cooldown: {
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
      syllabus_master: {
        Row: {
          chapter: string
          created_at: string | null
          exam_name: string
          id: string
          marks_2023: number | null
          marks_2024: number | null
          marks_2025: number | null
          microtopic: string
          relative_effort_score: number | null
          section: string | null
          subject: string
          weightage_tag: string | null
        }
        Insert: {
          chapter: string
          created_at?: string | null
          exam_name?: string
          id?: string
          marks_2023?: number | null
          marks_2024?: number | null
          marks_2025?: number | null
          microtopic: string
          relative_effort_score?: number | null
          section?: string | null
          subject: string
          weightage_tag?: string | null
        }
        Update: {
          chapter?: string
          created_at?: string | null
          exam_name?: string
          id?: string
          marks_2023?: number | null
          marks_2024?: number | null
          marks_2025?: number | null
          microtopic?: string
          relative_effort_score?: number | null
          section?: string | null
          subject?: string
          weightage_tag?: string | null
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
          end_time: string | null
          estimated_time_minutes: number | null
          id: string
          marks_value: number | null
          marks_weight: number | null
          microtopic_id: string | null
          name: string | null
          source: string | null
          start_time: string | null
          status: string
          time_spent_seconds: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          assigned_date: string
          created_at?: string | null
          end_time?: string | null
          estimated_time_minutes?: number | null
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
          end_time?: string | null
          estimated_time_minutes?: number | null
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
            referencedRelation: "exam_full_analysis_view"
            referencedColumns: ["microtopic_id"]
          },
          {
            foreignKeyName: "tasks_microtopic_id_fkey"
            columns: ["microtopic_id"]
            isOneToOne: false
            referencedRelation: "syllabus_master"
            referencedColumns: ["id"]
          },
        ]
      }
      trial_queue_entries: {
        Row: {
          activated_at: string | null
          created_at: string
          id: string
          notified_at: string | null
          queued_for: string
          status: string
          user_id: string
        }
        Insert: {
          activated_at?: string | null
          created_at?: string
          id?: string
          notified_at?: string | null
          queued_for: string
          status?: string
          user_id: string
        }
        Update: {
          activated_at?: string | null
          created_at?: string
          id?: string
          notified_at?: string | null
          queued_for?: string
          status?: string
          user_id?: string
        }
        Relationships: []
      }
      user_app_update_reads: {
        Row: {
          read_at: string
          update_id: string
          user_id: string
        }
        Insert: {
          read_at?: string
          update_id: string
          user_id: string
        }
        Update: {
          read_at?: string
          update_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_app_update_reads_update_id_fkey"
            columns: ["update_id"]
            isOneToOne: false
            referencedRelation: "app_updates"
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
      user_feedback: {
        Row: {
          category: string
          contact_email: string | null
          contact_name: string | null
          created_at: string
          id: string
          message: string
          screenshot_url: string | null
          subject: string | null
          user_id: string
        }
        Insert: {
          category: string
          contact_email?: string | null
          contact_name?: string | null
          created_at?: string
          id?: string
          message: string
          screenshot_url?: string | null
          subject?: string | null
          user_id: string
        }
        Update: {
          category?: string
          contact_email?: string | null
          contact_name?: string | null
          created_at?: string
          id?: string
          message?: string
          screenshot_url?: string | null
          subject?: string | null
          user_id?: string
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
      user_meditation_sessions: {
        Row: {
          ambient_sound: string | null
          completed_at: string
          created_at: string
          duration_seconds: number
          guided: boolean
          id: string
          meditation_type: string
          note: string | null
          session_date: string
          updated_at: string
          user_id: string
        }
        Insert: {
          ambient_sound?: string | null
          completed_at?: string
          created_at?: string
          duration_seconds: number
          guided?: boolean
          id?: string
          meditation_type: string
          note?: string | null
          session_date: string
          updated_at?: string
          user_id: string
        }
        Update: {
          ambient_sound?: string | null
          completed_at?: string
          created_at?: string
          duration_seconds?: number
          guided?: boolean
          id?: string
          meditation_type?: string
          note?: string | null
          session_date?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_microtopic_progress: {
        Row: {
          id: string
          last_updated: string | null
          status: string | null
          syllabus_master_id: string
          user_id: string
        }
        Insert: {
          id?: string
          last_updated?: string | null
          status?: string | null
          syllabus_master_id: string
          user_id: string
        }
        Update: {
          id?: string
          last_updated?: string | null
          status?: string | null
          syllabus_master_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_microtopic_progress_syllabus_master_id_fkey"
            columns: ["syllabus_master_id"]
            isOneToOne: false
            referencedRelation: "exam_full_analysis_view"
            referencedColumns: ["microtopic_id"]
          },
          {
            foreignKeyName: "user_microtopic_progress_syllabus_master_id_fkey"
            columns: ["syllabus_master_id"]
            isOneToOne: false
            referencedRelation: "syllabus_master"
            referencedColumns: ["id"]
          },
        ]
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
        Relationships: [
          {
            foreignKeyName: "user_motivation_prefs_wallpaper_photo_id_fkey"
            columns: ["wallpaper_photo_id"]
            isOneToOne: false
            referencedRelation: "motivation_vision_photos"
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
      user_profiles: {
        Row: {
          ai_study_partner_seconds_remaining: number
          ai_tokens_month: string | null
          ai_tokens_used: number
          ai_usage_row_version: number
          attempts: Json | null
          bonus_ai_tokens: number
          bonus_ai_tokens_ledger: Json
          bonus_ai_tokens_ledger_at_cancel: Json | null
          bonus_photo_scans: number
          bonus_photo_scans_ledger: Json
          bonus_voice_minutes: number
          bonus_voice_minutes_ledger: Json
          bonus_voice_minutes_ledger_at_cancel: Json | null
          class_studying: string | null
          cuet_domain_subjects: Json | null
          enabled_exams_in_track: string[] | null
          enabled_features: string[] | null
          exam_dates: Json | null
          full_name: string | null
          has_had_trial: boolean
          has_used_free_trial: boolean
          id: string
          level: number
          mandatory_onboarding_completed_at: string | null
          paid_trial_ai_tokens_used: number
          payment_grace_until: string | null
          pending_upgrade_order_id: string | null
          phone_number: string | null
          phone_verified_at: string | null
          photo_scans_used_this_month: number
          prepbrain_tokens_month: string | null
          prepbrain_tokens_used: number
          prev_exam_attempted: boolean | null
          prev_score: number | null
          prev_score_entries: Json | null
          primary_exam: string | null
          quick_nav_hrefs: Json | null
          razorpay_subscription_id: string | null
          referral_campaign: string | null
          referral_captured_at: string | null
          referral_medium: string | null
          referral_source: string | null
          referral_url: string | null
          selected_track: string | null
          signup_attribution: Json | null
          subscription_autopay_months_total: number | null
          subscription_cancelled_at: string | null
          subscription_end_date: string | null
          subscription_plan: string | null
          subscription_start_date: string | null
          subscription_status: string | null
          subscription_tier: string | null
          system_push_notifications: boolean
          target_exam: string | null
          target_exam_date: string | null
          trial_access_type: string | null
          trial_date: string | null
          trial_photo_scans_used: number
          trial_started_at: string | null
          trial_voice_seconds_used: number
          ui_prefs: Json | null
          updated_at: string | null
          upsc_optional_subject: string | null
          upsc_optional_subjects: string[] | null
          usage_reset_date: string | null
          user_id: string | null
          voice_minutes_used_this_month: number
          welcome_ai_tokens_used: number
          xp: number
        }
        Insert: {
          ai_study_partner_seconds_remaining?: number
          ai_tokens_month?: string | null
          ai_tokens_used?: number
          ai_usage_row_version?: number
          attempts?: Json | null
          bonus_ai_tokens?: number
          bonus_ai_tokens_ledger?: Json
          bonus_ai_tokens_ledger_at_cancel?: Json | null
          bonus_photo_scans?: number
          bonus_photo_scans_ledger?: Json
          bonus_voice_minutes?: number
          bonus_voice_minutes_ledger?: Json
          bonus_voice_minutes_ledger_at_cancel?: Json | null
          class_studying?: string | null
          cuet_domain_subjects?: Json | null
          enabled_exams_in_track?: string[] | null
          enabled_features?: string[] | null
          exam_dates?: Json | null
          full_name?: string | null
          has_had_trial?: boolean
          has_used_free_trial?: boolean
          id?: string
          level?: number
          mandatory_onboarding_completed_at?: string | null
          paid_trial_ai_tokens_used?: number
          payment_grace_until?: string | null
          pending_upgrade_order_id?: string | null
          phone_number?: string | null
          phone_verified_at?: string | null
          photo_scans_used_this_month?: number
          prepbrain_tokens_month?: string | null
          prepbrain_tokens_used?: number
          prev_exam_attempted?: boolean | null
          prev_score?: number | null
          prev_score_entries?: Json | null
          primary_exam?: string | null
          quick_nav_hrefs?: Json | null
          razorpay_subscription_id?: string | null
          referral_campaign?: string | null
          referral_captured_at?: string | null
          referral_medium?: string | null
          referral_source?: string | null
          referral_url?: string | null
          selected_track?: string | null
          signup_attribution?: Json | null
          subscription_autopay_months_total?: number | null
          subscription_cancelled_at?: string | null
          subscription_end_date?: string | null
          subscription_plan?: string | null
          subscription_start_date?: string | null
          subscription_status?: string | null
          subscription_tier?: string | null
          system_push_notifications?: boolean
          target_exam?: string | null
          target_exam_date?: string | null
          trial_access_type?: string | null
          trial_date?: string | null
          trial_photo_scans_used?: number
          trial_started_at?: string | null
          trial_voice_seconds_used?: number
          ui_prefs?: Json | null
          updated_at?: string | null
          upsc_optional_subject?: string | null
          upsc_optional_subjects?: string[] | null
          usage_reset_date?: string | null
          user_id?: string | null
          voice_minutes_used_this_month?: number
          welcome_ai_tokens_used?: number
          xp?: number
        }
        Update: {
          ai_study_partner_seconds_remaining?: number
          ai_tokens_month?: string | null
          ai_tokens_used?: number
          ai_usage_row_version?: number
          attempts?: Json | null
          bonus_ai_tokens?: number
          bonus_ai_tokens_ledger?: Json
          bonus_ai_tokens_ledger_at_cancel?: Json | null
          bonus_photo_scans?: number
          bonus_photo_scans_ledger?: Json
          bonus_voice_minutes?: number
          bonus_voice_minutes_ledger?: Json
          bonus_voice_minutes_ledger_at_cancel?: Json | null
          class_studying?: string | null
          cuet_domain_subjects?: Json | null
          enabled_exams_in_track?: string[] | null
          enabled_features?: string[] | null
          exam_dates?: Json | null
          full_name?: string | null
          has_had_trial?: boolean
          has_used_free_trial?: boolean
          id?: string
          level?: number
          mandatory_onboarding_completed_at?: string | null
          paid_trial_ai_tokens_used?: number
          payment_grace_until?: string | null
          pending_upgrade_order_id?: string | null
          phone_number?: string | null
          phone_verified_at?: string | null
          photo_scans_used_this_month?: number
          prepbrain_tokens_month?: string | null
          prepbrain_tokens_used?: number
          prev_exam_attempted?: boolean | null
          prev_score?: number | null
          prev_score_entries?: Json | null
          primary_exam?: string | null
          quick_nav_hrefs?: Json | null
          razorpay_subscription_id?: string | null
          referral_campaign?: string | null
          referral_captured_at?: string | null
          referral_medium?: string | null
          referral_source?: string | null
          referral_url?: string | null
          selected_track?: string | null
          signup_attribution?: Json | null
          subscription_autopay_months_total?: number | null
          subscription_cancelled_at?: string | null
          subscription_end_date?: string | null
          subscription_plan?: string | null
          subscription_start_date?: string | null
          subscription_status?: string | null
          subscription_tier?: string | null
          system_push_notifications?: boolean
          target_exam?: string | null
          target_exam_date?: string | null
          trial_access_type?: string | null
          trial_date?: string | null
          trial_photo_scans_used?: number
          trial_started_at?: string | null
          trial_voice_seconds_used?: number
          ui_prefs?: Json | null
          updated_at?: string | null
          upsc_optional_subject?: string | null
          upsc_optional_subjects?: string[] | null
          usage_reset_date?: string | null
          user_id?: string | null
          voice_minutes_used_this_month?: number
          welcome_ai_tokens_used?: number
          xp?: number
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
            referencedRelation: "exam_full_analysis_view"
            referencedColumns: ["microtopic_id"]
          },
          {
            foreignKeyName: "user_progress_microtopic_id_fkey"
            columns: ["microtopic_id"]
            isOneToOne: false
            referencedRelation: "syllabus_master"
            referencedColumns: ["id"]
          },
        ]
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
            referencedRelation: "exam_full_analysis_view"
            referencedColumns: ["microtopic_id"]
          },
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
            referencedRelation: "exam_full_analysis_view"
            referencedColumns: ["microtopic_id"]
          },
          {
            foreignKeyName: "user_revision_topic_state_syllabus_master_id_fkey"
            columns: ["syllabus_master_id"]
            isOneToOne: false
            referencedRelation: "syllabus_master"
            referencedColumns: ["id"]
          },
        ]
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
      user_stats: {
        Row: {
          highest_daily_score: number
          highest_daily_score_date: string | null
          longest_streak_date: string | null
          longest_streak_days: number
          most_marks_in_day: number
          most_marks_in_day_date: string | null
          most_study_hours_date: string | null
          most_study_hours_in_day: number
          most_tasks_in_day: number
          most_tasks_in_day_date: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          highest_daily_score?: number
          highest_daily_score_date?: string | null
          longest_streak_date?: string | null
          longest_streak_days?: number
          most_marks_in_day?: number
          most_marks_in_day_date?: string | null
          most_study_hours_date?: string | null
          most_study_hours_in_day?: number
          most_tasks_in_day?: number
          most_tasks_in_day_date?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          highest_daily_score?: number
          highest_daily_score_date?: string | null
          longest_streak_date?: string | null
          longest_streak_days?: number
          most_marks_in_day?: number
          most_marks_in_day_date?: string | null
          most_study_hours_date?: string | null
          most_study_hours_in_day?: number
          most_tasks_in_day?: number
          most_tasks_in_day_date?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_syllabus_customizations: {
        Row: {
          action_type: string
          chapter: string | null
          created_at: string | null
          custom_chapter: string | null
          custom_microtopic: string | null
          custom_subject: string | null
          exam_name: string
          id: string
          original_syllabus_id: string | null
          parent_id: string | null
          subject: string | null
          syllabus_master_id: string | null
          target_type: string
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          action_type: string
          chapter?: string | null
          created_at?: string | null
          custom_chapter?: string | null
          custom_microtopic?: string | null
          custom_subject?: string | null
          exam_name: string
          id?: string
          original_syllabus_id?: string | null
          parent_id?: string | null
          subject?: string | null
          syllabus_master_id?: string | null
          target_type: string
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          action_type?: string
          chapter?: string | null
          created_at?: string | null
          custom_chapter?: string | null
          custom_microtopic?: string | null
          custom_subject?: string | null
          exam_name?: string
          id?: string
          original_syllabus_id?: string | null
          parent_id?: string | null
          subject?: string | null
          syllabus_master_id?: string | null
          target_type?: string
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_syllabus_customizations_original_syllabus_id_fkey"
            columns: ["original_syllabus_id"]
            isOneToOne: false
            referencedRelation: "exam_full_analysis_view"
            referencedColumns: ["microtopic_id"]
          },
          {
            foreignKeyName: "user_syllabus_customizations_original_syllabus_id_fkey"
            columns: ["original_syllabus_id"]
            isOneToOne: false
            referencedRelation: "syllabus_master"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_syllabus_customizations_syllabus_master_id_fkey"
            columns: ["syllabus_master_id"]
            isOneToOne: false
            referencedRelation: "exam_full_analysis_view"
            referencedColumns: ["microtopic_id"]
          },
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
          marks_2026: number | null
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
          marks_2026?: number | null
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
          marks_2026?: number | null
          syllabus_master_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_syllabus_marks_overrides_syllabus_master_id_fkey"
            columns: ["syllabus_master_id"]
            isOneToOne: false
            referencedRelation: "exam_full_analysis_view"
            referencedColumns: ["microtopic_id"]
          },
          {
            foreignKeyName: "user_syllabus_marks_overrides_syllabus_master_id_fkey"
            columns: ["syllabus_master_id"]
            isOneToOne: false
            referencedRelation: "syllabus_master"
            referencedColumns: ["id"]
          },
        ]
      }
      user_backlog_vents: {
        Row: {
          created_at: string
          id: string
          raw_text: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          raw_text: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          raw_text?: string
          user_id?: string
        }
        Relationships: []
      }
      user_syllabus_backlog: {
        Row: {
          created_at: string
          details: string
          difficulty: string | null
          effort_estimate_minutes: number | null
          group_label: string | null
          id: string
          last_attempt_date: string | null
          retry_count: number
          status: string
          syllabus_master_id: string | null
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          details?: string
          difficulty?: string | null
          effort_estimate_minutes?: number | null
          group_label?: string | null
          id?: string
          last_attempt_date?: string | null
          retry_count?: number
          status?: string
          syllabus_master_id?: string | null
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          details?: string
          difficulty?: string | null
          effort_estimate_minutes?: number | null
          group_label?: string | null
          id?: string
          last_attempt_date?: string | null
          retry_count?: number
          status?: string
          syllabus_master_id?: string | null
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_syllabus_backlog_syllabus_master_id_fkey"
            columns: ["syllabus_master_id"]
            isOneToOne: false
            referencedRelation: "exam_full_analysis_view"
            referencedColumns: ["microtopic_id"]
          },
          {
            foreignKeyName: "user_syllabus_backlog_syllabus_master_id_fkey"
            columns: ["syllabus_master_id"]
            isOneToOne: false
            referencedRelation: "syllabus_master"
            referencedColumns: ["id"]
          },
        ]
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
      user_xp: {
        Row: {
          level: number
          total_xp: number
          updated_at: string
          user_id: string
        }
        Insert: {
          level?: number
          total_xp?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          level?: number
          total_xp?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      voice_ai_usage_log: {
        Row: {
          created_at: string
          feature: string
          id: string
          input_tokens: number
          model: string
          output_tokens: number
          provider: string
          user_id: string
        }
        Insert: {
          created_at?: string
          feature: string
          id?: string
          input_tokens?: number
          model?: string
          output_tokens?: number
          provider?: string
          user_id: string
        }
        Update: {
          created_at?: string
          feature?: string
          id?: string
          input_tokens?: number
          model?: string
          output_tokens?: number
          provider?: string
          user_id?: string
        }
        Relationships: []
      }
      voice_timeline_entries: {
        Row: {
          category: string
          chapter: string | null
          created_at: string
          description: string
          estimated_minutes: number | null
          id: string
          log_date: string
          occurred_at: string
          parsed_json: Json | null
          subject: string | null
          title: string
          transcript_raw: string
          updated_at: string
          user_id: string
        }
        Insert: {
          category: string
          chapter?: string | null
          created_at?: string
          description?: string
          estimated_minutes?: number | null
          id?: string
          log_date: string
          occurred_at?: string
          parsed_json?: Json | null
          subject?: string | null
          title: string
          transcript_raw: string
          updated_at?: string
          user_id: string
        }
        Update: {
          category?: string
          chapter?: string | null
          created_at?: string
          description?: string
          estimated_minutes?: number | null
          id?: string
          log_date?: string
          occurred_at?: string
          parsed_json?: Json | null
          subject?: string | null
          title?: string
          transcript_raw?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      waitlist_entries: {
        Row: {
          activated_at: string | null
          batch_id: string | null
          contact_email: string | null
          contact_phone: string | null
          created_at: string
          id: string
          joined_at: string
          notification_channel: string
          position: number
          razorpay_payment_id: string | null
          skipped_waitlist: boolean
          status: string
          user_id: string
        }
        Insert: {
          activated_at?: string | null
          batch_id?: string | null
          contact_email?: string | null
          contact_phone?: string | null
          created_at?: string
          id?: string
          joined_at?: string
          notification_channel?: string
          position: number
          razorpay_payment_id?: string | null
          skipped_waitlist?: boolean
          status?: string
          user_id: string
        }
        Update: {
          activated_at?: string | null
          batch_id?: string | null
          contact_email?: string | null
          contact_phone?: string | null
          created_at?: string
          id?: string
          joined_at?: string
          notification_channel?: string
          position?: number
          razorpay_payment_id?: string | null
          skipped_waitlist?: boolean
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "waitlist_entries_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "batches"
            referencedColumns: ["id"]
          },
        ]
      }
      waitlist_join_rate_limits: {
        Row: {
          attempt_count: number
          ip_hash: string
          window_start: string
        }
        Insert: {
          attempt_count?: number
          ip_hash: string
          window_start: string
        }
        Update: {
          attempt_count?: number
          ip_hash?: string
          window_start?: string
        }
        Relationships: []
      }
      xp_events: {
        Row: {
          created_at: string
          event_type: string
          id: string
          ref_id: string
          user_id: string
          xp_awarded: number
        }
        Insert: {
          created_at?: string
          event_type: string
          id?: string
          ref_id?: string
          user_id: string
          xp_awarded: number
        }
        Update: {
          created_at?: string
          event_type?: string
          id?: string
          ref_id?: string
          user_id?: string
          xp_awarded?: number
        }
        Relationships: []
      }
      xp_transactions: {
        Row: {
          amount: number
          base_xp: number
          created_at: string
          discipline_streak_days: number
          id: string
          idempotency_key: string
          meta: Json | null
          multiplier: number
          session_ymd: string
          source: string
          user_id: string
        }
        Insert: {
          amount: number
          base_xp: number
          created_at?: string
          discipline_streak_days?: number
          id?: string
          idempotency_key: string
          meta?: Json | null
          multiplier?: number
          session_ymd: string
          source: string
          user_id: string
        }
        Update: {
          amount?: number
          base_xp?: number
          created_at?: string
          discipline_streak_days?: number
          id?: string
          idempotency_key?: string
          meta?: Json | null
          multiplier?: number
          session_ymd?: string
          source?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      exam_full_analysis_view: {
        Row: {
          average_chapter_weightage_last_3_years: number | null
          chapter_id: string | null
          chapter_marks_year_1: number | null
          chapter_marks_year_2: number | null
          chapter_marks_year_3: number | null
          chapter_name: string | null
          exam_date: string | null
          exam_id: string | null
          exam_name: string | null
          marks_2026: number | null
          marks_allocated: number | null
          microtopic_id: string | null
          microtopic_name: string | null
          relative_effort_score: number | null
          section: string | null
          subject: string | null
          total_chapter_weightage_last_3_years: number | null
          total_full_marks: number | null
          weightage_tag: string | null
          weightage_year_1: number | null
          weightage_year_2: number | null
          weightage_year_3: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      _prepbrain_add_bonus_ai_pool: {
        Args: {
          p_amount: number
          p_expires_at: string
          p_ledger: Json
          p_now: string
        }
        Returns: Json
      }
      _prepbrain_apply_ai_token_consume: {
        Args: {
          p_ai_month: string
          p_ai_used: number
          p_bonus: Json
          p_delta: number
          p_month_key: string
          p_now: string
          p_paid_trial: number
          p_phase: string
          p_welcome: number
        }
        Returns: Record<string, unknown>
      }
      _prepbrain_available_ai_tokens: {
        Args: {
          p_ai_month: string
          p_ai_used: number
          p_bonus: Json
          p_month_key: string
          p_now: string
          p_paid: number
          p_phase: string
          p_welcome: number
        }
        Returns: number
      }
      _prepbrain_consume_bonus_ai_fifo: {
        Args: { p_ledger: Json; p_need: number; p_now: string }
        Returns: {
          ledger_out: Json
          taken: number
        }[]
      }
      _prepbrain_prune_bonus_ai_ledger: {
        Args: { p_ledger: Json; p_now: string }
        Returns: Json
      }
      _prepbrain_resolve_ai_phase: {
        Args: { prof: Database["public"]["Tables"]["user_profiles"]["Row"] }
        Returns: string
      }
      _prepbrain_total_active_bonus_ai: {
        Args: { p_ledger: Json; p_now: string }
        Returns: number
      }
      activate_waitlist_skip: {
        Args: { p_razorpay_payment_id: string; p_user_id: string }
        Returns: Json
      }
      add_ai_study_partner_seconds: {
        Args: { p_seconds: number; p_user_id: string }
        Returns: undefined
      }
      assign_waitlist_position:
        | {
            Args: {
              p_batch_id: string
              p_contact_email?: string
              p_notification_ch?: string
              p_user_id: string
            }
            Returns: Json
          }
        | {
            Args: {
              p_batch_id: string
              p_contact_email?: string
              p_contact_phone?: string
              p_notification_ch?: string
              p_user_id: string
            }
            Returns: Json
          }
      attach_referral_to_user: {
        Args: {
          p_code: string
          p_ref_url?: string
          p_user_id: string
          p_utm_campaign?: string
          p_utm_medium?: string
          p_utm_source?: string
        }
        Returns: Json
      }
      automated_notification_task_signals: {
        Args: {
          p_today: string
        }
        Returns: {
          completion_streak: number
          incomplete_task_count: number
          today_task_completed: number
          today_task_total: number
        }[]
      }
      auth_rate_limit_password_reset: {
        Args: { p_email: string; p_ip: string; p_step: string }
        Returns: Json
      }
      auth_rate_limit_step: {
        Args: { p_action_type: string; p_bucket_key: string; p_step: string }
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
      deduct_ai_study_partner_seconds: {
        Args: { p_seconds: number; p_user_id: string }
        Returns: undefined
      }
      fetch_task_sessions_for_log: {
        Args: { p_limit?: number; p_since: string }
        Returns: {
          assigned_date: string
          created_at: string
          duration_seconds: number
          end_time: string
          id: string
          microtopic_id: string
          start_time: string
          task_id: string
          task_name: string
          task_status: string
        }[]
      }
      get_gated_predicted_score: {
        Args: { target_user_id: string }
        Returns: Json
      }
      increment_daily_trial_count: {
        Args: { p_user_id: string }
        Returns: Json
      }
      join_trial_queue: { Args: { p_user_id: string }; Returns: Json }
      prepbrain_ai_token_cancel_reservation: {
        Args: { p_reservation_id: string; p_user_id: string }
        Returns: Json
      }
      prepbrain_ai_token_finalize: {
        Args: {
          p_actual: number
          p_input_tokens?: number
          p_model?: string
          p_output_tokens?: number
          p_provider?: string
          p_reservation_id: string
          p_user_id: string
        }
        Returns: Json
      }
      prepbrain_ai_token_reserve: {
        Args: { p_estimate: number; p_month_key: string; p_user_id: string }
        Returns: Json
      }
      prepbrain_ai_token_sweep_expired: { Args: never; Returns: Json }
      prepbrain_marks_intelligence: {
        Args: { p_exam_name: string; p_limit?: number; p_user_id: string }
        Returns: {
          chapter: string
          completion_pct: number
          done_topics: number
          marks_2023: number
          marks_2024: number
          marks_2025: number
          marks_2026: number
          subject: string
          total_topics: number
        }[]
      }
      recompute_leaderboard_weekly_top_percents: {
        Args: { p_week_start: string }
        Returns: undefined
      }
      refund_automated_push_budget: {
        Args: { p_ist_date: string; p_user_id: string }
        Returns: undefined
      }
      try_consume_automated_push_budget: {
        Args: { p_ist_date: string; p_max?: number; p_user_id: string }
        Returns: boolean
      }
      upsc_cse_mains_optional_subjects: {
        Args: never
        Returns: {
          base_name: string
        }[]
      }
      upsc_cse_mains_syllabus_rows: {
        Args: { p_optional?: string }
        Returns: {
          chapter: string
          created_at: string | null
          exam_name: string
          id: string
          marks_2023: number | null
          marks_2024: number | null
          marks_2025: number | null
          microtopic: string
          relative_effort_score: number | null
          section: string | null
          subject: string
          weightage_tag: string | null
        }[]
        SetofOptions: {
          from: "*"
          to: "syllabus_master"
          isOneToOne: false
          isSetofReturn: true
        }
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
