/** Local + server-backed study session row (IndexedDB + Supabase). */
export type StudySessionLog = {
  id: string;
  user_id: string;
  subject: string;
  duration_seconds: number;
  is_camera_proven: boolean;
  started_at: string;
  ended_at: string;
};
