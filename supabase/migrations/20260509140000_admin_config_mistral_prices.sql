-- Mastermind / DeepInfra Mistral 24B pricing (INR per 1M tokens).
-- Defaults match generic DeepInfra keys until admin syncs or edits.

INSERT INTO public.admin_config (key, value) VALUES
  ('ai_deepinfra_mistral_input_inr_per_m',  '2.82'),
  ('ai_deepinfra_mistral_output_inr_per_m', '13.15')
ON CONFLICT (key) DO NOTHING;
