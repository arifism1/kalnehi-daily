/** sessionStorage: prefill Backlog Tracker (Backlog List, Plan / Fix these, staged capture). */
export const BACKLOG_TRACKER_PREFILL_KEY = "kalnehi_backlog_tracker_prefill_v1";

/** One row to schedule — from AI organize or verbatim lines (exact titles). */
export type BacklogStagedItem = {
  title: string;
  syllabus_master_id?: string | null;
  group_label?: string | null;
};

export type BacklogTrackerPrefillV1 = {
  v: 1;
  /** Optional: pending row IDs for Plan / Fix these */
  backlog_ids?: string[];
  /** Optional seed lines for the AI capture box */
  titles?: string[];
  /** Load pending rows from DB with saved minutes — skip capture */
  load_existing_rows?: boolean;
  /**
   * Items built on Backlog List (AI + verbatim); opens tracker at the time step.
   */
  staged_items?: BacklogStagedItem[];
};

export const BACKLOG_TIME_STEP_MINUTES = 15;
export const BACKLOG_TIME_MIN_CAP = 15;
export const BACKLOG_TIME_MAX_CAP = 240;
