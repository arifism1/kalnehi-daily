-- Update annual plan price to ₹3,591 (25% off ₹399 × 12 = ₹4,788 × 0.75).
-- Supersedes the ₹3,830 (20% off) value set in 20260627120000_six_month_plan.sql.

UPDATE public.admin_config
  SET value = '3591'
  WHERE key = 'smart_plan_annual_price_inr';
