-- Track consecutive invalid-registration FCM responses per token; delete only after threshold (see sendNotifications).
alter table public.user_push_tokens
  add column if not exists invalid_registration_streak integer not null default 0;

comment on column public.user_push_tokens.invalid_registration_streak is
  'Increments on messaging/invalid-registration-token or not-registered; reset on success; row deleted at 3.';
