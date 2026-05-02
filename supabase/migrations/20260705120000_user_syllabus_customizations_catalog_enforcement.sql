-- Enforce: user-added microtopics attach only to existing syllabus_master (subject, chapter, exam);
-- disallow relocating user-added rows to another subject/chapter; disallow catalog microtopic display
-- overrides that change subject/chapter (custom_subject / custom_chapter).

UPDATE public.user_syllabus_customizations
SET
  custom_subject = NULL,
  custom_chapter = NULL
WHERE action_type = 'edit'
  AND target_type = 'microtopic'
  AND syllabus_master_id IS NOT NULL;

ALTER TABLE public.user_syllabus_customizations
  DROP CONSTRAINT IF EXISTS user_syllabus_customizations_edit_global_no_subject_chapter;

ALTER TABLE public.user_syllabus_customizations
  ADD CONSTRAINT user_syllabus_customizations_edit_global_no_subject_chapter
  CHECK (
    NOT (
      action_type = 'edit'
      AND target_type = 'microtopic'
      AND syllabus_master_id IS NOT NULL
    )
    OR (custom_subject IS NULL AND custom_chapter IS NULL)
  );

CREATE OR REPLACE FUNCTION public.enforce_user_syllabus_customizations_rules()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  -- New user-added microtopics must attach to an existing catalog chapter.
  IF TG_OP = 'INSERT' THEN
    IF NEW.action_type = 'add' AND NEW.target_type = 'microtopic' THEN
      IF NOT EXISTS (
        SELECT 1
        FROM public.syllabus_master sm
        WHERE sm.exam_name = NEW.exam_name
          AND sm.subject IS NOT DISTINCT FROM NEW.subject
          AND sm.chapter IS NOT DISTINCT FROM NEW.chapter
      ) THEN
        RAISE EXCEPTION
          'user_syllabus_customizations: add microtopic requires existing syllabus_master row for exam_name, subject, chapter';
      END IF;
    END IF;
  END IF;

  IF TG_OP = 'UPDATE'
     AND OLD.action_type = 'add'
     AND OLD.target_type = 'microtopic' THEN
    IF NEW.subject IS DISTINCT FROM OLD.subject
       OR NEW.chapter IS DISTINCT FROM OLD.chapter THEN
      RAISE EXCEPTION
        'user_syllabus_customizations: cannot change subject or chapter on user-added microtopic';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.enforce_user_syllabus_customizations_rules() IS
  'Validates user-added microtopics against syllabus_master; prevents relocating add rows.';

DROP TRIGGER IF EXISTS user_syllabus_customizations_enforce
  ON public.user_syllabus_customizations;

CREATE TRIGGER user_syllabus_customizations_enforce
  BEFORE INSERT OR UPDATE ON public.user_syllabus_customizations
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_user_syllabus_customizations_rules();
