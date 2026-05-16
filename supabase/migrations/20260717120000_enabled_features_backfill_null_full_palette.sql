-- Preserve legacy behaviour for profiles that never customised features:
-- NULL previously meant "all dashboard tools visible". New app semantics treat NULL as a default
-- palette without opt-in Mind & Motivation tools — so backfill explicit full ids once.
--
-- Must stay in sync with ALL_FEATURE_IDS order in src/lib/dashboardFeatures.ts (DASHBOARD_FEATURES).

UPDATE user_profiles
SET
  enabled_features = ARRAY[
    'daily-planner',
    'dictate-my-day',
    'timer',
    'missed-tasks',
    'daily-debrief',
    'shareable-recap',
    'saved-daily-plans',
    'consistency-tracker',
    'mock-test-tracker',
    'progress',
    'syllabus-tracker',
    'backlogs',
    'target-score-blueprint',
    'my-target',
    'prepbrain-ai',
    'revision-tracker',
    'doubt-tracker',
    'mistake-log',
    'study-squad',
    'study-sessions',
    'habit-maker',
    'personal-motivation',
    'brain-yoga'
  ]::text[],
  updated_at = NOW()
WHERE enabled_features IS NULL;
