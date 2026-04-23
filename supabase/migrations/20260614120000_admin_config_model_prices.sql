-- Seed AI model pricing keys into admin_config.
-- DeepInfra prices are auto-syncable via /api/admin/sync-deepinfra-pricing.
-- Groq prices are manually editable from the admin config panel.
-- All prices are INR per 1 million tokens.

INSERT INTO public.admin_config (key, value) VALUES
  ('ai_deepinfra_input_inr_per_m',    '2.82'),
  ('ai_deepinfra_output_inr_per_m',   '13.15'),
  ('ai_groq_input_inr_per_m',         '4.70'),
  ('ai_groq_output_inr_per_m',        '7.51'),
  ('ai_usd_to_inr_rate',              '95')
ON CONFLICT (key) DO NOTHING;
