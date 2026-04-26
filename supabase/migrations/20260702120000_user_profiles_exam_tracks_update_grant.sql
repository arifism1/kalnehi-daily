-- user_profiles: allow authenticated users to read and write track selection columns.
-- selected_track and enabled_exams_in_track were added in 20260426143459_exam_tracks
-- but were not included in the UPDATE grant in 20260625120000_security_hardening,
-- nor in the INSERT grant in 20260417120000_user_profiles_lockdown_welcome_usage_rpc.
GRANT UPDATE (selected_track, enabled_exams_in_track) ON public.user_profiles TO authenticated;
GRANT INSERT (selected_track, enabled_exams_in_track) ON public.user_profiles TO authenticated;
